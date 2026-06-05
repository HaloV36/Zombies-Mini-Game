/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Skull, 
  Target, 
  RotateCcw, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Gamepad, 
  Activity, 
  ShieldAlert, 
  Zap, 
  Flame, 
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { GameState, PlayerState, Weapon, PerkType, Perk } from '../types';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface HUDProps {
  gameState: GameState;
  playerState: PlayerState;
  weapons: Record<string, Weapon>;
  interactPrompt: string | null;
  onStartGame: () => void;
  onRestartGame: () => void;
  onResumeGame: () => void;
  isPaused: boolean;
  gameStatus: 'START' | 'PLAYING' | 'GAMEOVER';
  isMuted: boolean;
  onToggleMute: () => void;
  isLocked: boolean; // pointer lock indicator
  activeFloatingTexts: FloatingText[];
}

const PERK_DETAILS: Record<PerkType, Perk> = {
  juggernog: {
    id: 'juggernog',
    name: 'Juggernog',
    cost: 2500,
    color: '#ef4444', // Red
    description: 'Increases health (survive 5 hits instead of 2)'
  },
  speed_cola: {
    id: 'speed_cola',
    name: 'Speed Cola',
    cost: 3000,
    color: '#22c55e', // Green
    description: 'Cuts reload time in half'
  },
  double_tap: {
    id: 'double_tap',
    name: 'Double Tap',
    cost: 2000,
    color: '#f97316', // Orange
    description: 'Doubles your rate of fire'
  },
  quick_revive: {
    id: 'quick_revive',
    name: 'Quick Revive',
    cost: 1500,
    color: '#06b6d4', // Blue
    description: 'Regenerates health twice as fast'
  }
};

export const HUD: React.FC<HUDProps> = ({
  gameState,
  playerState,
  weapons,
  interactPrompt,
  onStartGame,
  onRestartGame,
  onResumeGame,
  isPaused,
  gameStatus,
  isMuted,
  onToggleMute,
  isLocked,
  activeFloatingTexts
}) => {
  const [showControls, setShowControls] = useState<boolean>(false);
  const activeWeapon = weapons[playerState.activeWeaponId];
  const secondaryWeapon = playerState.secondaryWeaponId ? weapons[playerState.secondaryWeaponId] : null;

  // Render original COD-style round indicator representation (tally marks)
  const renderRoundTallyNode = (round: number) => {
    if (round <= 5) {
      const tallies = [];
      const isFive = round === 5;
      const count = isFive ? 4 : round;
      
      for (let i = 0; i < count; i++) {
        tallies.push(
          <div 
            key={i} 
            className="w-2 h-14 bg-red-700/90 rounded-sm mx-1 shadow-[0_4px_12px_rgba(185,28,28,0.7)] rotate-3" 
          />
        );
      }
      
      if (isFive) {
        return (
          <div className="relative flex items-center">
            {tallies}
            <div className="absolute top-4 left-[-6px] w-14 h-2 bg-red-700/95 rounded-sm rotate-12 shadow-[0_4px_12px_rgba(185,28,28,0.8)]" />
          </div>
        );
      }
      
      return <div className="flex items-center gap-0.5">{tallies}</div>;
    }
    
    return (
      <div 
        className="text-red-700 text-8xl md:text-9xl font-black drop-shadow-[0_4px_12px_rgba(185,28,28,0.6)] leading-none italic select-none"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {round}
      </div>
    );
  };

  // Health display opacity
  const healthPercent = (playerState.health / playerState.maxHealth) * 100;
  const isHurt = healthPercent < 100;
  // Intensity of the red blood splash border on screen
  const hurtOpacity = Math.max(0, (100 - healthPercent) / 100);

  return (
    <div id="hud-root" className="absolute inset-0 pointer-events-none select-none font-sans overflow-hidden z-10 flex flex-col justify-between">
      
      {/* PERFECTLY CENTERED WEAPON CROSSHAIR SIGHT LINE */}
      {isLocked && !isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-center w-8 h-8">
          {/* Visual Reticle targeting reticle */}
          <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          <div className="absolute top-0 left-[15px] w-0.5 h-2 bg-white opacity-50 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
          <div className="absolute bottom-0 left-[15px] w-0.5 h-2 bg-white opacity-50 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
          <div className="absolute left-0 top-[15px] w-2 h-0.5 bg-white opacity-50 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
          <div className="absolute right-0 top-[15px] w-2 h-0.5 bg-white opacity-50 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
        </div>
      )}

      {/* 0. HIGH DENSITY ENVIRONMENTAL STYLE OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-0" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] z-0" />

      {/* 1. BLOOD SPLATTER VISUAL VIGNETTE (Screen damage flare) */}
      {isHurt ? (
        <div 
          id="blood-vignette"
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-10"
          style={{
            opacity: hurtOpacity,
            boxShadow: `inset 0 0 ${80 - healthPercent * 0.5}px rgba(239, 68, 68, ${0.4 + hurtOpacity * 0.4})`,
            border: `${15 * (1 - healthPercent / 100)}px solid rgba(153, 27, 27, ${0.2 + hurtOpacity * 0.3})`
          }}
        />
      ) : null}

      {/* Low Health Heartbeat Pulse Flash */}
      {healthPercent <= 35 ? (
        <div 
          id="critical-pulse"
          className="absolute inset-0 bg-red-900/15 animate-ping mix-blend-multiply duration-1000 pointer-events-none z-10"
        />
      ) : null}

      {/* Floating Point Gains Popups */}
      {activeFloatingTexts.map((txt) => (
        <div
          key={txt.id}
          className="absolute text-lg font-bold font-mono tracking-wide z-30 transition-transform flex items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{
            left: `${txt.x}%`,
            top: `${txt.y}%`,
            color: txt.color,
            fontSize: txt.text.includes('+100') ? '1.5rem' : '1.15rem'
          }}
        >
          {txt.text}
        </div>
      ))}

      {/* FRONT PAGE AND STATIC screens based on GameState status */}
      
      {/* 2. START SCREEN OVERLAY */}
      {gameStatus === 'START' && (
        <div 
          id="start-screen"
          className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200 pointer-events-auto"
        >
          <div className="max-w-2xl w-full text-center space-y-8 relative">
            {/* Dark grunge zombie backdrop vibes */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />

            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.4em] text-red-500 font-semibold drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                STAY ALIVE IN THE WAREHOUSE
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] uppercase">
                CoD Zombies <span className="text-red-600 block md:inline">3D</span>
              </h1>
              <p className="text-neutral-400 max-w-lg mx-auto text-sm leading-relaxed">
                A high-fidelity first-person survivor classic shooter remake. Repair window barricades, purchase weapons from walls, play the mystery box, buy Perks, and survive infinite rounds of scaling difficulty.
              </p>
            </div>

            {/* Quick Game Start Action */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                id="btn-start"
                onClick={onStartGame}
                className="w-full sm:w-auto px-8 py-4 bg-red-700 hover:bg-red-600 active:scale-95 transition-all text-white font-bold uppercase tracking-wider rounded-lg shadow-[0_4px_18px_rgba(185,28,28,0.4)] flex items-center justify-center gap-3 border border-red-500"
              >
                <Play className="w-5 h-5 fill-white" />
                Launch Survival
              </button>
              
              <button
                id="btn-controls"
                onClick={() => setShowControls(!showControls)}
                className="w-full sm:w-auto px-6 py-4 bg-neutral-800 hover:bg-neutral-700 transition-colors text-neutral-300 font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 border border-neutral-700"
              >
                <Keyboard className="w-5 h-5 text-neutral-400" />
                {showControls ? 'Hide Controls' : 'Show Controls'}
              </button>
            </div>

            {/* Controls Guide panel */}
            {showControls && (
              <div id="controls-panel" className="bg-neutral-900/80 border border-neutral-800 p-6 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs md:text-sm animate-fade-in animate-duration-300 backdrop-blur-sm">
                <div>
                  <h3 className="text-red-500 font-bold mb-3 uppercase tracking-wider">Combat & Interactions</h3>
                  <ul className="space-y-2 text-neutral-300">
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">Mouse Click</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Shoot / Melee (knife if close)</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">R</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Reload Weapon</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">F / Hold E</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Interact / Repair Window</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">1 / 2 (or Wheel)</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Switch Arsenal</kbd>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-red-500 font-bold mb-3 uppercase tracking-wider">Movement</h3>
                  <ul className="space-y-2 text-neutral-300">
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">W, A, S, D</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Walk Around</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">Mouse Movement</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Aim / Turn Camera</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">Spacebar</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Jump Over Hurdles</kbd>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1.5">
                      <span className="font-semibold text-neutral-200">Escape (ESC)</span>
                      <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded shadow-sm text-[10px]">Pause and Release Mouse</kbd>
                    </li>
                  </ul>
                </div>
                <div className="col-span-1 sm:col-span-2 pt-2 text-center text-neutral-400 text-[11px] leading-relaxed">
                  📢 <strong className="text-neutral-200">First Person Pointer Lock Required:</strong> Clicking inside the 3D window secures your mouse for movement, looking naturally around. Hit <kbd className="px-1 bg-neutral-800 rounded">ESC</kbd> to unlock anytime.
                </div>
              </div>
            )}

            {/* Bottom Credit and info */}
            <div className="pt-8 text-neutral-600 text-xs">
              Runs fully client-side on WebGL. Procedural sound architecture active.
            </div>
          </div>
        </div>
      )}

      {/* 3. GAMEOVER SCREEN OVERLAY */}
      {gameStatus === 'GAMEOVER' && (
        <div 
          id="gameover-screen"
          className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-neutral-200 pointer-events-auto"
        >
          <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
            {/* You Died red bloody display */}
            <div className="space-y-2">
              <h2 className="text-7xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse">
                YOU DIED
              </h2>
              <p className="text-neutral-500 uppercase tracking-widest text-xs font-bold font-mono">
                The horde overcame your defenses
              </p>
            </div>

            {/* Survivor statistics card */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
              <h3 className="text-neutral-400 text-xs uppercase font-bold tracking-widest border-b border-neutral-800 pb-3">
                Survival Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-neutral-950/50 p-3 rounded border border-neutral-900">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Rounds Survived</div>
                  <div className="text-2xl font-black text-white">{gameState.roundsSurvived}</div>
                </div>
                
                <div className="bg-neutral-950/50 p-3 rounded border border-neutral-900">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Total Score</div>
                  <div className="text-2xl font-black text-white">{gameState.score}</div>
                </div>

                <div className="bg-neutral-950/50 p-3 rounded border border-neutral-900 flex items-center justify-between col-span-2">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Zombies Eradicated</div>
                    <div className="text-lg font-bold text-red-400 flex items-center gap-1.5 mt-0.5">
                      <Skull className="w-4 h-4" />
                      {gameState.kills}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Headshots</div>
                    <div className="text-lg font-bold text-green-400 flex items-center justify-end gap-1.5 mt-0.5">
                      <Target className="w-4 h-4" />
                      {gameState.headshots}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Restart button */}
            <button
              id="btn-restart"
              onClick={onRestartGame}
              className="w-full px-8 py-4 bg-red-700 hover:bg-red-600 active:scale-95 transition-all text-white font-bold uppercase tracking-wider rounded-lg shadow-[0_4px_15px_rgba(220,38,38,0.3)] border border-red-500 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Try Survival Again
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN GAMEPLAY LAYER (Active during active rounds) */}
      {gameStatus === 'PLAYING' && (
        <>
          {/* TOP RAIL BAR: HUD, Perks, Status flags, Audio */}
          <div className="w-full p-4 flex justify-between items-start pointer-events-none relative z-10">
            {/* Top Left: Survivor Stats & Perks */}
            <div className="flex flex-col gap-2.5">
              {/* Scorecard block */}
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-lg flex items-center gap-5 text-xs text-neutral-300">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider font-mono">
                  <Skull className="w-3.5 h-3.5 text-red-500" />
                  Kills: <span className="text-neutral-100 font-bold font-mono ml-1">{gameState.kills}</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider font-mono">
                  <Target className="w-3.5 h-3.5 text-green-400" />
                  Headshots: <span className="text-neutral-100 font-bold font-mono ml-1">{gameState.headshots}</span>
                </div>
                {gameState.zombiesRemainingInRound > 0 && (
                  <>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-1 uppercase tracking-wider font-mono">
                      Horde remaining: <span className="text-red-500 font-bold font-mono ml-1">{gameState.zombiesRemainingInRound}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top Center: Realtime High Density Wave Progress Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none hidden md:block">
              <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] tracking-[0.2em] font-bold text-white/45 uppercase font-mono">Wave Progress</div>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const maxRoundZombies = Math.max(10, gameState.currentRound * 5 + 5);
                    const killedVal = Math.max(0, maxRoundZombies - gameState.zombiesRemainingInRound);
                    const activeProgress = Math.min(5, Math.floor((killedVal / maxRoundZombies) * 5));
                    const isLit = i < activeProgress || gameState.zombiesRemainingInRound === 0;
                    return (
                      <div 
                        key={i} 
                        className={`w-4 h-1.5 transition-all duration-300 rounded-[1px] ${isLit ? 'bg-red-600 shadow-[0_0_8px_#ef4444]' : 'bg-neutral-800'}`} 
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Right: Interactive control indicators & utilities */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Point Multiplier / Insta-kill states indicators */}
              <div className="flex flex-col gap-1.5 items-end">
                {gameState.doublePointsTimeLeft > 0 && (
                  <div className="bg-cyan-950/70 text-cyan-400 border border-cyan-500/50 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Double Points! ({Math.ceil(gameState.doublePointsTimeLeft / 1000)}s)
                  </div>
                )}
                {gameState.instaKillTimeLeft > 0 && (
                  <div className="bg-red-950/70 text-red-400 border border-red-500/50 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    Insta-Kill Active! ({Math.ceil(gameState.instaKillTimeLeft / 1000)}s)
                  </div>
                )}
              </div>

              {/* Mute button */}
              <button
                id="btn-mute-audio"
                onClick={onToggleMute}
                className="p-2.5 bg-black/45 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded-lg backdrop-blur-sm transition-all active:scale-95"
                title={isMuted ? 'Unmute procedural audio' : 'Mute audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-neutral-300" />}
              </button>
            </div>
          </div>

          {/* CENTRE PORTION OF HUD: INTERACT PREVIEWS, CROSSHAIRS, AND MESSAGES */}
          <div className="flex-1 flex flex-col justify-center items-center px-4 relative">
            
            {/* INTERACTION PROMPT BOX (Center Screen lower third) */}
            {interactPrompt && !isPaused && (
              <div 
                id="interact-prompt"
                className="absolute top-[60%] left-1/2 -translate-x-1/2 text-center pointer-events-none select-none z-10 bg-black/40 backdrop-blur-sm px-5 py-2.5 rounded-lg border border-white/10 shadow-lg"
              >
                <div className="text-white font-bold text-base sm:text-lg drop-shadow-lg tracking-wide uppercase">
                  {/* Present standard format with highlighted F key for actions */}
                  {interactPrompt.toLowerCase().includes('press f') ? (
                    <>
                      {interactPrompt.replace(/press f to/i, 'Press').replace(/press f/i, 'Press')} 
                      <span className="px-2 py-0.5 bg-white text-black font-mono font-black text-sm rounded mx-1 shadow-md">F</span>
                    </>
                  ) : (
                    interactPrompt
                  )}
                </div>
                {(interactPrompt.toLowerCase().includes('repair') || interactPrompt.toLowerCase().includes('board')) && (
                  <div className="text-yellow-500 font-mono text-sm font-bold tracking-widest mt-1 drop-shadow-[0_1px_5px_#fbbf24]">+10 POINTS</div>
                )}
              </div>
            )}

            {/* POINTER LOCK NOTIFICATION ALERT INSTRUCTION (Prompt click to recover control) */}
            {!isLocked && !isPaused && (
              <div id="lock-pointer-prompt" className="bg-black/90 border border-red-700/50 p-6 rounded-lg text-center max-w-sm shadow-[0_4px_30px_rgba(220,38,38,0.25)] pointer-events-auto flex flex-col items-center space-y-4">
                <Gamepad className="w-10 h-10 text-red-500 animate-bounce" />
                <div>
                  <h3 className="text-white font-extrabold text-sm uppercase tracking-wider mb-1">
                    Secure Target Sight Locking
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Click anywhere on the view background to direct your tactical gaze. Utilize your mouse to aim, fire, and turn.
                  </p>
                </div>
                <button 
                  id="btn-aim-now"
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      canvas.requestPointerLock();
                    }
                  }}
                  className="px-5 py-2 bg-red-700 hover:bg-red-600 text-xs font-bold uppercase rounded text-white tracking-widest border border-red-500 shadow-lg"
                >
                  Acquire Aim Site
                </button>
              </div>
            )}

            {/* RELOAD ALREADY CRITICAL FLASH ALERT */}
            {activeWeapon && activeWeapon.clip === 0 && activeWeapon.ammo > 0 && !isPaused && (
              <div className="absolute top-[35%] bg-red-600/30 text-red-200 border border-red-500 text-center px-4 py-2 rounded text-xs tracking-widest uppercase font-mono font-bold animate-ping">
                RELOAD REQUIRED [R]
              </div>
            )}
          </div>

          {/* LOWER HUD BAR: AMMO COUNTS, CREDIT BALANCE, ROUND INDICATOR */}
          <div className="w-full absolute bottom-12 left-0 right-0 px-12 flex justify-between items-end pointer-events-none z-10">
            
            {/* Bottom-Left: Round Counter (Chalk Tallies with Blood Overlay) */}
            <div className="relative">
              {/* Blood Overlay */}
              <div className="absolute -top-12 -left-12 w-48 h-48 opacity-[0.25] pointer-events-none">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#991b1b" d="M44.7,-76.4C58.1,-69.2,70.1,-58.5,78.2,-45.3C86.3,-32.1,90.4,-16.1,88.7,-0.9C87.1,14.2,79.7,28.4,70.3,40.3C60.9,52.2,49.5,61.7,36.5,68.9C23.6,76,9.1,80.7,-5.7,80.4C-20.4,80.1,-35.4,74.8,-48,65.8C-60.6,56.8,-70.7,44,-77.3,29.9C-83.9,15.8,-86.9,0.3,-84.7,-14.8C-82.6,-29.9,-75.3,-44.7,-64.1,-54.6C-52.9,-64.6,-37.8,-69.7,-24.1,-75.6C-10.4,-81.4,1.8,-88.1,15.1,-87.3C28.4,-86.6,31.2,-83.5,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
              <div id="round-tally-container" className="relative z-10">
                {renderRoundTallyNode(gameState.currentRound)}
              </div>
              <div className="text-red-900/80 text-xs font-bold uppercase tracking-widest mt-2 ml-2 select-none font-mono">Survival Phase</div>
            </div>

            {/* Bottom-Right (Points, Weapon Container, Perks) */}
            <div className="flex flex-col items-end gap-3 max-w-sm w-full">
              
              {/* Point Credit Balance Counter */}
              <div 
                id="points-box"
                className="text-yellow-500 font-mono text-5xl md:text-6xl font-bold tracking-tighter drop-shadow-[0_2px_10px_rgba(234,179,8,0.55)] select-none mr-2"
              >
                {playerState.points.toLocaleString()}
              </div>

              {/* Weapon Info Container */}
              {activeWeapon && (
                <div className="bg-black/75 border-t border-r p-4 min-w-[210px] sm:min-w-[230px] flex justify-between items-end backdrop-blur-md transition-all shadow-md border-white/20">
                  <div className="flex flex-col text-left mr-4">
                    <div className="text-[10px] text-white/50 uppercase tracking-tighter font-bold mb-1">
                      {playerState.activeWeaponId === 'pistol' ? 'Sidearm' : 'Active Arsenal'}
                    </div>
                    <div className="text-lg sm:text-xl font-bold italic tracking-wider text-white uppercase max-w-[130px] truncate">
                      {activeWeapon.name.replace(/Pistol|Rifle|Shotgun|SMG|Zeus Cannon/i, '').trim() || activeWeapon.name}
                    </div>
                    {secondaryWeapon && (
                      <div className="text-[9px] text-neutral-400 mt-1 uppercase max-w-[130px] truncate font-mono">
                        Secondary: {secondaryWeapon.name.replace(/Pistol|Rifle|Shotgun|SMG|Zeus Cannon/i, '').trim()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    {activeWeapon.clipSize === 1 ? (
                      <span className="text-3xl font-black text-white">MAX</span>
                    ) : (
                      <>
                        <span className={`text-4xl font-black ${activeWeapon.clip <= activeWeapon.clipSize * 0.25 ? 'text-red-600 drop-shadow-[0_0_8px_#ef4444]' : 'text-white'}`}>
                          {activeWeapon.clip}
                        </span>
                        <span className="text-xl text-white/40 border-l border-white/20 pl-2 ml-1">
                          {activeWeapon.ammo}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Active Perks Badges Row */}
              {playerState.perks.length > 0 ? (
                <div className="flex gap-3 mt-1.5 mr-2">
                  {playerState.perks.map((perkId) => {
                    const desc = PERK_DETAILS[perkId];
                    const perkColorGlow = desc?.color || '#ef4444';
                    return (
                      <div 
                        key={perkId} 
                        className="w-10 h-10 rounded-full border-2 bg-black/65 flex items-center justify-center transition-all cursor-help group pointer-events-auto"
                        style={{ 
                          borderColor: perkColorGlow,
                          boxShadow: `0 0 15px ${perkColorGlow}50`
                        }}
                        title={`${desc?.name}: ${desc?.description}`}
                      >
                        {perkId === 'juggernog' && <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />}
                        {perkId === 'speed_cola' && <RotateCcw className="w-5 h-5 text-green-500" />}
                        {perkId === 'double_tap' && <Zap className="w-5 h-5 text-orange-500 animate-pulse" />}
                        {perkId === 'quick_revive' && <Activity className="w-5 h-5 text-cyan-500" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-3 mt-1.5 mr-2 opacity-20">
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-600 bg-neutral-800/40 flex items-center justify-center">
                    <div className="w-4 h-4 bg-white/20 rounded-full"></div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* 5. PAUSED SCREEN OVERLAY */}
          {isPaused && (
            <div 
              id="pause-screen"
              className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center p-6 text-neutral-200 pointer-events-auto backdrop-blur-sm z-20"
            >
              <div className="max-w-xs w-full text-center space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-3xl font-extrabold uppercase text-white tracking-tight">
                    Defense Suspended
                  </h3>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono font-bold">
                    Tactical Pause Menu
                  </p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800/80 p-4 rounded-lg space-y-3.5 text-xs text-neutral-400">
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span>Active Round</span>
                    <span className="font-bold text-neutral-100 font-mono">{gameState.currentRound}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-2">
                    <span>Eliminations</span>
                    <span className="font-bold text-red-400 font-mono">{gameState.kills}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accrued Score</span>
                    <span className="font-bold text-yellow-400 font-mono">{gameState.score}</span>
                  </div>
                </div>

                {/* Pause choices */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    id="btn-resume"
                    onClick={onResumeGame}
                    className="w-full py-3 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase rounded tracking-wider border border-red-500 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Resume Combat
                  </button>
                  
                  <button
                    id="btn-restart-pause"
                    onClick={onRestartGame}
                    className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase rounded tracking-wider border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart Survival
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
export default HUD;
