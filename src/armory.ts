import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PACK_WEAPONS } from './game/weaponCatalog';
import { preloadPackModels, buildPackWeapon } from './game/packModels';
import { disposeResources } from './game/disposeResources';

const status=document.getElementById('status')!;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,300);renderer.setPixelRatio(1);renderer.setClearColor('#141d2a');renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8291a6',4.5));
const key=new THREE.DirectionalLight('#fff0db',3);key.position.set(2,4,4);scene.add(key);
const rim=new THREE.DirectionalLight('#8ceaff',1.5);rim.position.set(-3,2,-2);scene.add(rim);
const camera=new THREE.OrthographicCamera(-1,1,.475,-.475,.01,20);
const sheet=document.createElement('canvas');sheet.width=2400;sheet.height=2300;
const ctx=sheet.getContext('2d')!;ctx.fillStyle='#0b1018';ctx.fillRect(0,0,sheet.width,sheet.height);
ctx.fillStyle='#5ddac8';ctx.font='20px sans-serif';ctx.fillText('NEON DEAD  /  QUATERNIUS COLLECTION',50,48);
ctx.fillStyle='#eef3f8';ctx.font='bold 54px sans-serif';ctx.fillText('40 weapons. One rooftop.',50,115);
ctx.fillStyle='#9aacbe';ctx.font='22px sans-serif';ctx.fillText('Feedback guide • Numbers and names match the game • All available from the mystery box',50,158);
const grid=document.getElementById('grid')!;
let selected:THREE.Group|null=null;
const inspect=document.getElementById('inspect') as HTMLDialogElement;
const inspectionRenderer=new THREE.WebGLRenderer({antialias:true});
inspectionRenderer.setPixelRatio(Math.min(devicePixelRatio,2));inspectionRenderer.setClearColor('#141d2a');
document.getElementById('inspectCanvas')!.appendChild(inspectionRenderer.domElement);
const inspectionScene=new THREE.Scene();inspectionScene.add(new THREE.HemisphereLight(0xffffff,0x718ba1,3));const il=new THREE.DirectionalLight(0xffffff,3);il.position.set(2,4,3);inspectionScene.add(il);
const inspectionCamera=new THREE.PerspectiveCamera(40,2,.01,20);const controls=new OrbitControls(inspectionCamera,inspectionRenderer.domElement);controls.enableDamping=true;
function show(id:string) {
 if(selected){disposeResources(selected);inspectionScene.remove(selected);}
 selected=new THREE.Group();buildPackWeapon(id,selected);const bounds=new THREE.Box3().setFromObject(selected);selected.position.sub(bounds.getCenter(new THREE.Vector3()));inspectionScene.add(selected);
 const w=PACK_WEAPONS.find(w=>w.id===id)!;document.getElementById('inspectTitle')!.textContent=`${String(w.catalogNumber).padStart(2,'0')} / ${w.name}`;
 document.getElementById('inspectStats')!.textContent=`${w.category.toUpperCase()} • ${w.clipSize} rounds • ${w.damage} damage${w.category==='shotgun'?' across 8 pellets':''} • ${w.reloadTime/1000}s reload${w.scopeZoom?` • ${w.scopeZoom}× scope (hold RMB in game)`:''} • Source: ${w.modelFile}`;
 inspect.showModal();const host=document.getElementById('inspectCanvas')!;inspectionRenderer.setSize(host.clientWidth,host.clientHeight);inspectionCamera.aspect=host.clientWidth/host.clientHeight;inspectionCamera.updateProjectionMatrix();inspectionCamera.position.set(1,.35,.7);controls.target.set(0,0,0);controls.update();
}
document.getElementById('close')!.onclick=()=>inspect.close();
inspectionRenderer.setAnimationLoop(()=>{if(inspect.open){controls.update();inspectionRenderer.render(inspectionScene,inspectionCamera);}});
async function build() {
 await preloadPackModels(n=>status.textContent=`Loading gun ${n} / 40…`);
 PACK_WEAPONS.forEach((w,i)=>{
  const model=new THREE.Group();buildPackWeapon(w.id,model);
  const bounds=new THREE.Box3().setFromObject(model);model.position.sub(bounds.getCenter(new THREE.Vector3()));scene.add(model);
  // Nearly side-on preserves the source silhouettes; slight elevation reveals rails.
  camera.position.set(3,.85,1.05);camera.lookAt(0,0,0);
  camera.updateMatrixWorld();const framed=new THREE.Box3().setFromObject(model);let halfX=0,halfY=0;
  for(const x of [framed.min.x,framed.max.x]) for(const y of [framed.min.y,framed.max.y]) for(const z of [framed.min.z,framed.max.z]) {
    const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);halfX=Math.max(halfX,Math.abs(p.x));halfY=Math.max(halfY,Math.abs(p.y));
  }
  const halfWidth=Math.max(halfX,halfY*800/300)*1.16;camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth*300/800;camera.bottom=-camera.top;camera.updateProjectionMatrix();renderer.render(scene,camera);
  const image=renderer.domElement.toDataURL('image/png');
  const x=40+(i%5)*472,y=195+Math.floor(i/5)*255;
  ctx.fillStyle='#141d2a';ctx.fillRect(x,y,456,235);ctx.drawImage(renderer.domElement,x+5,y+4,446,166);
  ctx.fillStyle='#eef3f8';ctx.font='bold 22px sans-serif';ctx.fillText(`${String(i+1).padStart(2,'0')}  ${w.name}`,x+16,y+194);
  ctx.fillStyle=w.scopeZoom?'#66e3c7':'#9aacbe';ctx.font='16px sans-serif';ctx.fillText(`${w.category.toUpperCase()}${w.scopeZoom?` / ${w.scopeZoom}× SCOPE`:''}   ·   ${w.clipSize} ROUNDS`,x+16,y+220);
  const card=document.createElement('article');card.dataset.category=w.category;
  const filter=(document.getElementById('filter') as HTMLSelectElement).value;card.hidden=filter!=='all'&&filter!==w.category;
  const img=document.createElement('img');img.src=image;img.alt=`${w.catalogNumber}. ${w.name}`;
  const caption=document.createElement('div');const title=document.createElement('h2');title.textContent=`${String(i+1).padStart(2,'0')} / ${w.name}`;const subtitle=document.createElement('p');subtitle.textContent=`${w.category.toUpperCase()} • ${w.clipSize} rounds${w.scopeZoom?` • ${w.scopeZoom}× scope`:''}`;
  const button=document.createElement('button');button.textContent=`Inspect ${w.name}`;button.style.marginTop='12px';button.onclick=()=>show(w.id);caption.append(title,subtitle,button);card.append(img,caption);grid.append(card);
  const testLink=document.createElement('a');testLink.textContent='Test in game';testLink.href=`/?testWeapon=${encodeURIComponent(w.id)}`;testLink.style.cssText='display:inline-block;margin:8px 0 0 8px;font-size:12px';caption.append(testLink);
  scene.remove(model);disposeResources(model);
 });
 ctx.fillStyle='#9aacbe';ctx.font='18px sans-serif';ctx.fillText('Original models by Quaternius · CC0 · Six scoped snipers · No standalone accessories in the loot pool',50,2270);
 const png=sheet.toDataURL('image/png');(document.getElementById('sheet') as HTMLImageElement).src=png;(document.getElementById('download') as HTMLAnchorElement).href=png;
 status.textContent='40 / 40 models ready. Download the full-resolution 2400 × 2300 guide.';
 renderer.dispose();
}
document.getElementById('filter')!.onchange=e=>{const category=(e.target as HTMLSelectElement).value;grid.querySelectorAll<HTMLElement>('article').forEach(c=>c.hidden=category!=='all'&&c.dataset.category!==category);};
document.getElementById('showSheet')!.onclick=()=>{grid.classList.toggle('hide');document.getElementById('sheet')!.classList.toggle('hide');};
build().catch(e=>{status.textContent=`Unable to load armory: ${e.message}. Refresh to retry.`;});
