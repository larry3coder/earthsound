import test from 'node:test';
import assert from 'node:assert/strict';
import tracksJson from '../../nasa_jukebox_tracks.json';
import { NasaTrack } from '../types/earthsound';
import {
  analyzeFullImageData,
  analyzeScanColumn,
  computeLuminance,
  computeSonarReading,
  estimatePhysicalValueFromColor,
  mapBandToScaleNote,
  mapYToScaleNote,
  NUM_LAT_BANDS,
} from './sonificationMath';

const tracks = tracksJson as NasaTrack[];

test('catalog contains all 11 official NASA SVS/EIC resources and zero excluded nations', () => {
  assert.equal(tracks.length, 11);
  const serialized = JSON.stringify(tracks).toLowerCase();
  assert.equal(serialized.includes('china'), false);
  assert.equal(serialized.includes('russia'), false);
  assert.equal(serialized.includes('beijing'), false);
  assert.equal(serialized.includes('moscow'), false);
});

test('computeLuminance implements ITU-R BT.709 formula accurately', () => {
  assert.equal(Math.round(computeLuminance(0, 0, 0)), 0);
  assert.equal(Math.round(computeLuminance(255, 255, 255)), 255);
  // Pure green contributes 0.7152 * 200 = 143.04
  assert.ok(Math.abs(computeLuminance(0, 200, 0) - 143.04) < 0.01);
});

test('Caldwell 73 Y-coordinate mapping assigns higher pitches to northern bands and bass to southern bands', () => {
  const scale = tracks[1].musical_scale; // Caldwell 73
  const northNote = mapYToScaleNote(0, 400, scale);
  const southNote = mapYToScaleNote(399, 400, scale);
  assert.equal(northNote, scale[scale.length - 1]);
  assert.equal(southNote, scale[0]);
  assert.equal(mapBandToScaleNote(0, NUM_LAT_BANDS, scale), scale[scale.length - 1]);
  assert.equal(mapBandToScaleNote(15, NUM_LAT_BANDS, scale), scale[0]);
});

test('analyzeScanColumn enforces L > 30 silence threshold and L > 240 flash trigger', () => {
  const height = 400;
  const col = new Uint8ClampedArray(height * 4);
  // Leave everything dark (0,0,0) except top band (y = 0..24) bright white (255,255,255)
  for (let y = 0; y < 25; y++) {
    col[y * 4] = 255;
    col[y * 4 + 1] = 255;
    col[y * 4 + 2] = 255;
    col[y * 4 + 3] = 255;
  }
  const lightningTrack = tracks.find((t) => t.id === 'iss_lightning')!;
  const telemetry = analyzeScanColumn(col, 400, 800, height, lightningTrack);

  assert.equal(telemetry.bands.length, 16);
  assert.equal(telemetry.bands[0].active, true);
  assert.equal(telemetry.bands[0].flash, true);
  assert.equal(telemetry.bands[8].active, false);
  assert.equal(telemetry.flashCount, 1);
  assert.equal(telemetry.stereoPan, 0);
});

test('estimatePhysicalValueFromColor maps GEDI Forest Height green canopy to realistic meters', () => {
  const gediTrack = tracks.find((t) => t.id === 'gedi_forest_height')!;
  const result = estimatePhysicalValueFromColor(34, 197, 94, gediTrack);
  assert.ok(result.estimatedValue >= 18 && result.estimatedValue <= 40);
  assert.ok(result.stop.label.length > 0);
});

test('computeSonarReading calculates 5x5 cluster average and stereo pan', () => {
  const cluster = new Uint8ClampedArray(25 * 4);
  for (let i = 0; i < 25; i++) {
    cluster[i * 4] = 240;
    cluster[i * 4 + 1] = 100;
    cluster[i * 4 + 2] = 40;
    cluster[i * 4 + 3] = 255;
  }
  const aeros = tracks.find((t) => t.id === 'geos_aerosols')!;
  const reading = computeSonarReading(cluster, 600, 100, 800, 400, aeros);
  assert.equal(reading.pan, 0.5);
  assert.equal(reading.r, 240);
  assert.ok(reading.luminance > 30);
});

test('analyzeFullImageData produces 16-bin histograms and contrast metrics', () => {
  const width = 40;
  const height = 20;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = 20;
    rgba[i * 4 + 1] = 180;
    rgba[i * 4 + 2] = 90;
    rgba[i * 4 + 3] = 255;
  }
  const metrics = analyzeFullImageData(rgba, width, height, tracks[10]);
  assert.equal(metrics.histogramR.length, 16);
  assert.equal(metrics.dominantBand, 'Green (Biosphere/Sulfates)');
  assert.ok(metrics.meanLuminance > 120);
});
