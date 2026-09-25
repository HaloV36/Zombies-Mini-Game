import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { pursuitTarget, SIDE_ROOM_WALLS } from '../src/game/sideRoom';

const walls = SIDE_ROOM_WALLS.map(([w,h,d,x,y,z]) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x,y,z),new THREE.Vector3(w,h,d)));
const blocked=(p:THREE.Vector3)=> walls.some(w=>w.intersectsBox(new THREE.Box3(new THREE.Vector3(p.x-0.55,0,p.z-0.55),new THREE.Vector3(p.x+0.55,4,p.z+0.55))));
for(const [name,start,end] of [
 ['enter from north',[0,0,-12],[-34,0,-6]],
 ['enter from south',[3,0,13],[-32,0,8]],
 ['return to north',[-30,0,-8],[2,0,-10]],
 ['return to south',[-35,0,8],[4,0,12]],
 ['pursue beside warehouse wall',[-14,0,12],[-13.8,0,8]],
 ['pursue beside annex wall',[-18,0,-9],[-18,0,-3]],
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
test('doorway clears player and zombie collision height',()=>{
 assert.equal(blocked(new THREE.Vector3(-16,1.8,5)),false);
 assert.equal(blocked(new THREE.Vector3(-16,1.8,0)),true);
 assert.equal(blocked(new THREE.Vector3(-16,1.8,10)),true);
});
