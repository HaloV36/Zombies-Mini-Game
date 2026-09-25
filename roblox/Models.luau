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
