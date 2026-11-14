import * as Tone from 'tone';
import { MixerChannelState, NasaTrack, ScanColumnTelemetry } from '../types/earthsound';

class EarthSoundToneEngine {
  private initialized = false;
  private isInitializing = false;

  private masterReverb: Tone.Reverb | null = null;
  private mainFilter: Tone.Filter | null = null;
  private mainPanner: Tone.Panner | null = null;

  private melodySynth: Tone.PolySynth | null = null;
  private redSynth: Tone.FMSynth | null = null;
  private greenSynth: Tone.AMSynth | null = null;
  private blueSynth: Tone.Synth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private percussionSynth: Tone.PluckSynth | null = null;

  private channelGains: Record<MixerChannelState['id'], Tone.Gain | null> = {
    melody: null,
    rgb: null,
    bass: null,
    percussion: null,
  };

  private lastTriggeredTime = 0;

  public async ensureStarted(): Promise<boolean> {
    if (this.initialized) {
      if (Tone.getContext().state !== 'running') {
        try {
          await Tone.start();
        } catch {
          return false;
        }
      }
      return true;
    }
    if (this.isInitializing) return false;
    this.isInitializing = true;

    try {
      await Tone.start();
      this.masterReverb = new Tone.Reverb({ decay: 2.4, wet: 0.28 }).toDestination();
      this.mainFilter = new Tone.Filter({ frequency: 3200, type: 'lowpass', rolloff: -12 }).connect(
        this.masterReverb
      );
      this.mainPanner = new Tone.Panner(0).connect(this.mainFilter);

      const gMelody = new Tone.Gain(0.75).connect(this.mainPanner);
      const gRgb = new Tone.Gain(0.65).connect(this.mainPanner);
      const gBass = new Tone.Gain(0.6).connect(this.mainFilter);
      const gPerc = new Tone.Gain(0.7).connect(this.mainPanner);

      this.channelGains = {
        melody: gMelody,
        rgb: gRgb,
        bass: gBass,
        percussion: gPerc,
      };

      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.025, decay: 0.25, sustain: 0.3, release: 0.65 },
      }).connect(gMelody);

      this.redSynth = new Tone.FMSynth({
        harmonicity: 2.0,
        modulationIndex: 3.5,
        envelope: { attack: 0.06, decay: 0.3, sustain: 0.4, release: 0.8 },
      }).connect(gRgb);

      this.greenSynth = new Tone.AMSynth({
        harmonicity: 1.5,
        envelope: { attack: 0.04, decay: 0.25, sustain: 0.35, release: 0.6 },
      }).connect(gRgb);

      this.blueSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.015, decay: 0.3, sustain: 0.2, release: 0.9 },
      }).connect(gRgb);

      this.bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.03, decay: 0.25, sustain: 0.4, release: 0.5 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.4, baseFrequency: 90, octaves: 2.5 },
      }).connect(gBass);

      this.percussionSynth = new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 3600,
        resonance: 0.85,
      }).connect(gPerc);

      this.initialized = true;
      return true;
    } catch {
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  public syncMixerChannels(channels: MixerChannelState[]): void {
    if (!this.initialized) return;
    const anySolo = channels.some((c) => c.solo);

    for (const ch of channels) {
      const gainNode = this.channelGains[ch.id];
      if (!gainNode) continue;
      const audible = !ch.muted && (!anySolo || ch.solo);
      gainNode.gain.rampTo(audible ? ch.volume * 0.85 : 0, 0.06);
    }
  }

  public triggerScanTelemetry(
    telemetry: ScanColumnTelemetry,
    track: NasaTrack,
    channels: MixerChannelState[]
  ): void {
    if (!this.initialized || Tone.getContext().state !== 'running') return;
    this.syncMixerChannels(channels);

    const now = Tone.now();
    if (now - this.lastTriggeredTime < 0.07) return;
    this.lastTriggeredTime = now;

    try {
      // Spatial stereo panning (Atmospheric River & global sweep)
      if (this.mainPanner) {
        const panAmount =
          track.mode === 'stereo_reverb'
            ? telemetry.stereoPan
            : telemetry.stereoPan * 0.45;
        this.mainPanner.pan.rampTo(Math.max(-1, Math.min(1, panAmount)), 0.08);
      }

      // Low-pass filter sweep driven by ocean/current luminance & contrast
      if (this.mainFilter) {
        const cutoff = 450 + (telemetry.meanLuminance / 255) * 3800 + telemetry.contrastIndex * 28;
        this.mainFilter.frequency.rampTo(Math.min(7200, Math.max(320, cutoff)), 0.09);
      }

      // Consonance-to-Dissonance detune (Air Quality PM2.5)
      if (this.melodySynth) {
        this.melodySynth.set({ detune: telemetry.detuneCents });
        if (telemetry.activeNotes.length > 0) {
          const velocity = Math.min(0.8, Math.max(0.15, telemetry.meanLuminance / 255));
          this.melodySynth.triggerAttackRelease(telemetry.activeNotes, '16n', now, velocity);
        }
      }

      // Channel 2: Multi-Track RGB voices
      const totalRgb = Math.max(1, telemetry.sumR + telemetry.sumG + telemetry.sumB);
      const rNorm = telemetry.sumR / totalRgb;
      const gNorm = telemetry.sumG / totalRgb;
      const bNorm = telemetry.sumB / totalRgb;
      const scale = track.musical_scale;

      if (rNorm > 0.3 && this.redSynth && scale.length > 2) {
        this.redSynth.triggerAttackRelease(scale[1], '8n', now, Math.min(0.55, rNorm));
      }
      if (gNorm > 0.3 && this.greenSynth && scale.length > 6) {
        this.greenSynth.triggerAttackRelease(scale[Math.floor(scale.length / 2)], '8n', now, Math.min(0.55, gNorm));
      }
      if (bNorm > 0.3 && this.blueSynth && scale.length > 10) {
        this.blueSynth.triggerAttackRelease(scale[scale.length - 3], '16n', now, Math.min(0.5, bNorm));
      }

      // Channel 3: Rhythm & LFO Bass
      if (this.bassSynth && telemetry.meanLuminance > 35 && scale.length > 0) {
        const bassNote = scale[0];
        const bassVel = Math.min(0.65, 0.25 + telemetry.contrastIndex / 140);
        this.bassSynth.triggerAttackRelease(bassNote, '8n', now, bassVel);
      }

      // Channel 4: Punctuated Percussion on L > 240 spikes (ISS Lightning & bright fronts)
      if (this.percussionSynth && telemetry.flashCount > 0) {
        const flashBand = telemetry.bands.find((b) => b.flash);
        const strikeNote = flashBand?.note || scale[scale.length - 1] || 'C5';
        this.percussionSynth.triggerAttackRelease(strikeNote, '16n', now);
      }
    } catch {
      // Ignore transient Web Audio scheduling collisions
    }
  }

  public async playReferenceNote(note: string, pan: number = 0, duration: string = '8n'): Promise<void> {
    const started = await this.ensureStarted();
    if (!started || !this.melodySynth) return;
    try {
      if (this.mainPanner) {
        this.mainPanner.pan.rampTo(Math.max(-1, Math.min(1, pan)), 0.04);
      }
      this.melodySynth.triggerAttackRelease(note, duration, undefined, 0.55);
    } catch {
      // Safe no-op
    }
  }

  public async playUiConfirmChime(): Promise<void> {
    const started = await this.ensureStarted();
    if (!started || !this.blueSynth) return;
    try {
      this.blueSynth.triggerAttackRelease('G5', '32n', undefined, 0.22);
    } catch {
      // Safe no-op
    }
  }
}

export const toneEngine = new EarthSoundToneEngine();
