import type { Weapon } from '../types';

// Stable IDs and feedback numbers map one-to-one to the 40 complete source guns.
// Accessories deliberately never enter this catalog or the mystery-box pool.
const families = [
  {prefix:'Pistol', names:['Metro Nine','Slate Viper','Railkeeper','Griplock','Night Marshal','Longslide'], category:'pistol', clip:12, damage:32, interval:260, reload:1300, length:.42},
  {prefix:'Revolver', names:['Copperhead','Longhorn','Silver Deputy','Iron Judge','Ash Ranger'], category:'revolver', clip:6, damage:80, interval:480, reload:2100, length:.44},
  {prefix:'Shotgun', names:['Breach Pump','Rustwood','Trailbreaker','Single Sentinel','Sawed Thunder','Shortstock'], files:['Shotgun_1','Shotgun_2','Shotgun_3','Shotgun_4','Shotgun_SawedOff','Shotgun_ShortStock'], category:'shotgun', clip:6, damage:160, interval:850, reload:2300, length:.9},
  {prefix:'AssaultRifle', names:['Kestrel Compact','Copper Fang','Timber Wolf','Wire Jackal','Black Bear'], category:'rifle', clip:30, damage:42, interval:150, reload:1900, length:.9},
  {prefix:'AssaultRifle2', names:['Specter M4','Longwatch','Stubby Raider','Micro Commando'], category:'rifle', clip:30, damage:39, interval:130, reload:1800, length:.86},
  {prefix:'Bullpup', names:['Tunnel Warden','Neon Lynx','District Guardian'], category:'rifle', clip:30, damage:46, interval:160, reload:2000, length:.78},
  {prefix:'SubmachineGun', names:['Alley Wasp','Night Runner','Wireframe','Railstorm','Urban Echo'], category:'smg', clip:32, damage:29, interval:95, reload:1600, length:.65},
  {prefix:'SniperRifle', names:['Moss Watcher','Pale Reaper','Olive Oracle','Black Horizon','Bipod Nomad','Cedar Ghost'], category:'sniper', clip:5, damage:210, interval:1050, reload:2600, length:1.1},
] as const;

export const PACK_WEAPONS: Weapon[] = families.flatMap(f => f.names.map((name, i) => {
  const file = 'files' in f ? f.files[i] : `${f.prefix}_${i+1}`;
  const clip = f.category==='shotgun' && i>=3 ? 2 : f.clip;
  return {id:`q_${file.toLowerCase()}`, name, modelFile:file, category:f.category,
    modelLength:f.length, scopeZoom:f.category==='sniper' ? [4,6,4,6,8,8][i] : undefined,
    ammo:clip*8, maxAmmo:clip*8, clip, clipSize:clip, damage:f.damage+i*3,
    fireRate:f.interval+i*7, reloadTime:f.reload+i*35,
    isAutomatic:f.category==='rifle'||f.category==='smg', isUnlocked:false, cost:950};
})).map((w,i)=>({...w, catalogNumber:i+1}));

export const PACK_BY_ID: Record<string,Weapon> = Object.fromEntries(PACK_WEAPONS.map(w=>[w.id,w]));

export function aimProfile(weapon: Weapon | undefined, aiming: boolean, reloading: boolean) {
  const zoom=aiming && !reloading ? weapon?.scopeZoom ?? 1 : 1;
  return {scoped:zoom>1, zoom, fov:zoom>1 ? 2*Math.atan(Math.tan(75*Math.PI/360)/zoom)*180/Math.PI : aiming && !reloading ? 55 : 75,
    sensitivity:zoom>1 ? 1/zoom : aiming ? .75 : 1};
}
