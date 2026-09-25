import * as THREE from 'three';
import { buildWeaponModel } from '../src/game/weaponModels';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDetailedPerk, createDetailedZombie } from '../src/game/modelDetails';

const scene = new THREE.Scene(); scene.background = new THREE.Color('#131b1e');
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.3,0);camera.position.set(9,7,19);controls.update();
scene.add(new THREE.HemisphereLight('#f3f0df','#5c7170',2));
const key = new THREE.DirectionalLight('#ffedcd',3);key.position.set(-3,8,9);key.castShadow=true;scene.add(key);
const rim = new THREE.DirectionalLight('#9dcbd0',2);rim.position.set(5,5,-6);scene.add(rim);
const jug=createDetailedPerk('juggernog');jug.position.x=-3.5;scene.add(jug);
const speed=createDetailedPerk('speed_cola');speed.position.x=3.5;scene.add(speed);
const zombie=createDetailedZombie(0);zombie.scale.setScalar(1.65);zombie.position.z=0.3;scene.add(zombie);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:'#25322f',roughness:0.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const weapons:THREE.Group[]=[];
for(const id of ['pistol','carbine','shotgun','thompson','raygun','thundergun']) {
 const model=new THREE.Group();buildWeaponModel(id,model);const bounds=new THREE.Box3().setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);
 const display=new THREE.Group();display.add(model);display.scale.setScalar(6);display.position.y=2.5;display.visible=false;scene.add(display);weapons.push(display);
 document.getElementById(id)!.onclick=()=>{jug.visible=speed.visible=zombie.visible=false;weapons.forEach(w=>w.visible=w===display);camera.position.set(4.5,4.8,5);controls.target.set(0,2.5,0);controls.update();};
}
const views:Record<string,number[]>={all:[9,7,19,0,2.3,0],jug:[-0.6,4.5,8,-3.5,2.55,0],speed:[6.5,4.5,8,3.5,2.55,0],zombie:[2.7,2.9,5,0,1.65,0]};
Object.entries(views).forEach(([id,v])=>document.getElementById(id)!.onclick=()=>{jug.visible=speed.visible=zombie.visible=true;weapons.forEach(w=>w.visible=false);camera.position.set(v[0],v[1],v[2]);controls.target.set(v[3],v[4],v[5]);controls.update();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
