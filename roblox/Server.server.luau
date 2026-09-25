local Players=game:GetService('Players')
local RS=game:GetService('ReplicatedStorage')
local Debris=game:GetService('Debris')
local Pathfinding=game:GetService('PathfindingService')
local package=RS:WaitForChild('NeonZombies')
local Config=require(package.Config);local Models=require(package.Models)
local remote=package.Events
local map=workspace:WaitForChild('NeonZombiesMap')
local enemies=Instance.new('Folder');enemies.Name='NeonZombiesEnemies';enemies.Parent=workspace
local states={};local round=0;local remaining=0;local countdown=0;local epoch=0
local function send(p,message)
 local s=states[p];if not s then return end
 local gun=s.guns[s.slot];local humanoid=p.Character and p.Character:FindFirstChildOfClass('Humanoid')
 remote:FireClient(p,'state',{points=s.points,kills=s.kills,weapon=gun.id,ammo=gun.ammo,reserve=gun.reserve,reloading=s.reloading,jug=s.jug,speed=s.speed,round=round,remaining=remaining,countdown=countdown,health=humanoid and math.ceil(humanoid.Health) or 0,maxHealth=humanoid and humanoid.MaxHealth or 100,message=message})
end
local function fresh(p)
 states[p]={points=500,kills=0,guns={{id=1,ammo=8,reserve=80}},slot=1,reloading=false,nextShot=0,reloadToken=0,jug=false,speed=false,lastRemote=0,lastBuy=0}
end
local function alive(p)
 local c=p.Character;local h=c and c:FindFirstChildOfClass('Humanoid');return h and h.Health>0 and c:FindFirstChild('HumanoidRootPart')
end
local function setup(p)
 p.RespawnLocation=map:FindFirstChild('Rooftop spawn')
 fresh(p)
 p.CharacterAdded:Connect(function(c)
  local h=c:WaitForChild('Humanoid');local s=states[p];if not s then return end
  s.jug=false;s.speed=false;s.reloading=false;s.reloadToken+=1
  h.WalkSpeed=19;h.MaxHealth=100;h.Health=100;p.CameraMode=Enum.CameraMode.LockFirstPerson
  h.HealthChanged:Connect(function() send(p) end)
  send(p,'Survive the rooftop. E to buy • R to reload')
 end)
end
Players.PlayerAdded:Connect(setup);Players.PlayerRemoving:Connect(function(p) states[p]=nil end)
for _,p in ipairs(Players:GetPlayers()) do setup(p) end
local function equip(p,id)
 local s=states[p];local w=Config.Weapons[id];s.reloadToken+=1;s.reloading=false
 for index,g in ipairs(s.guns) do if g.id==id then g.ammo=w.clip;g.reserve=w.reserve;s.slot=index;send(p);return end end
 local index=#s.guns<2 and #s.guns+1 or s.slot;s.guns[index]={id=id,ammo=w.clip,reserve=w.reserve};s.slot=index;send(p)
end
for _,q in ipairs(map:GetDescendants()) do if q:IsA('ProximityPrompt') then
 q.Triggered:Connect(function(p)
  local s=states[p];local r=alive(p);if not s or not r or (r.Position-q.Parent.Position).Magnitude>13 or os.clock()-s.lastBuy<.7 then return end;s.lastBuy=os.clock()
  local id=q:GetAttribute('Purchase');local weapon=tonumber(string.match(id,'^weapon(%d+)$'));local cost=weapon and Config.Weapons[weapon].cost or id=='jug' and 2500 or id=='speed' and 3000 or 950
  if (id=='jug' and s.jug) or (id=='speed' and s.speed) then send(p,'Perk already active');return end
  if s.points<cost then send(p,'Need '..cost..' points');return end;s.points-=cost
  if weapon then equip(p,weapon)
  elseif id=='mystery' then equip(p,math.random(2,6))
  elseif id=='jug' then s.jug=true;local h=p.Character:FindFirstChildOfClass('Humanoid');h.MaxHealth=250;h.Health=250
  elseif id=='speed' then s.speed=true end
  send(p,'Purchased!')
 end)
end end
local function finite(v) return typeof(v)=='Vector3' and v.X==v.X and v.Y==v.Y and v.Z==v.Z and math.abs(v.X)<1e6 and math.abs(v.Y)<1e6 and math.abs(v.Z)<1e6 end
remote.OnServerEvent:Connect(function(p,action,direction)
 local s=states[p];if not s then return end
 local now=os.clock();if now-s.lastRemote<.025 then return end;s.lastRemote=now
 if action=='sync' then send(p);return end
 local root=alive(p);if not root then return end
 local g=s.guns[s.slot];local w=Config.Weapons[g.id]
 if action=='reload' then
  if s.reloading or g.ammo>=w.clip or g.reserve<=0 then return end
  s.reloading=true;s.reloadToken+=1;local token=s.reloadToken;send(p)
  task.delay(w.reload*(s.speed and .5 or 1),function()
   if states[p]~=s or token~=s.reloadToken then return end
   local n=math.min(w.clip-g.ammo,g.reserve);g.ammo+=n;g.reserve-=n;s.reloading=false;send(p)
  end)
 elseif action=='switch' then
  if #s.guns<2 then return end;s.reloadToken+=1;s.reloading=false;s.slot=s.slot==1 and 2 or 1;send(p)
 elseif action=='shoot' then
  if not finite(direction) or direction.Magnitude<.9 or direction.Magnitude>1.1 or s.reloading or now<s.nextShot or g.ammo<=0 then return end
  g.ammo-=1;s.nextShot=now+w.delay
  local origin=p.Character.Head.Position;local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances={p.Character}
  for _=1,w.pellets or 1 do
   local dir=direction.Unit
   if w.pellets then dir=(dir+Vector3.new((math.random()-.5)*.1,(math.random()-.5)*.1,(math.random()-.5)*.1)).Unit end
   local hit=workspace:Raycast(origin,dir*400,params);local endpoint=hit and hit.Position or origin+dir*400
   remote:FireAllClients('shot',origin,endpoint,g.id)
   if hit then
    local model=hit.Instance:FindFirstAncestorOfClass('Model');local h=model and model.Parent==enemies and model:FindFirstChildOfClass('Humanoid')
    if h and h.Health>0 then
     local headshot=hit.Instance.Name=='Head' or hit.Instance.Name=='Eye';local damage=w.damage*(headshot and 2 or 1)
     local kill=h.Health<=damage;h:TakeDamage(damage);s.points+=kill and 100 or 10;if kill then s.kills+=1 end;remote:FireClient(p,'hit',kill)
    end
   end
  end
  send(p)
 end
end)
local function spawnZombie()
 local locations={Vector3.new(-22,84,-36),Vector3.new(22,84,-36),Vector3.new(-100,84,-22),Vector3.new(22,84,38)}
 local m=Models.zombie(locations[math.random(#locations)],100*1.15^(round-1),math.min(18,7+round*.55));m.Parent=enemies;m.PrimaryPart:SetNetworkOwner(nil)
 local h=m:FindFirstChildOfClass('Humanoid');local token=epoch;local jointBases={}
 h.Died:Connect(function() remaining=math.max(0,remaining-1);Debris:AddItem(m,2) end)
 task.spawn(function()
  local attack=0;local pathAt=0;local waypoints=nil;local waypoint=1
  while m.Parent and h.Health>0 and token==epoch do
   local target=nil;local distance=math.huge
   for _,p in ipairs(Players:GetPlayers()) do local r=alive(p);if r then local d=(r.Position-m.PrimaryPart.Position).Magnitude;if d<distance then target=r;distance=d end end end
   if target then
    if os.clock()>pathAt then
     pathAt=os.clock()+1.7
     local path=Pathfinding:CreatePath({AgentRadius=2,AgentHeight=6,AgentCanJump=false,WaypointSpacing=5})
     local ok=pcall(function() path:ComputeAsync(m.PrimaryPart.Position,target.Position) end)
     waypoints=ok and path.Status==Enum.PathStatus.Success and path:GetWaypoints() or nil;waypoint=2
    end
    local point=waypoints and waypoints[waypoint]
    if point and (point.Position-m.PrimaryPart.Position).Magnitude<4 then waypoint+=1;point=waypoints[waypoint] end
    h:MoveTo(point and point.Position or target.Position)
    if distance<5 and os.clock()>attack then
     attack=os.clock()+1.1
     local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Exclude;rp.FilterDescendantsInstances={enemies}
     local hit=workspace:Raycast(m.PrimaryPart.Position,target.Position-m.PrimaryPart.Position,rp)
     if hit and hit.Instance:IsDescendantOf(target.Parent) then target.Parent:FindFirstChildOfClass('Humanoid'):TakeDamage(35) end
    end
    local phase=os.clock()*h.WalkSpeed*.6
    for _,name in ipairs({'LeftLeg','RightLeg','LeftArm','RightArm'}) do
     local joint=m.PrimaryPart:FindFirstChild(name..'Joint');local side=string.find(name,'Left') and 1 or -1
     if joint then jointBases[name]=jointBases[name] or joint.C0;joint.C0=jointBases[name]*CFrame.Angles(math.sin(phase)*.4*side,0,0) end
    end
   end
   if m.PrimaryPart.Position.Y<50 then h.Health=0 end
   task.wait(.2)
  end
 end)
end
local function broadcast() for p in pairs(states) do send(p) end end
task.spawn(function()
 while true do
  while #Players:GetPlayers()==0 do task.wait(1) end
  for i=10,1,-1 do countdown=i;broadcast();task.wait(1) end
  countdown=0;round+=1;remaining=6+round*4;local toSpawn=remaining
  for p,s in pairs(states) do
   if round>1 then for _,g in ipairs(s.guns) do g.reserve=Config.Weapons[g.id].reserve end;send(p,'Round '..round..' • reserve ammunition replenished') end
  end
  while remaining>0 do
   local active=0;for _,m in ipairs(enemies:GetChildren()) do local h=m:FindFirstChildOfClass('Humanoid');if h and h.Health>0 then active+=1 end end
   if toSpawn>0 and active<Config.MaxActiveZombies then spawnZombie();toSpawn-=1 end
   local living=0;for p in pairs(states) do if alive(p) then living+=1 end end
   if living==0 then
    epoch+=1;enemies:ClearAllChildren();round=0;remaining=0
    for p in pairs(states) do fresh(p);send(p,'Squad wiped • restarting') end
    break
   end
   broadcast();task.wait(.8)
  end
 end
end)
