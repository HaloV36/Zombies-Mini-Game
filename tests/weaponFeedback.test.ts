import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {PACK_WEAPONS} from '../src/game/weaponCatalog';
import {feedbackProfile,synthesizeShot,synthesizeReload,RELOAD_EVENTS} from '../src/game/weaponFeedback';
import {parsePackModel} from '../src/game/packModels';

test('40 finite, bounded, distinct shot waveforms and nonzero recoil impulses',()=>{
 const hashes=new Set<string>();
 for(const w of PACK_WEAPONS){const pcm=synthesizeShot(w,22050);let energy=0;for(const s of pcm){assert.ok(Number.isFinite(s)&&Math.abs(s)<=.69);energy+=s*s;}
  assert.ok(energy>1);hashes.add(createHash('sha256').update(Buffer.from(pcm.buffer)).digest('hex'));
  const p=feedbackProfile(w);assert.ok(p.pitch>0&&p.push>0&&p.rise>0);
 }assert.equal(hashes.size,40);
});
test('six reload mechanism patterns fit normal and Speed Cola durations',()=>{
 assert.equal(new Set(Object.values(RELOAD_EVENTS).map(v=>JSON.stringify(v))).size,6);
 for(const w of PACK_WEAPONS){for(const speed of [1,.5]){const seconds=w.reloadTime/1000*speed,pcm=synthesizeReload(w,seconds,22050);
  assert.equal(pcm.length,Math.ceil(seconds*22050));assert.ok(pcm.some(s=>s!==0));assert.ok(pcm.every(s=>Number.isFinite(s)&&Math.abs(s)<1));
 }}
});
test('every barrel marker is at the geometry front and follows weapon transforms',()=>{
 for(const w of PACK_WEAPONS){const path=`public/models/quaternius/${w.modelFile}`;const model=parsePackModel(fs.readFileSync(path+'.obj','utf8'),fs.readFileSync(path+'.mtl','utf8'),w.modelLength!);
  const muzzle=model.getObjectByName('muzzle')!;assert.ok(muzzle,w.name);assert.ok(Math.abs(muzzle.position.z-(.12-w.modelLength!-.003))<1e-6);
  const local=muzzle.position.clone();model.position.set(4,2,3);model.rotation.set(.2,.9,-.1);model.updateMatrixWorld(true);
  assert.ok(muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(local.applyMatrix4(model.matrixWorld))<1e-6);
 }
});
