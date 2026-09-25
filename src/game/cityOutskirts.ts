import * as THREE from 'three';

type Vec3 = [number, number, number];
type CityBuilder = {
  root: THREE.Group;
  box: (parent: THREE.Object3D, size: Vec3, position: Vec3, material: THREE.Material, solid?: boolean) => THREE.Mesh;
  building: (w:number,h:number,d:number,x:number,z:number,yaw:number,title:string,subtitle:string,color:string) => THREE.Group;
  light: (position:Vec3,color:string,intensity:number,range:number) => THREE.PointLight;
  utilityTexture: THREE.Texture;
};

// Set dressing stays outside the playable fence. The shared support volumes also
// allow tests to verify downward sightlines without needing a WebGL context.
export const CITY_SUPPORTS: {size:Vec3;position:Vec3;name:string}[] = [
  {size:[600,2,600],position:[0,-15.1,0],name:'continuous-city-ground'},
  {size:[32,14.1,32],position:[0,-7.15,0],name:'market-building-base'},
  {size:[24,14.1,24],position:[-28,-7.15,0],name:'terrace-building-base'},
  {size:[30,13.4,28],position:[-31.5,-7.5,26],name:'neighboring-workshop'},
];

export function buildCityOutskirts({root,box,building,light,utilityTexture}:CityBuilder) {
  const concrete=new THREE.MeshStandardMaterial({color:'#334453',roughness:0.85});
  const asphalt=new THREE.MeshStandardMaterial({color:'#101d2a',roughness:0.58,metalness:0.16});
  const pavement=new THREE.MeshStandardMaterial({color:'#556373',roughness:0.86});
  const paint=new THREE.MeshStandardMaterial({color:'#c8d8ce',roughness:0.75,emissive:'#53655c',emissiveIntensity:0.2});
  const yellow=new THREE.MeshStandardMaterial({color:'#d8a858',roughness:0.75});
  const metal=new THREE.MeshStandardMaterial({color:'#425766',roughness:0.58,metalness:0.45});
  const black=new THREE.MeshStandardMaterial({color:'#111b24',roughness:0.84});
  const warm=new THREE.MeshBasicMaterial({color:'#ffd29a'});
  const cool=new THREE.MeshBasicMaterial({color:'#8adce5'});
  CITY_SUPPORTS.forEach(({size,position,name})=>{const m=box(root,size,position,concrete,true);m.name=name;});

  // Twelve metres below the player: two streets, curbs and a four-way crossing.
  // Every road and building rests on the same continuous city ground.
  box(root,[150,0.045,16],[12,-14.065,29],asphalt,true);
  box(root,[14,0.045,135],[29,-14.06,20],asphalt,true);
  for(const z of [19,39])box(root,[150,0.28,4],[12,-13.96,z],pavement,true);
  for(const x of [19,39])box(root,[4,0.28,110],[x,-13.96,10],pavement,true);
  // Crossing remains asphalt through the sidewalks.
  box(root,[22,0.32,24],[29,-13.92,29],asphalt,true);
  for(let x=-55;x<85;x+=5){
    if(x>16 && x<43)continue;
    box(root,[2.6,0.012,0.12],[x,-14.032,29],yellow);
    for(const z of [25,33])box(root,[2.5,0.012,0.1],[x,-14.032,z],paint);
  }
  for(let z=-42;z<82;z+=5){
    if(z>15 && z<43)continue;
    box(root,[0.12,0.012,2.6],[29,-14.028,z],yellow);
    for(const x of [25,33])box(root,[0.1,0.012,2.5],[x,-14.028,z],paint);
  }
  for(let i=0;i<10;i++){
    const t=-6.1+i*1.35;
    for(const x of [20.5,37.5])box(root,[3.1,0.018,0.63],[x,-13.748,29+t],paint);
    for(const z of [19.5,38.5])box(root,[0.63,0.018,3.1],[29+t,-13.746,z],paint);
  }
  // Stop lines give the intersection a readable street scale from above.
  for(const z of [16.7,41.3])box(root,[13,0.018,0.2],[29,-14.025,z],paint);
  for(const x of [17.7,40.3])box(root,[0.2,0.018,14],[x,-14.025,29],paint);

  // Street-facing blocks surround the view; their bases reach pavement level.
  for(const [z,h,title] of [[-27,29,'NIGHT LINE'],[-4,24,'電器'],[19,32,'TOKYO 03'],[56,26,'夜行']] as const){
    const b=building(22,h,16,43,z,-Math.PI/2,title,'STREET LEVEL / OPEN','#64d7ee');b.position.y=-14.1;
  }
  for(const [x,h,title] of [[-42,23,'DEPOT'],[-16,29,'深夜'],[10,25,'TOKYO TRANSIT'],[36,35,'HOTEL'],[62,24,'24 HOURS']] as const){
    const b=building(25,h,18,x,44,Math.PI,title,'NIGHT SERVICE','#ee86c3');b.position.y=-14.1;
  }
  // End blocks hide the unfinished horizon at the ends of the roads.
  const end=building(30,32,15,29,91,Math.PI,'TERMINAL','LAST TRAIN / 02:40','#80c9ff');end.position.y=-14.1;
  const endWest=building(26,27,16,-69,29,Math.PI/2,'CARGO','LOGISTICS DISTRICT','#d9aa70');endWest.position.y=-14.1;

  // Lower-storey window bands attach the playable roof to a building beneath it.
  for(let x=3;x<15;x+=2.5)for(const y of [-3,-6.4,-9.8]){
    box(root,[1.3,1.55,0.035],[x,y,16.025],black);
    box(root,[1.1,0.85,0.04],[x,y+0.1,16.05],cool);
  }
  for(let z=5;z<15;z+=2.5)for(const y of [-3,-6.4,-9.8]){
    box(root,[0.035,1.55,1.3],[16.025,y,z],black);
    box(root,[0.04,0.85,1.1],[16.05,y+0.1,z],warm);
  }

  // Parked vehicles, a bus shelter and signals add detail at the bottom of the drop.
  for(const [x,z,angle,color] of [[29,-15,0,'#9f6551'],[25,5,0,'#486978'],[34,52,0,'#717495'],[5,25,Math.PI/2,'#577e80'],[54,33,Math.PI/2,'#a77848']] as const){
    const car=new THREE.Group();car.position.set(x,-14,z);car.rotation.y=angle;root.add(car);
    const body=new THREE.MeshStandardMaterial({color,metalness:0.38,roughness:0.5});
    box(car,[1.9,0.6,4.6],[0,0.65,0],body);
    box(car,[1.6,0.65,2.1],[0,1.2,0],body);
    for(const side of [-1,1])for(const z of [-1.4,1.4]){
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.18,10),black);
      tire.rotation.z=Math.PI/2;tire.position.set(side*0.96,0.38,z);car.add(tire);
    }
    for(const end of [-1,1]){
      box(car,[1.4,0.45,0.04],[0,1.22,end*1.07],black);
      for(const x of [-0.63,0.63])box(car,[0.38,0.13,0.04],[x,0.68,end*2.32],end<0?warm:new THREE.MeshBasicMaterial({color:'#ed5b7d'}));
    }
  }
  for(const [x,z] of [[19,12],[39,12],[19,44],[39,44]]){
    box(root,[0.14,5.3,0.14],[x,-11.35,z],metal);
    box(root,[1.6,0.12,0.3],[x+0.65,-8.7,z],metal);
    box(root,[1.3,0.05,0.22],[x+0.65,-8.78,z],warm);
    box(root,[0.35,0.8,0.3],[x,-10,z],black);
    box(root,[0.17,0.17,0.03],[x,-9.78,z-0.17],cool);
  }
  box(root,[8,0.15,3],[6,-10.8,40],metal);
  for(const x of [2.2,9.8])box(root,[0.1,3,0.1],[x,-12.35,40],metal);
  box(root,[6,0.3,0.6],[6,-13.2,40.8],metal);
  box(root,[7.7,0.045,0.08],[6,-10.9,38.5],cool);
  light([29,-7,29],'#8dbdce',38,48);
  light([8,-8,38],'#ed87a4',20,30);

  // The other railing overlooks a neighboring service roof, almost level with
  // the playable terrace. Its parapet and clutter obscure downward void views.
  const roof=new THREE.MeshStandardMaterial({color:'#4f5b65',roughness:0.82});
  box(root,[30,0.18,28],[-31.5,-0.78,26],roof,true);
  for(const x of [-46.25,-16.75])box(root,[0.5,1.0,28],[x,-0.25,26],concrete,true);
  box(root,[30,0.8,0.45],[-31.5,-0.35,12.25],concrete,true);
  box(root,[30,7,5],[-31.5,2.5,38.5],metal,true);
  const ventMat=new THREE.MeshStandardMaterial({map:utilityTexture,color:'#96a8aa',roughness:0.68,metalness:0.3});
  for(const [x,z,w] of [[-40,17,4],[-28,19,5],[-19,16.5,3],[-36,28,4],[-23,29,5]]){
    box(root,[w,2.3,3],[x,0.45,z],ventMat,true);
    box(root,[w+0.18,0.12,3.16],[x,1.66,z],metal);
    const duct=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,1.8,10),metal);duct.position.set(x,2.5,z);root.add(duct);
    box(root,[1.5,0.14,1.5],[x,3.42,z],metal);
  }
  const crateMat=new THREE.MeshStandardMaterial({color:'#6d5745',roughness:0.95});
  for(let i=0;i<17;i++){
    const x=-43+(i*7.1)%27,z=15+(i*4.7)%18;
    const h=0.7+(i%3)*0.38;
    const crate=box(root,[1.1,h,1.3],[x,-0.7+h/2,z],crateMat);crate.rotation.y=(i%4)*0.25;
    box(root,[1.16,0.08,1.35],[x,-0.7+h,z],metal);
  }
  for(let i=0;i<6;i++){
    const panel=box(root,[3.5,0.07,1.1],[-41+i*3.8,0.1+(i%2)*0.35,23+(i%3)*2],metal);
    panel.rotation.z=0.12;panel.rotation.y=i*0.24;
  }
  for(const z of [32,33]){
    box(root,[26,0.19,0.19],[-30,-0.32,z],metal);
    for(let x=-42;x<-16;x+=5)box(root,[0.4,0.4,0.55],[x,-0.45,z],concrete);
  }
  box(root,[20,0.08,0.12],[-30,5.4,35.94],cool);
  light([-30,4,23],'#719ea8',16,26);
}
