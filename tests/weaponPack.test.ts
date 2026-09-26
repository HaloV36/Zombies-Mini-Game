import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { PACK_WEAPONS, aimProfile } from '../src/game/weaponCatalog';
import { parsePackModel, preloadPackModels, buildPackWeapon } from '../src/game/packModels';
import { disposeResources } from '../src/game/disposeResources';

test('catalog covers exactly the 40 source guns, excluding all accessories',()=>{
 const names=fs.readdirSync('public/models/quaternius').filter(n=>n.endsWith('.obj')).map(n=>n.slice(0,-4)).sort();
 assert.equal(PACK_WEAPONS.length,40);assert.equal(new Set(PACK_WEAPONS.map(w=>w.name)).size,40);assert.equal(new Set(PACK_WEAPONS.map(w=>w.id)).size,40);
 assert.deepEqual(PACK_WEAPONS.map(w=>w.modelFile).sort(),names);
 assert.deepEqual(PACK_WEAPONS.map(w=>w.catalogNumber),Array.from({length:40},(_,i)=>i+1));
});

test('all original geometry parses, has materials, and normalizes to a forward barrel',()=>{
 for(const w of PACK_WEAPONS) {
  const base=`public/models/quaternius/${w.modelFile}`;
  const m=parsePackModel(fs.readFileSync(`${base}.obj`,'utf8'),fs.readFileSync(`${base}.mtl`,'utf8'),w.modelLength!);
  const b=new THREE.Box3().setFromObject(m);assert.ok(!b.isEmpty(),w.name);
  assert.ok(Math.abs(b.max.z-b.min.z-w.modelLength!)<.0001,w.name);
  assert.ok(Math.abs(b.max.z-.12)<.0001,w.name);
  assert.ok(Math.abs(b.max.x+b.min.x)<.0001,w.name);
  m.traverse(o=>{if(o instanceof THREE.Mesh){assert.ok(o.geometry.attributes.position.count>0);for(const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v));}});
  disposeResources(m);
 }
});

test('every included optical scope receives real angular magnification and restores on reload/release',()=>{
 const snipers=PACK_WEAPONS.filter(w=>w.scopeZoom);assert.equal(snipers.length,6);
 for(const w of snipers) {
  const p=aimProfile(w,true,false);assert.equal(p.scoped,true);
  const magnification=Math.tan(75*Math.PI/360)/Math.tan(p.fov*Math.PI/360);
  assert.ok(Math.abs(magnification-w.scopeZoom!)<.00001);
  assert.equal(aimProfile(w,false,false).fov,75);assert.equal(aimProfile(w,true,true).scoped,false);
  assert.equal(aimProfile(w,true,true).fov,75);
 }
 assert.equal(aimProfile(PACK_WEAPONS[0],true,false).scoped,false);
});

test('disposing a switched weapon cannot destroy the cache or another instance',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=(async(url)=>new Response(fs.readFileSync(`public${url}`,'utf8'))) as typeof fetch;
 try {
  await preloadPackModels();const a=new THREE.Group(),b=new THREE.Group();
  buildPackWeapon(PACK_WEAPONS[0].id,a);buildPackWeapon(PACK_WEAPONS[0].id,b);
  const meshesA:THREE.Mesh[]=[],meshesB:THREE.Mesh[]=[];
  a.traverse(o=>{if(o instanceof THREE.Mesh) meshesA.push(o);});b.traverse(o=>{if(o instanceof THREE.Mesh) meshesB.push(o);});
  assert.notEqual(meshesA[0].geometry,meshesB[0].geometry);assert.notEqual(meshesA[0].material,meshesB[0].material);
  let disposed=false;meshesB[0].geometry.addEventListener('dispose',()=>disposed=true);disposeResources(a);assert.equal(disposed,false);
  const c=new THREE.Group();assert.equal(buildPackWeapon(PACK_WEAPONS[0].id,c),true);assert.ok(c.children.length);disposeResources(b);disposeResources(c);
 } finally {globalThis.fetch=originalFetch;}
});
