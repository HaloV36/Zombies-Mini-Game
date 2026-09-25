/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createDetailedPerk, createDetailedZombie } from '../game/modelDetails';
import { createBrickTexture, createConcreteTexture, createWoodTexture, createSteelTexture } from '../game/environmentTextures';
import { disposeResources } from '../game/disposeResources';
import { buildWeaponModel } from '../game/weaponModels';
import { buildSideRoom, pursuitTarget } from '../game/sideRoom';
import { 
  Weapon, 
  PlayerState, 
  Zombie, 
  Barricade, 
  WallBuy, 
  MysteryBoxState, 
  PowerUp, 
  PowerUpType, 
  PerkType, 
  GameState 
} from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  gameStatus: 'START' | 'PLAYING' | 'GAMEOVER';
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  weapons: Record<string, Weapon>;
  setWeapons: React.Dispatch<React.SetStateAction<Record<string, Weapon>>>;
  setInteractPrompt: (prompt: string | null) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isMuted: boolean;
  setIsLocked: (locked: boolean) => void;
  onReceivePoints: (amount: number, label: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameStatus,
  gameState,
  setGameState,
  playerState,
  setPlayerState,
  weapons,
  setWeapons,
  setInteractPrompt,
  isPaused,
  setIsPaused,
  isMuted,
  setIsLocked,
  onReceivePoints
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs to hold mutable game values running inside ThreeJS render loop at 60Hz
  const stateRef = useRef<{
    player: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      yaw: number;
      pitch: number;
      radius: number;
      height: number;
      isJumping: boolean;
      health: number;
      maxHealth: number;
      points: number;
      regenTimer: number;
    };
    keys: Record<string, boolean>;
    pointerLocked: boolean;
    isMouseDown: boolean;
    bullets: Array<{
      position: THREE.Vector3;
      direction: THREE.Vector3;
      damage: number;
      mesh: THREE.Line | THREE.Mesh;
      life: number;
      maxLife?: number;
      target?: THREE.Vector3;
      start?: THREE.Vector3;
      type?: 'regular' | 'ray' | 'thunder';
    }>;
    particles: Array<{
      mesh: THREE.Mesh | THREE.Points | THREE.Group;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
      noGravity?: boolean;
      fadeOpacity?: boolean;
      isScaleUp?: boolean;
    }>;
    zombies: Zombie[];
    barricades: Barricade[];
    wallBuys: WallBuy[];
    mysteryBox: MysteryBoxState;
    powerUps: PowerUp[];
    lastShotTime: number;
    activeWeaponId: string;
    secondaryWeaponId: string | null;
    isReloading: boolean;
    reloadTimeLeft: number;
    reloadDuration: number;
    magazineDroppedForCurrentReload: boolean;
    isAiming: boolean;
    collidables: THREE.Box3[];
    zombieCollidables: THREE.Box3[];
    weapons: Record<string, Weapon>;
    gameState: GameState;
    zombieSpawnTimer: number;
    perks: PerkType[];
    sway: {
      x: number;
      y: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    };
    recoil: {
      pitch: number;
      yOffset: number;
      zOffset: number;
      rotZ: number;
    };
  }>({
    player: {
      position: new THREE.Vector3(0, 1.8, 10), // start in main area
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      radius: 0.9,
      height: 1.8,
      isJumping: false,
      health: playerState.health,
      maxHealth: playerState.maxHealth,
      points: playerState.points,
      regenTimer: 0
    },
    keys: {},
    pointerLocked: false,
    isMouseDown: false,
    bullets: [],
    particles: [],
    zombies: [],
    barricades: [],
    wallBuys: [],
    mysteryBox: {
      id: 'mbox',
      position: { x: 14.1, y: 0.1, z: 4.0 },
      yaw: -Math.PI / 2,
      isOpen: false,
      isRolling: false,
      currentWeaponId: null,
      rollTimer: 0,
      interactTimer: 0,
      weaponsList: ['carbine', 'shotgun', 'thompson', 'raygun', 'thundergun']
    },
    powerUps: [],
    lastShotTime: 0,
    activeWeaponId: playerState.activeWeaponId,
    secondaryWeaponId: playerState.secondaryWeaponId,
    isReloading: false,
    reloadTimeLeft: 0,
    reloadDuration: 1,
    magazineDroppedForCurrentReload: false,
    isAiming: false,
    collidables: [],
    zombieCollidables: [],
    weapons: weapons,
    gameState: gameState,
    zombieSpawnTimer: 0,
    perks: playerState.perks,
    sway: {
      x: 0,
      y: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0
    },
    recoil: {
      pitch: 0,
      yOffset: 0,
      zOffset: 0,
      rotZ: 0
    }
  });

  // Track state changes from React props
  useEffect(() => {
    stateRef.current.player.points = playerState.points;
    stateRef.current.player.health = playerState.health;
    stateRef.current.player.maxHealth = playerState.maxHealth;
    stateRef.current.activeWeaponId = playerState.activeWeaponId;
    stateRef.current.secondaryWeaponId = playerState.secondaryWeaponId;
    stateRef.current.perks = playerState.perks;
    stateRef.current.weapons = weapons;
    stateRef.current.gameState = gameState;
  }, [
    playerState.points,
    playerState.health,
    playerState.maxHealth,
    playerState.activeWeaponId,
    playerState.secondaryWeaponId,
    playerState.perks,
    weapons,
    gameState
  ]);

  // Synchronize paused states to completely stop the animation loops
  const isPausedRef = useRef<boolean>(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const gameStatusRef = useRef<string>(gameStatus);
  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  const renderedWeaponIdRef = useRef<string | null>(null);
  const baseMagPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.21, -0.245));

  // Scene triggers
  const sceneElementsRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    weaponGroup: THREE.Group | null;
    weaponMeshContainer: THREE.Group | null;
    leftArmGroup: THREE.Group | null;
    removableMagazine: THREE.Mesh | null;
    leftHandMagazine: THREE.Mesh | null;
    muzzleFlashLight: THREE.PointLight | null;
    mysteryBoxMesh: THREE.Group | null;
    mysteryBoxBeam: THREE.Mesh | null;
    mysteryBoxWeaponFloater: THREE.Group | null;
    perkMachineMeshes: Record<string, THREE.Group>;
    zombieModelsGroup: THREE.Group | null;
    barricadeModelsGroup: THREE.Group | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    weaponGroup: null,
    weaponMeshContainer: null,
    leftArmGroup: null,
    removableMagazine: null,
    leftHandMagazine: null,
    muzzleFlashLight: null,
    mysteryBoxMesh: null,
    mysteryBoxBeam: null,
    mysteryBoxWeaponFloater: null,
    perkMachineMeshes: {},
    zombieModelsGroup: null,
    barricadeModelsGroup: null
  });

  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    // --- SETUP THREEJS WEBGL GRAPHICS ENVIRONMENT ---
    const container = containerRef.current;
    if (!container) return;

    // Build Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#08090d'); // Pitch dark
    // Expand fog range
    scene.fog = new THREE.FogExp2('#0c0d12', 0.026);
    sceneElementsRef.current.scene = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.copy(stateRef.current.player.position);
    sceneElementsRef.current.camera = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    sceneElementsRef.current.renderer = renderer;

    // Setup groups
    const zombieGroup = new THREE.Group();
    scene.add(zombieGroup);
    sceneElementsRef.current.zombieModelsGroup = zombieGroup;

    const barricadeGroup = new THREE.Group();
    scene.add(barricadeGroup);
    sceneElementsRef.current.barricadeModelsGroup = barricadeGroup;

    // --- PROCEDURAL ARCHITECTURAL TEXTURES ---
    const brickTex = createBrickTexture();
    const concreteTex = createConcreteTexture();
    const woodTex = createWoodTexture();
    const steelTex = createSteelTexture();

    // --- LIGHT SYSTEMS ---
    // A slightly stronger, warmer ambient baseline light so that the environment and key items are clearly visible.
    const ambientLight = new THREE.AmbientLight('#697584', 1.1);
    scene.add(ambientLight);
    scene.add(new THREE.HemisphereLight('#c4d6e2', '#655644', 0.85));

    // Beautiful hanging lanterns at each corner of the ceiling
    const cornerLanternPositions = [
      { x: -14.6, z: -14.6 },
      { x: 14.6, z: -14.6 },
      { x: -14.6, z: 14.6 },
      { x: 14.6, z: 14.6 }
    ];

    cornerLanternPositions.forEach((pos) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(pos.x, 12, pos.z); // Ceiling height is 12

      // 1. Hanging Wire/Cord (dark rustic metal rod going downwards)
      const cordGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4);
      const cordMat = new THREE.MeshStandardMaterial({ color: '#111215', roughness: 0.6, metalness: 0.95 });
      const cord = new THREE.Mesh(cordGeom, cordMat);
      cord.position.y = -0.7; // intermediate between y=12 and y=10.6
      lanternGroup.add(cord);

      // 2. Lantern Hood/Cap (dark iron lid)
      const capGeom = new THREE.CylinderGeometry(0.24, 0.36, 0.15, 6);
      const capMat = new THREE.MeshStandardMaterial({ color: '#2d3340', roughness: 0.5, metalness: 0.8 });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.y = -1.4; // positioned at y=10.6
      cap.castShadow = true;
      lanternGroup.add(cap);

      // 3. Emissive Warm Glass Bulb Core
      const coreGeom = new THREE.CylinderGeometry(0.18, 0.13, 0.5, 6);
      const coreMat = new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#ea580c',
        emissiveIntensity: 3.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
      });
      const glass = new THREE.Mesh(coreGeom, coreMat);
      glass.position.y = -1.725; // positioned at y=10.275
      lanternGroup.add(glass);

      // 4. Structural Metal Frame cage (struts)
      const struts = 4;
      const strutGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4);
      const strutMat = new THREE.MeshStandardMaterial({ color: '#161a22', roughness: 0.5, metalness: 0.9 });
      for (let i = 0; i < struts; i++) {
        const angle = (i * Math.PI) / 2;
        const strut = new THREE.Mesh(strutGeom, strutMat);
        strut.position.set(Math.cos(angle) * 0.19, -1.725, Math.sin(angle) * 0.19);
        strut.castShadow = true;
        lanternGroup.add(strut);
      }

      // 5. Bottom closing Base Ring
      const baseGeom = new THREE.CylinderGeometry(0.21, 0.18, 0.08, 6);
      const baseMesh = new THREE.Mesh(baseGeom, capMat);
      baseMesh.position.y = -1.985; // positioned at y=10.015
      baseMesh.castShadow = true;
      lanternGroup.add(baseMesh);

      // 6. Pointlight inside the lanterns to provide beautiful, dim, organic light
      // This reaches further across each section of the walls & floor with decay curves
      const pointLight = new THREE.PointLight('#f59e0b', 3.8, 38, 1.1); // amber-orange glow
      pointLight.position.set(0, -1.725, 0); // centered at y=10.275 relative to ceiling base
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      pointLight.shadow.bias = -0.003;
      lanternGroup.add(pointLight);

      scene.add(lanternGroup);
    });

    // Soft Moonlight Center Ceiling skylight point glow
    const moonLight = new THREE.PointLight('#38bdf8', 2.2, 45, 1.0);
    moonLight.position.set(0, 11, 0);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    scene.add(moonLight);

    // Decorative glass skylight on the ceiling at the center
    const skyGeom = new THREE.BoxGeometry(4, 0.1, 4);
    const skyMat = new THREE.MeshStandardMaterial({ 
      color: '#0f172a', 
      emissive: '#0284c7', 
      emissiveIntensity: 0.6 
    });
    const skylight = new THREE.Mesh(skyGeom, skyMat);
    skylight.position.set(0, 11.95, 0);
    scene.add(skylight);

    // Muzzle Flash PointLight (attached near camera weapon later)
    const mFlash = new THREE.PointLight('#f59e0b', 0, 10);
    scene.add(mFlash);
    sceneElementsRef.current.muzzleFlashLight = mFlash;

    // --- BUILD WAREHOUSE ENVIRONMENT LEVELS ---
    stateRef.current.collidables = [];
    stateRef.current.zombieCollidables = [];

    // Concrete floor grid
    const floorGeom = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: '#44464c', 
      roughness: 0.85, 
      metalness: 0.1,
      map: concreteTex
    });
    // repeat floor texture to scale cleanly
    floorMat.map!.repeat.set(4, 4);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceilings (prevent shooting out)
    const ceilGeom = new THREE.PlaneGeometry(32, 32);
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeom, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 12;
    scene.add(ceil);

    // Warehouse Boundary Outer Brick Walls
    const createWall = (width: number, height: number, depth: number, pos: THREE.Vector3, rotY: number = 0) => {
      const wallGeom = new THREE.BoxGeometry(width, height, depth);
      const wallMat = new THREE.MeshStandardMaterial({ 
        map: brickTex.clone(),
        roughness: 0.9, 
        metalness: 0.05 
      });
      wallMat.map!.repeat.set(Math.max(width, depth) / 3, height / 3);
      const wall = new THREE.Mesh(wallGeom, wallMat);
      wall.position.copy(pos);
      wall.rotation.y = rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);

      // Define collision bounds box
      wall.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wall);
      stateRef.current.collidables.push(box);
      stateRef.current.zombieCollidables.push(box);
    };

    // Four boundaries around small arena (perimeter walls 32x32 boundary)
    const hWallHeight = 12;

    // Back (North) Wall with a Window/Hole cutout at x=0
    createWall(14.25, hWallHeight, 2, new THREE.Vector3(-8.875, 6, -16)); // Left segment of North wall
    createWall(14.25, hWallHeight, 2, new THREE.Vector3(8.875, 6, -16));  // Right segment of North wall
    createWall(3.5, 7, 2, new THREE.Vector3(0, 8.5, -16));                // Top lintel above North window

    // Front (South) Wall with a Window/Hole cutout at x=0
    createWall(14.25, hWallHeight, 2, new THREE.Vector3(-8.875, 6, 16));  // Left segment of South wall
    createWall(14.25, hWallHeight, 2, new THREE.Vector3(8.875, 6, 16));   // Right segment of South wall
    createWall(3.5, 7, 2, new THREE.Vector3(0, 8.5, 16));                 // Top lintel above South window

    // West wall opens into the connected bottling room.
    buildSideRoom(scene, createWall, floorMat, ceilMat, (mesh) => {
      mesh.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(mesh);
      stateRef.current.collidables.push(bounds);
      stateRef.current.zombieCollidables.push(bounds);
    });

    // Right (East) Wall (Single solid wall - where Mystery Box is placed)
    createWall(2, hWallHeight, 32, new THREE.Vector3(16, 6, 0));

    // --- INTERIOR ROOM COMPARTMENTS & PILLARS ---
    const createCargoBox = (x: number, z: number, size: {w: number, h: number, d: number}, angle: number = 0) => {
      const crateGeom = new THREE.BoxGeometry(size.w, size.h, size.d);
      const crateMat = new THREE.MeshStandardMaterial({
        map: steelTex,
        roughness: 0.7,
        metalness: 0.25
      });
      const crate = new THREE.Mesh(crateGeom, crateMat);
      crate.position.set(x, size.h / 2, z);
      crate.rotation.y = angle;
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
      
      crate.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(crate);
      stateRef.current.collidables.push(box);
      stateRef.current.zombieCollidables.push(box);
    };

    // Spawn 2 tactical columns for running cover (aligned at angle 0 for perfect tight collision boundaries)
    createCargoBox(-4, -4, { w: 3, h: 3, d: 3 }, 0);
    createCargoBox(4, 4, { w: 3.5, h: 3, d: 3.5 }, 0);

    // --- SETUP CO-D BARRICADE WINDOW WINDOWS (Points of Zombie entry) ---
    const barricades: Barricade[] = [
      { id: 'b_back', name: 'North Window', position: { x: 0, y: 0.1, z: -15.8 }, yaw: 0, boards: 6, maxBoards: 6, isBreached: false },
      { id: 'b_front', name: 'South Window', position: { x: 0, y: 0.1, z: 15.8 }, yaw: Math.PI, boards: 6, maxBoards: 6, isBreached: false }
    ];

    stateRef.current.barricades = barricades;

    // Draw the structural models of barricades
    barricades.forEach((bar) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bar.position.x, bar.position.y, bar.position.z);
      bGroup.rotation.y = bar.yaw;
      
      // Frame borders
      const frameGeom = new THREE.BoxGeometry(3.5, 5, 0.4);
      const frameMat = new THREE.MeshStandardMaterial({ color: '#2c2d30', roughness: 0.6 });
      const frame = new THREE.Mesh(frameGeom, frameMat);
      frame.position.y = 2.5;
      bGroup.add(frame);

      // Hollow opening visual inside
      const openingGeom = new THREE.BoxGeometry(2.5, 4.2, 0.2);
      const openingMat = new THREE.MeshBasicMaterial({ color: '#030303' }); // Dark void
      const opening = new THREE.Mesh(openingGeom, openingMat);
      opening.position.y = 2.5;
      opening.position.z = -0.1;
      bGroup.add(opening);

      // Generate Planks group
      const planksGroup = new THREE.Group();
      planksGroup.name = 'planks';
      bGroup.add(planksGroup);

      // Insert wood board meshes
      for (let i = 0; i < bar.maxBoards; i++) {
        const boardGeom = new THREE.BoxGeometry(2.9, 0.45, 0.12);
        const boardMat = new THREE.MeshStandardMaterial({ 
          map: woodTex, 
          roughness: 0.95 
        });
        const board = new THREE.Mesh(boardGeom, boardMat);
        
        // Stack boards vertically across the window with slanting alterations
        board.position.y = 0.8 + (i * 0.6);
        board.rotation.z = (Math.random() * 0.18 - 0.09) + (i % 2 === 0 ? 0.05 : -0.05);
        board.position.z = 0.15;
        board.name = `board_${i}`;
        board.castShadow = true;
        planksGroup.add(board);
      }

      bGroup.name = bar.id;
      barricadeGroup.add(bGroup);
      bar.meshReference = bGroup;

      // Collidables block bounds for physics calculations on window frames
      bGroup.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(frame);
      stateRef.current.collidables.push(box);
    });

    // --- WALL BUY WEAPON GRAPHIC OUTLINES ---
    // Chalk silhouettes showing gun cost
    const wallBuys: WallBuy[] = [
      { id: 'wb_carbine', weaponId: 'carbine', cost: 1000, position: { x: -8, y: 1.8, z: -15.0 }, yaw: 0 },
      { id: 'wb_shotgun', weaponId: 'shotgun', cost: 1500, position: { x: -15.0, y: 1.5, z: 4.0 }, yaw: Math.PI / 2 },
      { id: 'wb_thompson', weaponId: 'thompson', cost: 1800, position: { x: 15.0, y: 1.8, z: -4.0 }, yaw: -Math.PI / 2 }
    ];

    stateRef.current.wallBuys = wallBuys;

    wallBuys.forEach((wb) => {
      // Chalk backplate
      const chalkGroup = new THREE.Group();
      chalkGroup.position.set(wb.position.x, wb.position.y, wb.position.z);
      chalkGroup.rotation.y = wb.yaw;

      const plateGeom = new THREE.PlaneGeometry(1.8, 1.1);
      const plateMat = new THREE.MeshBasicMaterial({ 
        color: '#1a1b24', 
        opacity: 0.8, 
        transparent: true,
        side: THREE.DoubleSide
      });
      const plate = new THREE.Mesh(plateGeom, plateMat);
      chalkGroup.add(plate);

      // Mini 3D floating wire mock of the gun
      const gunMeshGeom = new THREE.BoxGeometry(1.2, 0.35, 0.1);
      const gunMeshMat = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', 
        emissive: '#ef4444', 
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.9 
      });
      const gunOutline = new THREE.Mesh(gunMeshGeom, gunMeshMat);
      gunOutline.position.z = 0.08;
      chalkGroup.add(gunOutline);

      scene.add(chalkGroup);
    });

    // --- SETUP CLASSIC MYSTERY BOX SYSTEM ---
    const createMysteryBoxModel = () => {
      const boxGroup = new THREE.Group();
      boxGroup.position.set(stateRef.current.mysteryBox.position.x, stateRef.current.mysteryBox.position.y, stateRef.current.mysteryBox.position.z);
      boxGroup.rotation.y = stateRef.current.mysteryBox.yaw || 0;

      // Bottom Base Chest
      const bGeom = new THREE.BoxGeometry(3.6, 0.9, 1.8);
      const bMat = new THREE.MeshStandardMaterial({ color: '#543b23', roughness: 0.8, map: woodTex });
      const base = new THREE.Mesh(bGeom, bMat);
      base.position.y = 0.45;
      base.castShadow = true;
      base.receiveShadow = true;
      boxGroup.add(base);

      // Lid Chest (Rotatable hinge)
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.9, -0.9); // Hinge located at back edge of chest
      lidGroup.name = 'lidGroup';

      const lGeom = new THREE.BoxGeometry(3.61, 0.5, 1.81);
      const lMat = new THREE.MeshStandardMaterial({ color: '#432e1a', roughness: 0.85, map: woodTex });
      const lid = new THREE.Mesh(lGeom, lMat);
      lid.position.set(0, 0.25, 0.9); // offset back so rotation works cleanly
      lid.castShadow = true;
      lidGroup.add(lid);
      boxGroup.add(lidGroup);

      // Neon Question Marks inside glowing trim
      const decGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const decMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' }); // Bright aqua
      const decLeft = new THREE.Mesh(decGeom, decMat);
      decLeft.position.set(-1.2, 0.45, 0.92);
      const decRight = decLeft.clone();
      decRight.position.x = 1.2;
      boxGroup.add(decLeft);
      boxGroup.add(decRight);

      // Beacon vertical column of mystery light (deactivated initially)
      const beamGeom = new THREE.CylinderGeometry(1.1, 1.1, 80, 16, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({ 
        color: '#0ea5e9', 
        transparent: true, 
        opacity: 0, 
        side: THREE.DoubleSide 
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.y = 40;
      boxGroup.add(beam);
      sceneElementsRef.current.mysteryBoxBeam = beam;

      // Inside floating Weapon holder
      const weaponFloater = new THREE.Group();
      weaponFloater.position.set(0, 1.2, 0);
      weaponFloater.scale.set(0, 0, 0); // hidden until opened
      boxGroup.add(weaponFloater);
      sceneElementsRef.current.weaponWeaponFloater = weaponFloater; // wait, map reference
      sceneElementsRef.current.mysteryBoxWeaponFloater = weaponFloater;

      scene.add(boxGroup);
      sceneElementsRef.current.mysteryBoxMesh = boxGroup;

      boxGroup.updateMatrixWorld(true);
      const collBox = new THREE.Box3().setFromObject(base);
      stateRef.current.collidables.push(collBox);
      stateRef.current.zombieCollidables.push(collBox);
    };

    createMysteryBoxModel();

    // Detailed enamel soda machines, with collision matching the coin tower.
    sceneElementsRef.current.perkMachineMeshes = {};
    const addPerkMachine = (id: 'juggernog' | 'speed_cola', x: number, z: number) => {
      const machine = createDetailedPerk(id);
      machine.position.set(x, 0, z);
      machine.rotation.y = Math.PI / 2;
      scene.add(machine);
      sceneElementsRef.current.perkMachineMeshes[id] = machine;
      machine.updateMatrixWorld(true);
      const bounds = (machine.userData.bodyBounds as THREE.Box3).clone().applyMatrix4(machine.matrixWorld);
      stateRef.current.collidables.push(bounds);
      stateRef.current.zombieCollidables.push(bounds);
    };
    addPerkMachine('juggernog', -14.1, -4);
    addPerkMachine('speed_cola', -38.1, 0);

    // ---WEAPON RENDERING SKIN SWITCHER ENGINE ---
    const rebuildWeaponVisuals = (activeId: string) => {
      const container = sceneElementsRef.current.weaponMeshContainer;
      const handMagContainer = sceneElementsRef.current.leftHandMagazine as unknown as THREE.Group | null;
      if (!container) return;

      disposeResources(container, handMagContainer);

      // Clear existing geometry
      while (container.children.length > 0) {
        container.remove(container.children[0]);
      }

      // Rebuild the helper leftHandMagazine to match the gun's specific magazine!
      if (handMagContainer) {
        while (handMagContainer.children.length > 0) {
          handMagContainer.remove(handMagContainer.children[0]);
        }
      }

      const { removableMagazineMesh, defaultMagPos } = buildWeaponModel(activeId, container, handMagContainer);

      // Re-link the updated magazine mesh so reloading animations use the correct customized visuals!
      sceneElementsRef.current.removableMagazine = removableMagazineMesh;

      // Update baseline magazine position
      baseMagPosRef.current.copy(defaultMagPos);
    };

    const buildActiveGunInCamera = () => {
      const gunGroup = new THREE.Group();
      
      // Placeholder group to contain the weapon parts that change on weapon switch!
      const weaponMeshContainer = new THREE.Group();
      weaponMeshContainer.name = "weaponMeshContainer";
      gunGroup.add(weaponMeshContainer);
      sceneElementsRef.current.weaponMeshContainer = weaponMeshContainer;

      // --- STYLIZED FIRST-PERSON HANDS (Right & Left) HOLDING THE FIREARM ---
      // Materials chosen to match tactical jackets and stylish gloves from the references
      const jacketSleeveMat = new THREE.MeshStandardMaterial({ color: '#1e222b', roughness: 0.85 }); // Detective dark jacket sleeve
      const gloveMat = new THREE.MeshStandardMaterial({ color: '#2b2a29', roughness: 0.75, metalness: 0.1 }); // Dark tactical glove back elements
      const gloveTrimMat = new THREE.MeshStandardMaterial({ color: '#634b35', roughness: 0.8 }); // Stylish brown leather accents/grips
      const handSkinMat = new THREE.MeshStandardMaterial({ color: '#df9f80', roughness: 0.6 }); // Smooth skin tone accents for finger joints/heels

      // --- RIGHT HAND (Dominant weapon hand wrapping the grip) ---
      const rightArmGroup = new THREE.Group();

      // 1. Sleek Right Sleeve (Forearm coming from bottom right corner of view)
      const rSleeveGeom = new THREE.CylinderGeometry(0.038, 0.048, 0.32, 12);
      const rSleeve = new THREE.Mesh(rSleeveGeom, jacketSleeveMat);
      rSleeve.rotation.x = Math.PI / 3.4; // Aimed up and towards the grip
      rSleeve.rotation.y = -Math.PI / 10;
      rSleeve.position.set(0.12, -0.28, -0.06);
      rightArmGroup.add(rSleeve);

      // 2. Right Glove Cuff/Wrist
      const rCuffGeom = new THREE.CylinderGeometry(0.039, 0.041, 0.05, 12);
      const rCuff = new THREE.Mesh(rCuffGeom, gloveTrimMat);
      rCuff.rotation.x = Math.PI / 3.4;
      rCuff.rotation.y = -Math.PI / 10;
      rCuff.position.set(0.09, -0.22, -0.11);
      rightArmGroup.add(rCuff);

      // 3. Right Glove Main Palm (Wraps the back-right of the pistol grip)
      const rPalmGeom = new THREE.BoxGeometry(0.076, 0.074, 0.082);
      const rPalm = new THREE.Mesh(rPalmGeom, gloveMat);
      rPalm.position.set(0.022, -0.14, -0.18);
      rPalm.rotation.set(Math.PI / 8, 0, -Math.PI / 24); // Tilted/aligned with pistol handle
      rightArmGroup.add(rPalm);

      // 4. Right Fingers wrapping the grip from Right (+X) to Front (-Z)
      const fingerSegmentGeom = new THREE.BoxGeometry(0.042, 0.018, 0.018);

      // Index finger (resting inside/just outside trigger guard)
      const rFingerIndex = new THREE.Mesh(fingerSegmentGeom, gloveTrimMat);
      rFingerIndex.position.set(0.02, -0.09, -0.25);
      rFingerIndex.rotation.y = -Math.PI / 4;
      rightArmGroup.add(rFingerIndex);

      // Middle finger
      const rFingerMiddle = new THREE.Mesh(fingerSegmentGeom, gloveMat);
      rFingerMiddle.position.set(0.025, -0.125, -0.23);
      rFingerMiddle.rotation.y = -Math.PI / 3;
      rightArmGroup.add(rFingerMiddle);

      // Ring finger
      const rFingerRing = new THREE.Mesh(fingerSegmentGeom, gloveMat);
      rFingerRing.position.set(0.025, -0.155, -0.21);
      rFingerRing.rotation.y = -Math.PI / 3;
      rightArmGroup.add(rFingerRing);

      // Pinky finger (rests right above base clamp)
      const rFingerPinky = new THREE.Mesh(fingerSegmentGeom, gloveMat);
      rFingerPinky.position.set(0.022, -0.185, -0.19);
      rFingerPinky.rotation.y = -Math.PI / 3;
      rightArmGroup.add(rFingerPinky);

      // Thumb (pressing forward on the Left side of receiver/grip)
      const rThumbGeom = new THREE.BoxGeometry(0.02, 0.016, 0.046);
      const rThumb = new THREE.Mesh(rThumbGeom, handSkinMat);
      rThumb.position.set(-0.038, -0.12, -0.21);
      rThumb.rotation.set(-Math.PI / 12, -Math.PI / 4, 0);
      rightArmGroup.add(rThumb);

      gunGroup.add(rightArmGroup);

      // --- LEFT HAND (Supporting hand cupping and steadying from Bottom Left) ---
      const leftArmGroup = new THREE.Group();

      // 1. Sleek Left Sleeve (Forearm angle coming from deep bottom left corner of view)
      const lSleeveGeom = new THREE.CylinderGeometry(0.036, 0.046, 0.35, 12);
      const lSleeve = new THREE.Mesh(lSleeveGeom, jacketSleeveMat);
      lSleeve.rotation.x = Math.PI / 3.2; // Steep rise to cup weapon base
      lSleeve.rotation.y = Math.PI / 6;
      lSleeve.position.set(-0.15, -0.30, -0.08);
      leftArmGroup.add(lSleeve);

      // 2. Left Glove Cuff/Wrist
      const lCuffGeom = new THREE.CylinderGeometry(0.037, 0.039, 0.05, 12);
      const lCuff = new THREE.Mesh(lCuffGeom, gloveTrimMat);
      lCuff.rotation.x = Math.PI / 3.2;
      lCuff.rotation.y = Math.PI / 6;
      lCuff.position.set(-0.09, -0.23, -0.13);
      leftArmGroup.add(lCuff);

      // 3. Left Glove Main Palm cupping index/thumb joint beneath the right palm
      const lPalmGeom = new THREE.BoxGeometry(0.078, 0.068, 0.078);
      const lPalm = new THREE.Mesh(lPalmGeom, gloveMat);
      lPalm.position.set(-0.025, -0.18, -0.20);
      lPalm.rotation.set(Math.PI / 6, Math.PI / 12, -Math.PI / 8);
      leftArmGroup.add(lPalm);

      // 4. Supporting Left fingers wrapping around knuckles of Right Hand
      const lFingerSegmentGeom = new THREE.BoxGeometry(0.044, 0.02, 0.02);

      const lFinger1 = new THREE.Mesh(lFingerSegmentGeom, gloveMat);
      lFinger1.position.set(-0.032, -0.145, -0.23);
      lFinger1.rotation.y = Math.PI / 3.5;
      leftArmGroup.add(lFinger1);

      const lFinger2 = new THREE.Mesh(lFingerSegmentGeom, gloveTrimMat);
      lFinger2.position.set(-0.03, -0.175, -0.21);
      lFinger2.rotation.y = Math.PI / 3.5;
      leftArmGroup.add(lFinger2);

      const lFinger3 = new THREE.Mesh(lFingerSegmentGeom, gloveMat);
      lFinger3.position.set(-0.026, -0.205, -0.19);
      lFinger3.rotation.y = Math.PI / 3.5;
      leftArmGroup.add(lFinger3);

      // Supporting Left Thumb wrapping across upper right hand backing
      const lThumbGeom = new THREE.BoxGeometry(0.018, 0.018, 0.042);
      const lThumb = new THREE.Mesh(lThumbGeom, gloveTrimMat);
      lThumb.position.set(0.02, -0.135, -0.22);
      lThumb.rotation.set(-Math.PI / 6, Math.PI / 6, Math.PI / 4);
      leftArmGroup.add(lThumb);

      // --- SECONDARY MAGAZINE ATTACHABLE TO LEFT HAND (DURING RELOADS) ---
      // We start with an empty Group which gets populated on the fly by rebuildWeaponVisuals!
      const lHandMagGroup = new THREE.Group();
      lHandMagGroup.position.set(-0.012, -0.16, -0.23);
      lHandMagGroup.rotation.set(Math.PI / 10, -Math.PI / 12, -Math.PI / 12);
      lHandMagGroup.visible = false; // Hidden during regular hip-fire/aiming
      leftArmGroup.add(lHandMagGroup);

      gunGroup.add(leftArmGroup);

      // Position nicely shifted to bottomer right corner quadrant of the viewport
      gunGroup.position.set(0.25, -0.25, -0.48);
      camera.add(gunGroup);
      scene.add(camera); // Must add tracking elements to view Hierarchy
      sceneElementsRef.current.weaponGroup = gunGroup;
      sceneElementsRef.current.leftArmGroup = leftArmGroup;
      sceneElementsRef.current.leftHandMagazine = lHandMagGroup as unknown as THREE.Mesh; // cast group to mesh for compatibility
      
      // Perform initial visual construction for the active weapon!
      const initialActiveId = stateRef.current.activeWeaponId || 'pistol';
      rebuildWeaponVisuals(initialActiveId);
      renderedWeaponIdRef.current = initialActiveId;
    };

    buildActiveGunInCamera();

    // --- KEY LISTENERS & WINDOW POINTER LOCK EVENTS ---
    let disposed = false;
    let lockPending = false;

    const releaseAim = () => {
      lockPending = false;
      stateRef.current.pointerLocked = false;
      stateRef.current.keys = {};
      stateRef.current.isAiming = false;
      stateRef.current.isMouseDown = false;
      renderer.domElement.style.cursor = '';
      setIsLocked(false);
      setIsPaused(true);
    };
    const handleLockError = () => {
      if (disposed || !lockPending) return;
      lockPending = false;
      stateRef.current.pointerLocked = false;
      stateRef.current.keys = {};
      stateRef.current.isMouseDown = false;
      stateRef.current.isAiming = false;
      setIsLocked(false);
      setIsPaused(false);
      window.dispatchEvent(new Event('zombies:aim-error'));
    };
    const acquireAim = () => {
      if (disposed || lockPending || stateRef.current.pointerLocked) return;
      lockPending = true;
      try {
        const request = renderer.domElement.requestPointerLock();
        request?.catch(handleLockError);
      } catch {
        handleLockError();
      }
    };
    const handleBlur = () => {
      releaseAim();
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBlur();
        return;
      }
      if (!stateRef.current.pointerLocked || isPausedRef.current) return;
      const k = e.key.toLowerCase();
      stateRef.current.keys[k] = true;

      // Manual weapon reloading key check
      if (k === 'r' && !stateRef.current.isReloading) {
        triggerWeaponReload();
      }

      // Weapon selections hotkey keys '1' and '2'
      if (k === '1' || k === '2') {
        switchActiveArsenalWeapon(k);
      }

      // Interaction Action trigger press (key F)
      if (k === 'f' || k === 'e') {
        resolveInteractEvent();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      stateRef.current.keys[k] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.pointerLocked || isPausedRef.current) return;
      
      const sensitivity = 0.0016;
      stateRef.current.player.yaw -= e.movementX * sensitivity;
      stateRef.current.player.pitch -= e.movementY * sensitivity;

      // Clamp vertical camera look to avoid rotating upside down
      const limit = Math.PI / 2 - 0.04;
      stateRef.current.player.pitch = Math.max(-limit, Math.min(limit, stateRef.current.player.pitch));

      // Visual lag/sway on mouse horizontal and vertical delta looks
      stateRef.current.sway.x += e.movementX * 0.0003;
      stateRef.current.sway.y -= e.movementY * 0.0003;
      stateRef.current.sway.rotX -= e.movementY * 0.0008;
      stateRef.current.sway.rotY += e.movementX * 0.0008;
    };

    const handlePointerLockChange = () => {
      const isLockedNow = document.pointerLockElement === renderer.domElement;
      if (isLockedNow) {
        lockPending = false;
          stateRef.current.pointerLocked = true;
        setIsLocked(true);
        setIsPaused(false);
      } else {
        releaseAim();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameStatusRef.current !== 'PLAYING') return;
      if (isPausedRef.current) return;
      
      if (e.button === 0) { // Left Click Down to shoot
        if (stateRef.current.pointerLocked) {
          stateRef.current.isMouseDown = true;
          fireTriggerShot(); // Shoot immediately on click
        }
      } else if (e.button === 2) { // Right Click Down to Aim
        if (stateRef.current.pointerLocked) {
          stateRef.current.isAiming = true;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) { // Left Click Up
        stateRef.current.isMouseDown = false;
      } else if (e.button === 2) { // Right Click Up to stop Aiming
        stateRef.current.isAiming = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Disable default browser right-click context menu during FPS gameplay
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handleLockError);
    window.addEventListener('zombies:acquire-aim', acquireAim);
    window.addEventListener('blur', handleBlur);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    // Initialise lock binding on canvas click
    const handleCanvasClick = (e: MouseEvent) => {
      if (gameStatusRef.current !== 'PLAYING') return;
      if (isPausedRef.current) return;
      
      if (!stateRef.current.pointerLocked) {
        if (e.button === 0) {
          acquireAim();
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // --- GAME ENGINE CLOCK LOOP ---
    const clock = new THREE.Clock();
    let animId: number;

    const gameLoop = () => {
      animId = requestAnimationFrame(gameLoop);

      // Dynamically rebuild weapon skin visuals if player swaps active weapon
      const currentActiveId = stateRef.current.activeWeaponId || 'pistol';
      if (renderedWeaponIdRef.current !== currentActiveId) {
        rebuildWeaponVisuals(currentActiveId);
        renderedWeaponIdRef.current = currentActiveId;
      }

      const dt = Math.min(0.08, clock.getDelta()); // clamp to avoid heavy jumps if frames dip

      if (isPausedRef.current || !stateRef.current.pointerLocked || gameStatusRef.current !== 'PLAYING') {
        renderer.render(scene, camera);
        return;
      }

      // Update calculations
      updateTacticalMovement(dt);
      updateWieldedWeapons(dt);

      // Handle automatic-fire weapon firing continuously when mouse is held down
      if (stateRef.current.isMouseDown && stateRef.current.pointerLocked) {
        const activeId = stateRef.current.activeWeaponId;
        const activeGun = stateRef.current.weapons[activeId];
        if (activeGun && activeGun.isAutomatic) {
          fireTriggerShot();
        }
      }

      updateMysteryBoxCycle(dt);
      updateActiveZombiesAI(dt);
      updateParticlesPhysics(dt);
      updateBulletsPhysics(dt);
      updateInteractDetection();

      // Final camera alignment
      camera.position.copy(stateRef.current.player.position);
      
      // Orient camera based on Pitch (Pitch x-axis) and Yaw (Yaw y-axis)
      const lookTarget = new THREE.Vector3(0, 0, -1);
      lookTarget.applyAxisAngle(new THREE.Vector3(1, 0, 0), stateRef.current.player.pitch);
      lookTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.player.yaw);
      lookTarget.add(camera.position);
      camera.lookAt(lookTarget);

      // Tactical gun positioning & bobbing updates
      if (sceneElementsRef.current.weaponGroup) {
        const isAiming = stateRef.current.isAiming || false;
        const s = stateRef.current;
        const p = s.player;

        // FOV adjustment for beautiful tactical zoom
        const targetFov = isAiming ? 55 : 75;
        if (camera && Math.abs(camera.fov - targetFov) > 0.1) {
          camera.fov += (targetFov - camera.fov) * 12 * dt;
          camera.updateProjectionMatrix();
        }

        // --- DECAY SWAY & RECOIL ---
        // Decay mouse look sway smoothly back to zero
        s.sway.x += (0 - s.sway.x) * 14 * dt;
        s.sway.y += (0 - s.sway.y) * 14 * dt;
        s.sway.rotX += (0 - s.sway.rotX) * 14 * dt;
        s.sway.rotY += (0 - s.sway.rotY) * 14 * dt;
        s.sway.rotZ += (0 - s.sway.rotZ) * 14 * dt;

        // Decay recoil over time back to 0
        s.recoil.pitch += (0 - s.recoil.pitch) * 12 * dt;
        s.recoil.yOffset += (0 - s.recoil.yOffset) * 12 * dt;
        s.recoil.zOffset += (0 - s.recoil.zOffset) * 12 * dt;
        s.recoil.rotZ += (0 - s.recoil.rotZ) * 12 * dt;

        // --- CALCULATE MOVEMENT-BASED INERTIA SWAY ---
        // Determine horizontal velocity in the player's personal directions (local forward, local strafe)
        const rightDirection = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        const localStrafeVel = p.velocity.dot(rightDirection);
        const forwardDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        const localForwardVel = p.velocity.dot(forwardDirection);

        // Map movement rate to weapon lag offset targets (strafe and runs)
        const normFactor = isAiming ? 0.35 : 1.0;
        const movementSwayX = -localStrafeVel * 0.006 * normFactor;
        const movementSwayY = localForwardVel * 0.0035 * normFactor;
        const movementRollZ = localStrafeVel * 0.016 * normFactor;

        // Base idle position targets for hip-fire vs ADS
        const baseTargetX = isAiming ? 0.0 : 0.25;
        const baseTargetY = isAiming ? -0.101 : -0.25;

        // Calculate custom bobbing offsets based on movement speeds
        let bobX = 0;
        let bobY = 0;
        const velSq = p.velocity.lengthSq();
        if (velSq > 0.05 && !p.isJumping) {
          const speedFactor = isAiming ? 6.0 : 11.0;
          const bobAmplitudeX = isAiming ? 0.0008 : 0.009;
          const bobAmplitudeY = isAiming ? 0.001 : 0.011;
          const t = clock.getElapsedTime() * speedFactor;
          bobY = Math.sin(t) * bobAmplitudeY;
          bobX = Math.cos(t * 0.5) * bobAmplitudeX;
        }

        // Apply visual gun height cushion on jump/land
        let jumpOffset = 0;
        if (p.isJumping) {
          jumpOffset = -Math.min(0.06, p.velocity.y * 0.006);
        }

        // Combine inputs: basic coords + bobbing + mouse look sway + movement sway + jump cushion + vertical recoil kick
        const clampedMouseSwayX = Math.max(-0.05, Math.min(0.05, s.sway.x));
        const clampedMouseSwayY = Math.max(-0.05, Math.min(0.05, s.sway.y));

        const targetX = baseTargetX + bobX - clampedMouseSwayX * 0.65 + movementSwayX;
        const targetY = baseTargetY + bobY - clampedMouseSwayY * 0.65 + movementSwayY + jumpOffset + s.recoil.yOffset;

        // Smoothly interpolate current weapon coordinates
        sceneElementsRef.current.weaponGroup.position.x += (targetX - sceneElementsRef.current.weaponGroup.position.x) * 15 * dt;
        sceneElementsRef.current.weaponGroup.position.y += (targetY - sceneElementsRef.current.weaponGroup.position.y) * 15 * dt;

        // Incorporate weapon group recoil Z pull-back
        const baseTargetZ = isAiming ? -0.38 : -0.48;
        const targetZ = baseTargetZ - s.recoil.zOffset;
        sceneElementsRef.current.weaponGroup.position.z += (targetZ - sceneElementsRef.current.weaponGroup.position.z) * 16 * dt;

        // Rotate the weapons to represent high-fidelity flow/inertia on mouse look and strafing movement
        const clampedMouseRotX = Math.max(-0.06, Math.min(0.06, s.sway.rotX));
        const clampedMouseRotY = Math.max(-0.06, Math.min(0.06, s.sway.rotY));

        sceneElementsRef.current.weaponGroup.rotation.x = -clampedMouseRotY * 0.65 + s.recoil.pitch;
        sceneElementsRef.current.weaponGroup.rotation.y = clampedMouseRotX * 0.8;

        // Return weapon Group rotation back to resting naturally, unless currently reloading
        const isReloading = s.isReloading;
        if (!isReloading) {
          sceneElementsRef.current.weaponGroup.rotation.z = -clampedMouseRotX * 0.55 + movementRollZ + s.recoil.rotZ;
        } else {
          // Slide reload handles rotation separately, let's blend reload rotations
          sceneElementsRef.current.weaponGroup.rotation.z += (0 - sceneElementsRef.current.weaponGroup.rotation.z) * 10 * dt;
        }
      }

      // Render view
      renderer.render(scene, camera);
    };

    gameLoop();

    // Resize container canvas
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // --- DESTRUCT DESCRIPTORS ---
    return () => {
      disposed = true;
      lockPending = false;
      window.removeEventListener('zombies:acquire-aim', acquireAim);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('pointerlockerror', handleLockError);
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
        renderer.domElement.removeEventListener('click', handleCanvasClick);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      brickTex.dispose();
      concreteTex.dispose();
      woodTex.dispose();
      steelTex.dispose();
      disposeResources(scene);
      renderer.dispose();
    };

  }, [gameStatus]);

  // --- TRIGGER SHOOTING LOGIC ON GUN CLICK ---
  const fireTriggerShot = () => {
    const s = stateRef.current;
    const activeId = s.activeWeaponId;
    const activeGun = s.weapons[activeId];
    if (!activeGun) return;

    if (s.isReloading) {
      audio.playEmptyClip();
      return;
    }

    if (activeGun.clip <= 0) {
      audio.playEmptyClip();
      if (activeGun.ammo > 0 && !s.isReloading) {
        triggerWeaponReload();
      }
      return;
    }

    const now = Date.now();
    // Fire rate check. If double tap perk is active, fire rate is cut in half (double rate of fire!)
    const hasDoubleTap = s.perks.includes('double_tap');
    const requiredInterval = hasDoubleTap ? activeGun.fireRate / 2 : activeGun.fireRate;
    
    if (now - s.lastShotTime < requiredInterval) {
      return;
    }

    s.lastShotTime = now;

    // Deduct bullet ammo synchronously in stateRef
    activeGun.clip -= 1;

    // Push update to React for UI rendering
    setWeapons((prev) => {
      const g = { ...prev[activeId] };
      g.clip = activeGun.clip;
      return { ...prev, [activeId]: g };
    });

    // Sound Synthesizers for gun sounds
    if (activeId === 'pistol') audio.playPistol();
    else if (activeId === 'carbine') audio.playThompson(); // sweet middle range rifle
    else if (activeId === 'thompson') audio.playThompson();
    else if (activeId === 'shotgun') audio.playShotgun();
    else if (activeId === 'raygun') audio.playRaygun();
    else if (activeId === 'thundergun') audio.playThundergun();

    // Trigger physical upkick & lag recoil on firing
    let pitchKick = 0;
    let verticalKick = 0;
    let backwardKick = 0;
    const rollSide = (Math.random() - 0.5) * 0.04;

    if (activeId === 'pistol') {
      pitchKick = 0.16;      // upward rotate
      verticalKick = 0.038;   // vertical height jump
      backwardKick = 0.082;   // pull back depth
    } else if (activeId === 'carbine') {
      pitchKick = 0.14;
      verticalKick = 0.034;
      backwardKick = 0.065;
    } else if (activeId === 'thompson') {
      pitchKick = 0.09;
      verticalKick = 0.022;
      backwardKick = 0.048;
    } else if (activeId === 'shotgun') {
      pitchKick = 0.35;      // heavy pump layout jumps high
      verticalKick = 0.085;
      backwardKick = 0.18;
    } else if (activeId === 'raygun') {
      pitchKick = 0.052;
      verticalKick = 0.012;
      backwardKick = 0.032;
    } else if (activeId === 'thundergun') {
      pitchKick = 0.30;
      verticalKick = 0.075;
      backwardKick = 0.24;
    }

    // Double-tap makes weapon handle recoil with slightly smaller intensity on high speed bullets
    if (s.perks.includes('double_tap')) {
      pitchKick *= 0.85;
      verticalKick *= 0.85;
      backwardKick *= 0.85;
    }

    s.recoil.pitch += pitchKick;
    s.recoil.yOffset += verticalKick;
    s.recoil.zOffset += backwardKick;
    s.recoil.rotZ += rollSide;

    // Trigger muzzle point flash
    if (sceneElementsRef.current.muzzleFlashLight) {
      sceneElementsRef.current.muzzleFlashLight.intensity = activeId === 'thundergun' ? 3.5 : 1.5;
    }

    // Capture precise camera aiming vectors to shoot raycasts
    const camera = sceneElementsRef.current.camera;
    const scene = sceneElementsRef.current.scene;
    if (!camera || !scene) return;

    const startPos = camera.position;
    const playerPos = s.player.position;

    // 1. Calculate camera directional basis vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    // 2. Compute muzzle start coordinate (shifted slightly forward, right, down)
    const muzzlePos = playerPos.clone()
      .addScaledVector(forward, 0.45)
      .addScaledVector(right, 0.16)
      .addScaledVector(up, -0.15);

    if (activeId === 'thundergun') {
      // ----------------- THUNDERGUN ACOUSTIC BLAST (AOI CONE SHOCKWAVE) -----------------
      // Spawns expanding wireframe acoustic shockwave sphere particle
      const shockGeom = new THREE.SphereGeometry(0.1, 16, 12);
      const shockMat = new THREE.MeshBasicMaterial({
        color: '#e2e8f0', // soft white/steel
        transparent: true,
        opacity: 0.45,
        wireframe: true
      });
      const shockMesh = new THREE.Mesh(shockGeom, shockMat);
      shockMesh.position.copy(muzzlePos);
      scene.add(shockMesh);

      // Scale-up fading sphere particle
      s.particles.push({
        mesh: shockMesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        noGravity: true,
        fadeOpacity: true,
        isScaleUp: true
      });

      // Spawns high-velocity compression gas particles
      const blastCount = 35;
      for (let i = 0; i < blastCount; i++) {
        const coneDir = forward.clone()
          .addScaledVector(right, (Math.random() - 0.5) * 0.75)
          .addScaledVector(up, (Math.random() - 0.5) * 0.6)
          .normalize();

        const blastGeom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const blastMat = new THREE.MeshBasicMaterial({
          color: Math.random() < 0.5 ? '#cbd5e1' : '#f1f5f9',
          transparent: true,
          opacity: 0.6
        });
        const bMesh = new THREE.Mesh(blastGeom, blastMat);
        bMesh.position.copy(muzzlePos);
        scene.add(bMesh);

        const speed = 15 + Math.random() * 15;
        s.particles.push({
          mesh: bMesh,
          velocity: coneDir.multiplyScalar(speed),
          life: 0,
          maxLife: 0.4 + Math.random() * 0.2,
          noGravity: true,
          fadeOpacity: true
        });
      }

      // Wide AoE (Area of Influence) Zombie Sweep
      s.zombies.forEach((z) => {
        if (z.isDead) return;
        const zPos = new THREE.Vector3(z.position.x, playerPos.y, z.position.z);
        const dist = playerPos.distanceTo(zPos);

        if (dist <= 13.0) {
          // Check if zombie is in front cone of player
          const toZom = new THREE.Vector3().subVectors(zPos, playerPos).normalize();
          const dot = toZom.dot(forward);

          if (dot >= 0.42) { // 65-degree cone
            // Set massive physical blown away knockback push vector!
            const knockDir = new THREE.Vector3().subVectors(zPos, playerPos);
            knockDir.y = 0;
            knockDir.normalize();

            z.knockback = {
              x: knockDir.x * 24.0,
              z: knockDir.z * 24.0,
              duration: 0.5
            };

            // Thundergun delivers huge shockblast damage
            const dmgScale = activeGun.damage;
            const finalDmg = s.gameState.instaKillTimeLeft > 0 ? z.maxHp : dmgScale;

            damageZombieInstance(z, finalDmg, false, zPos);
          }
        }
      });

    } else {
      // ----------------- TARGET SINGLE RAYCASTING SHOT (REGULAR & RAYGUN) -----------------
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      // Filter environment meshes
      const envMeshes: THREE.Object3D[] = [];
      scene.children.forEach((obj) => {
        if (obj !== camera && obj.type === 'Mesh') {
          envMeshes.push(obj);
        }
      });

      // Filter active zombies
      const activeZombieMeshes: THREE.Object3D[] = [];
      s.zombies.forEach((z) => {
        if (z.meshReference && !z.isDead) {
          activeZombieMeshes.push(z.meshReference);
        }
      });

      const envIntersects = raycaster.intersectObjects(envMeshes, false);
      const zombieIntersects = raycaster.intersectObjects(activeZombieMeshes, true);

      let finalHitPoint = startPos.clone().addScaledVector(forward, 30.0);
      let hitZombie: Zombie | null = null;
      let isHeadshot = false;
      let closestDist = Infinity;

      // Find closest zombie hit
      if (zombieIntersects.length > 0) {
        const zHit = zombieIntersects[0];
        if (zHit.distance < closestDist) {
          closestDist = zHit.distance;
          finalHitPoint.copy(zHit.point);
          
          // Bubble up to retrieve correct Zombie ID
          let currentObj: THREE.Object3D | null = zHit.object;
          while (currentObj) {
            if (currentObj.name && currentObj.name.startsWith('zombie_')) {
              const zId = currentObj.name.replace('zombie_', '');
              hitZombie = s.zombies.find((z) => z.id === zId) || null;
              break;
            }
            currentObj = currentObj.parent;
          }

          let hitPart: THREE.Object3D | null = zHit.object;
          while (hitPart && hitPart !== hitZombie?.meshReference) {
            if (hitPart.name === 'head_block') isHeadshot = true;
            hitPart = hitPart.parent;
          }
        }
      }

      // Find closer environmental/scenery boundary hit
      let hitEnvironment = false;
      if (envIntersects.length > 0) {
        const eHit = envIntersects[0];
        if (eHit.distance < closestDist) {
          closestDist = eHit.distance;
          finalHitPoint.copy(eHit.point);
          hitZombie = null;
          hitEnvironment = true;
        }
      }

      if (activeId === 'raygun') {
        // ------------- RAY GUN GREEN PLASMA LASER BEAM -------------
        const dist = muzzlePos.distanceTo(finalHitPoint);
        const beamGeom = new THREE.CylinderGeometry(0.015, 0.015, dist, 6);
        beamGeom.rotateX(Math.PI / 2);
        beamGeom.translate(0, 0, dist / 2);

        const beamMat = new THREE.MeshBasicMaterial({
          color: '#22c55e', // luminous bright green
          transparent: true,
          opacity: 0.95
        });
        const beamMesh = new THREE.Mesh(beamGeom, beamMat);
        beamMesh.position.copy(muzzlePos);
        beamMesh.lookAt(finalHitPoint);
        scene.add(beamMesh);

        // Neon laser lasts for 0.12 seconds!
        s.particles.push({
          mesh: beamMesh,
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0.12,
          noGravity: true,
          fadeOpacity: true
        });

        // Spawn bright green sparkles at target
        spawnDustSparkles(finalHitPoint, '#10b981', 12);

      } else {
        // ------------- REGULAR WEAPON BLACK BULLET & SPARK TRAIL -------------
        const bGeom = new THREE.BoxGeometry(0.015, 0.015, 0.06);
        const bMat = new THREE.MeshBasicMaterial({ color: '#111827' }); // solid charcoal black bullet
        const bMesh = new THREE.Mesh(bGeom, bMat);
        bMesh.position.copy(muzzlePos);
        scene.add(bMesh);

        s.bullets.push({
          position: muzzlePos.clone(),
          direction: forward.clone(),
          damage: activeGun.damage,
          mesh: bMesh,
          life: 0,
          maxLife: 0.12,
          target: finalHitPoint.clone(),
          start: muzzlePos.clone(),
          type: 'regular'
        });
      }

      // Apply standard ray damage and instant blood/sparks splatters
      if (hitZombie && !hitZombie.isDead) {
        const dmgScale = isHeadshot ? activeGun.damage * 2.5 : activeGun.damage;
        const finalDmg = s.gameState.instaKillTimeLeft > 0 ? hitZombie.maxHp : dmgScale;

        damageZombieInstance(hitZombie, finalDmg, isHeadshot, finalHitPoint);
      } else if (hitEnvironment) {
        // Soft brown masonry wall spark triggers
        spawnDustSparkles(finalHitPoint, '#c1a687', 5);
      } else if (!hitZombie && closestDist < Infinity) {
        spawnDustSparkles(finalHitPoint, '#a1a1aa', 5);
      }
    }

    // Automatically trigger reload if clip goes empty and we have backup reserve ammo
    if (activeGun.clip === 0 && activeGun.ammo > 0 && !s.isReloading) {
      triggerWeaponReload();
    }
  };

  // --- WEAPON RELOAD MECHANICS ---
  const triggerWeaponReload = () => {
    const s = stateRef.current;
    const activeId = s.activeWeaponId;
    const activeGun = s.weapons[activeId];
    if (!activeGun || activeGun.clip === activeGun.clipSize || activeGun.ammo <= 0) return;

    s.isReloading = true;
    s.magazineDroppedForCurrentReload = false;
    
    // Check speed cola perk for faster reloads
    const hasSpeedCola = s.perks.includes('speed_cola');
    const baseReloadTime = activeGun.reloadTime;
    const finalReloadTime = hasSpeedCola ? baseReloadTime / 2 : baseReloadTime;

    s.reloadTimeLeft = finalReloadTime;
    s.reloadDuration = finalReloadTime;
    audio.playReload();
  };

  const switchActiveArsenalWeapon = (key: string) => {
    const p = stateRef.current.player;
    const activeId = stateRef.current.activeWeaponId;
    const secondaryId = stateRef.current.secondaryWeaponId;

    if (!secondaryId) return; // one weapon slot only

    // Switch check keys
    if (key === '1' && activeId !== playerState.activeWeaponId) {
      // Swap is handled by React trigger state syncs
    }

    setPlayerState((prev) => {
      if (prev.secondaryWeaponId === null) return prev;
      return {
        ...prev,
        activeWeaponId: prev.secondaryWeaponId,
        secondaryWeaponId: prev.activeWeaponId
      };
    });
    audio.playReload();
  };

  // --- ZOMBIE IMPACT HURT & DECEASE MECHANICS ---
  const damageZombieInstance = (z: Zombie, dmg: number, isHeadshot: boolean, hitPoint: THREE.Vector3) => {
    z.hp -= dmg;
    z.lastHurtTime = Date.now();

    // Trigger splattering blood effects
    spawnDustSparkles(hitPoint, '#a51c1c', 15); // Dark blood particles

    // Score calculations
    let pointsAwarded = 10; // +10 on standard hit
    if (stateRef.current.gameState.doublePointsTimeLeft > 0) pointsAwarded *= 2;

    onReceivePoints(pointsAwarded, `+${pointsAwarded}`);
    audio.playZombieHurt();

    // Check if dead
    if (z.hp <= 0) {
      eliminateZombieInstance(z, isHeadshot, hitPoint);
    }
  };

  const eliminateZombieInstance = (z: Zombie, isHeadshot: boolean, hitPoint: THREE.Vector3) => {
    z.isDead = true;
    audio.playZombieDie();

    // Award major credits cash indices
    let killPoints = isHeadshot ? 100 : 60;
    if (stateRef.current.gameState.doublePointsTimeLeft > 0) killPoints *= 2;

    onReceivePoints(killPoints, isHeadshot ? `HEADSHOT +${killPoints}` : `ELIMINATION +${killPoints}`);

    // Update global game kills stats
    setGameState((prev) => ({
      ...prev,
      kills: prev.kills + 1,
      headshots: prev.headshots + (isHeadshot ? 1 : 0),
      zombiesRemainingInRound: Math.max(0, prev.zombiesRemainingInRound - 1)
    }));

    // Spawn massive blood burst
    spawnDustSparkles(hitPoint, '#8b0000', 30);

    // Release and fade zombie group from ThreeJS scene hierarchy
    if (z.meshReference && sceneElementsRef.current.scene) {
      const mesh = z.meshReference;
      
      // Flash model red
      mesh.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.set('#f87171');
            child.material.emissiveIntensity = 0.7;
          } else if (child.material instanceof THREE.MeshBasicMaterial) {
            child.material.color.set('#f87171');
          }
        }
      });

      // Slide carcass downwards under floor
      let fadeCount = 0;
      const slideInterval = setInterval(() => {
        if (mesh && mesh.position) {
          mesh.position.y -= 0.12;
          fadeCount++;
          if (fadeCount > 25) {
            clearInterval(slideInterval);
            mesh.removeFromParent();
            disposeResources(mesh);
          }
        } else {
          clearInterval(slideInterval);
        }
      }, 40);
    }

    // Remove zombie from stateRef buffer
    stateRef.current.zombies = stateRef.current.zombies.filter((item) => item.id !== z.id);

    // Roll high-percentage chance of launching a beautiful glowing PowerUp capsule! (5.5% drop rate)
    if (Math.random() < 0.08) {
      spawnPowerUpItem(z.position);
    }
  };

  // --- DAMAGE PARTICLES SYNTH PHYSICS (E.g. Blood drops, dusty sparkles) ---
  const spawnDustSparkles = (pos: THREE.Vector3, color: string, count: number = 8) => {
    const scene = sceneElementsRef.current.scene;
    if (!scene) return;

    for (let i = 0; i < count; i++) {
      const partGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const partMat = new THREE.MeshBasicMaterial({ color: color });
      const p = new THREE.Mesh(partGeom, partMat);
      p.position.copy(pos);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 1.5,
        (Math.random() - 0.5) * 5
      );

      scene.add(p);
      stateRef.current.particles.push({
        mesh: p,
        velocity: vel,
        life: 0,
        maxLife: 0.65 // disappears after 0.65 seconds
      });
    }
  };

  // --- POWER UP ITEM SYSTEM Mappings (Max Ammo, Kaboom, etc) ---
  const spawnPowerUpItem = (pos: { x: number, y: number, z: number }) => {
    const scene = sceneElementsRef.current.scene;
    if (!scene) return;

    const types: PowerUpType[] = ['max_ammo', 'insta_kill', 'double_points', 'nuke'];
    const selected = types[Math.floor(Math.random() * types.length)];

    const powerGroup = new THREE.Group();
    powerGroup.position.set(pos.x, 1.2, pos.z);

    // Glowing halo mesh
    const haloGeom = new THREE.SphereGeometry(0.6, 12, 12);
    let haloColor = '#22c55e'; // Green for max ammo default
    if (selected === 'insta_kill') haloColor = '#ef4444'; // Red
    else if (selected === 'double_points') haloColor = '#06b6d4'; // Blue
    else if (selected === 'nuke') haloColor = '#eab308'; // Amber

    const haloMat = new THREE.MeshBasicMaterial({ 
      color: haloColor, 
      transparent: true, 
      opacity: 0.45, 
      wireframe: true 
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    powerGroup.add(halo);

    // Inner physical capsule model representer
    const capGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.9 });
    const cap = new THREE.Mesh(capGeom, capMat);
    powerGroup.add(cap);

    scene.add(powerGroup);
    audio.playPowerUpSpawn();

    const pUp: PowerUp = {
      id: Math.random().toString(),
      type: selected,
      position: { x: pos.x, y: 1.2, z: pos.z },
      duration: 30, // remains on floor for 30s
      meshReference: powerGroup
    };

    stateRef.current.powerUps.push(pUp);
  };

  const resolvePowerUpGrab = (p: PowerUp) => {
    // Play loud announce chimes
    audio.playPowerUpGrab(p.type);

    if (p.type === 'max_ammo') {
      // REFILL ALL WEAPONS AMMO POOLS!
      setWeapons((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          updated[id].ammo = updated[id].maxAmmo;
          updated[id].clip = updated[id].clipSize; // fully reloaded too!
        });
        return updated;
      });
      // Label floating text alerts
      triggerFloatingPointsText('MAX AMMO REFILLED!', '#22c55e');

    } else if (p.type === 'insta_kill') {
      setGameState((prev) => ({ ...prev, instaKillTimeLeft: 30000 }));
      triggerFloatingPointsText('INSTA-KILL COMMENCED!', '#ef4444');

    } else if (p.type === 'double_points') {
      setGameState((prev) => ({ ...prev, doublePointsTimeLeft: 30000 }));
      triggerFloatingPointsText('DOUBLE POINTS ACTIVATED!', '#06b6d4');

    } else if (p.type === 'nuke') {
      // Vaporize all active screen zombies!
      const activeZombies = [...stateRef.current.zombies];
      
      let nukeGain = 400;
      if (stateRef.current.gameState.doublePointsTimeLeft > 0) nukeGain *= 2;
      
      onReceivePoints(nukeGain, `KABOOM +${nukeGain}`);

      activeZombies.forEach((z) => {
        eliminateZombieInstance(z, false, new THREE.Vector3(z.position.x, z.position.y + 1, z.position.z));
      });

      // Large white flash alert camera shake
      triggerFloatingPointsText('BOOM! ALL ZOMBIES PURGED', '#eab308');

      // Visual flash glow
      if (sceneElementsRef.current.scene) {
        const flashGeom = new THREE.PlaneGeometry(200, 200);
        const flashMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1 });
        const flash = new THREE.Mesh(flashGeom, flashMat);
        flash.position.set(0, 5, 0);
        flash.rotation.x = -Math.PI / 2;
        sceneElementsRef.current.scene.add(flash);

        let op = 1;
        const decay = setInterval(() => {
          op -= 0.1;
          if (flash && flash.material) {
            flash.material.opacity = op;
          }
          if (op <= 0) {
            clearInterval(decay);
            if (sceneElementsRef.current.scene && sceneElementsRef.current.scene.children.includes(flash)) {
              sceneElementsRef.current.scene.remove(flash);
            }
          }
        }, 50);
      }
    }

    // Purge capsule from rendering arrays
    if (p.meshReference && sceneElementsRef.current.scene) {
      sceneElementsRef.current.scene.remove(p.meshReference);
    }
    stateRef.current.powerUps = stateRef.current.powerUps.filter((item) => item.id !== p.id);
  };

  // --- FLOATING TEXT ALERT WRAPPER ---
  const triggerFloatingPointsText = (label: string, color: string) => {
    // Communicate notification hooks back to parent
    onReceivePoints(0, label);
  };

  // --- PROCEDURAL ENGINE CALCULATIONS (60Hz Frame Updaters) ---

  // 1. Tactical Player WASD Movement & Physics collisions
  const updateTacticalMovement = (dt: number) => {
    const p = stateRef.current.player;
    const keys = stateRef.current.keys;

    // Movement speeds configurations.
    // If juggernog is loaded, you survive more hits but movement speed is standard.
    // Slow down movement speed while aiming for a more realistic, focused feel.
    const speedPower = stateRef.current.isAiming ? 4.8 : 9.8; 

    // Compute direct ground forwards vectors from rotation angles
    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw).normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw).normalize();

    const targetVel = new THREE.Vector3();

    if (keys['w'] || keys['arrowup']) targetVel.add(forwardVec);
    if (keys['s'] || keys['arrowdown']) targetVel.sub(forwardVec);
    if (keys['d'] || keys['arrowright']) targetVel.add(rightVec);
    if (keys['a'] || keys['arrowleft']) targetVel.sub(rightVec);

    targetVel.normalize().multiplyScalar(speedPower);

    // Blend values for smooth physical deceleration/slippage sliding
    p.velocity.x += (targetVel.x - p.velocity.x) * 12 * dt;
    p.velocity.z += (targetVel.z - p.velocity.z) * 12 * dt;

    // Jump capabilities physics
    const gravity = 22.0;
    if (keys[' '] && !p.isJumping) {
      p.isJumping = true;
      p.velocity.y = 8.5; // launch thrust vertical speed
    }

    if (p.isJumping) {
      p.velocity.y -= gravity * dt;
    } else {
      p.velocity.y = 0;
    }

    // Apply incremental translation values
    const moveX = p.velocity.x * dt;
    const moveZ = p.velocity.z * dt;
    const moveY = p.velocity.y * dt;

    // Direct collision checking against obstacles. 
    // Slide along walls smoothly rather than halting!
    const testPos = p.position.clone();

    // Check X axis first
    testPos.x += moveX;
    if (!checkObstacleCollisions(testPos)) {
      p.position.x = testPos.x;
    } else {
      p.velocity.x = 0;
    }

    // Check Z axis second
    testPos.copy(p.position);
    testPos.z += moveZ;
    if (!checkObstacleCollisions(testPos)) {
      p.position.z = testPos.z;
    } else {
      p.velocity.z = 0;
    }

    // Apply Vertical Jump translations (clamped at eye floor level)
    p.position.y += moveY;
    if (p.position.y <= p.height) {
      p.position.y = p.height;
      p.isJumping = false;
      p.velocity.y = 0;
    }

    // Outer map limits; the divider and annex walls supply the interior boundaries.
    p.position.x = Math.max(-38.4, Math.min(14.8, p.position.x));
    p.position.z = Math.max(-14.8, Math.min(14.8, p.position.z));

    // Player health regeneration checks. Health regens twice as fast with Quick Revive!
    const regInterval = playerState.perks.includes('quick_revive') ? 2200 : 4400; // time in ms before regen kicks in
    if (p.health < p.maxHealth) {
      p.regenTimer += dt * 1000;
      if (p.regenTimer >= regInterval) {
        p.health = Math.min(p.maxHealth, p.health + 20 * dt * 60);
        // Dispatch heal health updates back to React UI
        setPlayerState((prev) => ({ ...prev, health: Math.floor(p.health) }));
      }
    }

    // Active screen proximity checks on power ups floor collections!
    stateRef.current.powerUps.forEach((pUp) => {
      const dist = p.position.distanceTo(new THREE.Vector3(pUp.position.x, 1.8, pUp.position.z));
      if (dist < 1.8) {
        resolvePowerUpGrab(pUp);
      }
    });
  };

  const checkObstacleCollisions = (pos: THREE.Vector3): boolean => {
    const r = stateRef.current.player.radius;
    // Build a bounding box encapsulating player bounding volume cylinder
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - r, 0, pos.z - r),
      new THREE.Vector3(pos.x + r, 4, pos.z + r)
    );

    for (let i = 0; i < stateRef.current.collidables.length; i++) {
      if (playerBox.intersectsBox(stateRef.current.collidables[i])) {
        return true;
      }
    }
    return false;
  };

  const checkZombieObstacleCollisions = (pos: THREE.Vector3, radius: number = 0.55): boolean => {
    // Build a bounding box encapsulating zombie bounding volume cylinder
    const zombieBox = new THREE.Box3(
      new THREE.Vector3(pos.x - radius, 0, pos.z - radius),
      new THREE.Vector3(pos.x + radius, 4, pos.z + radius)
    );

    for (let i = 0; i < stateRef.current.zombieCollidables.length; i++) {
      if (zombieBox.intersectsBox(stateRef.current.zombieCollidables[i])) {
        return true;
      }
    }
    return false;
  };

  // 2. Weapon Recoil restorations & Reload times tracking
  const updateWieldedWeapons = (dt: number) => {
    const s = stateRef.current;
    
    // Weapon reload timer increments
    if (s.isReloading) {
      s.reloadTimeLeft -= dt * 1000;
      if (s.reloadTimeLeft <= 0) {
        s.isReloading = false;
        
        // Finalize reload calculations: pull from max pools
        const activeId = s.activeWeaponId;
        const activeGun = s.weapons[activeId];
        if (activeGun) {
          const bulletsNeeded = activeGun.clipSize - activeGun.clip;
          const bulletsToLoad = Math.min(bulletsNeeded, activeGun.ammo);
          activeGun.clip += bulletsToLoad;
          activeGun.ammo -= bulletsToLoad;

          setWeapons((prev) => {
            const g = { ...prev[activeId] };
            g.clip = activeGun.clip;
            g.ammo = activeGun.ammo;
            return { ...prev, [activeId]: g };
          });
        }
      }
    }

    // --- FIRST-PERSON PROCEDURAL RELOAD ANIMATION TRACKER ---
    const leftArm = sceneElementsRef.current.leftArmGroup;
    const itemMag = sceneElementsRef.current.removableMagazine;
    const handMag = sceneElementsRef.current.leftHandMagazine;

    if (leftArm && itemMag && handMag) {
      if (s.isReloading) {
        // Calculate progress ratio (t ranges from 0.0 to 1.0)
        const t = Math.max(0, Math.min(1.0, 1.0 - (s.reloadTimeLeft / s.reloadDuration)));

        if (t <= 0.40) {
          // --- PHASE 1: REACHING, GRABBING AND YANKING THE MAGAZINE DOWNWARDS OUT OF VIEW ---
          const reachDuration = 0.12;
          if (t < reachDuration) {
            // Reaching to grab the magazine
            const phaseRatio = t / reachDuration;
            // Guide left hand to the seat of the handle magazine
            leftArm.position.set(
              0.012 * phaseRatio,
              -0.12 * phaseRatio, // move down closer to handle base
              0.02 * phaseRatio
            );
            leftArm.rotation.set(
              (Math.PI / 24) * phaseRatio,
              -(Math.PI / 32) * phaseRatio,
              0
            );

            // Magazine remains inside the gun's handle slot
            itemMag.position.copy(baseMagPosRef.current);
            itemMag.visible = true;
            handMag.visible = false;
          } else {
            // Yanking the magazine downwards out of the screen
            const phaseRatio = (t - reachDuration) / (0.40 - reachDuration); // 0.0 to 1.0
            
            // Slide current magazine downwards relative to the gun handle
            const slideY = 0.65 * phaseRatio;
            const slideZ = 0.65 * Math.tan(Math.PI / 8) * phaseRatio; // aligns along handle angling axis
            
            itemMag.position.copy(baseMagPosRef.current);
            itemMag.position.y -= slideY;
            itemMag.position.z += slideZ;
            itemMag.visible = true;

            // Make the left hand follow/glove-grip the sliding magazine
            leftArm.position.set(
              0.012,
              -0.12 - slideY,
              0.02 + slideZ
            );
            leftArm.rotation.set(
              (Math.PI / 24),
              -(Math.PI / 32),
              0
            );
            handMag.visible = false;
          }

        } else if (t <= 0.60) {
          // --- PHASE 2: THROW CHIP TO FLOOR & RETRIEVE NEW CHIP FROM WAIST ---
          
          // Trigger physics debris drop exactly once when letting go at t = 0.40
          if (!s.magazineDroppedForCurrentReload) {
            s.magazineDroppedForCurrentReload = true;
            
            // Hide the old magazine from the gun's model
            itemMag.visible = false;

            // Spawn a genuine physical magazine box that falls to the floor!
            const scene = sceneElementsRef.current.scene;
            const camera = sceneElementsRef.current.camera;
            if (scene) {
              let debrisGeom: THREE.BufferGeometry = new THREE.BoxGeometry(0.045, 0.16, 0.05);
              let debrisMat = new THREE.MeshStandardMaterial({ color: '#161719', roughness: 0.6, metalness: 0.8 });
              
              const activeId = stateRef.current.activeWeaponId;
              if (activeId === 'thompson') {
                debrisGeom = new THREE.CylinderGeometry(0.095, 0.095, 0.045, 12);
                debrisMat = new THREE.MeshStandardMaterial({ color: '#25262c', roughness: 0.4, metalness: 0.9 });
              } else if (activeId === 'shotgun') {
                debrisGeom = new THREE.BoxGeometry(0.042, 0.12, 0.046);
                debrisMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 });
              } else if (activeId === 'raygun') {
                debrisGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8);
                debrisMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.4, metalness: 0.9 });
              } else if (activeId === 'thundergun') {
                debrisGeom = new THREE.BoxGeometry(0.075, 0.16, 0.11);
                debrisMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.4 });
              }
              
              const pMesh = new THREE.Mesh(debrisGeom, debrisMat);
              if (activeId === 'thompson' || activeId === 'raygun') {
                pMesh.rotation.x = Math.PI / 2;
                pMesh.rotation.z = Math.PI / 2;
              }
              
              const worldPos = new THREE.Vector3();
              leftArm.getWorldPosition(worldPos);
              pMesh.position.copy(worldPos);
              
              // Calculate player look angle to drop forward and down
              const forward = new THREE.Vector3(0, 0, -1);
              if (camera) {
                forward.applyQuaternion(camera.quaternion);
              }
              const vel = new THREE.Vector3()
                .copy(forward)
                .multiplyScalar(0.4)
                .add(new THREE.Vector3(0.08 * (Math.random() - 0.5), -4.0, 0.08 * (Math.random() - 0.5)));
                
              scene.add(pMesh);
              s.particles.push({
                mesh: pMesh,
                velocity: vel,
                life: 0,
                maxLife: 2.0
              });
            }
          }

          itemMag.visible = false; // Empty slot
          
          // Hand searches pocket/belt down below, grabs fresh clip
          const searchRatio = (t - 0.40) / 0.20; // 0.0 to 1.0
          
          // Hand reaches further downwards into holster/waist belt pouch
          const waistYOffset = -0.65 - 0.25 * Math.sin(searchRatio * Math.PI);
          const waistXOffset = 0.012 - 0.15 * Math.sin(searchRatio * Math.PI); // search slightly closer to chest/belly button

          leftArm.position.set(waistXOffset, waistYOffset, 0.08);
          leftArm.rotation.set(-Math.PI / 10, -Math.PI / 12, -Math.PI / 12);

          // Once we reach mid-search, visual fresh clip appears in glove palm!
          if (searchRatio > 0.6) {
            handMag.visible = true; // fresh glowing bullets visible inside fingers
          } else {
            handMag.visible = false;
          }

        } else if (t <= 0.86) {
          // --- PHASE 3: RISE WITH FRESH MAGAZINE AND GUIDE IT UP TO GRIP ---
          itemMag.visible = false; // still empty gun socket
          handMag.visible = true;  // holding fresh one in fingers
          
          const phaseRatio = (t - 0.60) / 0.26; // 0.0 to 1.0
          
          // Smooth rise path from waist back up to handle slot
          const targetArmX = -0.15 * (1.0 - phaseRatio) + 0.012 * phaseRatio;
          const targetArmY = -0.65 - 0.25 * (1.0 - phaseRatio) + (-0.12) * phaseRatio; // curve slightly outward on way up
          const targetArmZ = 0.08 * (1.0 - phaseRatio) + 0.02 * phaseRatio;

          leftArm.position.set(targetArmX, targetArmY, targetArmZ);
          leftArm.rotation.set(
            (Math.PI / 24) * phaseRatio,
            -(Math.PI / 32) * phaseRatio,
            0
          );

        } else if (t <= 0.92) {
          // --- SLAM CLAMP MAG BACK IN! (SATISFYING SNAP) ---
          const phaseRatio = (t - 0.86) / 0.06; // 0.0 to 1.0
          
          // Hand slams/locks mag in forcefully
          leftArm.position.set(0.012, -0.12 + 0.01 * Math.sin(phaseRatio * Math.PI), 0.02);
          
          // Instantly toggle clip visual visibility on chamber lock!
          handMag.visible = false;
          itemMag.visible = true;
          itemMag.position.copy(baseMagPosRef.current);

          // Give a beautiful physical force kick to gun group (simulates ammo slot recoil punch!)
          if (sceneElementsRef.current.weaponGroup) {
            sceneElementsRef.current.weaponGroup.position.y = -0.22; // punch gun up
            sceneElementsRef.current.weaponGroup.rotation.z = -0.06; // slight tilt on trigger lock
          }

        } else {
          // --- PHASE 4: LEFT HAND RETURNS BACK SLOWLY TO THE RESTING SUPPORT POSITION ---
          const phaseRatio = (t - 0.92) / 0.08; // 0.0 to 1.0
          
          leftArm.position.set(0.012 * (1.0 - phaseRatio), -0.12 * (1.0 - phaseRatio), 0.02 * (1.0 - phaseRatio));
          leftArm.rotation.set((Math.PI / 24) * (1.0 - phaseRatio), -(Math.PI / 32) * (1.0 - phaseRatio), 0);

          itemMag.visible = true;
          itemMag.position.copy(baseMagPosRef.current);
          handMag.visible = false;

          // return weapon Group rotation back to resting
          if (sceneElementsRef.current.weaponGroup) {
            sceneElementsRef.current.weaponGroup.rotation.z += (0 - sceneElementsRef.current.weaponGroup.rotation.z) * 10 * dt;
          }
        }
      } else {
        // Not reloading: keep everything locked tightly in idle
        leftArm.position.set(0, 0, 0);
        leftArm.rotation.set(0, 0, 0);

        itemMag.position.copy(baseMagPosRef.current);
        itemMag.visible = true;
        handMag.visible = false;
      }
    }

    // Fade out muzzle flash illumination
    if (sceneElementsRef.current.muzzleFlashLight && sceneElementsRef.current.muzzleFlashLight.intensity > 0) {
      sceneElementsRef.current.muzzleFlashLight.intensity -= 30 * dt;
      if (sceneElementsRef.current.muzzleFlashLight.intensity < 0) {
        sceneElementsRef.current.muzzleFlashLight.intensity = 0;
      }
    }
  };

  // 3. Mystery Box lid rotations, floaters, and rolls
  const updateMysteryBoxCycle = (dt: number) => {
    const box = stateRef.current.mysteryBox;
    const lidGroup = sceneElementsRef.current.mysteryBoxMesh?.getObjectByName('lidGroup') as THREE.Group | undefined;
    const floater = sceneElementsRef.current.mysteryBoxWeaponFloater;
    const beam = sceneElementsRef.current.mysteryBoxBeam;

    if (!lidGroup || !floater || !beam) return;

    if (box.isRolling) {
      // 1. Rotate lid open smoothly around hinge (rotY rotates down back border)
      const targetRotationRad = -Math.PI * 0.65; // open backwards
      lidGroup.rotation.x += (targetRotationRad - lidGroup.rotation.x) * 5 * dt;

      // Make beam visible
      if (beam.material) {
        (beam.material as THREE.Material).opacity += (0.45 - (beam.material as THREE.Material).opacity) * 5 * dt;
      }

      // Roll sequence timers
      box.rollTimer -= dt;
      
      // Scale and float weapon mesh out
      floater.scale.set(1.4, 1.4, 1.4);
      floater.position.y += (1.4 - floater.position.y) * 4 * dt;
      floater.rotation.y += 5 * dt; // spin weapon

      if (box.rollTimer <= 0) {
        // Halt roll, present target weapon!
        box.isRolling = false;
        box.isOpen = true;
        box.interactTimer = 8.0; // player has 8 seconds to grab it

        audio.playMysteryBoxWeapon();
        // lock chosen gun in
        box.currentWeaponId = box.weaponsList[Math.floor(Math.random() * box.weaponsList.length)];
        
        // update Floater visual representing the gun chosen 
        rebuildFloaterWeaponVisual(box.currentWeaponId);
      } else {
        // Fast cycle mock models to display high speed selection
        if (Math.random() < 0.12) {
          audio.playMysteryBoxWeapon();
          const rId = box.weaponsList[Math.floor(Math.random() * box.weaponsList.length)];
          rebuildFloaterWeaponVisual(rId);
        }
      }
    } else if (box.isOpen) {
      // Keep float weapon rotating
      floater.rotation.y += 1.5 * dt;
      
      box.interactTimer -= dt;
      if (box.interactTimer <= 0) {
        // Box times out, close box lid!
        box.isOpen = false;
        box.currentWeaponId = null;
      }
    } else {
      // Close Lid mesh slowly
      lidGroup.rotation.x += (0 - lidGroup.rotation.x) * 6 * dt;
      
      // Hide beacon
      if (beam.material) {
        (beam.material as THREE.Material).opacity += (0 - (beam.material as THREE.Material).opacity) * 6 * dt;
      }

      // Shrink floater
      floater.scale.set(0, 0, 0);
      floater.position.y = 0.5;
    }
  };

  const rebuildFloaterWeaponVisual = (gunId: string) => {
    const floater = sceneElementsRef.current.mysteryBoxWeaponFloater;
    if (!floater) return;

    // Purge previous floater children
    while (floater.children.length > 0) {
      floater.remove(floater.children[0]);
    }

    // Build miniature wire shape of corresponding items
    const coreGeom = new THREE.BoxGeometry(0.8, 0.25, 0.1);
    
    // RAY GUN GIVES OFF MENACING EMISSIVE LIGHT
    let color = '#a1a1a1';
    let em = '#000000';
    if (gunId === 'raygun') {
      color = '#ef4444';
      em = '#10b981';
    } else if (gunId === 'thundergun') {
      color = '#38bdf8';
      em = '#0284c7';
    }

    const coreMat = new THREE.MeshStandardMaterial({ 
      color: color, 
      roughness: 0.2, 
      metalness: 0.9,
      emissive: em,
      emissiveIntensity: 0.7 
    });
    const mainBox = new THREE.Mesh(coreGeom, coreMat);
    floater.add(mainBox);
  };

  // 4. ACTIVE ZOMBIES AI: PATHING AND ATTACK CHECKS
  const updateActiveZombiesAI = (dt: number) => {
    const s = stateRef.current;
    if (s.gameState.isRoundActive && s.zombies.length === 0 && s.gameState.zombiesToSpawn === 0) {
      // ROUND COMPLETED SUCCESFULLY!
      setGameState((prev) => {
        const nextRound = prev.currentRound + 1;
        audio.playRoundEnd();
        
        // Wait 4 seconds, then start next round
        setTimeout(() => {
          setGameState((prevNext) => ({
            ...prevNext,
            currentRound: nextRound,
            isRoundActive: true,
            zombiesToSpawn: 6 + (nextRound * 4),
            zombiesRemainingInRound: 6 + (nextRound * 4),
            roundsSurvived: prevNext.roundsSurvived + 1
          }));
          audio.playRoundStart();
        }, 4500);

        return {
          ...prev,
          isRoundActive: false
        };
      });
    }

    // Spawning zombies from window barricades
    if (s.gameState.isRoundActive && s.gameState.zombiesToSpawn > 0) {
      s.zombieSpawnTimer += dt * 1000;
      // Spawn every 3 - (round * 0.1) seconds, minimum 1 second delay
      const interval = Math.max(1000, 3000 - s.gameState.currentRound * 105);
      
      if (s.zombieSpawnTimer >= interval) {
        s.zombieSpawnTimer = 0;
        
        // Pick random window barricade to spawn at
        const spawners = s.barricades;
        if (spawners.length > 0) {
          const bar = spawners[Math.floor(Math.random() * spawners.length)];
          
          spawnZombieFromBarricade(bar);
        }
      }
    }

    // AI navigation loop
    const playerPos = s.player.position;
    
    s.zombies.forEach((z) => {
      if (z.isDead) return;

      // Spawning climbing animation: hauling themselves from beneath the floor
      if (z.isClimbing) {
        z.climbingTime = (z.climbingTime || 0) + dt;
        const dur = z.climbDuration || 2.2;
        const ratio = Math.min(1.0, z.climbingTime / dur);

        // Interpolate Y from -2.0 (underground) up to 0.1 (standard floor height)
        z.position.y = -2.0 + 2.1 * ratio;

        if (z.meshReference) {
          z.meshReference.position.set(z.position.x, z.position.y, z.position.z);
          z.meshReference.rotation.y = z.yaw;

          // Reach up with arms and alternate leg offsets to simulate dragging forward/climbing
          const leftLeg = z.meshReference.getObjectByName('left_leg');
          const rightLeg = z.meshReference.getObjectByName('right_leg');
          const leftArm = z.meshReference.getObjectByName('left_arm');
          const rightArm = z.meshReference.getObjectByName('right_arm');

          const swing = Math.sin(z.climbingTime * 7.5);
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = swing * 0.7;
            rightLeg.rotation.x = -swing * 0.7;
            leftLeg.position.y = 0.32 + Math.abs(swing) * 0.12;
            rightLeg.position.y = 0.32 + Math.abs(swing) * 0.12;
          }
          if (leftArm && rightArm) {
            leftArm.rotation.x = -Math.PI / 1.5 + swing * 0.55;
            rightArm.rotation.x = -Math.PI / 1.5 - swing * 0.55;
          }
        }

        if (ratio >= 1.0) {
          z.isClimbing = false;
          z.position.y = 0.1;
        }
        return; // Pause pathfinding/attacking/random growling while actively climbing
      }

      const zPos = new THREE.Vector3(z.position.x, playerPos.y, z.position.z);
      
      // Proximity damage checks. 
      // If zombie is standing near interactive wood board, claw board down!
      // Otherwise, walk toward player.
      let barricadeToAttack: Barricade | null = null;
      s.barricades.forEach((bar) => {
        const d = new THREE.Vector3(bar.position.x, 0, bar.position.z).distanceTo(new THREE.Vector3(z.position.x, 0, z.position.z));
        if (d < 3.2 && bar.boards > 0) {
          barricadeToAttack = bar;
        }
      });

      if (barricadeToAttack) {
        // Claw wood board
        z.attackCooldown -= dt * 1000;
        if (z.attackCooldown <= 0) {
          z.attackCooldown = 2200; // takes 2.2s per wood plank claw
          
          // Deduct board plank
          const updatedBoards = Math.max(0, (barricadeToAttack as Barricade).boards - 1);
          (barricadeToAttack as Barricade).boards = updatedBoards;
          audio.playBarricadeRepair(); // play wooden crack sound

          // update boards representation mesh
          const planks = (barricadeToAttack as Barricade).meshReference?.getObjectByName('planks');
          if (planks) {
            const board = planks.getObjectByName(`board_${updatedBoards}`) as THREE.Mesh | undefined;
            if (board) {
              board.visible = false;
            }
          }
        }
        
        // Standard growl sound triggers
        if (Math.random() < 0.005) {
          audio.playZombieGrowl();
        }

      } else {
        // Walk directly straight toward student
        const target = pursuitTarget(zPos, playerPos);
        const dir = new THREE.Vector3().subVectors(target, zPos).normalize();
        
        // Orient yaw angles face player
        z.yaw = Math.atan2(dir.x, dir.z);

        // Calculate physical knockback drift if active
        let kbX = 0;
        let kbZ = 0;
        if (z.knockback && z.knockback.duration > 0) {
          const ratio = Math.max(0, z.knockback.duration / 0.5); // decay over 0.5s starting frame
          kbX = z.knockback.x * ratio;
          kbZ = z.knockback.z * ratio;
          z.knockback.duration -= dt;
        }

        // Advance position coords with smooth sliding collision checks against obstacles
        const moveX = (dir.x * z.speed + kbX) * dt;
        const moveZ = (dir.z * z.speed + kbZ) * dt;

        const testPosX = new THREE.Vector3(z.position.x + moveX, z.position.y, z.position.z);
        if (!checkZombieObstacleCollisions(testPosX, 0.55)) {
          z.position.x += moveX;
        }

        const testPosZ = new THREE.Vector3(z.position.x, z.position.y, z.position.z + moveZ);
        if (!checkZombieObstacleCollisions(testPosZ, 0.55)) {
          z.position.z += moveZ;
        }

        // Apply visual bob animations on grouping child meshes (legs rocking)
        if (z.meshReference) {
          z.meshReference.position.set(z.position.x, z.position.y, z.position.z);
          z.meshReference.rotation.y = z.yaw;

          z.animTime += dt * z.speed * 3.5;
          const leftLeg = z.meshReference.getObjectByName('left_leg');
          const rightLeg = z.meshReference.getObjectByName('right_leg');
          const leftArm = z.meshReference.getObjectByName('left_arm');
          const rightArm = z.meshReference.getObjectByName('right_arm');

          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(z.animTime) * 0.55;
            rightLeg.rotation.x = -Math.sin(z.animTime) * 0.55;
          }

          // Raise arms in front to grab player
          if (leftArm && rightArm) {
            leftArm.rotation.x = -Math.PI / 2.3 + Math.sin(z.animTime) * 0.1;
            rightArm.rotation.x = -Math.PI / 2.3 - Math.sin(z.animTime) * 0.1;
          }
        }

        // Grunt/gargle sounds randomly
        if (Math.random() < 0.004) {
          audio.playZombieGrowl();
        }

        // Attack Player physically when in close proximity
        const distanceToPlayer = playerPos.distanceTo(new THREE.Vector3(z.position.x, playerPos.y, z.position.z));
        if (distanceToPlayer < 1.7) {
          z.attackCooldown -= dt * 1000;
          if (z.attackCooldown <= 0) {
            z.attackCooldown = 1500; // standard cool down lock
            hurtPlayerState(35); // zombies do 35 damage per hit
          }
        }
      }
    });
  };

  const spawnZombieFromBarricade = (bar: Barricade) => {
    const scene = sceneElementsRef.current.scene;
    const groupGroup = sceneElementsRef.current.zombieModelsGroup;
    if (!scene || !groupGroup) return;

    // Deduct spawning balance
    setGameState((prev) => ({ ...prev, zombiesToSpawn: Math.max(0, prev.zombiesToSpawn - 1) }));

    const s = stateRef.current;
    const zId = Math.random().toString();
    
    // Add random horizontal spawn offset relative to wall orientation to prevent spawning on top of each other
    let xOffset = 0;
    let zOffset = 0;
    const isHorizontalWall = Math.abs(bar.yaw) < 0.1 || Math.abs(Math.abs(bar.yaw) - Math.PI) < 0.1;
    if (isHorizontalWall) {
      xOffset = (Math.random() - 0.5) * 1.5; // randomize slightly along horizontal window opening X-axis
    } else {
      zOffset = (Math.random() - 0.5) * 1.5; // randomize slightly along horizontal window opening Z-axis
    }
    const pos = { 
      x: bar.position.x + xOffset, 
      y: -2.0, // Start beneath the floor
      z: bar.position.z + zOffset 
    };
    
    // Scale zombie health HP based on round!
    // Round 1: 100 HP, increases exponentially by 15% per round
    const scaleHp = Math.round(100 * Math.pow(1.15, s.gameState.currentRound - 1));

    // Speeds. More runners/sprinters on higher rounds!
    const isSprintingChance = Math.random() < Math.min(0.85, (s.gameState.currentRound - 1) * 0.1);
    const speed = isSprintingChance ? 4.9 : (1.4 + Math.random() * 0.8); // sprint vs slow shambling

    const z: Zombie = {
      id: zId,
      position: pos,
      hp: scaleHp,
      maxHp: scaleHp,
      speed: speed,
      width: 1.2,
      height: 2.0,
      isDead: false,
      isCrawler: false,
      attackCooldown: 1000,
      yaw: bar.yaw,
      animTime: Math.random() * 10,
      isSprinting: isSprintingChance,
      lastHurtTime: 0,
      isClimbing: true,
      climbingTime: 0,
      climbDuration: 2.2
    };

    const zMesh = createDetailedZombie(Math.floor(Math.random() * 3));
    zMesh.name = `zombie_${zId}`;
    zMesh.position.set(pos.x, pos.y, pos.z);
    zMesh.rotation.y = bar.yaw;

    groupGroup.add(zMesh);
    z.meshReference = zMesh;

    stateRef.current.zombies.push(z);
  };

  const hurtPlayerState = (dmg: number) => {
    const p = stateRef.current.player;
    if (gameStatusRef.current !== 'PLAYING') return;

    p.health = Math.max(0, p.health - dmg);
    p.regenTimer = 0; // reset health recovery cooldown trigger!
    audio.playPlayerHurt();
    audio.playZombieAttackScreech();

    setPlayerState((prev) => ({ ...prev, health: p.health }));

    if (p.health <= 0) {
      triggerSurvivalGameOver();
    }
  };

  const triggerSurvivalGameOver = () => {
    audio.playGameOverTune();
    // unlock mouse pointers locks
    document.exitPointerLock();
    
    setPlayerState((prev) => ({ ...prev, isDead: true }));
  };

  // 5. FX DUST PHYSICS & AMBIENT WIND PARTICLES EASES
  const updateParticlesPhysics = (dt: number) => {
    const s = stateRef.current;
    if (!sceneElementsRef.current.scene) return;

    const activeList = [...s.particles];
    s.particles = [];

    activeList.forEach((p) => {
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Purge
        sceneElementsRef.current.scene?.remove(p.mesh);
      } else {
        if (!p.noGravity) {
          // Fall down with gravity drift
          p.velocity.y -= 9.8 * dt;
          p.mesh.position.addScaledVector(p.velocity, dt);
          
          // Shrink particle dimensions scale over life
          const scale = Math.max(0.001, 1 - (p.life / p.maxLife));
          p.mesh.scale.set(scale, scale, scale);
        } else {
          // Apply velocity drift even if no gravity
          p.mesh.position.addScaledVector(p.velocity, dt);

          // Custom scaling behaviors
          if (p.isScaleUp) {
            const scale = 1 + (p.life / p.maxLife) * 11.0; // grow to 12.0
            p.mesh.scale.set(scale, scale, scale);
          }
        }

        // Fade transparency over life
        if (p.fadeOpacity) {
          const ratio = 1 - (p.life / p.maxLife);
          p.mesh.traverse((child: any) => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = ratio;
            }
          });
        }
        
        s.particles.push(p);
      }
    });

    // Spinning PowerUp drop items physics bobbing in air
    s.powerUps.forEach((pUp) => {
      pUp.duration -= dt;
      if (pUp.duration <= 0) {
        // Time out, dissolve
        if (pUp.meshReference && sceneElementsRef.current.scene) {
          sceneElementsRef.current.scene.remove(pUp.meshReference);
        }
        s.powerUps = s.powerUps.filter((item) => item.id !== pUp.id);
      } else {
        // Rotates and floats with a nice cosine wave
        if (pUp.meshReference) {
          pUp.meshReference.rotation.y += 1.2 * dt;
          pUp.meshReference.position.y = 1.2 + Math.cos(Date.now() * 0.003) * 0.12;
        }
      }
    });
  };

  const updateBulletsPhysics = (dt: number) => {
    const s = stateRef.current;
    if (!sceneElementsRef.current.scene) return;
    const scene = sceneElementsRef.current.scene;

    const activeBullets = [...s.bullets];
    s.bullets = [];

    activeBullets.forEach((b) => {
      b.life += dt;
      const totalLife = b.maxLife || 0.12; // default fast travel time (0.12s)

      if (b.life >= totalLife) {
        // Impact destination reached! Remove the flying bullet body
        scene.remove(b.mesh);
        
        // Spawn additional small splash sparkles at target coords
        if (b.target) {
          if (b.type === 'ray') {
            spawnDustSparkles(b.target, '#22c55e', 4);
          } else {
            spawnDustSparkles(b.target, '#f97316', 3);
          }
        }
      } else {
        // Move towards target
        if (b.start && b.target) {
          const ratio = Math.min(1.0, b.life / totalLife);
          const prevPos = b.position.clone();
          
          b.position.lerpVectors(b.start, b.target, ratio);
          b.mesh.position.copy(b.position);
          b.mesh.lookAt(b.target);

          // Generate thick smoke (gray + orange spark trail) along the flight line segments
          if (b.type === 'regular') {
            const steps = 3;
            for (let i = 0; i <= steps; i++) {
              const trailPt = new THREE.Vector3().lerpVectors(prevPos, b.position, i / steps);
              const isOrange = Math.random() < 0.40; // 40% orange, 60% gray trail mix
              
              const partGeom = new THREE.BoxGeometry(0.015, 0.015, 0.015);
              const partMat = new THREE.MeshBasicMaterial({
                color: isOrange ? '#f97316' : '#94a3b8',
                transparent: true,
                opacity: 0.8
              });
              const trailSpark = new THREE.Mesh(partGeom, partMat);
              trailSpark.position.copy(trailPt);
              scene.add(trailSpark);

              s.particles.push({
                mesh: trailSpark,
                velocity: new THREE.Vector3(
                  (Math.random() - 0.5) * 0.4,
                  (Math.random() - 0.5) * 0.4,
                  (Math.random() - 0.5) * 0.4
                ),
                life: 0,
                maxLife: 0.24,
                noGravity: true // float in mid-air
              });
            }
          }
        }
        
        s.bullets.push(b);
      }
    });
  };

  // 6. RAYCAST PROXIMITY DETECTION TO WALL-BUYS, BOX, PERKS
  const updateInteractDetection = () => {
    const s = stateRef.current;
    const pPos = s.player.position;
    
    // Default null prompt
    let closestMsg: string | null = null;

    // Detect closest Wall Buys
    let foundInteract = false;
    s.wallBuys.forEach((wb) => {
      const distance = pPos.distanceTo(new THREE.Vector3(wb.position.x, pPos.y, wb.position.z));
      if (distance < 2.5 && !foundInteract) {
        const gun = s.weapons[wb.weaponId];
        const hasGun = s.activeWeaponId === wb.weaponId || s.secondaryWeaponId === wb.weaponId;
        
        if (hasGun) {
          closestMsg = `REFUEL AMMO: ${gun.name} [$${Math.round(wb.cost / 2)}]`;
        } else {
          closestMsg = `BUY WALL WEAPON: ${gun.name} [$${wb.cost}]`;
        }
        foundInteract = true;
      }
    });

    // Detect closest Window Barricades needing repairs
    s.barricades.forEach((bar) => {
      const distance = pPos.distanceTo(new THREE.Vector3(bar.position.x, pPos.y, bar.position.z));
      if (distance < 3.2 && bar.boards < bar.maxBoards && !foundInteract) {
        closestMsg = `BOARD UP BARRICADE (+10 PTS)`;
        foundInteract = true;
      }
    });

    // Detect Mystery Box prompt proximity
    if (!foundInteract) {
      const box = s.mysteryBox;
      const dist = pPos.distanceTo(new THREE.Vector3(box.position.x, pPos.y, box.position.z));
      if (dist < 3.5) {
        if (box.isOpen && box.currentWeaponId) {
          closestMsg = `SWAP IN WEAPON: ${s.weapons[box.currentWeaponId]?.name}!`;
        } else if (!box.isOpen && !box.isRolling) {
          closestMsg = `ROLL MYSTERY BOX [$950]`;
        }
        foundInteract = true;
      }
    }

    // Detect Perk Vending Shrines
    if (!foundInteract) {
      const perksList: PerkType[] = ['juggernog', 'speed_cola', 'double_tap', 'quick_revive'];
      perksList.forEach((id) => {
        const mesh = sceneElementsRef.current.perkMachineMeshes[id];
        if (mesh && !foundInteract) {
          const dist = pPos.distanceTo(new THREE.Vector3(mesh.position.x, pPos.y, mesh.position.z));
          if (dist < 2.5) {
            const hasPerk = s.perks.includes(id);
            if (hasPerk) {
              closestMsg = `PERK ALREADY ACTIVE: ${id === 'speed_cola' ? 'Speed Cola (50% shorter reloads)' : 'Juggernog'}`;
            } else {
              let label = 'Juggernog Health';
              let cost = 2500;
              if (id === 'speed_cola') { label = 'Speed Cola (50% shorter reloads)'; cost = 3000; }
              else if (id === 'double_tap') { label = 'Double Tap Speeds'; cost = 2000; }
              else if (id === 'quick_revive') { label = 'Quick Revive Regen'; cost = 1500; }

              closestMsg = `DRINK ${label} SODA [$${cost}]`;
            }
            foundInteract = true;
          }
        }
      });
    }

    setInteractPrompt(closestMsg);
  };

  // --- RESOLVE INTERACTION MANEUVERS (Key F Pressed) ---
  const resolveInteractEvent = () => {
    const s = stateRef.current;
    const pPos = s.player.position;

    // Check Wall buy purchase integration
    let done = false;
    s.wallBuys.forEach((wb) => {
      const distance = pPos.distanceTo(new THREE.Vector3(wb.position.x, pPos.y, wb.position.z));
      if (distance < 2.5 && !done) {
        done = true;
        const gun = s.weapons[wb.weaponId];
        const activeId = s.activeWeaponId;
        const secondaryId = s.secondaryWeaponId;

        const hasGun = activeId === wb.weaponId || secondaryId === wb.weaponId;

        if (hasGun) {
          // buy standard ammo refills (half price)
          const ammoCost = Math.round(wb.cost / 2);
          if (s.player.points >= ammoCost) {
            audio.playPerkPurchase();
            onReceivePoints(-ammoCost, `AMMO REFILLED -$${ammoCost}`);
            
            // refill ammo pools inside ref synchronously
            gun.ammo = gun.maxAmmo;
            gun.clip = gun.clipSize;

            // refill ammo pools
            setWeapons((prev) => {
              const u = { ...prev };
              u[wb.weaponId].ammo = u[wb.weaponId].maxAmmo;
              u[wb.weaponId].clip = u[wb.weaponId].clipSize;
              return u;
            });
          } else {
            triggerFloatingPointsText('INSUFFICIENT FUNDS REQUIRED!', '#ef4444');
          }
        } else {
          // purchase wall buy gun
          if (s.player.points >= wb.cost) {
            audio.playPerkPurchase();
            onReceivePoints(-wb.cost, `${gun.name} PURCHASED -$${wb.cost}`);
            
            // unlock inside s.weapons sync ref
            gun.isUnlocked = true;

            // equip gun
            setWeapons((prev) => {
              const u = { ...prev };
              u[wb.weaponId].isUnlocked = true;
              return u;
            });

            setPlayerState((prev) => {
              // If only holding starting pistol, place starting pistol in secondary and set new buy active!
              if (prev.secondaryWeaponId === null) {
                return {
                  ...prev,
                  activeWeaponId: wb.weaponId,
                  secondaryWeaponId: prev.activeWeaponId
                };
              } else {
                // overwrite active weapon
                return {
                  ...prev,
                  activeWeaponId: wb.weaponId
                };
              }
            });
          } else {
            triggerFloatingPointsText('INSUFFICIENT FUNDS REQUIRED!', '#ef4444');
          }
        }
      }
    });

    if (done) return;

    // Boarding up windows repairs barricades! (+10 credits cash)
    s.barricades.forEach((bar) => {
      const distance = pPos.distanceTo(new THREE.Vector3(bar.position.x, pPos.y, bar.position.z));
      if (distance < 3.2 && bar.boards < bar.maxBoards && !done) {
        done = true;
        
        const newBoardIndex = bar.boards;
        bar.boards += 1;
        audio.playBarricadeRepair();

        // flash board back active in ThreeJS frame
        const planks = bar.meshReference?.getObjectByName('planks');
        if (planks) {
          const board = planks.getObjectByName(`board_${newBoardIndex}`) as THREE.Mesh | undefined;
          if (board) {
            board.visible = true;
          }
        }

        // +10 credit gains (max board credit limit caps up to +50 per round)
        let repairGain = 10;
        if (s.gameState.doublePointsTimeLeft > 0) repairGain *= 2;

        onReceivePoints(repairGain, `BARRICADE REPAIRED +${repairGain}`);
      }
    });

    if (done) return;

    // Mystery box roll triggering
    const box = s.mysteryBox;
    const dist = pPos.distanceTo(new THREE.Vector3(box.position.x, pPos.y, box.position.z));
    if (dist < 3.5) {
      if (box.isOpen && box.currentWeaponId) {
        // Settle swap in
        audio.playPerkPurchase();
        
        const targetId = box.currentWeaponId;
        box.isOpen = false;
        box.currentWeaponId = null;

        // Unlock in ref synchronously
        s.weapons[targetId].isUnlocked = true;
        s.weapons[targetId].ammo = s.weapons[targetId].maxAmmo;
        s.weapons[targetId].clip = s.weapons[targetId].clipSize;

        setWeapons((prev) => {
          const u = { ...prev };
          u[targetId].isUnlocked = true;
          u[targetId].ammo = u[targetId].maxAmmo; // fill ammo
          u[targetId].clip = u[targetId].clipSize;
          return u;
        });

        setPlayerState((prev) => {
          if (prev.secondaryWeaponId === null) {
            return {
              ...prev,
              activeWeaponId: targetId,
              secondaryWeaponId: prev.activeWeaponId
            };
          } else {
            return {
              ...prev,
              activeWeaponId: targetId
            };
          }
        });
        
        triggerFloatingPointsText('ARM GRABBED FROM BOX!', '#10b981');

      } else if (!box.isOpen && !box.isRolling) {
        if (s.player.points >= 950) {
          onReceivePoints(-950, 'MYSTERY BOX ROLLING -$950');
          
          box.isRolling = true;
          box.rollTimer = 2.4; // spins for 2.4 seconds
        } else {
          triggerFloatingPointsText('INSUFFICIENT FUNDS REQUIRED!', '#ef4444');
        }
      }
    }

    if (done) return;

    // Perk Soda Shriner purchasing
    const perksList: PerkType[] = ['juggernog', 'speed_cola', 'double_tap', 'quick_revive'];
    perksList.forEach((id) => {
      const mesh = sceneElementsRef.current.perkMachineMeshes[id];
      if (mesh && !done) {
        const d = pPos.distanceTo(new THREE.Vector3(mesh.position.x, pPos.y, mesh.position.z));
        if (d < 2.5) {
          done = true;
          const hasPerk = s.perks.includes(id);
          
          if (!hasPerk) {
            // lookup pricing params
            let cost = 2500;
            let display = 'JUGGERNOG SODA';
            if (id === 'speed_cola') { cost = 3000; display = 'SPEED COLA'; }
            else if (id === 'double_tap') { cost = 2000; display = 'DOUBLE TAP ROOTBEER'; }
            else if (id === 'quick_revive') { cost = 1500; display = 'QUICK REVIVE POP'; }

            if (s.player.points >= cost) {
              audio.playPerkPurchase();
              onReceivePoints(-cost, `${display} ACTIVATED -$${cost}`);

              setPlayerState((prev) => {
                const updatedPerks = [...prev.perks, id];
                let nextHp = prev.health;
                let maxHp = prev.maxHealth;

                if (id === 'juggernog') {
                  maxHp = 250; // Juggernog ups health base limits from 100 to 250 (survives much more attacks!)
                  nextHp = 250;
                  stateRef.current.player.maxHealth = 250;
                  stateRef.current.player.health = 250;
                }

                return {
                  ...prev,
                  perks: updatedPerks,
                  maxHealth: maxHp,
                  health: nextHp
                };
              });

            } else {
              triggerFloatingPointsText('INSUFFICIENT SODA FUNDS!', '#ef4444');
            }
          }
        }
      }
    });
  };

  return (
    <div 
      id="fps-game-container" 
      ref={containerRef} 
      className="absolute inset-0 bg-black cursor-crosshair"
    />
  );
};
export default GameCanvas;
