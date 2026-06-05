/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Weapon {
  id: string;
  name: string;
  ammo: number;
  maxAmmo: number;
  clip: number;
  clipSize: number;
  damage: number;
  fireRate: number; // millisecond interval between shots
  reloadTime: number; // milliseconds
  isAutomatic: boolean;
  isUnlocked: boolean;
  cost: number;
  isSpecial?: boolean;
}

export type PerkType = 'juggernog' | 'speed_cola' | 'double_tap' | 'quick_revive';

export interface Perk {
  id: PerkType;
  name: string;
  cost: number;
  color: string;
  description: string;
}

export interface PlayerState {
  points: number;
  health: number;
  maxHealth: number;
  activeWeaponId: string;
  secondaryWeaponId: string | null;
  perks: PerkType[];
  livesLeft: number;
  isDead: boolean;
}

export interface Zombie {
  id: string;
  position: { x: number; y: number; z: number };
  hp: number;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  isDead: boolean;
  isCrawler: boolean;
  attackCooldown: number; // ms lock between attacks
  meshReference?: any; // Three.js Group handle
  eyeLight?: any;
  yaw: number;
  animTime: number;
  isSprinting: boolean;
  lastHurtTime: number;
  knockback?: { x: number; z: number; duration: number };
  isClimbing?: boolean;
  climbingTime?: number;
  climbDuration?: number;
}

export interface Barricade {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  yaw: number; // rotation
  boards: number; // 0 to 6 boards (6 is fully intact)
  maxBoards: number;
  isBreached: boolean;
  meshReference?: any; // Three.js Group
}

export interface WallBuy {
  id: string;
  weaponId: string;
  cost: number;
  position: { x: number; y: number; z: number };
  yaw: number;
}

export interface MysteryBoxState {
  id: string;
  position: { x: number; y: number; z: number };
  yaw?: number;
  isOpen: boolean;
  isRolling: boolean;
  currentWeaponId: string | null;
  rollTimer: number; // time remaining
  interactTimer: number; // time player has to grab it
  weaponsList: string[];
}

export type PowerUpType = 'max_ammo' | 'insta_kill' | 'double_points' | 'nuke';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: { x: number; y: number; z: number };
  duration: number; // time left to pick up
  meshReference?: any;
}

export interface GameState {
  currentRound: number;
  isRoundActive: boolean;
  zombiesRemainingInRound: number;
  zombiesToSpawn: number;
  zombieSpawnTimer: number;
  points: number;
  score: number;
  kills: number;
  headshots: number;
  roundsSurvived: number;
  instaKillTimeLeft: number; // ms
  doublePointsTimeLeft: number; // ms
}
