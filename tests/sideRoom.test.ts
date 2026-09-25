import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { districtCollisionBoxes } from '../src/game/cyberpunkDistrict';
import { pursuitTarget } from '../src/game/sideRoom';

const walls = districtCollisionBoxes();
const blocked=(p:THREE.Vector3)=> walls.some(w=>w.intersectsBox(new THREE.Box3(new THREE.Vector3(p.x-0.55,0,p.z-0.55),new THREE.Vector3(p.x+0.55,4,p.z+0.55))));
for(const [name,start,end] of [
 ['enter from north',[0,0,-12],[-34,0,-6]],
 ['enter from south',[3,0,13],[-32,0,8]],
 ['return to north',[-30,0,-8],[2,0,-10]],
 ['return to south',[-35,0,8],[4,0,12]],
 ['pursue beside market façade',[-14,0,12],[-13.8,0,8]],
 ['pursue beside terrace façade',[-18,0,-9],[-18,0,-3]],
 ['pursue inside annex',[-30,0,-5],[-22,0,8]],
] as const) {
 test(name,()=>{
  const pos=new THREE.Vector3(...start);const goal=new THREE.Vector3(...end);
  for(let i=0;i<4000 && pos.distanceTo(goal)>0.1;i++){
   const waypoint=pursuitTarget(pos,goal);
   const step=waypoint.clone().sub(pos);step.clampLength(0,0.045);pos.add(step);
   assert.equal(blocked(pos),false,`route entered divider at ${pos.toArray()}`);
  }
  assert.ok(pos.distanceTo(goal)<0.1,`route did not reach player: ${pos.toArray()}`);
 });
}
test('alley clears player and zombie collision height',()=>{
 assert.equal(blocked(new THREE.Vector3(-16,1.8,5)),false);
 assert.equal(blocked(new THREE.Vector3(-16,1.8,0)),true);
 assert.equal(blocked(new THREE.Vector3(-16,1.8,10)),true);
});


test('market and terrace edges block escape into the skyline', () => {
 for (const [x,z] of [[16,10],[8,16],[-28,12],[-40,0],[-28,-12]]) {
  assert.equal(blocked(new THREE.Vector3(x,1.8,z)),true,`unsealed roof edge at ${x},${z}`);
 }
});
test('shop interiors and the abandoned car are solid', () => {
 for (const [x,z] of [[-8,-17],[8,-17],[17,-6],[-8,17],[-41,0],[15.2,10.6]]) {
  assert.equal(blocked(new THREE.Vector3(x,1.8,z)),true);
 }
});
test('both zombie service gate openings remain available', () => {
 assert.equal(blocked(new THREE.Vector3(0,1.8,-15.8)),false);
 assert.equal(blocked(new THREE.Vector3(0,1.8,15.8)),false);
});
test('the connecting alley stays open across its usable width', () => {
 for (const z of [3,5,7]) for(let x=-19;x<=-13;x+=0.25) {
  assert.equal(blocked(new THREE.Vector3(x,1.8,z)),false,`alley obstructed at ${x},${z}`);
 }
});
test('no roof or lintel blocks the sky above either court or the alley', () => {
 for (const [x,z] of [[0,0],[-28,0],[-16,5]]) {
  const ray = new THREE.Ray(new THREE.Vector3(x,0.1,z),new THREE.Vector3(0,1,0));
  assert.equal(walls.some(w => ray.intersectsBox(w)),false);
 }
});
