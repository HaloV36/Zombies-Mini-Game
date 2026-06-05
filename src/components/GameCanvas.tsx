/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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

// Procedural texture generators to make the environment look amazingly atmospheric!
function createBrickTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // Background mortar
  ctx.fillStyle = '#2e2d2b';
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw bricks
  ctx.fillStyle = '#6e3025';
  const rows = 16;
  const cols = 8;
  const brickH = 256 / rows;
  const brickW = 256 / cols;
  
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW / 2);
    ctx.fillStyle = r % 2 === 0 ? '#54261f' : '#632c24';
    
    // Add dirt
    for (let c = -1; c <= cols + 1; c++) {
      ctx.fillRect(c * brickW + offset + 1, r * brickH + 1, brickW - 2, brickH - 2);
      
      // Grainy highlights
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      if (Math.random() > 0.5) {
        ctx.fillRect(c * brickW + offset + 2, r * brickH + 2, brickW * 0.3, brickH * 0.3);
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

function createConcreteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#303236';
  ctx.fillRect(0, 0, 256, 256);
  
  // Add dark grunge specks
  for (let i = 0; i < 400; i++) {
    const size = Math.random() * 3 + 1;
    const opacity = Math.random() * 0.25;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity * 0.3})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, size, size);
  }
  
  // Draw faded yellow border safety lines
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 236, 236);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createWoodTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Base light brown
  ctx.fillStyle = '#8a5c37';
  ctx.fillRect(0, 0, 128, 512);
  
  // Darker wood grain lines
  ctx.strokeStyle = '#5c3d23';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = (128 / 8) * i + Math.random() * 10;
    ctx.moveTo(x, 0);
    // wavy grain
    for (let y = 0; y <= 512; y += 32) {
      x += Math.sin(y * 0.05) * 2 + (Math.random() * 2 - 1);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Split accents
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(5, 0, 10, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createSteelTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#5c5f66';
  ctx.fillRect(0, 0, 128, 128);
  
  // Rust stains
  ctx.fillStyle = 'rgba(139, 69, 19, 0.35)'; // Rust orange
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 25 + 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Metallic rivets on corners
  ctx.fillStyle = '#3c3e42';
  ctx.beginPath();
  ctx.arc(10, 10, 4, 0, Math.PI * 2);
  ctx.arc(118, 10, 4, 0, Math.PI * 2);
  ctx.arc(10, 118, 4, 0, Math.PI * 2);
  ctx.arc(118, 118, 4, 0, Math.PI * 2);
  ctx.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
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
    scene.fog = new THREE.FogExp2('#0c0d12', 0.042);
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const ambientLight = new THREE.AmbientLight('#262734', 1.2);
    scene.add(ambientLight);

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
        map: brickTex, 
        roughness: 0.9, 
        metalness: 0.05 
      });
      wallMat.map!.repeat.set(width / 3, height / 3);
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

    // Left (West) Wall (Single solid wall - where Juggernog is placed)
    createWall(2, hWallHeight, 32, new THREE.Vector3(-16, 6, 0));

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

    // --- CHROME PERK-A-COLA VENDING SHRINES ---
    const createPerkMachine = (id: PerkType, name: string, color: string, x: number, z: number, yAngle: number = 0) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(x, 0, z);
      pGroup.rotation.y = yAngle;

      // Outer metallic container
      const bodyGeom = new THREE.BoxGeometry(2.0, 4.4, 1.5);
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: '#22252a', 
        roughness: 0.15, 
        metalness: 0.95,
        map: steelTex
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 2.2;
      body.castShadow = true;
      body.receiveShadow = true;
      pGroup.add(body);

      // Colored front vending plate panel
      const plateGeom = new THREE.BoxGeometry(1.7, 3.4, 0.15);
      const plateMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.5 });
      const plate = new THREE.Mesh(plateGeom, plateMat);
      plate.position.set(0, 2.0, 0.76);
      pGroup.add(plate);

      // Glowing Neon Cap Top Logo sign
      const signGeom = new THREE.BoxGeometry(1.6, 0.5, 0.4);
      const signMat = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', 
        emissive: color, 
        emissiveIntensity: 1.0 
      });
      const sign = new THREE.Mesh(signGeom, signMat);
      sign.position.set(0, 4.15, 0.2);
      pGroup.add(sign);

      // Light glow radiating from machine
      const light = new THREE.PointLight(color, 2.0, 6);
      light.position.set(0, 3, 0.9);
      pGroup.add(light);

      scene.add(pGroup);
      sceneElementsRef.current.perkMachineMeshes[id] = pGroup;

      pGroup.updateMatrixWorld(true);
      const pBox = new THREE.Box3().setFromObject(body);
      stateRef.current.collidables.push(pBox);
      stateRef.current.zombieCollidables.push(pBox);
    };

     // Spawn only Juggernog vending machine on the left wall
     createPerkMachine('juggernog', 'Juggernog Soda', '#ef4444', -14.25, -4.0, Math.PI / 2);

    // ---WEAPON RENDERING SKIN SWITCHER ENGINE ---
    const rebuildWeaponVisuals = (activeId: string) => {
      const container = sceneElementsRef.current.weaponMeshContainer;
      const handMagContainer = sceneElementsRef.current.leftHandMagazine as unknown as THREE.Group | null;
      if (!container) return;

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
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if (!stateRef.current.pointerLocked) return;
      
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
      stateRef.current.pointerLocked = isLockedNow;
      setIsLocked(isLockedNow);

      if (isLockedNow) {
        setIsPaused(false);
      } else {
        // Only trigger pause if game is actively running (not start screen, not gameover)
        if (gameStatusRef.current === 'PLAYING') {
          setIsPaused(true);
        }
        stateRef.current.isAiming = false;
        stateRef.current.isMouseDown = false;
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
    container.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    // Initialise lock binding on canvas click
    const handleCanvasClick = (e: MouseEvent) => {
      if (gameStatusRef.current !== 'PLAYING') return;
      if (isPausedRef.current) return;
      
      if (!stateRef.current.pointerLocked) {
        if (e.button === 0) {
          renderer.domElement.requestPointerLock();
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

      if (isPausedRef.current || gameStatusRef.current !== 'PLAYING') {
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
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('mousemove', handleMouseMove);
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

          if (zHit.object.name === 'head_block') {
            isHeadshot = true;
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
          child.material = new THREE.MeshBasicMaterial({ color: '#f87171' });
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
            if (sceneElementsRef.current.scene && sceneElementsRef.current.scene.children.includes(mesh)) {
              sceneElementsRef.current.scene.remove(mesh);
            }
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

    // Boundary constraints clamp (Keep inside Warehouse perimeter -14.8 to +14.8 coordinates)
    p.position.x = Math.max(-14.8, Math.min(14.8, p.position.x));
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
        const dir = new THREE.Vector3().subVectors(playerPos, zPos).normalize();
        
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

    // 3D Visual Zombie Character construction (built using boxes)
    const zMesh = new THREE.Group();
    zMesh.name = `zombie_${zId}`;
    zMesh.position.set(pos.x, pos.y, pos.z);
    zMesh.rotation.y = bar.yaw;

    // Torso body container (Dark green putrid coat tatters)
    let torsoGeom = new THREE.BoxGeometry(0.65, 0.95, 0.35);
    let torsoMat = new THREE.MeshStandardMaterial({ color: '#2e452e', roughness: 0.9 });
    let torso = new THREE.Mesh(torsoGeom, torsoMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.receiveShadow = true;
    zMesh.add(torso);

    // Head cylinder container (Pale rotting grey-green skin)
    let headGeom = new THREE.BoxGeometry(0.35, 0.35, 0.32);
    let headMat = new THREE.MeshStandardMaterial({ color: '#576b53', roughness: 0.85 });
    let head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.7;
    head.name = 'head_block'; // Checked for headshot damage multiplier!
    head.castShadow = true;
    zMesh.add(head);

    // Glowing menacing RED EYES elements
    const eyeGeom = new THREE.BoxGeometry(0.06, 0.04, 0.04);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ef4444' }); // Vivid glowing red
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.09, 1.74, 0.15);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.09;
    zMesh.add(eyeL);
    zMesh.add(eyeR);

    // Left and Right Arms (raised outwards in front)
    const armGeom = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    const armMat = new THREE.MeshStandardMaterial({ color: '#445741', roughness: 0.9 });
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.name = 'left_arm';
    leftArm.position.set(-0.42, 1.3, 0.1);
    leftArm.rotation.x = -Math.PI / 2.3;
    zMesh.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.name = 'right_arm';
    rightArm.position.x = 0.42;
    zMesh.add(rightArm);

    // Left and Right moving legs
    const legGeom = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: '#141c2a', roughness: 0.95 }); // dark pants
    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.name = 'left_leg';
    leftLeg.position.set(-0.18, 0.32, 0);
    zMesh.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.name = 'right_leg';
    rightLeg.position.x = 0.18;
    zMesh.add(rightLeg);

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
              closestMsg = `PERK ALREADY ACTIVE: Juggernog/Soda`;
            } else {
              let label = 'Juggernog Health';
              let cost = 2500;
              if (id === 'speed_cola') { label = 'Speed Cola Reload'; cost = 3000; }
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
