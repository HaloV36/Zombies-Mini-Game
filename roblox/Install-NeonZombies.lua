-- NEON ZOMBIES / Roblox Studio Command Bar installer
-- Run in EDIT mode in a new Baseplate place. Replaces only this kit's named objects.
assert(not game:GetService('RunService'):IsRunning(), 'Stop Play mode before installing Neon Zombies')
local RS=game:GetService('ReplicatedStorage')
local SSS=game:GetService('ServerScriptService')
local starter=game:GetService('StarterPlayer')
local lighting=game:GetService('Lighting')
local function remove(parent,name) local old=parent:FindFirstChild(name);if old then old:Destroy() end end
remove(RS,'NeonZombies');remove(workspace,'NeonZombiesMap');remove(workspace,'NeonZombiesEnemies')
remove(SSS,'NeonZombiesServer');remove(starter.StarterPlayerScripts,'NeonZombiesClient')
local package=Instance.new('Folder');package.Name='NeonZombies';package.Parent=RS
local function scriptObject(class,name,source,parent)
 local s=Instance.new(class);s.Name=name;s.Source=source;s.Parent=parent;return s
end
scriptObject('ModuleScript','Config',[====[
return {
 Weapons = {
  {name='M1911',clip=8,reserve=80,damage=25,delay=.28,reload=1.2,cost=0,automatic=false},
  {name='M1 Carbine',clip=15,reserve=120,damage=65,delay=.4,reload=1.8,cost=1000,automatic=false},
  {name='Pump Shotgun',clip=6,reserve=48,damage=35,pellets=6,delay=.85,reload=2.2,cost=1500,automatic=false},
  {name='Thompson',clip=30,reserve=180,damage=38,delay=.15,reload=1.9,cost=1800,automatic=true},
  {name='Ray Gun',clip=20,reserve=120,damage=220,delay=.2,reload=2.3,cost=0,automatic=true},
  {name='Thundergun',clip=2,reserve=10,damage=600,delay=1.2,reload=2.5,cost=0,automatic=false},
 },
 FloorY=80, MaxActiveZombies=18,
}

]====],package)
scriptObject('ModuleScript','Models',[====[
local Models={}
local function block(parent,name,size,cf,color)
 local p=Instance.new('Part');p.Name=name;p.Size=size;p.CFrame=cf;p.Color=color;p.Material=Enum.Material.SmoothPlastic;p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.Parent=parent;return p
end
function Models.weapon(id)
 local m=Instance.new('Model');m.Name='View weapon'
 local steel=Color3.fromRGB(62,69,80);local wood=Color3.fromRGB(97,60,39);local black=Color3.fromRGB(19,22,28)
 local long=id~=1;local special=id>=5
 local function b(n,s,x,y,z,c) return block(m,n,s,CFrame.new(x,y,z),c) end
 b('Receiver',Vector3.new(.26,.32,long and 1.1 or .55),0,0,0,special and Color3.fromRGB(96,65,106) or steel)
 b('Barrel',Vector3.new(.12,.12,long and 1.2 or .35),0,.06,long and -1 or -.4,black)
 b('Grip',Vector3.new(.22,.46,.22),0,-.3,.15,wood)
 b('Magazine',Vector3.new(.2,id==4 and .6 or .32,.28),0,-.3,-.15,black)
 b('Rear sight',Vector3.new(.22,.09,.07),0,.2,.18,black)
 b('Front sight',Vector3.new(.045,.1,.06),0,.17,long and -1.5 or -.52,steel)
 if long then b('Stock',Vector3.new(.22,.3,.55),0,-.03,.7,wood);b('Foregrip',Vector3.new(.29,.22,.65),0,-.05,-.7,wood) end
 for i=1,7 do b('Slide detail',Vector3.new(.28,.025,.025),0,.05,.25-i*.05,black) end
 for _,x in ipairs({-.15,.15}) do for _,z in ipairs({-.3,.1}) do b('Rivet',Vector3.new(.025,.05,.05),x,0,z,Color3.fromRGB(142,153,163)) end end
 if special then
  for i=1,4 do local p=b('Energy coil',Vector3.new(.4,.4,.08),0,0,-.55-i*.16,id==5 and Color3.fromRGB(69,255,133) or Color3.fromRGB(84,191,255));p.Material=Enum.Material.Neon end
 end
 for _,x in ipairs({-.28,.28}) do b('Gloved hand',Vector3.new(.2,.22,.32),x,-.3,.05,Color3.fromRGB(48,50,44)) end
 m.PrimaryPart=m:FindFirstChild('Receiver');return m
end
function Models.zombie(position,health,speed)
 local m=Instance.new('Model');m.Name='Zombie'
 local skin=Color3.fromRGB(100,123,80);local cloth=Color3.fromRGB(43,57,66);local blood=Color3.fromRGB(99,35,35)
 local root=block(m,'HumanoidRootPart',Vector3.new(2,2,1),CFrame.new(position),cloth);root.Transparency=1;root.Anchored=false;root.CanCollide=true
 local function limb(name,size,offset,color)
  local p=block(m,name,size,root.CFrame*CFrame.new(offset),color);p.Anchored=false;p.Massless=true
  local w=Instance.new('Motor6D');w.Name=name..'Joint';w.Part0=root;w.Part1=p;w.C0=CFrame.new(offset);w.Parent=root;return p
 end
 limb('Torso',Vector3.new(2,2,1),Vector3.zero,cloth)
 local head=limb('Head',Vector3.new(1.4,1.4,1.25),Vector3.new(0,1.7,0),skin)
 limb('LeftArm',Vector3.new(.65,2,.65),Vector3.new(-1.3,0,-.3),skin)
 limb('RightArm',Vector3.new(.65,2,.65),Vector3.new(1.3,0,-.3),cloth)
 limb('LeftLeg',Vector3.new(.8,2,.8),Vector3.new(-.55,-2,0),cloth)
 limb('RightLeg',Vector3.new(.8,2,.8),Vector3.new(.55,-2,0),cloth)
 local function detail(name,size,offset,color,parent)
  parent=parent or head;local p=block(m,name,size,parent.CFrame*CFrame.new(offset),color);p.Anchored=false;p.Massless=true
  local w=Instance.new('WeldConstraint');w.Part0=parent;w.Part1=p;w.Parent=p;return p
 end
 for _,x in ipairs({-.35,.35}) do local p=detail('Eye',Vector3.new(.22,.17,.08),Vector3.new(x,.12,-.66),Color3.fromRGB(255,163,30));p.Material=Enum.Material.Neon end
 detail('Nose',Vector3.new(.2,.3,.2),Vector3.new(0,-.12,-.7),skin)
 detail('Jaw',Vector3.new(.65,.17,.08),Vector3.new(0,-.42,-.66),blood)
 for i=1,4 do detail('Tooth',Vector3.new(.1,.12,.06),Vector3.new(-.3+i*.12,-.38,-.72),Color3.fromRGB(211,203,164)) end
 detail('Wound',Vector3.new(.4,.3,.08),Vector3.new(.4,.45,-.65),blood)
 local torso=m.Torso
 detail('Belt',Vector3.new(2.05,.17,1.05),Vector3.new(0,-.7,0),Color3.fromRGB(31,25,23),torso)
 for _,x in ipairs({-.5,.5}) do detail('Pocket',Vector3.new(.55,.5,.12),Vector3.new(x,.25,-.55),Color3.fromRGB(61,74,80),torso) end
 local h=Instance.new('Humanoid');h.RequiresNeck=false;h.MaxHealth=health;h.Health=health;h.WalkSpeed=speed;h.HipHeight=2;h.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None;h.Parent=m
 m.PrimaryPart=root;return m
end
return Models

]====],package)
local remote=Instance.new('RemoteEvent');remote.Name='Events';remote.Parent=package
local Map=(function()
local Map = {}
function Map.build(root)
 local function part(name,size,pos,color,material,parent)
  local p=Instance.new('Part'); p.Name=name;p.Anchored=true;p.Size=size;p.Position=pos;p.Color=color;p.Material=material or Enum.Material.Concrete;p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth;p.Parent=parent or root;return p
 end
 local function box(name,x,y,z,w,h,d,color,material)
  return part(name,Vector3.new(w,h,d)*3,Vector3.new(x*3,80+y*3,z*3),color,material)
 end
 local dark=Color3.fromRGB(30,39,54);local metal=Color3.fromRGB(64,77,91);local cream=Color3.fromRGB(236,226,202)
 local cyan=Color3.fromRGB(40,225,255);local pink=Color3.fromRGB(255,46,160)
 local function label(p,text,color,face)
  local gui=Instance.new('SurfaceGui');gui.Face=face or Enum.NormalId.Front;gui.CanvasSize=Vector2.new(800,400);gui.Parent=p
  local t=Instance.new('TextLabel');t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=1;t.Text=text;t.TextColor3=color;t.Font=Enum.Font.GothamBold;t.TextScaled=true;t.Parent=gui
 end
 local function neon(name,x,y,z,w,h,text,color)
  local p=box(name,x,y,z,w,h,.2,dark);label(p,text,color);label(p,text,color,Enum.NormalId.Back)
  box('LED',x,y-h/2,z-.15,w,.07,.08,color,Enum.Material.Neon)
  local l=Instance.new('PointLight');l.Color=color;l.Brightness=1.4;l.Range=35;l.Parent=p
 end
 box('City ground',0,-14.3,0,300,.4,300,Color3.fromRGB(17,23,32))
 box('Main foundation',0,-7.1,0,32,14.2,32,dark)
 box('Terrace foundation',-28,-7.1,0,24,14.2,24,dark)
 box('Main roof',0,-.12,0,32,.24,32,metal)
 box('Terrace roof',-28,-.12,0,24,.24,24,metal)
 local buildings={{-8.875,25,-19,14.25,8},{8.875,32,-19,14.25,8},{-8.875,19,19,14.25,8},{19,28,-6,8,20},{-16,23,-7,2,18},{-16,17,12,2,8},{-43,26,0,8,24},{-28,22,-15,24,8}}
 for i,b in ipairs(buildings) do
  box('District building '..i,b[1],(b[2]-14)/2,b[3],b[4],b[2]+14,b[5],Color3.fromRGB(26+i*2,32+i*2,47+i*2))
  for y=4,b[2]-1,3 do for x=-b[4]/2+1,b[4]/2-1,2 do
   box('Window',b[1]+x,y,b[3]-b[5]/2-.03,1,1.5,.06,(i%2==0 and cyan or cream),Enum.Material.Neon)
   box('Window',b[1]+x,y,b[3]+b[5]/2+.03,1,1.5,.06,(i%2==0 and pink or cream),Enum.Material.Neon)
  end end
 end
 neon('Market',-8,5,-14.85,10,2,'夜市  NIGHT MARKET',cyan)
 neon('Hotel',8,8,-14.85,10,3,'NEON DREAM\nホテル  /  24H',pink)
 local arcade=box('Arcade sign',14.85,6,-5,.2,3,10,dark);label(arcade,'電脳 ARCADE',pink,Enum.NormalId.Left)
 neon('Kitchen',-9,4,14.85,10,2,'深夜食堂  /  RAMEN',Color3.fromRGB(255,169,72))
 -- Kitchen display behind a solid counter; scenery is inaccessible.
 box('Kitchen counter',-9,.7,14,10,1.4,1.3,dark)
 box('Kitchen hood',-9,2.7,14.4,7,.5,1,metal)
 for x=-12,-6,1 do box('Bottle',x,1.7,14.2,.2,.6,.2,Color3.fromRGB(60,155,100),Enum.Material.Glass) end
 neon('Terrace hotel',-28,5,-10.85,15,2,'カプセル HOTEL',pink)
 neon('Alley marker',-17,4,9.1,5,1,'← RE:GEN / 03',cyan)
 local function fence(x,z,length,turn)
  local model=Instance.new('Model');model.Name='Rooftop safety fence';model.Parent=root
  local cf=CFrame.new(x*3,80,z*3)*CFrame.Angles(0,turn or 0,0)
  local function rail(px,py,w,h)
   local p=part('Fence',Vector3.new(w,h,.12)*3,Vector3.zero,metal,Enum.Material.Metal,model);p.CFrame=cf*CFrame.new(px*3,py*3,0)
  end
  for a=-length/2,length/2,.6 do rail(a,2,.06,4) end
  rail(0,.25,length,.18);rail(0,2,length,.08);rail(0,4,length,.15)
  local barrier=part('Invisible safety boundary',Vector3.new(length,12,.25)*3,Vector3.zero,dark,nil,model);barrier.CFrame=cf*CFrame.new(0,18,0);barrier.Transparency=1
 end
 fence(8.875,16,14.25);fence(16,10,12,math.pi/2);fence(-28,12,24)
 -- Seal the two old entry gaps; zombies spawn inside the playable courts.
 fence(0,-16,3.5);fence(0,16,3.5)
 local function car(x,y,z,color,angle)
  local m=Instance.new('Model');m.Name='Abandoned vehicle';m.Parent=root
  local cf=CFrame.new(x*3,80+y*3,z*3)*CFrame.Angles(0,angle or 0,0)
  for _,b in ipairs({{0,.55,0,2.2,.7,4.7},{0,1.15,.2,1.9,.7,2.3}}) do
   local p=part('Body',Vector3.new(b[4],b[5],b[6])*3,Vector3.zero,color,Enum.Material.Metal,m);p.CFrame=cf*CFrame.new(b[1]*3,b[2]*3,b[3]*3)
  end
  for _,xx in ipairs({-1.1,1.1}) do for _,zz in ipairs({-1.4,1.4}) do
   local p=part('Wheel',Vector3.new(.3,.8,.8)*3,Vector3.zero,Color3.fromRGB(12,14,19),Enum.Material.Rubber,m);p.CFrame=cf*CFrame.new(xx*3,.4*3,zz*3)
  end end
  local p=part('Windshield',Vector3.new(1.7,.6,.08)*3,Vector3.zero,cyan,Enum.Material.Glass,m);p.CFrame=cf*CFrame.new(0,3.5,-2.9)
 end
 car(15,0,10,Color3.fromRGB(91,49,92))
 box('Street east west',8,-14.05,29,145,.1,16,Color3.fromRGB(25,29,38))
 box('Street north south',29,-14.04,15,14,.1,130,Color3.fromRGB(25,29,38))
 for x=-58,75,7 do box('Lane dash',x,-13.97,29,3,.03,.13,cream) end
 for z=-45,75,7 do box('Lane dash',29,-13.97,z,.13,.03,3,cream) end
 for i=0,9 do
  box('Crosswalk',23+i*1.2,-13.96,19,.6,.04,3,cream)
  box('Crosswalk',19,-13.96,23+i*1.2,3,.04,.6,cream)
 end
 for _,x in ipairs({-42,-16,10,36,62}) do
  box('Street block',x,3,47,20,34,18,dark)
  neon('Street storefront',x,-9,37.85,12,2,'OPEN / ネオン',cyan)
 end
 for _,z in ipairs({-30,-5,19,65}) do box('Opposite block',48,8,z,20,44,20,dark) end
 for i=1,8 do car(-45+i*14,-14,34,Color3.fromRGB(35+i*14,50,70),math.pi/2) end
 box('Neighbor workshop',-31.5,-7.5,26,30,13.4,28,dark)
 box('Workshop parapet',-31.5,.2,39,30,2,1,metal)
 box('Workshop shed',-32,2,35,13,5,6,dark)
 for i=1,15 do
  local x=-44+(i*7%26);local z=15+(i*11%17)
  box('Rooftop freight',x,.3,z,2,2,2,Color3.fromRGB(89,72,62))
  box('Freight band',x,.35,z,2.05,.12,2.05,metal)
 end
 for _,v in ipairs({{-40,17},{-28,19},{-19,16},{-36,28},{-23,29},{-4,-4},{4,4}}) do
  box('HVAC unit',v[1],1,v[2],3,2,3,metal)
  for i=1,6 do box('Vent grille',v[1],.35+i*.2,v[2]-1.51,2.5,.07,.05,dark) end
 end
 for i=1,18 do
  local a=i*math.pi*2/18;local x=math.cos(a)*100;local z=math.sin(a)*100;local h=30+i*3
  box('Skyline',x,h/2-14,z,12,h,12,dark)
  for y=0,h-15,5 do box('Skyline light',x,y,z-6.05,8,.15,.1,i%2==0 and cyan or pink,Enum.Material.Neon) end
 end
 local function prompt(p,action,text,id)
  local q=Instance.new('ProximityPrompt');q.ActionText=action;q.ObjectText=text;q.KeyboardKeyCode=Enum.KeyCode.E;q.MaxActivationDistance=10;q.RequiresLineOfSight=false;q:SetAttribute('Purchase',id);q.Parent=p
 end
 local function perk(name,x,z,color,cost,id)
  local m=Instance.new('Model');m.Name=name;m.Parent=root
  local cf=CFrame.new(x*3,80,z*3)*CFrame.Angles(0,-math.pi/2,0)
  local function p(n,s,o,c)
   local b=part(n,s*3,Vector3.zero,c,Enum.Material.Metal,m);b.CFrame=cf*CFrame.new(o*3);return b
  end
  local body=p('Enamel cabinet',Vector3.new(1.5,2.8,1),Vector3.new(0,1.4,0),color)
  local top=p('Cream header',Vector3.new(1.52,.85,1.02),Vector3.new(0,2.4,0),cream);label(top,name,color)
  local badge=p('Round badge',Vector3.new(.18,.9,.9),Vector3.new(0,3.3,-.05),cream);badge.Shape=Enum.PartType.Cylinder;badge.CFrame=cf*CFrame.new(0,9.9,0)*CFrame.Angles(0,math.pi/2,0)
  local sign=p('Badge symbol',Vector3.new(.75,.75,.1),Vector3.new(0,3.3,-.5),color);label(sign,id=='jug' and '+' or '↻',cream)
  local slot=p('Coin mechanism',Vector3.new(.72,.8,.16),Vector3.new(-.16,1.6,-.59),metal);label(slot,'10¢\nICE COLD',cream)
  p('Lever',Vector3.new(.4,.12,.18),Vector3.new(-.16,1,-.67),cream)
  p('Bottle chute',Vector3.new(.55,.4,.12),Vector3.new(-.16,.45,-.6),Color3.new(0,0,0))
  for i=1,4 do p('Vent',Vector3.new(.35,.05,.05),Vector3.new(.48,.2+i*.12,-.53),dark) end
  if id=='speed' then for i=1,5 do p('Bottle window',Vector3.new(.18,.22,.08),Vector3.new(.52,.9+i*.25,-.56),cream) end end
  prompt(body,'Buy / '..cost,name,id)
 end
 perk('Juggernog',-14.1,-4,Color3.fromRGB(155,40,45),2500,'jug')
 perk('Speed Cola',-38.1,0,Color3.fromRGB(25,156,85),3000,'speed')
 for i,v in ipairs({{-8,-14.3},{-13.8,-10},{13.8,-4}}) do
  local p=box('Weapon terminal',v[1],1.4,v[2],2.2,2.2,.6,dark);label(p,({'M1 CARBINE\n1000','PUMP SHOTGUN\n1500','THOMPSON\n1800'})[i],cyan);prompt(p,'Buy weapon','Wall buy','weapon'..(i+1))
 end
 local mystery=box('Mystery box',13,1,4,2,2,3,Color3.fromRGB(81,56,102));label(mystery,'? ? ?\n950',pink);prompt(mystery,'Roll / 950','Mystery box','mystery')
 local spawn=Instance.new('SpawnLocation');spawn.Name='Rooftop spawn';spawn.Size=Vector3.new(6,1,6);spawn.Position=Vector3.new(0,81,30);spawn.Anchored=true;spawn.Transparency=1;spawn.CanCollide=false;spawn.Neutral=true;spawn.Duration=3;spawn.Parent=root
 return root
end
return Map

end)()
local map=Instance.new('Folder');map.Name='NeonZombiesMap';map.Parent=workspace
Map.build(map)
scriptObject('Script','NeonZombiesServer',[====[
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

]====],SSS)
scriptObject('LocalScript','NeonZombiesClient',[====[
local Players=game:GetService('Players');local UIS=game:GetService('UserInputService');local RunService=game:GetService('RunService');local RS=game:GetService('ReplicatedStorage');local Debris=game:GetService('Debris')
local player=Players.LocalPlayer;local package=RS:WaitForChild('NeonZombies');local remote=package:WaitForChild('Events');local Config=require(package.Config);local Models=require(package.Models)
player.CameraMode=Enum.CameraMode.LockFirstPerson
local gui=Instance.new('ScreenGui');gui.Name='NeonZombiesHUD';gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.Parent=player:WaitForChild('PlayerGui')
local function text(name,pos,size,value,color)
 local t=Instance.new('TextLabel');t.Name=name;t.Position=pos;t.Size=size;t.BackgroundColor3=Color3.fromRGB(12,17,28);t.BackgroundTransparency=.25;t.BorderSizePixel=0;t.TextColor3=color or Color3.fromRGB(221,237,243);t.Font=Enum.Font.GothamBold;t.TextSize=20;t.TextWrapped=true;t.Text=value;t.Parent=gui;return t
end
local status=text('Round',UDim2.new(0,18,0,12),UDim2.new(0,260,0,65),'NEON DEAD / CONNECTING',Color3.fromRGB(74,230,255))
local health=text('Health',UDim2.new(0,18,1,-110),UDim2.new(0,260,0,85),'')
local ammo=text('Ammo',UDim2.new(1,-298,1,-110),UDim2.new(0,280,0,85),'')
local notice=text('Notice',UDim2.new(.5,-250,0,85),UDim2.new(0,500,0,40),'WASD move • Mouse aim • E buy • R reload • Q swap');notice.TextSize=15
local cross=text('Crosshair',UDim2.new(.5,-12,.5,-12),UDim2.fromOffset(24,24),'+');cross.BackgroundTransparency=1
local help=text('Controls',UDim2.new(.5,-230,1,-32),UDim2.fromOffset(460,24),'LMB fire  •  RMB aim  •  R reload  •  Q / 1 / 2 swap  •  E buy');help.BackgroundTransparency=1;help.TextSize=13
local state=nil;local view=nil;local held=false;local ads=false;local nextShot=0;local kick=0;local noticeUntil=os.clock()+12;local hitUntil=0
local function weapon(id)
 if view then view:Destroy() end;view=Models.weapon(id)
 for _,p in ipairs(view:GetDescendants()) do if p:IsA('BasePart') then p.CanQuery=false;p.CastShadow=false end end
 view.Parent=workspace.CurrentCamera
end
remote.OnClientEvent:Connect(function(action,a,b,id)
 if action=='state' then
  if not state or state.weapon~=a.weapon then weapon(a.weapon) end;state=a
  status.Text='ROUND '..a.round..'  /  '..a.remaining..' DEAD\n'..(a.countdown>0 and ('Next wave in '..a.countdown) or 'ROOFTOP DISTRICT')
  health.Text=a.points..' POINTS   /   '..a.kills..' KILLS\nHP '..a.health..' / '..a.maxHealth..'\n'..(a.jug and '✚ JUGGERNOG  ' or '')..(a.speed and '↻ SPEED COLA' or '')
  ammo.Text=Config.Weapons[a.weapon].name..'\n'..(a.reloading and 'RELOADING…' or (a.ammo..' / '..a.reserve))
  if a.message then notice.Text=a.message;noticeUntil=os.clock()+4 end
 elseif action=='hit' then hitUntil=os.clock()+.12;cross.Text=a and '×' or '✕'
 elseif action=='shot' then
  local length=(b-a).Magnitude;local p=Instance.new('Part');p.Name='Tracer';p.Anchored=true;p.CanCollide=false;p.CanQuery=false;p.CanTouch=false;p.Material=Enum.Material.Neon;p.Color=id==5 and Color3.fromRGB(70,255,130) or Color3.fromRGB(255,205,98);p.Size=Vector3.new(.045,.045,length);p.CFrame=CFrame.lookAt((a+b)/2,b);p.Parent=workspace;Debris:AddItem(p,.055)
 end
end)
local function shoot()
 if not state or state.reloading or state.health<=0 or os.clock()<nextShot then return end
 local w=Config.Weapons[state.weapon];if state.ammo<=0 then remote:FireServer('reload');nextShot=os.clock()+.3;return end
 nextShot=os.clock()+w.delay;kick=.13;remote:FireServer('shoot',workspace.CurrentCamera.CFrame.LookVector)
end
UIS.InputBegan:Connect(function(input,processed)
 if processed then return end
 if input.UserInputType==Enum.UserInputType.MouseButton1 then held=true;shoot()
 elseif input.UserInputType==Enum.UserInputType.MouseButton2 then ads=true
 elseif input.KeyCode==Enum.KeyCode.R then remote:FireServer('reload')
 elseif input.KeyCode==Enum.KeyCode.Q or input.KeyCode==Enum.KeyCode.One or input.KeyCode==Enum.KeyCode.Two then remote:FireServer('switch') end
end)
UIS.InputEnded:Connect(function(input)
 if input.UserInputType==Enum.UserInputType.MouseButton1 then held=false elseif input.UserInputType==Enum.UserInputType.MouseButton2 then ads=false end
end)
UIS.WindowFocusReleased:Connect(function() held=false;ads=false end)
local function button(title,x,action)
 local b=Instance.new('TextButton');b.Text=title;b.Size=UDim2.fromOffset(80,55);b.Position=UDim2.new(1,x,1,-190);b.BackgroundColor3=Color3.fromRGB(28,48,64);b.TextColor3=Color3.new(1,1,1);b.TextSize=16;b.Parent=gui;b.Activated:Connect(action)
end
if UIS.TouchEnabled then button('FIRE',-90,shoot);button('RELOAD',-180,function() remote:FireServer('reload') end);button('SWAP',-270,function() remote:FireServer('switch') end) end
RunService:BindToRenderStep('NeonZombiesView',Enum.RenderPriority.Camera.Value+1,function(dt)
 if held and state and Config.Weapons[state.weapon].automatic then shoot() end
 local camera=workspace.CurrentCamera;camera.FieldOfView+=( (ads and 55 or 78)-camera.FieldOfView)*math.min(1,dt*12)
 if view then
  if view.Parent~=camera then view.Parent=camera end
  local bob=math.sin(os.clock()*7)*.012;local reload=state and state.reloading
  view:PivotTo(camera.CFrame*CFrame.new(ads and .13 or .55,-.5+bob-(reload and .28 or 0),-1.1+kick)*CFrame.Angles(reload and -.6 or kick,0,reload and -.3 or 0))
 end
 kick=math.max(0,kick-dt*.9);notice.Visible=os.clock()<noticeUntil
 if os.clock()>hitUntil then cross.Text='+' end
end)
remote:FireServer('sync')

]====],starter.StarterPlayerScripts)
starter.CameraMode=Enum.CameraMode.LockFirstPerson
starter.CharacterUseJumpPower=true;starter.CharacterJumpPower=35
lighting.ClockTime=0;lighting.Brightness=2;lighting.Ambient=Color3.fromRGB(55,62,91);lighting.OutdoorAmbient=Color3.fromRGB(65,74,109)
lighting.FogColor=Color3.fromRGB(18,24,44);lighting.FogStart=180;lighting.FogEnd=950
remove(lighting,'NeonZombiesBloom');local bloom=Instance.new('BloomEffect');bloom.Name='NeonZombiesBloom';bloom.Intensity=.35;bloom.Size=24;bloom.Threshold=1.4;bloom.Parent=lighting
workspace.CurrentCamera.CFrame=CFrame.lookAt(Vector3.new(35,115,60),Vector3.new(-20,82,0))
print('NEON ZOMBIES installed. Save your place, then press Play. E buys, R reloads, Q swaps.')
