/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GameState, PlayerState, Weapon } from './types';
import { audio } from './utils/audio';

const INITIAL_WEAPONS: Record<string, Weapon> = {
  pistol: {
    id: 'pistol',
    name: 'Colt M1911 Pistol',
    ammo: 80,
    maxAmmo: 80,
    clip: 8,
    clipSize: 8,
    damage: 25,
    fireRate: 280, // semiauto click speed
    reloadTime: 1200,
    isAutomatic: false,
    isUnlocked: true,
    cost: 0
  },
  carbine: {
    id: 'carbine',
    name: 'M1 Carbine Rifle',
    ammo: 120,
    maxAmmo: 120,
    clip: 15,
    clipSize: 15,
    damage: 65,
    fireRate: 400,
    reloadTime: 1800,
    isAutomatic: false,
    isUnlocked: false,
    cost: 1000
  },
  shotgun: {
    id: 'shotgun',
    name: 'Remington Pump Shotgun',
    ammo: 48,
    maxAmmo: 48,
    clip: 6,
    clipSize: 6,
    damage: 180, // single heavy blast
    fireRate: 850,
    reloadTime: 2200,
    isAutomatic: false,
    isUnlocked: false,
    cost: 1500
  },
  thompson: {
    id: 'thompson',
    name: 'Thompson SMG',
    ammo: 180,
    maxAmmo: 180,
    clip: 30,
    clipSize: 30,
    damage: 38,
    fireRate: 150, // super fast
    reloadTime: 1900,
    isAutomatic: true,
    isUnlocked: false,
    cost: 1800
  },
  raygun: {
    id: 'raygun',
    name: 'Ray Gun Mark II',
    ammo: 120,
    maxAmmo: 120,
    clip: 20,
    clipSize: 20,
    damage: 220, // wonder weapon plasma splash!
    fireRate: 200,
    reloadTime: 2300,
    isAutomatic: true,
    isUnlocked: false,
    cost: 950,
    isSpecial: true
  },
  thundergun: {
    id: 'thundergun',
    name: 'Thundergun Zeus Cannon',
    ammo: 10,
    maxAmmo: 10,
    clip: 2,
    clipSize: 2,
    damage: 600, // blows away everything
    fireRate: 1200,
    reloadTime: 2500,
    isAutomatic: false,
    isUnlocked: false,
    cost: 950,
    isSpecial: true
  }
};

const INITIAL_GAME_STATE: GameState = {
  currentRound: 1,
  isRoundActive: true,
  zombiesRemainingInRound: 10,
  zombiesToSpawn: 10,
  zombieSpawnTimer: 0,
  points: 500, // starting funds
  score: 0,
  kills: 0,
  headshots: 0,
  roundsSurvived: 0,
  instaKillTimeLeft: 0,
  doublePointsTimeLeft: 0
};

const INITIAL_PLAYER_STATE: PlayerState = {
  points: 500,
  health: 100,
  maxHealth: 100,
  activeWeaponId: 'pistol',
  secondaryWeaponId: null,
  perks: [],
  livesLeft: 1,
  isDead: false
};

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export default function App() {
  const [gameStatus, setGameStatus] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [weapons, setWeapons] = useState<Record<string, Weapon>>(INITIAL_WEAPONS);
  const [activeFloatingTexts, setActiveFloatingTexts] = useState<FloatingText[]>([]);

  // Synchronize game over from player death
  useEffect(() => {
    if (playerState.isDead && gameStatus === 'PLAYING') {
      setGameStatus('GAMEOVER');
    }
  }, [playerState.isDead, gameStatus]);

  // Decrement active time left for Insta-kill and Double Points
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || isPaused) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        const nextInsta = Math.max(0, prev.instaKillTimeLeft - 100);
        const nextDouble = Math.max(0, prev.doublePointsTimeLeft - 100);
        return {
          ...prev,
          instaKillTimeLeft: nextInsta,
          doublePointsTimeLeft: nextDouble
        };
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameStatus, isPaused]);

  // Floating text animator loop
  useEffect(() => {
    if (activeFloatingTexts.length === 0) return;

    const interval = setTimeout(() => {
      setActiveFloatingTexts((prev) => 
        prev
          .map((txt) => ({ ...txt, y: txt.y - 0.7 })) // float upward
          .filter((txt) => txt.y > 20) // remove on high roof boundary
      );
    }, 30);

    return () => clearTimeout(interval);
  }, [activeFloatingTexts]);

  // Start game triggers
  const handleStartGame = () => {
    setWeapons(JSON.parse(JSON.stringify(INITIAL_WEAPONS)));
    setGameState({
      ...INITIAL_GAME_STATE,
      zombiesToSpawn: 10,
      zombiesRemainingInRound: 10
    });
    setPlayerState(INITIAL_PLAYER_STATE);
    setGameStatus('PLAYING');
    setIsPaused(false);
    audio.playRoundStart();
  };

  const handleRestartGame = () => {
    handleStartGame();
  };

  const handleResumeGame = () => {
    setIsPaused(false);
    // request pointer lock back automatically
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
  };

  const handleToggleMute = () => {
    const nextMute = audio.toggleMute();
    setIsMuted(nextMute);
  };

  // Callback to receive points from actions (shooting, boarding, kills)
  const handleReceivePoints = (amount: number, label: string) => {
    if (amount !== 0) {
      // update player points
      setPlayerState((prev) => {
        const nextPoints = prev.points + amount;
        return {
          ...prev,
          points: nextPoints
        };
      });

      // update score ledger
      if (amount > 0) {
        setGameState((prev) => ({
          ...prev,
          score: prev.score + amount
        }));
      }
    }

    // Launch floating visual text on UI
    let color = '#22c55e'; // Green default text
    if (amount < 0) color = '#f87171'; // Red for spendings
    else if (label.includes('HEADSHOT')) color = '#facc15'; // Yellow
    else if (label.includes('MAX AMMO')) color = '#10b981'; // Green neon
    else if (amount === 0) color = '#eab308'; // Amber announcements

    const floatId = Math.random().toString();
    const xOffset = 45 + Math.random() * 10;
    const yOffset = 55 + Math.random() * 5;

    setActiveFloatingTexts((prev) => [
      ...prev,
      {
        id: floatId,
        text: label,
        x: xOffset,
        y: yOffset,
        color: color
      }
    ]);
  };

  return (
    <div id="cod-zombies-app" className="relative w-screen h-screen bg-black select-none overflow-hidden text-white font-sans">
      
      {/* 1. FPS GAME BACKGROUND WEBGL CANVAS */}
      {gameStatus === 'PLAYING' && (
        <GameCanvas
          gameStatus={gameStatus}
          gameState={gameState}
          setGameState={setGameState}
          playerState={playerState}
          setPlayerState={setPlayerState}
          weapons={weapons}
          setWeapons={setWeapons}
          setInteractPrompt={setInteractPrompt}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          isMuted={isMuted}
          setIsLocked={setIsLocked}
          onReceivePoints={handleReceivePoints}
        />
      )}

      {/* 2. REALTIME HEADS-UP DISPLAY INTERFACE */}
      <HUD
        gameState={gameState}
        playerState={playerState}
        weapons={weapons}
        interactPrompt={interactPrompt}
        onStartGame={handleStartGame}
        onRestartGame={handleRestartGame}
        onResumeGame={handleResumeGame}
        isPaused={isPaused}
        gameStatus={gameStatus}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isLocked={isLocked}
        activeFloatingTexts={activeFloatingTexts}
      />
    </div>
  );
}
