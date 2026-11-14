import test from 'node:test';
import assert from 'node:assert/strict';
import tracksJson from '../../nasa_jukebox_tracks.json';
import { NasaTrack } from '../types/earthsound';
import {
  generateMidiFromBands,
  generateWavFromBands,
  midiToFrequency,
  noteNameToMidi,
} from './audioExport';

const tracks = tracksJson as NasaTrack[];

test('noteNameToMidi and midiToFrequency convert musical pitches accurately', () => {
  assert.equal(noteNameToMidi('A4'), 69);
  assert.equal(noteNameToMidi('C4'), 60);
  assert.equal(noteNameToMidi('Eb3'), 51);
  assert.ok(Math.abs(midiToFrequency(69) - 440) < 0.001);
});

test('generateMidiFromBands produces valid Standard MIDI File header (MThd + MTrk)', () => {
  const mockColumns = [
    {
      bands: Array.from({ length: 16 }, (_, idx) => ({
        luminance: idx % 2 === 0 ? 180 : 10,
        r: 40,
        g: 180,
        b: 90,
      })),
    },
  ];
  const bytes = generateMidiFromBands(mockColumns, tracks[0]);
  const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const trackChunk = String.fromCharCode(bytes[14], bytes[15], bytes[16], bytes[17]);
  assert.equal(header, 'MThd');
  assert.equal(trackChunk, 'MTrk');
  assert.ok(bytes.length > 30);
});

test('generateWavFromBands produces valid 16-bit PCM RIFF WAVE header', () => {
  const mockColumns = [
    {
      bands: Array.from({ length: 16 }, () => ({
        luminance: 160,
        r: 90,
        g: 150,
        b: 200,
      })),
    },
  ];
  const wav = generateWavFromBands(mockColumns, tracks[4], 22050);
  const riff = String.fromCharCode(wav[0], wav[1], wav[2], wav[3]);
  const wave = String.fromCharCode(wav[8], wav[9], wav[10], wav[11]);
  assert.equal(riff, 'RIFF');
  assert.equal(wave, 'WAVE');
  assert.ok(wav.length > 44);
});
