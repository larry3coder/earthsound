import { NasaTrack } from '../types/earthsound';
import { computeLuminance, mapBandToScaleNote, NUM_LAT_BANDS } from './sonificationMath';

const NOTE_INDEX_MAP: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/**
 * Converts a musical note name (e.g. "C4", "Eb3", "G#5") to MIDI note number (0-127).
 */
export function noteNameToMidi(noteName: string): number {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(noteName.trim());
  if (!match) return 60; // Middle C fallback
  const pitchClass = NOTE_INDEX_MAP[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  return Math.max(0, Math.min(127, (octave + 1) * 12 + pitchClass));
}

/**
 * Converts MIDI note number to frequency in Hz (A4 = 440Hz).
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function encodeVarLen(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

export interface MidiNoteEvent {
  midi: number;
  velocity: number;
  startTick: number;
  durationTicks: number;
  channel: number;
}

/**
 * Encodes a sequence of note events into a valid Standard MIDI File (Format 0, 480 PPQN).
 */
export function buildStandardMidiBytes(events: MidiNoteEvent[], bpm: number): Uint8Array {
  const ppqn = 480;
  const microsecPerQuarter = Math.round(60_000_000 / Math.max(40, Math.min(240, bpm)));

  interface RawMidiOp {
    tick: number;
    bytes: number[];
  }

  const ops: RawMidiOp[] = [
    // Set Tempo meta event
    {
      tick: 0,
      bytes: [
        0xff,
        0x51,
        0x03,
        (microsecPerQuarter >> 16) & 0xff,
        (microsecPerQuarter >> 8) & 0xff,
        microsecPerQuarter & 0xff,
      ],
    },
  ];

  for (const ev of events) {
    const ch = ev.channel & 0x0f;
    const vel = Math.max(1, Math.min(127, Math.round(ev.velocity)));
    const note = Math.max(0, Math.min(127, Math.round(ev.midi)));
    ops.push({ tick: ev.startTick, bytes: [0x90 | ch, note, vel] });
    ops.push({ tick: ev.startTick + ev.durationTicks, bytes: [0x80 | ch, note, 0] });
  }

  ops.sort((a, b) => a.tick - b.tick);

  const trackBytes: number[] = [];
  let lastTick = 0;
  for (const op of ops) {
    const delta = Math.max(0, op.tick - lastTick);
    lastTick = op.tick;
    trackBytes.push(...encodeVarLen(delta), ...op.bytes);
  }
  // End of track meta event
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  const trackLen = trackBytes.length;
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length 6
    0x00, 0x00, // Format 0
    0x00, 0x01, // 1 track
    (ppqn >> 8) & 0xff,
    ppqn & 0xff,
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  return new Uint8Array([...header, ...trackBytes]);
}

/**
 * Generates deterministic MIDI note events from track scale and sample band values.
 */
export function generateMidiFromBands(
  bandColumns: Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }>,
  track: NasaTrack
): Uint8Array {
  const ppqn = 480;
  const stepTicks = Math.round(ppqn / 2); // Eighth-note pulse
  const events: MidiNoteEvent[] = [];

  bandColumns.forEach((col, stepIdx) => {
    const startTick = stepIdx * stepTicks;
    col.bands.forEach((band, bandIdx) => {
      if (band.luminance > 30) {
        const noteName = mapBandToScaleNote(bandIdx, NUM_LAT_BANDS, track.musical_scale);
        const midi = noteNameToMidi(noteName);
        const velocity = Math.min(115, Math.max(30, Math.round((band.luminance / 255) * 110)));
        const channel = band.r >= band.g && band.r >= band.b ? 0 : band.g >= band.b ? 1 : 2;
        events.push({
          midi,
          velocity,
          startTick,
          durationTicks: Math.round(stepTicks * 0.85),
          channel,
        });
      }
    });
  });

  if (events.length === 0) {
    // Emit a gentle root chord if dark frame
    events.push({
      midi: noteNameToMidi(track.musical_scale[0] || 'C4'),
      velocity: 64,
      startTick: 0,
      durationTicks: ppqn,
      channel: 0,
    });
  }

  return buildStandardMidiBytes(events, track.bpm);
}

/**
 * Synthesizes a clean 16-bit PCM RIFF WAV buffer directly from quantized musical notes
 * derived from the dataset scan columns (supports both client-side and server-side export).
 */
export function generateWavFromBands(
  bandColumns: Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }>,
  track: NasaTrack,
  sampleRate: number = 22050
): Uint8Array {
  const secondsPerStep = 60 / Math.max(60, track.bpm) / 2;
  const totalSteps = Math.max(1, bandColumns.length);
  const totalDurationSec = totalSteps * secondsPerStep + 0.4;
  const totalSamples = Math.floor(totalDurationSec * sampleRate);
  const mixBuffer = new Float32Array(totalSamples);

  bandColumns.forEach((col, stepIdx) => {
    const stepStartSample = Math.floor(stepIdx * secondsPerStep * sampleRate);
    const noteDurSamples = Math.floor(secondsPerStep * 1.3 * sampleRate);

    // Pick top 3 brightest active bands per step for lush harmonic clarity
    const topBands = col.bands
      .map((b, idx) => ({ ...b, idx }))
      .filter((b) => b.luminance > 30)
      .sort((a, b) => b.luminance - a.luminance)
      .slice(0, 3);

    topBands.forEach((b) => {
      const noteName = mapBandToScaleNote(b.idx, NUM_LAT_BANDS, track.musical_scale);
      const freq = midiToFrequency(noteNameToMidi(noteName));
      const amp = (b.luminance / 255) * 0.22;

      for (let i = 0; i < noteDurSamples; i++) {
        const sampleIdx = stepStartSample + i;
        if (sampleIdx >= totalSamples) break;
        const t = i / sampleRate;
        const env =
          i < sampleRate * 0.02
            ? i / (sampleRate * 0.02)
            : Math.exp(-3.2 * (i / noteDurSamples));
        // Blend fundamental + warm 2nd harmonic
        const wave = Math.sin(2 * Math.PI * freq * t) * 0.78 + Math.sin(4 * Math.PI * freq * t) * 0.22;
        mixBuffer[sampleIdx] += wave * amp * env;
      }
    });
  });

  // Encode RIFF WAVE 16-bit mono PCM
  const dataSize = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < totalSamples; i++) {
    const clamped = Math.max(-0.95, Math.min(0.95, mixBuffer[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return new Uint8Array(buffer);
}

/**
 * Helper to extract a compact 16-step column summary from an HTML5 Canvas for WAV/MIDI export.
 */
export function sampleCanvasColumnsForExport(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  steps: number = 24
): Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }> {
  const columns: Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }> = [];
  const bandHeight = Math.floor(height / NUM_LAT_BANDS);

  for (let s = 0; s < steps; s++) {
    const x = Math.min(width - 1, Math.floor((s / steps) * width));
    const colData = ctx.getImageData(x, 0, 1, height).data;
    const bands: Array<{ luminance: number; r: number; g: number; b: number }> = [];

    for (let b = 0; b < NUM_LAT_BANDS; b++) {
      const y = Math.min(height - 1, b * bandHeight + Math.floor(bandHeight / 2));
      const idx = y * 4;
      const r = colData[idx];
      const g = colData[idx + 1];
      const bl = colData[idx + 2];
      bands.push({ r, g, b: bl, luminance: computeLuminance(r, g, bl) });
    }
    columns.push({ bands });
  }
  return columns;
}
