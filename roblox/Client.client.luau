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
