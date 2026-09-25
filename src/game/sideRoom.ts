import * as THREE from 'three';
import { placard } from './modelDetails';

export const SIDE_ROOM = { west: -40, east: -16, north: -12, south: 12, doorZ: 5, doorHalfWidth: 3 };

// Route through both sides of the doorway before pursuing inside the other room.
// Staying on this line until clear prevents corners catching the zombie capsule.
export function pursuitTarget(from: THREE.Vector3, target: THREE.Vector3) {
  const fromAnnex = from.x < -16;
  const targetAnnex = target.x < -16;
  const clearOfDivider = fromAnnex ? from.x <= -17.6 : from.x >= -14.4;
  if (fromAnnex === targetAnnex && clearOfDivider) return target;
  if (fromAnnex === targetAnnex && Math.abs(target.z - 5) < 1.5) return target;
  const entering = targetAnnex;
  const approachX = entering ? -13 : -19;
  const exitX = entering ? -19 : -13;
  const beforeDoor = entering ? from.x > -14 : from.x < -18;
  if (beforeDoor && Math.abs(from.z - 5) > 0.7) return new THREE.Vector3(approachX, target.y, 5);
  return new THREE.Vector3(exitX, target.y, 5);
}

export const SIDE_ROOM_WALLS: [number, number, number, number, number, number][] = [
  [2,12,26,-40,6,0], [24,12,2,-28,6,-12], [24,12,2,-28,6,12],
  [2,12,18,-16,6,-7], [2,12,8,-16,6,12], [2,6.5,6,-16,8.75,5],
];

type WallBuilder = (w: number, h: number, d: number, pos: THREE.Vector3, rot?: number) => void;

export function buildSideRoom(scene: THREE.Scene, createWall: WallBuilder, floorMaterial: THREE.Material, ceilingMaterial: THREE.Material, onSolid?: (mesh: THREE.Mesh) => void) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24,24),floorMaterial);
  floor.rotation.x=-Math.PI/2; floor.position.set(-28,0,0); floor.receiveShadow=true; scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(24,24),ceilingMaterial);
  ceiling.rotation.x=Math.PI/2; ceiling.position.set(-28,12,0); scene.add(ceiling);
  SIDE_ROOM_WALLS.forEach(([w,h,d,x,y,z]) => createWall(w,h,d,new THREE.Vector3(x,y,z)));
  const steel=new THREE.MeshStandardMaterial({color:'#566461',roughness:0.55,metalness:0.55});
  const dark=new THREE.MeshStandardMaterial({color:'#222c2c',roughness:0.7});
  const brass=new THREE.MeshStandardMaterial({color:'#c0a052',roughness:0.5,metalness:0.4});
  const add=(size:number[],pos:number[],mat:THREE.Material)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(...size as [number,number,number]),mat);
    m.position.set(...pos as [number,number,number]);m.castShadow=m.receiveShadow=true;scene.add(m);return m;
  };
  // Open steel door leaves folded into the annex, beyond the traversable threshold.
  for(const z of [1.8,8.2]) {
    add([0.28,5.5,0.25],[-14.88,2.75,z],steel);
    const leaf = add([2.6,4.9,0.16],[-18.2,2.45,z],steel);
    onSolid?.(leaf);
    add([2.35,0.11,0.21],[-18.2,0.5,z],dark);
    add([2.35,0.11,0.21],[-18.2,4.45,z],dark);
    add([0.08,0.42,0.3],[-19.1,2.35,z],brass);
    for(let i=0;i<5;i++)add([0.035,0.36,0.32],[-14.71,0.9+i*0.8,z],brass);
  }
  add([0.28,0.24,6.6],[-14.86,5.52,5],steel);
  const sign=placard('BOTTLING ROOM','SPEED COLA  /  OPEN',3.8,0.9);
  sign.position.set(-14.83,6.2,5);sign.rotation.y=Math.PI/2;scene.add(sign);
  const exit=placard('WAREHOUSE','SURVIVAL SECTOR 01',3.8,0.9,'#6c392c');
  exit.position.set(-17.16,6.2,5);exit.rotation.y=-Math.PI/2;scene.add(exit);
  // Service-room pipework and ceiling beams add scale while leaving a clear route.
  for(const x of [-36,-28,-20])add([0.3,0.4,22],[x,10.8,0],steel);
  for(const z of [-10.6,10.6]) {
    add([21,0.13,0.13],[-28,7.3,z],steel);
    for(const x of [-36,-29,-22]) {
      add([0.12,0.85,0.28],[x,7.3,z],brass);
    }
  }
  for(const x of [-34,-23]) {
    const glow=new THREE.MeshStandardMaterial({color:'#fff2cb',emissive:'#fff2cb',emissiveIntensity:2});
    add([2.1,0.13,0.45],[x,8.7,0],steel);
    add([1.8,0.06,0.3],[x,8.61,0],glow);
    const lamp=new THREE.PointLight('#d9e7c3',15,23,1.2);lamp.position.set(x,7.8,0);scene.add(lamp);
  }
  const machineSign=placard('COLD STORAGE','RELOAD. REFRESH. REPEAT.',4,1);
  machineSign.position.set(-38.94,6.5,0);machineSign.rotation.y=Math.PI/2;scene.add(machineSign);
}
