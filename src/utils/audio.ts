/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Lazy initialisation on first interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) return new AudioBuffer({ length: 1, sampleRate: 44100 });
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Gun Shot Synthesizers
  public playPistol() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Noise impulse for explosion-click
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    // Sine pitch drop for boom
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(400, now);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    // Connections
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playShotgun() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Heavy bass rumble + dense noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Pump action sound scheduled shortly after
    this.schedulePumpAction(now + 0.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.45);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private schedulePumpAction(time: number) {
    if (!this.ctx) return;
    
    // Click sound 1 (Pull back)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, time);
    osc1.frequency.exponentialRampToValueAtTime(800, time + 0.08);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.15, time);
    gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(time);
    osc1.stop(time + 0.09);

    // Click sound 2 (Push forward)
    const delay = 0.15;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, time + delay);
    osc2.frequency.exponentialRampToValueAtTime(1400, time + delay + 0.08);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.15, time + delay);
    gain2.gain.exponentialRampToValueAtTime(0.01, time + delay + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(time + delay);
    osc2.stop(time + delay + 0.09);
  }

  public playThompson() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Fast sharp shot, bit lighter than starting pistol
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(800, now);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    // Connect Fast-burst shooter
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.09);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playRaygun() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Laser Pitch Sweep (peewww!)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(1500, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.3);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(800, now);
    filter1.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    filter1.Q.value = 1.0;

    const gainNode1 = this.ctx.createGain();
    gainNode1.gain.setValueAtTime(0.35, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    const gainNode2 = this.ctx.createGain();
    gainNode2.gain.setValueAtTime(0.2, now);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(filter1);
    filter1.connect(gainNode1);
    gainNode1.connect(this.ctx.destination);

    osc2.connect(gainNode2);
    gainNode2.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.3);
  }

  public playThundergun() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Mega wind shockwave blast! Huge subwoofer rumbling + high noise explosion
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    noiseFilter.Q.value = 0.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.65);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start(now);
    subOsc.start(now);
    noise.stop(now + 0.8);
    subOsc.stop(now + 0.75);
  }

  public playReload() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Click Clack
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.setValueAtTime(900, now + 0.1);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.setValueAtTime(0.01, now + 0.05);
    gainNode.gain.setValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);
  }

  public playEmptyClip() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Dull click
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Zombie sound synthesis
  public playZombieGrowl() {
    // Disabled spawning/idle zombie growl sounds per request
  }

  public playZombieHurt() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Higher Pitch Shrill Screech
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playZombieDie() {
    this.playZombieHurt();
    // Add extra low pitch burp/groan
    setTimeout(() => {
      this.initContext();
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }, 100);
  }

  public playPlayerHurt() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Sudden heavy heartbeat/thump + noise impact
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.26);
    noise.stop(now + 0.21);
  }

  public playBarricadeRepair() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Two low frequency pitchy wood-knocks
    for (let i = 0; i < 2; i++) {
      const clickTime = now + (i * 0.12);

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, clickTime);
      osc.frequency.linearRampToValueAtTime(70, clickTime + 0.08);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, clickTime);
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.09);
    }
  }

  public playPowerUpSpawn() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // High ascending chord progression (chime)
    const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C
    notes.forEach((freq, idx) => {
      const time = now + (idx * 0.08);
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.45);
    });
  }

  public playPowerUpGrab(type: string) {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Major digital uplift synthesizer sound
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(600, now + 0.08);
    osc.frequency.setValueAtTime(900, now + 0.16);
    osc.frequency.setValueAtTime(1200, now + 0.24);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playMysteryBoxRoll() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Tocking sound
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playMysteryBoxWeapon() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Direct chime to grab
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3); // A6

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playRoundStart() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // A beautiful, clean, non-dissonant ominous minor chord swell (A Minor)
    // Frequencies: A2 (110Hz), E3 (164.81Hz), A3 (220Hz), C4 (261.63Hz)
    const freqs = [110, 164.81, 220, 261.63];
    const oscillators: OscillatorNode[] = [];

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.8); // Smooth fade in
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5); // Smooth fade out

    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      // Triangle waves are softer and cleaner than sawtooth, giving a nice synth swell
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      osc.connect(filter);
      oscillators.push(osc);
    });

    filter.connect(gain);
    gain.connect(this.ctx.destination);

    oscillators.forEach((osc) => {
      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  public playRoundEnd() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Haunting minor resolution (sinusoidal ambient wave fading)
    const root = this.ctx.createOscillator();
    root.type = 'sine';
    root.frequency.setValueAtTime(220, now); // A3
    root.frequency.linearRampToValueAtTime(196, now + 2.0); // slide to G3
    
    const third = this.ctx.createOscillator();
    third.type = 'sine';
    third.frequency.setValueAtTime(261.63, now); // C4 (Minor)
    third.frequency.linearRampToValueAtTime(233.08, now + 2.0); // slide to Bb3 (darker)

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    root.connect(filter);
    third.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    root.start(now);
    third.start(now);
    root.stop(now + 2.2);
    third.stop(now + 2.2);
  }

  public playPointGain() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Quick subtle mechanical "cha-ching" sound
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.setValueAtTime(1500, now + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playPerkPurchase() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Glorious retro carbonated pop cap-burst + upbeat arpeggio
    const pop = this.ctx.createOscillator();
    pop.type = 'sawtooth';
    pop.frequency.setValueAtTime(300, now);
    pop.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.4, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    pop.connect(popGain);
    popGain.connect(this.ctx.destination);
    pop.start(now);
    pop.stop(now + 0.13);

    const notes = [329.63, 392.00, 523.25, 659.25, 783.99]; // E5, G5, C6, E6, G6
    notes.forEach((freq, idx) => {
      const startTime = now + 0.1 + (idx * 0.08);

      const noteOsc = this.ctx.createOscillator();
      noteOsc.type = 'triangle';
      noteOsc.frequency.setValueAtTime(freq, startTime);

      const noteGain = this.ctx.createGain();
      noteGain.gain.setValueAtTime(0.18, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      noteOsc.connect(noteGain);
      noteGain.connect(this.ctx.destination);

      noteOsc.start(startTime);
      noteOsc.stop(startTime + 0.4);
    });
  }

  public playGameOverTune() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Somber descending progression
    const notes = [440.00, 415.30, 392.00, 349.23, 293.66, 220.00]; // descending sadness
    notes.forEach((freq, idx) => {
      const startTime = now + (idx * 0.4);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  }

  public playZombieAttackScreech() {
    this.initContext();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // High pitch screeching sound
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.5);

    // Add high frequency ring modulation or second oscillator for screechiness
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(950, now);
    osc2.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(500, now + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }
}

export const audio = new AudioSynthesizer();
