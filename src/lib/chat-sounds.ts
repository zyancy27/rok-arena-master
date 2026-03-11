/**
 * Chat Sound Effects Engine
 * Lightweight notification sounds for chat events using Web Audio API
 */

type ChatSoundType = 'message_sent' | 'message_received' | 'narrator_message' | 'dice_roll' | 'typing_start';

class ChatSoundsEngine {
  private ctx: AudioContext | null = null;
  private _volume = 0.5;
  private _enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(v: number) { this._volume = Math.max(0, Math.min(1, v)); }
  setEnabled(v: boolean) { this._enabled = v; }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 1) {
    if (!this._enabled || this._volume === 0) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(this._volume * volume * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  play(type: ChatSoundType) {
    switch (type) {
      case 'message_sent':
        this.playTone(880, 0.08, 'sine', 0.6);
        setTimeout(() => this.playTone(1100, 0.06, 'sine', 0.4), 60);
        break;
      case 'message_received':
        this.playTone(660, 0.1, 'sine', 0.7);
        setTimeout(() => this.playTone(880, 0.08, 'sine', 0.5), 80);
        setTimeout(() => this.playTone(1100, 0.06, 'sine', 0.3), 150);
        break;
      case 'narrator_message':
        this.playTone(440, 0.15, 'triangle', 0.5);
        setTimeout(() => this.playTone(550, 0.12, 'triangle', 0.4), 120);
        setTimeout(() => this.playTone(660, 0.1, 'triangle', 0.3), 220);
        break;
      case 'dice_roll':
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            this.playTone(200 + Math.random() * 400, 0.04, 'square', 0.3);
          }, i * 50);
        }
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.5), 220);
        break;
      case 'typing_start':
        this.playTone(600, 0.03, 'sine', 0.2);
        break;
    }
  }

  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

let instance: ChatSoundsEngine | null = null;

export function getChatSoundsEngine(): ChatSoundsEngine {
  if (!instance) {
    instance = new ChatSoundsEngine();
  }
  return instance;
}

export type { ChatSoundType };
