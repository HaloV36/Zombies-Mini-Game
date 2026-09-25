import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createConcreteTexture, createSteelTexture } from './environmentTextures';

type Size = [number, number, number];
export type DistrictSolid = { size: Size; position: Size; name: string };

// Physical borders follow the architecture, leaving the two repairable entry gates
// and the open six-metre alley. Nothing spans the sky above the playable courts.
export const DISTRICT_SOLIDS: DistrictSolid[] = [
  {size:[14.25,25,8],position:[-8.875,12.5,-19],name:'north-shop'},
  {size:[14.25,32,8],position:[8.875,16,-19],name:'north-hotel'},
  {size:[14.25,19,8],position:[-8.875,9.5,19],name:'noodle-bar'},
  {size:[8,28,20],position:[19,14,-6],name:'east-arcade'},
  {size:[2,23,18],position:[-16,11.5,-7],name:'alley-north-building'},
  {size:[2,17,8],position:[-16,8.5,12],name:'alley-south-building'},
  {size:[8,26,24],position:[-43,13,0],name:'terrace-clinic'},
  {size:[24,22,8],position:[-28,11,-15],name:'terrace-hotel'},
  {size:[14.25,4.6,0.3],position:[8.875,2.3,16],name:'south-fence'},
  {size:[0.3,4.6,12],position:[16,2.3,10],name:'east-fence'},
  {size:[24,4.6,0.3],position:[-28,2.3,12],name:'terrace-fence'},
  {size:[2.15,1.8,5.4],position:[15.2,0.9,10.6],name:'abandoned-car'},
];

export const districtCollisionBoxes = () => DISTRICT_SOLIDS.map(({size,position}) =>
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...position),new THREE.Vector3(...size)));

export function rooftopUtilityTexture() {
  return canvasTexture(256,256,ctx=>{
    ctx.fillStyle='#455263';ctx.fillRect(0,0,256,256);
    ctx.fillStyle='#1c2937';ctx.fillRect(14,32,228,166);
    for(let i=0;i<15;i++){
      ctx.fillStyle='#8d9ea9';ctx.fillRect(24,42+i*10,208,3);
      ctx.fillStyle='#334250';ctx.fillRect(24,45+i*10,208,3);
    }
    ctx.fillStyle='#09131d';ctx.fillRect(15,216,132,25);
    ctx.fillStyle='#7ee6e1';ctx.font='bold 13px monospace';ctx.fillText('VENT / UNIT 03',20,233);
    ctx.fillStyle='#d5a751';ctx.fillRect(191,216,40,23);
    ctx.fillStyle='#1a2430';ctx.font='bold 17px monospace';ctx.fillText('!',207,233);
    ctx.fillStyle='#b8c2cc';for(const x of [7,249])for(const y of [7,249])ctx.fillRect(x-2,y-2,4,4);
  });
}

function canvasTexture(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void) {
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d')!);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

function signTexture(title:string,subtitle:string,color:string,vertical=false) {
  const width=vertical?384:1024,height=vertical?1024:384;
  return canvasTexture(width,height,ctx=>{
    ctx.fillStyle='#060d19';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(18,18,width-36,height-36);
    ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=22;ctx.textAlign='center';
    if(vertical){
      ctx.font='bold 190px "Yu Gothic", "Meiryo", sans-serif';
      [...title].slice(0,4).forEach((char,i)=>ctx.fillText(char,192,245+i*210,300));
      ctx.font='bold 60px monospace';ctx.fillText(subtitle,192,935,310);
    }else{
      ctx.font='bold 114px "Yu Gothic", "Meiryo", sans-serif';ctx.fillText(title,512,188,910);
      ctx.shadowBlur=5;ctx.font='bold 31px monospace';ctx.fillText(subtitle,512,292,910);
    }
    ctx.shadowBlur=0;ctx.fillStyle='#050b1838';
    for(let y=0;y<height;y+=5)ctx.fillRect(0,y,width,1);
  });
}

export function buildCyberpunkDistrict(scene: THREE.Scene) {
  const root=new THREE.Group();root.name='cyberpunk-district';scene.add(root);
  const solids:THREE.Mesh[]=[];
  const steelTex=createSteelTexture();
  const steel=new THREE.MeshStandardMaterial({color:'#536374',map:steelTex,roughness:0.55,metalness:0.45});
  const trim=new THREE.MeshStandardMaterial({color:'#18242f',roughness:0.6,metalness:0.5});
  const cladding=canvasTexture(256,512,ctx=>{
    ctx.fillStyle='#c1c5cc';ctx.fillRect(0,0,256,512);
    for(let x=0;x<256;x+=64){ctx.fillStyle='#656d79';ctx.fillRect(x,0,2,512);ctx.fillStyle='#e0e3e8';ctx.fillRect(x+2,0,1,512);}
    for(let y=0;y<512;y+=64){ctx.fillStyle='#757e8a';ctx.fillRect(0,y,256,2);}
    for(let i=0;i<160;i++){const x=(i*83)%256,y=(i*131)%512;ctx.fillStyle='#31394a15';ctx.fillRect(x,y,2,15+(i%8)*9);}
  });
  const plaster=new THREE.MeshStandardMaterial({color:'#4d5765',map:cladding,roughness:0.8,metalness:0.15});
  const dark=new THREE.MeshStandardMaterial({color:'#090f1a',roughness:0.65});
  const glass=new THREE.MeshStandardMaterial({color:'#12354b',emissive:'#0b3444',emissiveIntensity:0.45,roughness:0.18,metalness:0.55});
  const neon=(color:string)=>new THREE.MeshBasicMaterial({color});
  const cyan=neon('#50eafa'),pink=neon('#ff499c'),amber=neon('#ffb969');
  const box=(parent:THREE.Object3D,size:Size,pos:Size,mat:THREE.Material,solid=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.position.set(...pos);
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    if(solid){mesh.userData.solidEnvironment=true;solids.push(mesh);}return mesh;
  };
  const light=(position:Size,color:string,intensity:number,range:number)=>{
    const l=new THREE.PointLight(color,intensity,range,1.25);l.position.set(...position);root.add(l);return l;
  };

  // Open night sky, distant stars and a hazy violet horizon.
  scene.background=new THREE.Color('#070b19');scene.fog=new THREE.FogExp2('#111529',0.016);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(350,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 direction; void main(){float h=normalize(direction).y;vec3 c=mix(vec3(.075,.04,.13),vec3(.012,.024,.061),smoothstep(-.05,.65,h));gl_FragColor=vec4(c,1.0);}',
  }));sky.name='open-night-sky';root.add(sky);
  const starPositions=[];
  let seed=929;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  for(let i=0;i<180;i++){const angle=random()*Math.PI*2;const y=60+random()*200;starPositions.push(Math.cos(angle)*220,y,Math.sin(angle)*220);}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#b9cbed',size:0.36,fog:false,transparent:true,opacity:0.55}));root.add(stars);
  root.add(new THREE.HemisphereLight('#9dbbe8','#29203b',1.15));
  const moon=new THREE.DirectionalLight('#98b4e5',0.85);moon.position.set(-12,45,18);root.add(moon);

  // Two roof decks, with a wet road surface and a clear alley between them.
  const asphalt=createConcreteTexture();asphalt.repeat.set(8,8);
  const ground=new THREE.MeshStandardMaterial({color:'#6d768b',map:asphalt,roughness:0.38,metalness:0.32});
  for(const [w,d,x,z] of [[32,32,0,0],[24,24,-28,0]]){
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,d),ground);floor.rotation.x=-Math.PI/2;floor.position.set(x,0,z);floor.receiveShadow=true;floor.userData.solidEnvironment=true;solids.push(floor);root.add(floor);
    box(root,[w,1.1,d],[x,-0.6,z],trim,true);
  }
  const roadpaint=new THREE.MeshStandardMaterial({color:'#b0a385',roughness:0.8});
  for(let z=-12;z<14;z+=4)box(root,[0.13,0.008,1.75],[1.8,0.006,z],roadpaint);
  for(let x=-35;x<12;x+=3)box(root,[1.45,0.008,0.09],[x,0.008,5],roadpaint);
  for(const x of [-2.3,9]){
    box(root,[0.65,0.025,3.4],[x,0.012,-11],trim);
    for(let i=0;i<11;i++)box(root,[0.56,0.028,0.045],[x,0.017,-12.5+i*0.3],steel);
  }

  const glowTexture=canvasTexture(128,128,ctx=>{
    const gradient=ctx.createRadialGradient(64,64,4,64,64,63);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(0.4,'#ffffff70');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  });
  function groundGlow(x:number,z:number,color:string,w:number,d:number){
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,map:glowTexture,transparent:true,opacity:0.19,depthWrite:false,blending:THREE.AdditiveBlending}));
    glow.rotation.x=-Math.PI/2;glow.position.set(x,0.014,z);root.add(glow);
  }
  function billboard(parent:THREE.Object3D,title:string,sub:string,color:string,w:number,h:number,pos:Size){
    box(parent,[w+0.25,h+0.22,0.18],[pos[0],pos[1],pos[2]-0.11],trim);
    const tex=signTexture(title,sub,color,h>w*1.4);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));face.position.set(...pos);parent.add(face);
    return face;
  }
  function windows(parent:THREE.Object3D,w:number,h:number,z:number){
    const columns=Math.max(2,Math.floor(w/2.25));const rows=Math.max(2,Math.floor((h-8)/2.8));
    const mat=new THREE.MeshBasicMaterial({color:'#ffffff'});
    const panes=new THREE.InstancedMesh(new THREE.BoxGeometry(0.85,1.3,0.025),mat,columns*rows);
    const frames=new THREE.InstancedMesh(new THREE.BoxGeometry(1.09,1.57,0.035),trim,columns*rows);
    const transform=new THREE.Object3D();let i=0;
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      transform.position.set(-w/2+(col+0.5)*w/columns,8+row*2.8,z);transform.updateMatrix();frames.setMatrixAt(i,transform.matrix);
      transform.position.z+=0.026;transform.updateMatrix();panes.setMatrixAt(i,transform.matrix);
      panes.setColorAt(i,new THREE.Color(random()>0.6 ? (row%3===0?'#9a638f':'#739cab'):'#162433'));i++;
    }
    parent.add(frames,panes);
  }
  function building(w:number,h:number,depth:number,x:number,z:number,yaw:number,title:string,subtitle:string,color:string){
    const facade=new THREE.Group();facade.position.set(x,0,z);facade.rotation.y=yaw;root.add(facade);
    box(facade,[w,h,depth],[0,h/2,-depth/2],plaster,true);
    box(facade,[w,0.2,0.55],[0,4.9,0.1],steel,true);
    box(facade,[w-0.1,4.5,0.2],[0,2.3,0.06],trim,true);
    // Closed storefront glazing, metal shutters and utility cabinets.
    for(let x=-w/2+1;x<w/2-0.5;x+=2.1){
      box(facade,[1.72,2.6,0.04],[x,2.65,0.2],glass);
      box(facade,[1.84,0.08,0.12],[x,1.3,0.25],steel);
      for(let y=1.65;y<4;y+=0.33)box(facade,[1.75,0.018,0.06],[x,y,0.24],steel);
    }
    for(let y=7;y<h;y+=5.6)box(facade,[w,0.12,0.25],[0,y,0.07],trim);
    for(const sx of [-1,1])box(facade,[0.18,h,0.24],[sx*(w/2-0.1),h/2,0.1],steel);
    windows(facade,w,h,0.025);
    // Small balconies and exposed risers keep the buildings from reading as boxes.
    for(const y of [10.3,15.9]){
      box(facade,[w*0.36,0.16,0.7],[-w*0.2,y,0.25],steel);
      box(facade,[w*0.36,0.05,0.055],[-w*0.2,y+0.85,0.58],steel);
      for(let i=0;i<6;i++)box(facade,[0.045,0.85,0.045],[-w*0.38+i*w*0.072,y+0.42,0.58],steel);
    }
    box(facade,[0.11,h-1,0.15],[w*0.41,(h-1)/2,0.17],steel);
    billboard(facade,title,subtitle,color,Math.min(w-0.6,10),2.1,[0,6.15,0.4]);
    box(facade,[w-0.3,0.055,0.09],[0,4.72,0.43],neon(color));
    // Rooftop mechanical silhouettes break up the building outlines.
    box(facade,[w*0.45,1.6,depth*0.65],[-w*0.15,h+0.8,-depth/2],steel);
    box(facade,[0.08,4.5,0.08],[w*0.29,h+2,-depth/2],trim);
    for(let i=0;i<3;i++){
      const acx=-w/2+1.2+i*1.8;
      box(facade,[1.3,0.8,0.42],[acx,7.3,0.3],steel);
      for(let j=0;j<5;j++)box(facade,[1.08,0.035,0.03],[acx,7.04+j*0.11,0.525],dark);
    }
    return facade;
  }
  building(14.25,25,8,-8.875,-15,0,'夜市 / NIGHT MARKET','LEVEL 03    •    AFTER HOURS','#59eaff');
  const hotel=building(14.25,32,8,8.875,-15,0,'NEON DREAM','ホテル    /    VACANCY 24H','#ff54b4');
  billboard(hotel,'ホテル','24H','#ac85ff',2.7,5,[5.1,12.3,0.55]);
  building(20,28,8,15,-6,-Math.PI/2,'電脳 ARCADE','INSERT COIN    •    2077','#9f9bff');
  const west=building(18,23,2,-15,-7,Math.PI/2,'深夜食堂','MIDNIGHT KITCHEN    •    CLOSED','#ffbc73');
  building(8,17,2,-15,12,Math.PI/2,'SERVICE 03','←    ROOFTOP PASSAGE','#58e6e2');
  building(24,26,8,-39,0,Math.PI/2,'RE:GEN','回復    •    REFRESH / RELOAD','#59ffb4');
  building(24,22,8,-28,-11,0,'カプセル HOTEL','CAPSULE ROOMS    /    NO VACANCY','#ec66dc');
  const bar=building(14.25,19,8,-8.875,15,Math.PI,'ラーメン / RAMEN','LAST CALL    •    03:00','#ff8a69');

  // Sealed bar display: a counter, kitchen hood, bottles and hanging menu boards.
  // All parts sit in the blocked building footprint, behind the glass frontage.
  box(bar,[7.5,2.65,0.14],[0,2.8,0.22],dark);
  box(bar,[8,0.27,0.75],[0,1.35,0.35],steel,true);
  box(bar,[5.2,0.8,0.4],[0,3.86,0.35],steel);
  box(bar,[5.1,0.065,0.1],[0,3.4,0.59],amber);
  for(let i=0;i<12;i++){
    box(bar,[0.13,0.42+(i%3)*0.07,0.13],[-3+i*0.52,1.7,0.46],i%2?cyan:pink);
    box(bar,[0.06,0.13,0.07],[-3+i*0.52,1.98+(i%3)*0.07,0.46],steel);
  }
  billboard(bar,'拉麺','HOT / SPICY','#ffd29a',1.4,1.4,[-4.9,3,0.5]);
  billboard(bar,'餃子','FRESH DAILY','#ffc89a',1.4,1.4,[4.9,3,0.5]);
  // The backs of the alley buildings read as serviced façades, not a plain divider.
  for(const [z,w,h] of [[-7,18,23],[12,8,17]]){
    const back=new THREE.Group();back.position.set(-17,0,z);back.rotation.y=-Math.PI/2;root.add(back);windows(back,w,h,0.04);
    box(back,[w-0.5,0.1,0.22],[0,5.5,0.12],steel);
  }
  billboard(west,'路地 →','RE:GEN TERRACE','#5cecff',4,1.3,[-6.1,4.15,0.46]);
  light([-8,5,-12],'#32dfff',32,31);light([9,6,-11],'#ff3b9f',32,30);
  light([11,5,-3],'#9f70ff',20,24);light([-9,4,12],'#ff8562',25,26);
  light([-21,4,4],'#35dbec',28,23);light([-35,5,0],'#51f3b1',28,25);
  groundGlow(-8,-9,'#2fe8ff',12,17);groundGlow(8,-9,'#ff348d',12,17);
  groundGlow(-9,10,'#ff8c56',11,9);groundGlow(-19,5,'#37ebee',12,5);groundGlow(-34,0,'#33df9b',10,14);

  function fence(length:number,x:number,z:number,yaw:number){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=yaw;root.add(group);
    box(group,[length,0.4,0.4],[0,0.2,0],steel,true);
    for(let sx=-length/2;sx<=length/2;sx+=2.4){
      box(group,[0.11,4.6,0.13],[sx,2.3,0],steel,true);
      box(group,[0.08,0.1,0.1],[sx,4.58,0],cyan);
    }
    for(const y of [0.7,2.3,4.25])box(group,[length,0.07,0.09],[0,y,0],steel,true);
    const meshTexture=canvasTexture(64,64,ctx=>{
      ctx.clearRect(0,0,64,64);ctx.strokeStyle='#9da9b5';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,32);ctx.lineTo(32,0);ctx.lineTo(64,32);ctx.lineTo(32,64);ctx.closePath();ctx.stroke();
    });meshTexture.wrapS=meshTexture.wrapT=THREE.RepeatWrapping;meshTexture.repeat.set(length*2.2,8);
    const wire=new THREE.Mesh(new THREE.PlaneGeometry(length,3.8),new THREE.MeshStandardMaterial({map:meshTexture,transparent:true,alphaTest:0.2,side:THREE.DoubleSide,roughness:0.6,metalness:0.35}));wire.position.y=2.35;wire.userData.solidEnvironment=true;solids.push(wire);group.add(wire);
    billboard(group,'立入禁止','ROOF EDGE   /   LEVEL 03','#ffad65',2.6,0.9,[0,2.8,0.1]);
  }
  fence(14.25,8.875,16,Math.PI);fence(12,16,10,-Math.PI/2);fence(24,-28,12,Math.PI);

  // An abandoned compact car forms part of the east edge, away from the alley.
  const car=new THREE.Group();car.position.set(15.2,0,10.6);root.add(car);
  const carPaint=new THREE.MeshStandardMaterial({color:'#355b68',metalness:0.5,roughness:0.36});
  box(car,[1.95,0.68,5.25],[0,0.7,0],carPaint,true);
  box(car,[1.68,0.67,2.6],[0,1.36,0.14],carPaint,true);
  box(car,[1.49,0.48,0.06],[0,1.36,-1.18],glass);box(car,[1.49,0.48,0.06],[0,1.36,1.47],glass);
  for(const side of [-1,1]){
    box(car,[0.035,0.46,2.32],[side*0.851,1.37,0.13],glass);
    box(car,[0.05,0.5,0.095],[side*0.875,1.37,0.14],steel);
    for(const z of [-1.7,1.7]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.2,12),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*0.97,0.46,z);car.add(wheel);
    }
    box(car,[0.57,0.14,0.06],[side*0.6,0.87,-2.65],cyan);
    box(car,[0.57,0.14,0.06],[side*0.6,0.87,2.65],pink);
  }
  // Cables cross at isolated points; the canopy is the night sky.
  for(let i=0;i<3;i++){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-16,13+i*0.22,-8),new THREE.Vector3(0,10+i*0.22,-5),new THREE.Vector3(16,15+i*0.22,-8)]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,0.028,4,false),trim));
  }
  // Distant buildings extend below the deck to establish its third-floor elevation.
  for(let i=0;i<26;i++){
    const angle=i/26*Math.PI*2;const radius=65+random()*30;const h=25+random()*65;const w=7+random()*9;
    const tower=new THREE.Group();tower.position.set(-12+Math.cos(angle)*radius,-14,Math.sin(angle)*radius);tower.lookAt(-12,-14,0);root.add(tower);
    box(tower,[w,h,9],[0,h/2,-4.5],new THREE.MeshStandardMaterial({color:i%2?'#162331':'#211d32',roughness:0.8}));
    windows(tower,w,h,0.01);
    box(tower,[0.14,h,0.06],[-w/2+0.2,h/2,0.04],i%3===0?pink:cyan);
  }
  root.updateMatrixWorld(true);
  // Batch static architecture by material and collision role. Neon signs remain
  // individually readable without hundreds of separate façade draw calls.
  const batches=new Map<string,{material:THREE.Material;solid:boolean;meshes:THREE.Mesh[]}>();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material) || object.material instanceof THREE.ShaderMaterial)return;
    const solid=!!object.userData.solidEnvironment;const key=object.material.uuid+String(solid);
    if(!batches.has(key))batches.set(key,{material:object.material,solid,meshes:[]});
    batches.get(key)!.meshes.push(object);
  });
  solids.length=0;
  batches.forEach(({material,solid,meshes})=>{
    if(meshes.length===1){if(solid)solids.push(meshes[0]);return;}
    const pieces=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry=mergeGeometries(pieces);
    if(!geometry){pieces.forEach(piece=>piece.dispose());return;}
    const merged=new THREE.Mesh(geometry,material);merged.userData.solidEnvironment=solid;merged.castShadow=merged.receiveShadow=true;
    root.add(merged);if(solid)solids.push(merged);
    meshes.forEach(mesh=>{mesh.removeFromParent();mesh.geometry.dispose();});pieces.forEach(piece=>piece.dispose());
  });
  return {root,solids,colliders:districtCollisionBoxes()};
}
