import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source=name=>readFileSync(path.join(dir,name),'utf8');
const literal=s=>{if(s.includes(']====]'))throw new Error('Long-string delimiter collision');return '[====[\n'+s+'\n]====]';};
const modules=['Config','Models'];
const output=`-- NEON ZOMBIES / Roblox Studio Command Bar installer
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
${modules.map(name=>`scriptObject('ModuleScript','${name}',${literal(source(name+'.luau'))},package)`).join('\n')}
local remote=Instance.new('RemoteEvent');remote.Name='Events';remote.Parent=package
local Map=(function()
${source('Map.luau')}
end)()
local map=Instance.new('Folder');map.Name='NeonZombiesMap';map.Parent=workspace
Map.build(map)
scriptObject('Script','NeonZombiesServer',${literal(source('Server.server.luau'))},SSS)
scriptObject('LocalScript','NeonZombiesClient',${literal(source('Client.client.luau'))},starter.StarterPlayerScripts)
starter.CameraMode=Enum.CameraMode.LockFirstPerson
starter.CharacterUseJumpPower=true;starter.CharacterJumpPower=35
lighting.ClockTime=0;lighting.Brightness=2;lighting.Ambient=Color3.fromRGB(55,62,91);lighting.OutdoorAmbient=Color3.fromRGB(65,74,109)
lighting.FogColor=Color3.fromRGB(18,24,44);lighting.FogStart=180;lighting.FogEnd=950
remove(lighting,'NeonZombiesBloom');local bloom=Instance.new('BloomEffect');bloom.Name='NeonZombiesBloom';bloom.Intensity=.35;bloom.Size=24;bloom.Threshold=1.4;bloom.Parent=lighting
workspace.CurrentCamera.CFrame=CFrame.lookAt(Vector3.new(35,115,60),Vector3.new(-20,82,0))
print('NEON ZOMBIES installed. Save your place, then press Play. E buys, R reloads, Q swaps.')
`;
writeFileSync(path.join(dir,'Install-NeonZombies.lua'),output);
console.log(`Built Install-NeonZombies.lua (${output.length} characters)`);
