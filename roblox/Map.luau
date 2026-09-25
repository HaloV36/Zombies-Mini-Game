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
