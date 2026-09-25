import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Small, nearest-filtered paint flecks keep the models deliberately pixel styled.
function paintTexture(seed: number, kind: 'paint' | 'cloth' | 'metal' = 'paint') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = '#dedbd0'; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 440; i++) {
    const tone = Math.floor(150 + random() * 100);
    ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
    ctx.fillRect(Math.floor(random() * 64), Math.floor(random() * 64), kind === 'metal' ? 4 : 1 + Math.floor(random() * 3), 1);
  }
  if (kind === 'cloth') {
    ctx.fillStyle = '#aaa99c';
    for (let y = 0; y < 64; y += 4) ctx.fillRect(0, y, 64, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function box(parent: THREE.Object3D, material: THREE.Material, size: number[], pos: number[]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material);
  mesh.position.set(...pos as [number, number, number]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function labelTexture(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function placard(text: string, subtext: string, width = 2, height = 0.8, color = '#234c3a') {
  const texture = labelTexture(ctx => {
    ctx.fillStyle = '#ede6d0'; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.strokeRect(12, 12, 488, 232);
    ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.font = 'bold 52px Georgia'; ctx.fillText(text, 256, 114, 458);
    ctx.font = 'bold 24px monospace'; ctx.fillText(subtext, 256, 185, 456);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.6, emissive: '#fff3d2', emissiveMap: texture, emissiveIntensity: 0.24,
  }));
}

export function createDetailedPerk(id: 'juggernog' | 'speed_cola') {
  const speed = id === 'speed_cola';
  const group = new THREE.Group(); group.name = id;
  const color = speed ? '#138a53' : '#a72e29';
  const coat = new THREE.MeshStandardMaterial({color, map: paintTexture(42), roughness: 0.47, metalness: 0.22});
  const cream = new THREE.MeshStandardMaterial({color: '#fff2ce', map: paintTexture(19), roughness: 0.5});
  const chrome = new THREE.MeshStandardMaterial({color: '#bdc2ba', roughness: 0.28, metalness: 0.72});
  const dark = new THREE.MeshStandardMaterial({color: '#151e19', roughness: 0.85});
  const accent = new THREE.MeshStandardMaterial({color: speed ? '#065236' : '#70241f', roughness: 0.6});
  const width = speed ? 2.3 : 1.95;
  box(group, dark, [width + 0.1, 0.18, 1.56], [0, 0.09, 0]);
  box(group, coat, [width, 2.9, 1.5], [0, 1.6, 0]);
  box(group, cream, [width, 1.15, 1.5], [0, 3.625, 0]);
  box(group, cream, [width - 0.12, 0.14, 1.4], [0, 4.26, 0]);
  box(group, chrome, [width + 0.035, 0.055, 1.535], [0, 3.03, 0]);
  box(group, chrome, [width + 0.04, 0.08, 1.54], [0, 0.24, 0]);
  for (const x of [-1, 1]) {
    box(group, accent, [0.045, 2.68, 0.025], [x * (width / 2 - 0.075), 1.63, 0.766]);
    for (const y of [0.4, 2.85]) box(group, chrome, [0.035, 0.035, 0.02], [x * (width / 2 - 0.13), y, 0.785]);
  }
  const nameTexture = labelTexture(ctx => {
    ctx.fillStyle = '#eee5cb'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = speed ? '#82412d' : '#802923'; ctx.textAlign = 'center';
    ctx.font = '22px Georgia'; ctx.fillText('Drink', 256, 34);
    ctx.font = `bold italic ${speed ? 67 : 70}px Georgia`;
    if (speed) ctx.fillText('Speed Cola', 256, 135, 470);
    else { ctx.fillText('Juggernog', 256, 132, 470); }
    ctx.font = 'bold 21px monospace'; ctx.fillText(speed ? 'ICE COLD  •  FAST RELOAD' : '10¢  •  ICE COLD', 256, 205);
  });
  const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.15, 0.99), new THREE.MeshStandardMaterial({map: nameTexture, emissiveMap: nameTexture, emissive: '#fff4d5', emissiveIntensity: 0.32, roughness: 0.65}));
  namePlate.position.set(0, 3.65, 0.756); group.add(namePlate);

  // Raised coin tower, mechanical lever, dark recessed bottle chute.
  const towerX = speed ? -0.24 : 0;
  box(group, accent, [1.04, 2.37, 0.24], [towerX, 1.82, 0.85]);
  box(group, coat, [0.96, 2.28, 0.26], [towerX, 1.82, 0.89]);
  box(group, chrome, [0.84, 0.68, 0.08], [towerX, 2.52, 1.055]);
  box(group, dark, [0.69, 0.41, 0.022], [towerX, 2.47, 1.101]);
  const price = placard('10¢', 'INSERT COIN', 0.5, 0.29, '#343932');
  price.position.set(towerX - 0.08, 2.48, 1.118); group.add(price);
  box(group, chrome, [0.025, 0.23, 0.035], [towerX + 0.3, 2.48, 1.12]);
  for (let i = 0; i < 6; i++) box(group, dark, [0.7, 0.012, 0.02], [towerX, 2.73 + i * 0.025, 1.102]);
  box(group, dark, [0.34, 0.14, 0.04], [towerX, 1.88, 1.05]);
  box(group, chrome, [0.13, 0.35, 0.1], [towerX, 1.9, 1.12]);
  box(group, chrome, [0.14, 0.18, 0.02], [towerX + 0.26, 1.46, 1.033]);
  box(group, dark, [0.025, 0.06, 0.024], [towerX + 0.26, 1.46, 1.051]);
  box(group, chrome, [0.6, 0.58, 0.035], [towerX, 0.99, 1.035]);
  box(group, dark, [0.46, 0.42, 0.04], [towerX, 1.01, 1.061]);
  box(group, chrome, [0.49, 0.05, 0.19], [towerX, 0.77, 1.11]);
  for (const x of [-width * 0.29, width * 0.29]) {
    for (let i = 0; i < 4; i++) box(group, dark, [0.39, 0.028, 0.025], [x, 0.35 + i * 0.075, 0.763]);
  }
  if (speed) {
    box(group, chrome, [0.34, 2.03, 0.07], [0.82, 2.0, 0.805]);
    box(group, dark, [0.26, 1.93, 0.08], [0.82, 2.0, 0.85]);
    for (let i = 0; i < 5; i++) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.19, 10), coat);
      bottle.rotation.x = Math.PI / 2; bottle.position.set(0.82, 1.23 + i * 0.38, 0.91); group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.052, 12), cream);
      cap.position.set(0.82, 1.23 + i * 0.38, 1.015); group.add(cap);
    }
  }
  box(group, chrome, [0.14, 0.4, 0.14], [0, 4.39, 0]);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 24), chrome);
  badge.rotation.x = Math.PI / 2; badge.position.set(0, 4.9, 0); group.add(badge);
  const badgeTex = labelTexture(ctx => {
    ctx.fillStyle = '#f5ecd3'; ctx.fillRect(0, 0, 512, 256);
    ctx.save(); ctx.scale(2, 1);
    ctx.strokeStyle = '#8e7154'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(128, 128, 114, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(53, 50); ctx.lineTo(203, 50); ctx.lineTo(190, 171); ctx.lineTo(128, 215); ctx.lineTo(66, 171); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2d5';
    if (!speed) {ctx.fillRect(110, 75, 36, 106); ctx.fillRect(78, 110, 100, 36);}
    else {
      ctx.save(); ctx.translate(126, 131); ctx.rotate(-0.45);
      ctx.fillRect(-27, -8, 54, 63);
      for (let i = 0; i < 4; i++) ctx.fillRect(-28 + i * 16, -62 + Math.abs(i - 1) * 7, 11, 62);
      ctx.rotate(-0.65); ctx.fillRect(-48, -2, 16, 47); ctx.restore();
      ctx.strokeStyle = '#fff2d5'; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {ctx.beginPath(); ctx.moveTo(164, 128 + i * 18); ctx.lineTo(198, 114 + i * 18); ctx.stroke();}
    }
    ctx.restore();
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.465, 24), new THREE.MeshStandardMaterial({map: badgeTex, emissiveMap: badgeTex, emissive: '#fff6dd', emissiveIntensity: 0.5}));
  face.position.set(0, 4.9, 0.076); group.add(face);
  const light = new THREE.PointLight(speed ? '#80ffc0' : '#ffaca0', 4, 8, 1.2);
  light.position.set(0, 3.3, 1.9); group.add(light);
  group.userData.bodyBounds = new THREE.Box3(new THREE.Vector3(-width / 2 - 0.06, 0, -0.8), new THREE.Vector3(width / 2 + 0.06, 5.45, 1.21));
  return group;
}

// Merge static details within each animated limb to keep horde draw calls bounded.
function batchPart(part: THREE.Group) {
  const batches = new Map<boolean, THREE.BufferGeometry[]>();
  let surfaceMap: THREE.Texture | null = null;
  for (const child of [...part.children]) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
    const mat = child.material as THREE.MeshStandardMaterial;
    surfaceMap ??= mat.map ?? null;
    const luminous = child.material instanceof THREE.MeshBasicMaterial;
    child.updateMatrix();
    const geometry = child.geometry.clone().applyMatrix4(child.matrix);
    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) mat.color.toArray(colors, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const list = batches.get(luminous) ?? []; list.push(geometry); batches.set(luminous, list);
    child.geometry.dispose(); part.remove(child);
  }
  batches.forEach((geometries, luminous) => {
    const material = luminous
      ? new THREE.MeshBasicMaterial({vertexColors:true})
      : new THREE.MeshStandardMaterial({vertexColors:true, map:surfaceMap, roughness:0.87});
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.name = part.name === 'head_block' ? 'head_block' : 'voxel_detail';
    mesh.castShadow = mesh.receiveShadow = true; part.add(mesh);
    geometries.forEach(geometry => geometry.dispose());
  });
}

export function createDetailedZombie(variant = 0) {
  const root = new THREE.Group();
  const fabric = paintTexture(70 + variant, 'cloth');
  const skin = new THREE.MeshStandardMaterial({color: '#9aa17c', map: paintTexture(86), roughness: 0.95});
  const coat = new THREE.MeshStandardMaterial({color: ['#52634b', '#6c6050', '#435969'][variant % 3], map: fabric, roughness: 0.94});
  const trousers = new THREE.MeshStandardMaterial({color: '#343d39', map: fabric, roughness: 0.96});
  const leather = new THREE.MeshStandardMaterial({color: '#242924', roughness: 0.8});
  const bone = new THREE.MeshStandardMaterial({color: '#d4c29d', roughness: 0.9});
  const wound = new THREE.MeshStandardMaterial({color: '#653c31', roughness: 0.95});
  const metal = new THREE.MeshStandardMaterial({color: '#8b8970', metalness: 0.4, roughness: 0.65});
  const eyes = new THREE.MeshBasicMaterial({color: '#ffae30'});
  const part = (name: string, x: number, y: number, z: number) => {const g = new THREE.Group(); g.name = name; g.position.set(x,y,z); root.add(g); return g;};
  const torso = part('torso', 0, 1.05, 0);
  box(torso, coat, [0.65,0.91,0.36], [0,0,0]);
  box(torso, trousers, [0.54,0.23,0.34], [0,-0.41,0]);
  for (const x of [-0.18,0.18]) {
    box(torso, coat, [0.22,0.18,0.055], [x,0.19,0.2]);
    box(torso, leather, [0.23,0.028,0.025], [x,0.26,0.238]);
    box(torso, metal, [0.025,0.025,0.018], [x,0.23,0.261]);
    const lapel = box(torso, coat, [0.12,0.3,0.045], [x * 0.6,0.31,0.21]); lapel.rotation.z = x < 0 ? 0.3 : -0.3;
  }
  box(torso, leather, [0.67,0.095,0.39], [0,-0.28,0]);
  box(torso, metal, [0.12,0.095,0.035], [0,-0.28,0.21]);
  for (let i=0;i<4;i++) box(torso, metal, [0.026,0.026,0.025], [0,0.23-i*0.11,0.204]);
  box(torso,wound,[0.13,0.25,0.035],[0.24,-0.055,0.2]);
  for(let i=0;i<3;i++) box(torso,bone,[0.13,0.025,0.045],[0.24,0.03-i*0.065,0.22]);
  for(let i=0;i<7;i++) box(torso,coat,[0.072,0.09+(i%3)*0.024,0.37],[-0.27+i*0.09,-0.46,0]);
  box(torso,skin,[0.22,0.17,0.22],[0,0.55,0]);
  batchPart(torso);
  const head = part('head_block',0,1.75,0);
  box(head,skin,[0.37,0.34,0.32],[0,0,0]);
  box(head,skin,[0.29,0.12,0.3],[0,-0.19,0.025]);
  box(head,leather,[0.36,0.07,0.3],[0,0.17,-0.025]);
  for (const x of [-0.11,0.11]) {
    box(head,leather,[0.105,0.082,0.035],[x,0.035,0.168]);
    box(head,eyes,[0.05,0.033,0.018],[x,0.036,0.192]);
    const brow=box(head,skin,[0.135,0.042,0.045],[x,0.094,0.174]); brow.rotation.z=x<0?-0.18:0.18;
    box(head,skin,[0.057,0.12,0.13],[Math.sign(x)*0.21,-0.024,-0.02]);
  }
  box(head,skin,[0.07,0.115,0.09],[0,-0.024,0.198]);
  box(head,wound,[0.235,0.085,0.035],[0,-0.133,0.18]);
  for(let i=0;i<6;i++) box(head,bone,[0.022,0.036,0.018],[-0.09+i*0.036,-0.11+(i%2)*0.012,0.206]);
  for(let i=0;i<4;i++) box(head,wound,[0.033,0.045,0.012],[0.15-i*0.014,0.15-i*0.04,0.164]);
  batchPart(head);
  for(const side of [-1,1]) {
    const arm=part(side<0?'left_arm':'right_arm',side*0.43,1.3,0.1); arm.rotation.x=-Math.PI/2.3;
    box(arm,coat,[0.22,0.42,0.23],[0,0.12,0]);
    box(arm,skin,[0.16,0.23,0.16],[0,-0.2,0]);
    box(arm,coat,[0.24,0.07,0.24],[0,-0.065,0]);
    box(arm,skin,[0.19,0.15,0.13],[0,-0.36,0]);
    for(let i=0;i<4;i++) box(arm,skin,[0.034,0.12+(i%2)*0.025,0.05],[-0.069+i*0.047,-0.47,0.024]);
    box(arm,wound,[0.035,0.14,0.018],[side*0.044,-0.22,0.09]);
    batchPart(arm);
    const leg=part(side<0?'left_leg':'right_leg',side*0.18,0.32,0);
    box(leg,trousers,[0.23,0.67,0.25],[0,0.035,0]);
    box(leg,coat,[0.18,0.12,0.035],[0,0.12,0.14]);
    box(leg,leather,[0.255,0.16,0.37],[0,-0.235,0.055]);
    box(leg,leather,[0.26,0.05,0.39],[0,-0.305,0.058]);
    for(let i=0;i<3;i++) box(leg,bone,[0.12,0.018,0.019],[0,-0.14-i*0.028,0.246]);
    batchPart(leg);
  }
  return root;
}

export function enrichWeaponModel(group: THREE.Group) {
  const metalMap = paintTexture(922, 'metal');
  const woodMap = paintTexture(823, 'cloth');
  const materials = new Set<THREE.MeshStandardMaterial>();
  const receivers: THREE.Mesh[] = [];
  group.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for(const mat of mats) if(mat instanceof THREE.MeshStandardMaterial) materials.add(mat);
    const size = child.geometry.parameters;
    if(child.geometry instanceof THREE.BoxGeometry && size.width > 0.06 && size.height > 0.045 && size.depth > 0.25) receivers.push(child);
  });
  materials.forEach(mat => { if(!mat.map && !mat.emissive.getHex()) {mat.map = mat.metalness > 0.4 ? metalMap : woodMap; if(mat.metalness > 0.4) {mat.color.lerp(new THREE.Color('#87938e'), 0.18); mat.metalness = Math.min(mat.metalness, 0.55); mat.roughness = Math.max(mat.roughness, 0.42);} mat.needsUpdate = true;} });
  const silver = new THREE.MeshStandardMaterial({color:'#a7aca5', metalness:0.7, roughness:0.38});
  const dark = new THREE.MeshStandardMaterial({color:'#11181b', roughness:0.55});
  for(const receiver of receivers.slice(0,3)) {
    const {width:w,height:h,depth:d}=(receiver.geometry as THREE.BoxGeometry).parameters;
    for(const side of [-1,1]) {
      for(const z of [-d*0.32,d*0.32]) {
        box(receiver,silver,[0.003,0.009,0.009],[side*(w/2+0.002),0,z]);
        box(receiver,dark,[0.004,0.002,0.007],[side*(w/2+0.004),0,z]);
      }
      for(let i=0;i<9;i++) box(receiver,silver,[0.002,0.003,0.009],[side*(w/2+0.002),h*0.33,-d*0.35+i*0.017]);
    }
    // Recessed ejection port on the visible side, steel lip and bolt handle.
    box(receiver,dark,[0.004,h*0.48,d*0.17],[w/2+0.003,0,-d*0.03]);
    box(receiver,silver,[0.006,0.006,d*0.17],[w/2+0.005,h*0.24,-d*0.03]);
    box(receiver,silver,[0.021,0.012,0.012],[w/2+0.011,0,d*0.13]);
  }
}
