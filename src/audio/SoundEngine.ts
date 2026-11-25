import { RoomId } from '../types/game';

/**
 * 100% Procedural Web Audio synthesizer for Find My Heart.
 * Zero external audio files — resilient, zero 404s, mobile Safari/Chrome compliant.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicVol = 0.45;
  private sfxVol = 0.65;
  private unlocked = false;
  private ambientInterval: number | null = null;
  private proposalInterval: number | null = null;
  private currentRoom: RoomId = 'entrance';
  private inProposal = false;

  public unlock(): void {
    if (this.unlocked && this.ctx?.state === 'running') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVol;
        this.sfxGain.gain.value = this.sfxVol;
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
      this.startAmbientLoop();
    } catch {
      // Ignore audio errors on restricted devices
    }
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVol = Math.max(0, Math.min(1, music));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.08);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.08);
    }
  }

  public setRoom(room: RoomId): void {
    this.currentRoom = room;
  }

  private startAmbientLoop(): void {
    if (this.ambientInterval !== null) return;
    // Gentle warm mansion chord arpeggio every 5.2s
    const playWarmPad = () => {
      if (!this.ctx || !this.musicGain || this.musicVol <= 0.01 || this.inProposal) return;
      if (this.ctx.state !== 'running') return;

      const chordSets: Record<RoomId, number[]> = {
        entrance: [261.63, 329.63, 392.0, 493.88], // Cmaj7
        living: [220.0, 261.63, 329.63, 392.0], // Am7
        library: [196.0, 246.94, 293.66, 369.99], // Gmaj7
        music: [293.66, 349.23, 440.0, 523.25], // Dm7
        garden: [261.63, 329.63, 392.0, 587.33], // Cmaj9
        bedroom: [246.94, 293.66, 369.99, 440.0], // Bm7
        cinema: [174.61, 220.0, 261.63, 329.63], // Fmaj7
        balcony: [220.0, 277.18, 329.63, 415.3], // Amaj7
        memory: [233.08, 293.66, 349.23, 440.0], // Bbmaj7
        secret: [261.63, 329.63, 392.0, 493.88],
      };

      const notes = chordSets[this.currentRoom] || chordSets.entrance;
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * 0.5;
        const start = now + i * 0.16;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.035, start + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 4.8);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(start);
        osc.stop(start + 4.9);
      });
    };

    playWarmPad();
    this.ambientInterval = window.setInterval(playWarmPad, 5200);
  }

  public startProposalMusic(): void {
    this.inProposal = true;
    this.unlock();
    if (this.proposalInterval !== null) return;

    // Gentle romantic music-box / harp sequence (Fmaj9 -> Cmaj7 -> Dm7 -> Bbmaj7)
    const melody = [
      523.25, 659.25, 783.99, 987.77, 783.99, 659.25,
      587.33, 698.46, 880.0, 1046.5, 880.0, 698.46,
      523.25, 659.25, 783.99, 880.0, 783.99, 659.25,
      466.16, 587.33, 698.46, 880.0, 698.46, 587.33,
    ];
    let step = 0;

    const tickNote = () => {
      if (!this.ctx || !this.musicGain || this.musicVol <= 0.01) return;
      if (this.ctx.state !== 'running') return;
      const freq = melody[step % melody.length];
      step++;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const over = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      over.type = 'sine';
      osc.frequency.value = freq;
      over.frequency.value = freq * 2;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.075, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      const overGain = this.ctx.createGain();
      overGain.gain.value = 0.25;
      osc.connect(gain);
      over.connect(overGain);
      overGain.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      over.start(now);
      osc.stop(now + 1.45);
      over.stop(now + 1.45);
    };

    tickNote();
    this.proposalInterval = window.setInterval(tickNote, 480);
  }

  public stopProposalMusic(): void {
    this.inProposal = false;
    if (this.proposalInterval !== null) {
      clearInterval(this.proposalInterval);
      this.proposalInterval = null;
    }
  }

  public playFootstep(running: boolean): void {
    if (!this.ctx || !this.sfxGain || this.sfxVol <= 0.01) return;
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(running ? 115 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);
    gain.gain.setValueAtTime(running ? 0.08 : 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump(): void {
    this.playTone(220, 340, 0.14, 'sine', 0.08);
  }

  public playLand(): void {
    this.playTone(120, 58, 0.09, 'sine', 0.08);
  }

  public playDoor(open: boolean): void {
    this.playTone(open ? 180 : 240, open ? 260 : 140, 0.22, 'triangle', 0.1);
  }

  public playInteract(): void {
    this.playTone(523.25, 659.25, 0.18, 'sine', 0.09);
  }

  public playPianoPhrase(): void {
    if (!this.ctx || !this.sfxGain || this.sfxVol <= 0.01) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 1.15);
    });
  }

  public playKissChime(): void {
    if (!this.ctx || !this.sfxGain || this.sfxVol <= 0.01) return;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.95);
    });
  }

  public playSecretUnlock(): void {
    if (!this.ctx || !this.sfxGain || this.sfxVol <= 0.01) return;
    const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.13;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 1.55);
    });
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    peak: number
  ): void {
    if (!this.ctx || !this.sfxGain || this.sfxVol <= 0.01) return;
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public dispose(): void {
    if (this.ambientInterval !== null) clearInterval(this.ambientInterval);
    if (this.proposalInterval !== null) clearInterval(this.proposalInterval);
    this.ambientInterval = null;
    this.proposalInterval = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
