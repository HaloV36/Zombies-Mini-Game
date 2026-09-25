import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CITY_SUPPORTS } from '../src/game/cityOutskirts';
import { districtCollisionBoxes } from '../src/game/cyberpunkDistrict';

const supports=CITY_SUPPORTS.map(({size,position})=>new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...position),new THREE.Vector3(...size)));
const hitBelow=(x:number,z:number)=>{
 const ray=new THREE.Ray(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0));
 return supports.map(b=>ray.intersectBox(b,new THREE.Vector3())).filter((v):v is THREE.Vector3=>v!==null).sort((a,b)=>b.y-a.y)[0];
};
test('downward views outside both market fences always meet physical city ground',()=>{
 for(let x=17;x<=95;x+=6)for(let z=5;z<=100;z+=6){
  assert.ok(hitBelow(x,z),`uncovered sightline ${x},${z}`);
 }
 for(let x=2;x<=16;x+=2)for(let z=17;z<=85;z+=4)assert.ok(hitBelow(x,z));
});
test('a nearby roof fills the view past the full accessible terrace fence',()=>{
 for(let x=-38;x<=-18;x+=2)for(let z=12.5;z<=36;z+=2){
  assert.ok(hitBelow(x,z).y>-1,`missing neighboring roof ${x},${z}`);
 }
});
test('roof supports physically connect the playable slabs to the city ground',()=>{
 for(const support of supports.slice(1)){
  assert.ok(support.min.y<=supports[0].max.y+1e-6);
  assert.ok(support.max.y>=-0.9);
 }
});
test('decorative streets stay outside the unchanged playable fence borders',()=>{
 const colliders=districtCollisionBoxes();
 for(const [x,z] of [[16,6],[10,16],[-28,12]]){
  const position=new THREE.Vector3(x,1.8,z);
  assert.ok(colliders.some(b=>b.containsPoint(position)));
 }
});
