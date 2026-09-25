import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCyberpunkDistrict } from '../src/game/cyberpunkDistrict';
import { createDetailedPerk, createDetailedZombie } from '../src/game/modelDetails';

const scene = new THREE.Scene();
const district = buildCyberpunkDistrict(scene);
for (const [id,x,z] of [['juggernog',-14.1,-4],['speed_cola',-38.1,0]] as const) {
  const machine=createDetailedPerk(id);machine.position.set(x,0,z);machine.rotation.y=Math.PI/2;scene.add(machine);
}
const zombie=createDetailedZombie(0);zombie.position.set(0,0.1,-7);scene.add(zombie);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(2,devicePixelRatio));document.body.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
const views:Record<string,number[]>={street:[8,1.8,14.6,27,-11,30],eaststreet:[14.5,1.8,5.7,29,-11,5.7],junkroof:[-29,1.8,10.9,-29,-0.5,23],corner:[14,1.8,14,25,-12,25],market:[0,2.2,10,0,5,-15],alley:[-10,2.3,5,-29,3,5],terrace:[-22,2.4,7,-37,4,0],edge:[6,2.4,5,13,4,18],bar:[0,2.4,6,-9,3,15],sky:[0,2.4,4,0,38,-5]};
const view=(v:number[])=>{camera.position.set(v[0],v[1],v[2]);controls.target.set(v[3],v[4],v[5]);controls.update();};
Object.entries(views).forEach(([id,v])=>document.getElementById(id)!.onclick=()=>view(v));view(views.market);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(()=>{renderer.render(scene,camera);document.getElementById('stats')!.textContent=`${renderer.info.render.calls} draw calls / ${Math.round(renderer.info.render.triangles/1000)}k triangles`;});
