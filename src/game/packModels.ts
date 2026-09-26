import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { PACK_WEAPONS, PACK_BY_ID } from './weaponCatalog';

const cache=new Map<string,THREE.Group>();
let pending:Promise<void>|undefined;
export function parsePackModel(obj:string, mtl:string, length:number) {
  const colors=new Map<string,THREE.Color>();let current='';
  for(const line of mtl.split(/\r?\n/)) {
    if(line.startsWith('newmtl ')) current=line.slice(7).trim();
    if(line.startsWith('Kd ')) {const [r,g,b]=line.slice(3).trim().split(/\s+/).map(Number);colors.set(current,new THREE.Color().setRGB(r,g,b));}
  }
  const group=new OBJLoader().parse(obj);
  group.traverse(o=>{if(o instanceof THREE.Mesh) {
    const convert=(m:THREE.Material)=>new THREE.MeshStandardMaterial({name:m.name,color:colors.get(m.name)??new THREE.Color('#888888'),roughness:.68,metalness:.18,flatShading:true});
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    // Blender exports barrels along +X; FPS weapons point down -Z.
    o.geometry.rotateY(Math.PI/2);
  }});
  const bounds=new THREE.Box3().setFromObject(group);const scale=length/(bounds.max.z-bounds.min.z);
  const center=bounds.getCenter(new THREE.Vector3());
  group.traverse(o=>{if(o instanceof THREE.Mesh) {
    o.geometry.translate(-center.x,-center.y,-bounds.max.z);
    o.geometry.scale(scale,scale,scale);o.geometry.translate(0,0,.12);
  }});
  return group;
}

export function preloadPackModels(onProgress?:(loaded:number)=>void):Promise<void> {
  if(cache.size===PACK_WEAPONS.length) return Promise.resolve();
  if(pending) return pending;
  let count=cache.size;
  pending=Promise.all(PACK_WEAPONS.map(async w=>{
    if(cache.has(w.id)) return;
    const base=`/models/quaternius/${w.modelFile}`;
    const texts=await Promise.all(['obj','mtl'].map(async ext=>{
      const r=await fetch(`${base}.${ext}`);if(!r.ok) throw new Error(`Cannot load ${w.name} (${r.status})`);return r.text();
    }));
    cache.set(w.id,parsePackModel(texts[0],texts[1],w.modelLength!));onProgress?.(++count);
  })).then(()=>{}).finally(()=>{pending=undefined;});
  return pending;
}

export function buildPackWeapon(id:string,container:THREE.Group) {
  if(!PACK_BY_ID[id]) return false;
  const template=cache.get(id);if(!template) throw new Error(`Weapon assets not loaded: ${id}`);
  container.userData.aimHeight=new THREE.Box3().setFromObject(template).max.y;
  const model=template.clone(true);
  // Each displayed instance owns its resources: switching cannot dispose cached models.
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
  container.add(model);return true;
}
