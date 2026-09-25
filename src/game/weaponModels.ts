import * as THREE from 'three';
import { enrichWeaponModel } from './modelDetails';

// Shared by gameplay and the model workshop so previews use the actual weapon.
export function buildWeaponModel(activeId: string, container: THREE.Group, handMagContainer: THREE.Group | null = null) {
  // Materials to share
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: '#242528', roughness: 0.35, metalness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#582f1b', roughness: 0.95 }); // Dark walnut wood
  const brightGoldBulletMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.2, metalness: 0.9 });
  const silverFinMatShared = new THREE.MeshStandardMaterial({ color: '#a1a8b5', roughness: 0.25, metalness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.2, metalness: 0.9 });

  // Removable mag placeholder to assign
  let removableMagazineMesh: THREE.Mesh | null = null;
  let defaultMagPos = new THREE.Vector3(0, -0.21, -0.245);

  if (activeId === 'pistol') {
    // --- 1. DETAILED RETRO SLIDE-ACTION COLT PISTOL (1.15x Enlarged) ---
    // Slide / Receiver box
    const slideGeom = new THREE.BoxGeometry(0.076, 0.058, 0.36);
    const slideMesh = new THREE.Mesh(slideGeom, darkSteelMat);
    slideMesh.position.set(0, 0.015, -0.28);
    container.add(slideMesh);

    // Slide serrations for mechanical detailing
    for (let i = 0; i < 5; i++) {
      const serrationGeom = new THREE.BoxGeometry(0.078, 0.046, 0.005);
      const serrationMesh = new THREE.Mesh(serrationGeom, new THREE.MeshStandardMaterial({ color: '#161719', roughness: 0.6 }));
      serrationMesh.position.set(0, 0.015, -0.16 - i * 0.016);
      container.add(serrationMesh);
    }

    // Slide Top ventilation rib line
    const ribMesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.32), darkSteelMat);
    ribMesh.position.set(0, 0.046, -0.28);
    container.add(ribMesh);

    // Lower Frame
    const frameGeom = new THREE.BoxGeometry(0.07, 0.058, 0.21);
    const frameMesh = new THREE.Mesh(frameGeom, new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.5, metalness: 0.7 }));
    frameMesh.position.set(0, -0.02, -0.24);
    container.add(frameMesh);

    // Steel Trigger Guard
    const guardGeom = new THREE.TorusGeometry(0.024, 0.005, 8, 16);
    const guard = new THREE.Mesh(guardGeom, darkSteelMat);
    guard.position.set(0, -0.055, -0.28);
    guard.rotation.y = Math.PI / 2;
    container.add(guard);

    // Curved steel trigger
    const trigGeom = new THREE.BoxGeometry(0.006, 0.02, 0.012);
    const trigger = new THREE.Mesh(trigGeom, new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9 }));
    trigger.position.set(0, -0.055, -0.275);
    trigger.rotation.x = -Math.PI / 8;
    container.add(trigger);

    // Brown wood grip inserts with brass inlay medallion
    const pistolGripGeom = new THREE.BoxGeometry(0.065, 0.18, 0.088);
    const pistolGripMesh = new THREE.Mesh(pistolGripGeom, new THREE.MeshStandardMaterial({ color: '#4a2511', roughness: 0.95 }));
    pistolGripMesh.position.set(0, -0.12, -0.21);
    pistolGripMesh.rotation.x = Math.PI / 8;
    container.add(pistolGripMesh);

    const medalGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.068, 12);

    const medalL = new THREE.Mesh(medalGeom, brassMat);
    medalL.rotation.z = Math.PI / 2;
    medalL.position.set(-0.033, -0.12, -0.21);
    container.add(medalL);

    const medalR = new THREE.Mesh(medalGeom, brassMat);
    medalR.rotation.z = Math.PI / 2;
    medalR.position.set(0.033, -0.12, -0.21);
    container.add(medalR);

    // Chrome Barrel peeking from receiver
    const barrelGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.42, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.1, metalness: 0.9 });
    const barrelMesh = new THREE.Mesh(barrelGeom, barrelMat);
    barrelMesh.rotation.x = -Math.PI / 2;
    barrelMesh.position.set(0, 0.015, -0.44);
    container.add(barrelMesh);

    // Tactical laser pointer assembly under barrel
    const laserGeom = new THREE.BoxGeometry(0.045, 0.035, 0.12);
    const laserMesh = new THREE.Mesh(laserGeom, new THREE.MeshStandardMaterial({ color: '#1a1b1d', roughness: 0.6 }));
    laserMesh.position.set(0, -0.025, -0.38);
    container.add(laserMesh);

    const lensGeom = new THREE.SphereGeometry(0.008, 8, 8);
    const redLens = new THREE.Mesh(lensGeom, new THREE.MeshBasicMaterial({ color: '#ff2222' }));
    redLens.position.set(0, -0.025, -0.442);
    container.add(redLens);

    // Thin tactical magazine clip inside handle (removableMagazine)
    const pistolMagGeom = new THREE.BoxGeometry(0.052, 0.18, 0.058);
    const pistolMagMesh = new THREE.Mesh(pistolMagGeom, new THREE.MeshStandardMaterial({ color: '#111215', roughness: 0.5, metalness: 0.85 }));
    pistolMagMesh.position.set(0, -0.21, -0.245);
    pistolMagMesh.rotation.x = Math.PI / 8;
    container.add(pistolMagMesh);
    removableMagazineMesh = pistolMagMesh;
    defaultMagPos.set(0, -0.21, -0.245);

    // Populate handMag clip matching the pistol clip
    if (handMagContainer) {
      const lHandMagMesh = new THREE.Mesh(pistolMagGeom, new THREE.MeshStandardMaterial({ color: '#111215', roughness: 0.5, metalness: 0.85 }));
      handMagContainer.add(lHandMagMesh);

      const bulletGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.032, 8);
      const bulletMesh = new THREE.Mesh(bulletGeom, brightGoldBulletMat);
      bulletMesh.position.set(0, 0.09, 0.005);
      bulletMesh.rotation.x = Math.PI / 2;
      handMagContainer.add(bulletMesh);
    }

    // Iron sights aligned at center Y = 0.052 (perfectly aligned with eye view)
    const sightFGeom = new THREE.BoxGeometry(0.006, 0.014, 0.012);
    const sightF = new THREE.Mesh(sightFGeom, darkSteelMat);
    sightF.position.set(0, 0.052, -0.42);
    container.add(sightF);

    const sightRGeom = new THREE.BoxGeometry(0.014, 0.016, 0.008);
    const sightR = new THREE.Mesh(sightRGeom, darkSteelMat);
    sightR.position.set(0, 0.052, -0.14);
    container.add(sightR);

  } else if (activeId === 'carbine') {
    // --- 2. VINTAGE MILITARY WALNUT CARBINE RIFLE (1.20x Enlarged & Scoped) ---
    // Solid long wooden stock
    const stockGeom = new THREE.BoxGeometry(0.075, 0.075, 0.62);
    const stockMesh = new THREE.Mesh(stockGeom, woodMat);
    stockMesh.position.set(0, -0.05, -0.28);
    container.add(stockMesh);

    // Leather cheek pad on stock
    const padGeom = new THREE.BoxGeometry(0.072, 0.04, 0.18);
    const pad = new THREE.Mesh(padGeom, new THREE.MeshStandardMaterial({ color: '#3f220f', roughness: 0.9 }));
    pad.position.set(0, -0.01, -0.08);
    container.add(pad);

    // Wood forend slide wrapping the barrel
    const forendGeom = new THREE.CylinderGeometry(0.038, 0.034, 0.44, 12);
    const forendMesh = new THREE.Mesh(forendGeom, woodMat);
    forendMesh.rotation.x = -Math.PI / 2;
    forendMesh.position.set(0, -0.03, -0.5);
    container.add(forendMesh);

    // Metal Receiver box sitting on the wood stock
    const recGeom = new THREE.BoxGeometry(0.065, 0.052, 0.32);
    const recMesh = new THREE.Mesh(recGeom, darkSteelMat);
    recMesh.position.set(0, 0.005, -0.24);
    container.add(recMesh);

    // Curved steel trigger and guard
    const guardGeom = new THREE.TorusGeometry(0.026, 0.005, 8, 16);
    const guard = new THREE.Mesh(guardGeom, darkSteelMat);
    guard.position.set(0, -0.05, -0.22);
    guard.rotation.y = Math.PI / 2;
    container.add(guard);

    const trigGeom = new THREE.BoxGeometry(0.005, 0.024, 0.012);
    const trigger = new THREE.Mesh(trigGeom, new THREE.MeshStandardMaterial({ color: '#a1a8b5', metalness: 0.8 }));
    trigger.position.set(0, -0.05, -0.215);
    trigger.rotation.x = -Math.PI / 6;
    container.add(trigger);

    // Multi-lens Precision Optical Scope
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(0, 0.062, -0.24);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12), darkSteelMat);
    scopeTube.rotation.x = -Math.PI / 2;
    scopeGroup.add(scopeTube);

    const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.05, 12), darkSteelMat);
    scopeBell.rotation.x = -Math.PI / 2;
    scopeBell.position.set(0, 0, -0.135);
    scopeGroup.add(scopeBell);

    const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.04, 12), darkSteelMat);
    scopeEye.rotation.x = -Math.PI / 2;
    scopeEye.position.set(0, 0, 0.13);
    scopeGroup.add(scopeEye);

    // Glowing cyan-blue lens glass reflection
    const lensGeomPris = new THREE.CylinderGeometry(0.022, 0.022, 0.005, 12);
    const lensMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.5, roughness: 0.1 });
    const frontLens = new THREE.Mesh(lensGeomPris, lensMat);
    frontLens.rotation.x = -Math.PI / 2;
    frontLens.position.set(0, 0, -0.16);
    scopeGroup.add(frontLens);

    // Scope support brackets
    const supportGeom = new THREE.BoxGeometry(0.01, 0.035, 0.012);
    const support1 = new THREE.Mesh(supportGeom, darkSteelMat);
    support1.position.set(0, -0.02, -0.05);
    scopeGroup.add(support1);

    const support2 = new THREE.Mesh(supportGeom, darkSteelMat);
    support2.position.set(0, -0.02, 0.05);
    scopeGroup.add(support2);

    container.add(scopeGroup);

    // Ornate Brass barrel clamps
    const clampGeom = new THREE.BoxGeometry(0.082, 0.082, 0.015);
    const clamp1 = new THREE.Mesh(clampGeom, brassMat);
    clamp1.position.set(0, -0.03, -0.42);
    container.add(clamp1);

    const clamp2 = new THREE.Mesh(clampGeom, brassMat);
    clamp2.position.set(0, -0.03, -0.58);
    container.add(clamp2);

    // Ultra long black steel rifle barrel
    const rBarrelGeom = new THREE.CylinderGeometry(0.016, 0.014, 0.72, 12);
    const rBarrel = new THREE.Mesh(rBarrelGeom, darkSteelMat);
    rBarrel.rotation.x = -Math.PI / 2;
    rBarrel.position.set(0, 0.005, -0.74);
    container.add(rBarrel);

    // Angled stick clip protruding underneath
    const carbineMagGeom = new THREE.BoxGeometry(0.048, 0.2, 0.055);
    const carbineMagMesh = new THREE.Mesh(carbineMagGeom, darkSteelMat);
    carbineMagMesh.position.set(0, -0.19, -0.32);
    carbineMagMesh.rotation.x = Math.PI / 7;
    container.add(carbineMagMesh);
    removableMagazineMesh = carbineMagMesh;
    defaultMagPos.set(0, -0.19, -0.32);

    // Match left hand mag
    if (handMagContainer) {
      const lMag = new THREE.Mesh(carbineMagGeom, darkSteelMat);
      handMagContainer.add(lMag);

      const bGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8);
      const bMesh = new THREE.Mesh(bGeom, brightGoldBulletMat);
      bMesh.position.set(0, 0.1, 0.005);
      bMesh.rotation.x = Math.PI / 2;
      handMagContainer.add(bMesh);
    }

    // Iron sight values centered (with tritium glowing indicators)
    const frontSightGeom = new THREE.BoxGeometry(0.006, 0.025, 0.014);
    const frontSight = new THREE.Mesh(frontSightGeom, darkSteelMat);
    frontSight.position.set(0, 0.045, -1.14);
    container.add(frontSight);

    const glowSight = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshBasicMaterial({ color: '#22c55e' }));
    glowSight.position.set(0, 0.055, -1.14);
    container.add(glowSight);

    const sightRGeom = new THREE.BoxGeometry(0.012, 0.02, 0.01);
    const rearSight = new THREE.Mesh(sightRGeom, darkSteelMat);
    rearSight.position.set(0, 0.038, -0.16);
    container.add(rearSight);

  } else if (activeId === 'thompson') {
    // --- 3. GANGSTER TOMMY GUN (1.15x Enlarged, custom engravings, cooling ribs) ---
    // Main flat-slab metal receiver
    const tommyRecGeom = new THREE.BoxGeometry(0.072, 0.092, 0.44);
    const tommyRec = new THREE.Mesh(tommyRecGeom, darkSteelMat);
    tommyRec.position.set(0, 0.01, -0.28);
    container.add(tommyRec);

    // Laser-engraved certificate gold plates on both receiver sides
    const certPlatL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.045, 0.18), brassMat);
    certPlatL.position.set(-0.038, 0.01, -0.28);
    container.add(certPlatL);

    const certPlatR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.045, 0.18), brassMat);
    certPlatR.position.set(0.038, 0.01, -0.28);
    container.add(certPlatR);

    // Bold metallic cocking lever knob on top
    const boltLever = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.032, 8), silverFinMatShared);
    boltLever.position.set(0, 0.065, -0.28);
    container.add(boltLever);

    // Rear wood pistol handle and stock bracket
    const tommyHandleGeom = new THREE.BoxGeometry(0.06, 0.16, 0.088);
    const tommyHandle = new THREE.Mesh(tommyHandleGeom, woodMat);
    tommyHandle.position.set(0, -0.11, -0.2);
    tommyHandle.rotation.x = Math.PI / 6;
    container.add(tommyHandle);

    // Vertical classic wood foregrip handle (peg grip)
    const foregripGeom = new THREE.BoxGeometry(0.038, 0.15, 0.048);
    const foregrip = new THREE.Mesh(foregripGeom, woodMat);
    foregrip.position.set(0, -0.11, -0.5);
    container.add(foregrip);

    // Cool barrel-shroud cooling ring fins
    for (let i = 0; i < 7; i++) {
      const coolingFin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 12), darkSteelMat);
      coolingFin.rotation.x = -Math.PI / 2;
      coolingFin.position.set(0, 0.01, -0.46 - i * 0.022);
      container.add(coolingFin);
    }

    // Heavy ribbed barrel
    const tommyBarrelGeom = new THREE.CylinderGeometry(0.018, 0.015, 0.52, 12);
    const tommyBarrel = new THREE.Mesh(tommyBarrelGeom, darkSteelMat);
    tommyBarrel.rotation.x = -Math.PI / 2;
    tommyBarrel.position.set(0, 0.01, -0.66);
    container.add(tommyBarrel);

    // Muzzle flare compensator loop
    const compGeom = new THREE.CylinderGeometry(0.03, 0.02, 0.06, 12);
    const comp = new THREE.Mesh(compGeom, darkSteelMat);
    comp.rotation.x = -Math.PI / 2;
    comp.position.set(0, 0.01, -0.92);
    container.add(comp);

    // ICONIC MASSIVE CIRCULAR DRUM MAGAZINE (detailed sides)
    const drumGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.052, 24);
    const drumMesh = new THREE.Mesh(drumGeom, new THREE.MeshStandardMaterial({ color: '#25262c', roughness: 0.4, metalness: 0.9 }));
    drumMesh.rotation.x = Math.PI / 2; // Flat circle facing forward
    drumMesh.rotation.z = Math.PI / 2;
    drumMesh.position.set(0, -0.12, -0.34);
    container.add(drumMesh);
    removableMagazineMesh = drumMesh; // Pull out this heavy drum!
    defaultMagPos.set(0, -0.12, -0.34);

    // Add radial structural rib details to the drum's front panel
    const ribG = new THREE.BoxGeometry(0.18, 0.012, 0.006);
    for (let j = 0; j < 4; j++) {
      const mRib = new THREE.Mesh(ribG, new THREE.MeshStandardMaterial({ color: '#17181c', metalness: 0.9 }));
      mRib.position.set(0, -0.12, -0.34);
      mRib.rotation.y = Math.PI / 2;
      mRib.rotation.z = (j * Math.PI) / 4;
      container.add(mRib);
    }

    if (handMagContainer) {
      const lDrum = new THREE.Mesh(drumGeom, new THREE.MeshStandardMaterial({ color: '#25262c', roughness: 0.4, metalness: 0.9 }));
      lDrum.scale.set(0.85, 1.0, 0.85); // Scale slightly down for gloved palm
      handMagContainer.add(lDrum);
    }

    // Iron sight values centered high for ADS matching
    const frontSightGeom = new THREE.BoxGeometry(0.006, 0.02, 0.012);
    const frontSight = new THREE.Mesh(frontSightGeom, darkSteelMat);
    frontSight.position.set(0, 0.07, -0.92);
    container.add(frontSight);

    const sightRGeom = new THREE.BoxGeometry(0.012, 0.02, 0.01);
    const rearSight = new THREE.Mesh(sightRGeom, darkSteelMat);
    rearSight.position.set(0, 0.055, -0.14);
    container.add(rearSight);

  } else if (activeId === 'shotgun') {
    // --- 4. TWIN-BARREL HEAVY SHOTGUN (1.18x Enlarged with Side-Saddle spare shells) ---
    // Machine silver breech block
    const silverSteelMat = new THREE.MeshStandardMaterial({ color: '#7c8491', roughness: 0.18, metalness: 0.9 });
    const breechGeom = new THREE.BoxGeometry(0.096, 0.092, 0.26);
    const breech = new THREE.Mesh(breechGeom, silverSteelMat);
    breech.position.set(0, -0.01, -0.24);
    container.add(breech);

    // Tactical Side-Saddle mounted on the breech left face
    const saddlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.048, 0.14), new THREE.MeshStandardMaterial({ color: '#1c1b1a', roughness: 0.8 }));
    saddlePlate.position.set(-0.054, -0.01, -0.24);
    container.add(saddlePlate);

    // Loaded crimson shotgun shells visible in the holder
    for (let i = 0; i < 4; i++) {
      const extShell = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.038, 8), new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.5 }));
      extShell.rotation.x = Math.PI / 18;
      extShell.position.set(-0.063, -0.01, -0.29 + (i * 0.03));

      const shCap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 8), brassMat);
      shCap.position.set(0, -0.02, 0);
      extShell.add(shCap);

      container.add(extShell);
    }

    // Short chunky wood stock
    const chunkyStockGeom = new THREE.BoxGeometry(0.076, 0.13, 0.24);
    const chunkyStock = new THREE.Mesh(chunkyStockGeom, new THREE.MeshStandardMaterial({ color: '#4c260f', roughness: 0.9 }));
    chunkyStock.position.set(0, -0.07, -0.14);
    container.add(chunkyStock);

    // Rubber shoulder butt recoil pad
    const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.142, 0.018), new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.9 }));
    buttPad.position.set(0, -0.07, -0.02);
    container.add(buttPad);

    // Wooden pump action grip sleeve
    const pumpSleeveGeom = new THREE.CylinderGeometry(0.052, 0.05, 0.28, 12);
    const pumpSleeve = new THREE.Mesh(pumpSleeveGeom, new THREE.MeshStandardMaterial({ color: '#4c260f', roughness: 0.9 }));
    pumpSleeve.rotation.x = -Math.PI / 2;
    pumpSleeve.position.set(0, -0.04, -0.44);
    container.add(pumpSleeve);

    // Dual heavy barrels side rib cage heat shield
    const shieldTop = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.44), darkSteelMat);
    shieldTop.position.set(0, 0.035, -0.55);
    container.add(shieldTop);

    // DOUBLE BARRELS (SIDE-BY-SIDE)
    const bGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.66, 12);

    const barrelL = new THREE.Mesh(bGeom, darkSteelMat);
    barrelL.rotation.x = -Math.PI / 2;
    barrelL.position.set(-0.022, 0.015, -0.66);
    container.add(barrelL);

    const barrelR = new THREE.Mesh(bGeom, darkSteelMat);
    barrelR.rotation.x = -Math.PI / 2;
    barrelR.position.set(0.022, 0.015, -0.66);
    container.add(barrelR);

    // Shotgun crimson reload shell box under block!
    const shellGeom = new THREE.BoxGeometry(0.048, 0.14, 0.052);
    const shellMesh = new THREE.Mesh(shellGeom, new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 })); // crimson shell body
    shellMesh.position.set(0, -0.15, -0.24);
    container.add(shellMesh);
    removableMagazineMesh = shellMesh;
    defaultMagPos.set(0, -0.15, -0.24);

    if (handMagContainer) {
      const lShell = new THREE.Mesh(shellGeom, new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 }));
      // Brass cap at the shell's top
      const capGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.022, 12);
      const capMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.9, roughness: 0.2 });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.set(0, 0.071, 0);
      lShell.add(cap);
      handMagContainer.add(lShell);
    }

    // Sight bead on barrels
    const beadSight = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), new THREE.MeshBasicMaterial({ color: '#f59e0b' }));
    beadSight.position.set(0, 0.038, -0.96);
    container.add(beadSight);

  } else if (activeId === 'raygun') {
    // --- 5. ULTRA SCI-FI RETRO RAY GUN MARK II (1.15x scaled with glowing helices) ---
    // Bulbous Crimson Circular Housing (Sideways coin)
    const bulbGeom = new THREE.CylinderGeometry(0.138, 0.138, 0.088, 20);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#b41e2d', roughness: 0.15, metalness: 0.8 }); // Cherry glossy red
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.rotation.y = Math.PI / 2;
    bulb.position.set(0, 0.02, -0.26);
    container.add(bulb);

    // Side power meters (glowing gauge panel)
    const dialGeom = new THREE.CylinderGeometry(0.092, 0.092, 0.006, 16);
    const dialMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', metalness: 0.1, roughness: 0.4 });

    // Left Dial (Facing Left)
    const dialL = new THREE.Mesh(dialGeom, dialMat);
    dialL.rotation.y = Math.PI / 2;
    dialL.position.set(-0.046, 0.02, -0.26);
    container.add(dialL);

    // Right Dial (Facing Right)
    const dialR = new THREE.Mesh(dialGeom, dialMat);
    dialR.rotation.y = Math.PI / 2;
    dialR.position.set(0.046, 0.02, -0.26);
    container.add(dialR);

    // Colorful arcs inside the left-side gauge (Green left, yellow mid, red right)
    const gaugeArcGeom = new THREE.BoxGeometry(0.005, 0.046, 0.092);
    const gaugeArc = new THREE.Mesh(gaugeArcGeom, new THREE.MeshBasicMaterial({ color: '#10b981' })); // Green gauge arc
    gaugeArc.position.set(-0.048, 0.03, -0.28);
    gaugeArc.rotation.y = Math.PI / 2;
    container.add(gaugeArc);

    const gaugeArcRed = new THREE.Mesh(gaugeArcGeom, new THREE.MeshBasicMaterial({ color: '#ef4444' })); // Red arc
    gaugeArcRed.position.set(-0.048, 0.03, -0.24);
    gaugeArcRed.rotation.y = Math.PI / 2;
    container.add(gaugeArcRed);

    // Left Needle
    const needleGeom = new THREE.BoxGeometry(0.068, 0.004, 0.008);
    const needle = new THREE.Mesh(needleGeom, new THREE.MeshBasicMaterial({ color: '#111827' }));
    needle.rotation.y = Math.PI / 2;
    needle.rotation.z = Math.PI / 6; // Angled needle charging
    needle.position.set(-0.049, 0.02, -0.26);
    container.add(needle);

    // Diagnostic status LED lamps (Green, Yellow, Red) pulsing on the housing top
    const ledG = new THREE.SphereGeometry(0.007, 6, 6);

    const led1 = new THREE.Mesh(ledG, new THREE.MeshBasicMaterial({ color: '#10b981' }));
    led1.position.set(-0.015, 0.165, -0.32);
    container.add(led1);

    const led2 = new THREE.Mesh(ledG, new THREE.MeshBasicMaterial({ color: '#fbbf24' }));
    led2.position.set(0, 0.165, -0.32);
    container.add(led2);

    const led3 = new THREE.Mesh(ledG, new THREE.MeshBasicMaterial({ color: '#ef4444' }));
    led3.position.set(0.015, 0.165, -0.32);
    container.add(led3);

    // 3 Thruster Vane Fins on the top rear of Crimson shell
    const finGeom = new THREE.BoxGeometry(0.006, 0.058, 0.08);

    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(finGeom, silverFinMatShared);
      f.position.set(0, 0.138 + i * 0.022, -0.2 + i * 0.018);
      f.rotation.x = -Math.PI / 12 - i * (Math.PI / 18);
      container.add(f);
    }

    // Rectangular Top Frame Carry Handle U-Shape (rises as rectangular U-bar shown in weapon hold)
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.21), darkSteelMat);
    topBar.position.set(0, 0.172, -0.32);
    container.add(topBar);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.006), darkSteelMat);
    legL.position.set(0.032, 0.138, -0.25);
    container.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.006), darkSteelMat);
    legR.position.set(-0.032, 0.138, -0.25);
    container.add(legR);

    // Helical glowing plasma coils winding along core barrel shroud
    for (let i = 0; i < 5; i++) {
      const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.006, 8, 16), new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#06b6d4', emissiveIntensity: 1.0, roughness: 0.1 }));
      coilRing.position.set(0, 0.015, -0.34 - i * 0.042);
      container.add(coilRing);
    }

    // central barrel needle core
    const coreNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), silverFinMatShared);
    coreNeedle.rotation.x = -Math.PI / 2;
    coreNeedle.position.set(0, 0.015, -0.42);
    container.add(coreNeedle);

    // Neon Blue Glowing Battery Energy Tube shroud
    const tubeGeom = new THREE.CylinderGeometry(0.032, 0.032, 0.18, 12);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    tube.rotation.x = -Math.PI / 2;
    tube.position.set(0, 0.015, -0.42);
    container.add(tube);

    // Core glowing battery element
    const cellGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.17, 12);
    const cellMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' }); // glowing brilliant cyan
    const cell = new THREE.Mesh(cellGeom, cellMat);
    cell.rotation.x = -Math.PI / 2;
    cell.position.set(0, 0.015, -0.42);
    container.add(cell);

    // Crimson Cone Funnel Muzzle
    const funnelGeom = new THREE.CylinderGeometry(0.052, 0.02, 0.13, 12);
    const funnel = new THREE.Mesh(funnelGeom, bulbMat);
    funnel.rotation.x = -Math.PI / 2;
    funnel.position.set(0, 0.015, -0.6);
    container.add(funnel);

    // Brass antenna pin + Glowing spherical emitter tip
    const pinGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.07, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', metalness: 0.9, roughness: 0.1 });
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.rotation.x = -Math.PI / 2;
    pin.position.set(0, 0.015, -0.69);
    container.add(pin);

    const beadGeom = new THREE.SphereGeometry(0.009, 8, 8);
    const beadMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' }); // glowing pink-red indicator antenna
    const bead = new THREE.Mesh(beadGeom, beadMat);
    bead.position.set(0, 0.015, -0.72);
    container.add(bead);

    // Split focus brass forks on the barrel muzzle
    const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.08), pinMat);
    forkL.position.set(-0.045, 0.015, -0.74);
    container.add(forkL);

    const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.08), pinMat);
    forkR.position.set(0.045, 0.015, -0.74);
    container.add(forkR);

    // Retro Circular Ring Sight (brass loop with vertical post)
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.046, 0.003), pinMat);
    post.position.set(0, 0.11, -0.58);
    container.add(post);

    const torusRingGeom = new THREE.TorusGeometry(0.022, 0.003, 8, 16);
    const ring = new THREE.Mesh(torusRingGeom, pinMat);
    ring.position.set(0, 0.13, -0.58);
    container.add(ring);

    // Inner glowing mini dot for center sight alignment
    const crosshairDot = new THREE.Mesh(new THREE.SphereGeometry(0.002, 4, 4), beadMat);
    crosshairDot.position.set(0, 0.13, -0.58);
    container.add(crosshairDot);

    // Bottom curved swooping structural sweep bar connecting to handles
    const sweepTorusGeom = new THREE.TorusGeometry(0.145, 0.01, 8, 20, Math.PI / 2);
    const sweep = new THREE.Mesh(sweepTorusGeom, bulbMat);
    sweep.position.set(0, -0.11, -0.34);
    sweep.rotation.y = Math.PI / 2;
    sweep.rotation.z = Math.PI / 6;
    container.add(sweep);

    // Ribbed cyber grip
    const rayGripGeom = new THREE.BoxGeometry(0.058, 0.18, 0.08);
    const rayGrip = new THREE.Mesh(rayGripGeom, new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.95 }));
    rayGrip.position.set(0, -0.14, -0.22);
    rayGrip.rotation.x = Math.PI / 8;
    container.add(rayGrip);

    // Glowing high-tech battery capsule (removable magazine)
    const battGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 12);
    const battMesh = new THREE.Mesh(battGeom, new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.4, metalness: 0.9 }));
    battMesh.position.set(0, -0.21, -0.245);
    battMesh.rotation.x = Math.PI / 8;
    container.add(battMesh);
    removableMagazineMesh = battMesh; // Pull down this plasma cell!
    defaultMagPos.set(0, -0.21, -0.245);

    if (handMagContainer) {
      const lBatt = new THREE.Mesh(battGeom, new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.4, metalness: 0.9 }));
      handMagContainer.add(lBatt);

      // Glowing blue energy filaments wrapping left wrist battery
      const neonStripGeom = new THREE.CylinderGeometry(0.017, 0.017, 0.14, 12);
      const neonStrip = new THREE.Mesh(neonStripGeom, new THREE.MeshBasicMaterial({ color: '#22d3ee' }));
      handMagContainer.add(neonStrip);
    }

  } else if (activeId === 'thundergun') {
    // --- 6. INDUSTRIAL ACOUSTIC ACCELERATOR (THUNDERGUN) (1.20x Massive Expansion, caution stripes, conduits) ---
    // Giant grey shroud container cylinder
    const tankGeom = new THREE.CylinderGeometry(0.145, 0.12, 0.52, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.45, metalness: 0.8 });
    const tank = new THREE.Mesh(tankGeom, tankMat);
    tank.rotation.x = -Math.PI / 2;
    tank.position.set(0, -0.01, -0.3);
    container.add(tank);

    // --- Industrial Safety Hazard Stripes (Yellow & Black) on Left & Right faces ---
    const cautionMatY = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.4 });
    const cautionMatB = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4 });

    for (let i = 0; i < 4; i++) {
      const zOffset = -0.15 - i * 0.08;

      // Left side caution stripes
      const stripLY = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.035), cautionMatY);
      stripLY.position.set(-0.151, -0.01, zOffset);
      stripLY.rotation.x = Math.PI / 4;
      container.add(stripLY);

      const stripLB = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.035), cautionMatB);
      stripLB.position.set(-0.151, -0.01, zOffset + 0.035);
      stripLB.rotation.x = Math.PI / 4;
      container.add(stripLB);

      // Right side caution stripes
      const stripRY = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.035), cautionMatY);
      stripRY.position.set(0.151, -0.01, zOffset);
      stripRY.rotation.x = -Math.PI / 4;
      container.add(stripRY);

      const stripRB = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.035), cautionMatB);
      stripRB.position.set(0.151, -0.01, zOffset + 0.035);
      stripRB.rotation.x = -Math.PI / 4;
      container.add(stripRB);
    }

    // Heavy steel reinforcement brackets wrapping the giant barrel cylinder
    const bracketGeom = new THREE.BoxGeometry(0.29, 0.29, 0.03);
    const bracket1 = new THREE.Mesh(bracketGeom, darkSteelMat);
    bracket1.position.set(0, -0.01, -0.22);
    container.add(bracket1);

    const bracket2 = new THREE.Mesh(bracketGeom, darkSteelMat);
    bracket2.position.set(0, -0.01, -0.42);
    container.add(bracket2);

    // Giant flared wind horn ring at the front muzzle tip
    const ringGeom = new THREE.CylinderGeometry(0.17, 0.11, 0.19, 16, 1, true); // open ended muzzle
    const ringMesh = new THREE.Mesh(ringGeom, new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3, metalness: 0.85 }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, -0.01, -0.66);
    container.add(ringMesh);

    // Core turbine rotors inside muzzle
    const coreRotor = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), darkSteelMat);
    coreRotor.position.set(0, -0.01, -0.58);
    container.add(coreRotor);

    // Radial turbine fan blades
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.078, 0.016), silverFinMatShared);
      blade.position.set(0, -0.01, -0.58);
      blade.rotation.z = i * (Math.PI / 3);
      coreRotor.add(blade);
    }

    // Inner glowing light emitter disc (Pressurized blue pressure core)
    const pressureCore = new THREE.Mesh(new THREE.CircleGeometry(0.095, 16), new THREE.MeshBasicMaterial({ color: '#06b6d4', side: THREE.DoubleSide }));
    pressureCore.position.set(0, -0.01, -0.56);
    container.add(pressureCore);

    // Thick braided acoustic copper conduit pipes
    const copperConduitMat = new THREE.MeshStandardMaterial({ color: '#b45309', metalness: 0.9, roughness: 0.2 });
    const condL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 12), copperConduitMat);
    condL.position.set(-0.11, -0.08, -0.32);
    condL.rotation.x = -Math.PI / 2;
    container.add(condL);

    const condR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 12), copperConduitMat);
    condR.position.set(0.11, -0.08, -0.32);
    condR.rotation.x = -Math.PI / 2;
    container.add(condR);

    // Piping & conduits
    const pipeGeom = new THREE.CylinderGeometry(0.007, 0.007, 0.38, 8);
    const goldPipeMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', metalness: 0.9, roughness: 0.1 });

    const pipeL = new THREE.Mesh(pipeGeom, goldPipeMat);
    pipeL.position.set(-0.12, 0.04, -0.3);
    pipeL.rotation.x = -Math.PI / 2;
    container.add(pipeL);

    const pipeR = new THREE.Mesh(pipeGeom, goldPipeMat);
    pipeR.position.set(0.12, 0.04, -0.3);
    pipeR.rotation.x = -Math.PI / 2;
    container.add(pipeR);

    // Industrial acoustics pressure monitoring dial gauge
    const pressDial = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.015, 12), new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 }));
    pressDial.position.set(0.06, 0.12, -0.22);
    pressDial.rotation.z = Math.PI / 2;
    container.add(pressDial);

    const pressNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.003, 0.024), new THREE.MeshBasicMaterial({ color: '#ec4899' })); // glowing vibrant pink needle
    pressNeedle.position.set(0.068, 0.12, -0.22);
    container.add(pressNeedle);

    // Giant industrial reactor core box (removable ammo magazine)
    const reactorCellGeom = new THREE.BoxGeometry(0.085, 0.18, 0.13);
    const reactorCell = new THREE.Mesh(reactorCellGeom, new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.4 }));
    reactorCell.position.set(0, -0.14, -0.24);
    container.add(reactorCell);
    removableMagazineMesh = reactorCell;
    defaultMagPos.set(0, -0.14, -0.24);

    if (handMagContainer) {
      const lReactor = new THREE.Mesh(reactorCellGeom, new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.4 }));
      handMagContainer.add(lReactor);
    }

    // Sight ring aligned at center Y = 0.110
    const sightR = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 16), goldPipeMat);
    sightR.position.set(0, 0.11, -0.58);
    container.add(sightR);
  }

  enrichWeaponModel(container);

  return { removableMagazineMesh, defaultMagPos };
}
