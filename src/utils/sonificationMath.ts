import {
  ColorbarStop,
  ImageAnalysisMetrics,
  NasaTrack,
  RegionalPreset,
  ScanBandSample,
  ScanColumnTelemetry,
  SonarReading,
} from '../types/earthsound';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;
export const NUM_LAT_BANDS = 16;
export const LUMINANCE_THRESHOLD = 30;
export const FLASH_THRESHOLD = 240;

/**
 * Neutral global & regional Earth Observation presets (zero geopolitical exclusions).
 */
export const REGIONAL_PRESETS: RegionalPreset[] = [
  {
    id: 'amazon_canopy',
    name: 'Amazon Basin Canopy',
    region: 'South America',
    lat: -3.4653,
    lon: -62.2159,
    zoom: 5,
    recommendedTrackId: 'gedi_forest_height',
    summary: 'Dense multi-story tropical rainforest canopy reaching 35-40m elevation.',
  },
  {
    id: 'gulf_stream',
    name: 'Gulf Stream Boundary',
    region: 'North Atlantic',
    lat: 35.5,
    lon: -68.0,
    zoom: 5,
    recommendedTrackId: 'perpetual_ocean_2',
    summary: 'High-velocity western boundary current eddies and thermal gradients.',
  },
  {
    id: 'sahara_dust',
    name: 'Sahara Dust Corridor',
    region: 'North Atlantic & West Africa',
    lat: 19.5,
    lon: -15.2,
    zoom: 4,
    recommendedTrackId: 'geos_aerosols',
    summary: 'Trans-Atlantic mineral dust plumes interacting with marine sea salt aerosols.',
  },
  {
    id: 'pamir_glaciers',
    name: 'Pamir & Tien Shan Glaciers',
    region: 'Central Asia',
    lat: 38.8,
    lon: 72.3,
    zoom: 6,
    recommendedTrackId: 'caldwell_73',
    summary: 'High-albedo alpine snowpack and glacial valleys with sharp luminance contrast.',
  },
  {
    id: 'pacific_ar',
    name: 'North American Atmospheric River',
    region: 'Northeast Pacific',
    lat: 37.8,
    lon: -128.4,
    zoom: 4,
    recommendedTrackId: 'atmospheric_river_3d',
    summary: 'Concentrated tropospheric water vapor corridor approaching the Pacific coast.',
  },
  {
    id: 'congo_lightning',
    name: 'Equatorial Storm Basin',
    region: 'Central Africa',
    lat: -1.5,
    lon: 22.0,
    zoom: 5,
    recommendedTrackId: 'iss_lightning',
    summary: 'High-frequency tropical convective lightning hotspot observed from low Earth orbit.',
  },
];

/**
 * Standard ITU-R BT.709 relative luminance: L = 0.2126R + 0.7152G + 0.0722B
 */
export function computeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Maps a vertical Y coordinate (0 = top/North, height = bottom/South)
 * to a quantized note in the track's Caldwell 73 harmonic scale.
 * Top bands map to high notes; bottom bands map to bass notes.
 */
export function mapYToScaleNote(y: number, height: number, scale: string[]): string {
  if (!scale || scale.length === 0) return 'C4';
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const normalizedFromTop = clampedY / Math.max(1, height - 1);
  // Top (0) -> highest index; Bottom (1) -> index 0
  const inverted = 1 - normalizedFromTop;
  const idx = Math.min(scale.length - 1, Math.max(0, Math.round(inverted * (scale.length - 1))));
  return scale[idx];
}

/**
 * Maps a band index (0 = North/top, 15 = South/bottom) to a scale note.
 */
export function mapBandToScaleNote(bandIndex: number, totalBands: number, scale: string[]): string {
  if (!scale || scale.length === 0) return 'C4';
  const clamped = Math.max(0, Math.min(totalBands - 1, bandIndex));
  const inverted = 1 - clamped / Math.max(1, totalBands - 1);
  const idx = Math.min(scale.length - 1, Math.max(0, Math.round(inverted * (scale.length - 1))));
  return scale[idx];
}

/**
 * Converts a hex color (#RRGGBB) to [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Finds the nearest NASA colorbar stop to an observed RGB pixel and interpolates
 * the scientific physical measurement for Tactile Cursor Sonar and Analysis.
 */
export function estimatePhysicalValueFromColor(
  r: number,
  g: number,
  b: number,
  track: NasaTrack
): { stop: ColorbarStop; estimatedValue: number } {
  const stops = track.colorbar_stops;
  if (!stops || stops.length === 0) {
    const l = computeLuminance(r, g, b);
    const val = track.physical_range[0] + (l / 255) * (track.physical_range[1] - track.physical_range[0]);
    return {
      stop: { stop: l / 255, color: '#38BDF8', label: 'Luminance', value: val, note: 'C4' },
      estimatedValue: Number(val.toFixed(1)),
    };
  }

  let bestStop = stops[0];
  let bestDist = Infinity;

  for (const s of stops) {
    const [sr, sg, sb] = hexToRgb(s.color);
    const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestStop = s;
    }
  }

  // Blend slightly with luminance for smooth continuous physical readouts
  const lumRatio = computeLuminance(r, g, b) / 255;
  const rangeSpan = track.physical_range[1] - track.physical_range[0];
  const lumEstimate = track.physical_range[0] + lumRatio * rangeSpan;
  const blended = bestStop.value * 0.72 + lumEstimate * 0.28;
  const clamped = Math.max(track.physical_range[0], Math.min(track.physical_range[1], blended));

  return {
    stop: bestStop,
    estimatedValue: Number(clamped.toFixed(1)),
  };
}

/**
 * Analyzes a single 1px-wide vertical scan column (height = 400 -> 16 bands of 25px)
 * from ctx.getImageData(scanX, 0, 1, height).data.
 */
export function analyzeScanColumn(
  columnRgba: Uint8ClampedArray,
  scanX: number,
  width: number,
  height: number,
  track: NasaTrack
): ScanColumnTelemetry {
  const bandHeight = Math.max(1, Math.floor(height / NUM_LAT_BANDS));
  const bands: ScanBandSample[] = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumL = 0;
  let flashCount = 0;
  const lumValues: number[] = [];

  for (let band = 0; band < NUM_LAT_BANDS; band++) {
    const startY = band * bandHeight;
    const endY = band === NUM_LAT_BANDS - 1 ? height : startY + bandHeight;
    let br = 0;
    let bg = 0;
    let bb = 0;
    let count = 0;
    let maxBandLum = 0;

    for (let y = startY; y < endY; y++) {
      const idx = y * 4;
      if (idx + 2 < columnRgba.length) {
        const r = columnRgba[idx];
        const g = columnRgba[idx + 1];
        const b = columnRgba[idx + 2];
        const l = computeLuminance(r, g, b);
        br += r;
        bg += g;
        bb += b;
        if (l > maxBandLum) maxBandLum = l;
        count++;
      }
    }

    const avgR = count > 0 ? br / count : 0;
    const avgG = count > 0 ? bg / count : 0;
    const avgB = count > 0 ? bb / count : 0;
    const avgL = computeLuminance(avgR, avgG, avgB);
    const isFlash = maxBandLum > FLASH_THRESHOLD;
    if (isFlash) flashCount++;

    sumR += avgR;
    sumG += avgG;
    sumB += avgB;
    sumL += avgL;
    lumValues.push(avgL);

    const note = mapBandToScaleNote(band, NUM_LAT_BANDS, track.musical_scale);
    bands.push({
      bandIndex: band,
      r: Math.round(avgR),
      g: Math.round(avgG),
      b: Math.round(avgB),
      luminance: Math.round(avgL),
      note,
      active: avgL > LUMINANCE_THRESHOLD,
      flash: isFlash,
    });
  }

  const meanLuminance = sumL / NUM_LAT_BANDS;
  const variance =
    lumValues.reduce((acc, v) => acc + (v - meanLuminance) ** 2, 0) / NUM_LAT_BANDS;
  const contrastIndex = Math.sqrt(variance);

  // Pick up to 4 most luminous active bands for polyphonic chord clarity (no muddy cluster noise)
  const activeSorted = [...bands]
    .filter((b) => b.active)
    .sort((a, b) => b.luminance - a.luminance)
    .slice(0, 4);
  const activeNotes = Array.from(new Set(activeSorted.map((b) => b.note)));

  // Consonance-to-Dissonance calculation (Air Quality PM2.5 or dense red pollution shifts harmony)
  const redRatio = sumR / Math.max(1, sumR + sumG + sumB);
  let harmonyQuality: ScanColumnTelemetry['harmonyQuality'] = 'Major Consonance';
  let detuneCents = 0;

  if (track.mode === 'consonance_dissonance' || redRatio > 0.43) {
    if (redRatio > 0.48 && meanLuminance > 90) {
      harmonyQuality = 'Minor Tension';
      detuneCents = Math.min(32, Math.round((redRatio - 0.4) * 140));
    } else if (redRatio > 0.37) {
      harmonyQuality = 'Suspended Equilibrium';
      detuneCents = Math.min(14, Math.round((redRatio - 0.34) * 80));
    }
  }

  const stereoPan = Number(((scanX / Math.max(1, width)) * 2 - 1).toFixed(2));

  return {
    scanX,
    width,
    bands,
    sumR: Math.round(sumR),
    sumG: Math.round(sumG),
    sumB: Math.round(sumB),
    meanLuminance: Math.round(meanLuminance),
    contrastIndex: Number(contrastIndex.toFixed(1)),
    flashCount,
    activeNotes,
    harmonyQuality,
    detuneCents,
    stereoPan,
  };
}

/**
 * Computes full-frame RGB histograms, luminance, contrast, edge density,
 * and harmonic summary for the Data Analysis workspace.
 */
export function analyzeFullImageData(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  track: NasaTrack
): ImageAnalysisMetrics {
  const histR = new Array<number>(16).fill(0);
  const histG = new Array<number>(16).fill(0);
  const histB = new Array<number>(16).fill(0);

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalL = 0;
  let edgeSum = 0;

  // Stride by 2px for instant interactive analysis
  const step = 2;
  let sampleCount = 0;

  for (let y = 0; y < height; y += step) {
    let prevL = 0;
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const l = computeLuminance(r, g, b);

      totalR += r;
      totalG += g;
      totalB += b;
      totalL += l;
      if (x > 0) {
        edgeSum += Math.abs(l - prevL);
      }
      prevL = l;

      histR[Math.min(15, Math.floor(r / 16))]++;
      histG[Math.min(15, Math.floor(g / 16))]++;
      histB[Math.min(15, Math.floor(b / 16))]++;
      sampleCount++;
    }
  }

  const n = Math.max(1, sampleCount);
  const meanR = totalR / n;
  const meanG = totalG / n;
  const meanB = totalB / n;
  const meanLuminance = totalL / n;

  // Second pass for contrast std-dev
  let varSum = 0;
  for (let y = 0; y < height; y += step * 2) {
    for (let x = 0; x < width; x += step * 2) {
      const idx = (y * width + x) * 4;
      const l = computeLuminance(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
      varSum += (l - meanLuminance) ** 2;
    }
  }
  const varSamples = Math.max(1, Math.ceil(height / (step * 2)) * Math.ceil(width / (step * 2)));
  const contrastStdDev = Math.sqrt(varSum / varSamples);
  const edgeDensity = Math.min(100, (edgeSum / n / 40) * 100);

  // Normalize histograms to percentage of sampled pixels
  const normalizeHist = (arr: number[]) => arr.map((c) => Number(((c / n) * 100).toFixed(2)));

  let dominantBand: ImageAnalysisMetrics['dominantBand'] = 'Blue (Ocean/Vapor)';
  if (meanR >= meanG && meanR >= meanB) dominantBand = 'Red (Thermal/Dust)';
  else if (meanG >= meanR && meanG >= meanB) dominantBand = 'Green (Biosphere/Sulfates)';

  const redDominance = meanR / Math.max(1, meanR + meanG + meanB);
  const estimatedDissonance =
    track.mode === 'consonance_dissonance'
      ? Math.min(1, Math.max(0, (redDominance - 0.3) * 3.2))
      : Math.min(0.65, Math.max(0, (contrastStdDev / 100) * 0.6));

  const harmonySummary =
    estimatedDissonance > 0.55
      ? `Tense minor intervals (${Math.round(estimatedDissonance * 30)} cents detune) driven by dense ${track.layers.red.label.toLowerCase()}.`
      : `Balanced ${track.musical_scale.slice(0, 5).join(' - ')} harmony anchored by ${dominantBand.toLowerCase()}.`;

  return {
    meanR: Number(meanR.toFixed(1)),
    meanG: Number(meanG.toFixed(1)),
    meanB: Number(meanB.toFixed(1)),
    meanLuminance: Number(meanLuminance.toFixed(1)),
    contrastStdDev: Number(contrastStdDev.toFixed(1)),
    edgeDensity: Number(edgeDensity.toFixed(1)),
    dominantBand,
    histogramR: normalizeHist(histR),
    histogramG: normalizeHist(histG),
    histogramB: normalizeHist(histB),
    harmonySummary,
    estimatedDissonance: Number(estimatedDissonance.toFixed(2)),
  };
}

/**
 * Computes a Tactile Cursor Sonar reading for a 5x5 pixel cluster around (mouseX, mouseY).
 */
export function computeSonarReading(
  clusterRgba: Uint8ClampedArray,
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
  track: NasaTrack
): SonarReading {
  const pixelCount = Math.max(1, Math.floor(clusterRgba.length / 4));
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (let i = 0; i < pixelCount; i++) {
    sr += clusterRgba[i * 4];
    sg += clusterRgba[i * 4 + 1];
    sb += clusterRgba[i * 4 + 2];
  }
  const r = Math.round(sr / pixelCount);
  const g = Math.round(sg / pixelCount);
  const b = Math.round(sb / pixelCount);
  const luminance = Math.round(computeLuminance(r, g, b));
  const note = mapYToScaleNote(mouseY, height, track.musical_scale);
  const { stop, estimatedValue } = estimatePhysicalValueFromColor(r, g, b, track);
  const pan = Number(((mouseX / Math.max(1, width)) * 2 - 1).toFixed(2));

  return {
    x: Math.round(mouseX),
    y: Math.round(mouseY),
    r,
    g,
    b,
    luminance,
    note,
    physicalLabel: stop.label,
    physicalValue: estimatedValue,
    unit: track.physical_unit,
    pan,
  };
}

/**
 * Smooth multi-harmonic noise in [0, 1] without blocky artifacts.
 */
function smoothNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Draws a crisp continental silhouette mask (equirectangular projection, 800x400)
 * using organically modulated geographic contours (zero geopolitical exclusions).
 */
export function isLandMass(lonDeg: number, latDeg: number): boolean {
  const coastJitter =
    Math.sin(lonDeg * 0.15) * 3.2 +
    Math.cos(latDeg * 0.19) * 2.6 +
    Math.sin((lonDeg + latDeg) * 0.09) * 2.1;
  const lon = lonDeg + coastJitter;
  const lat = latDeg + coastJitter * 0.65;

  // North America + Central America
  if (lon > -168 && lon < -52 && lat > 12 && lat < 72) {
    const na = ((lon + 104) / 36) ** 2 + ((lat - 46) / 21) ** 2 < 0.85;
    const ca = lon > -108 && lon < -78 && lat > 9 && lat < 26 && Math.abs(lon + 92 + (lat - 18) * 1.1) < 7;
    if (na || ca) return true;
  }
  // Greenland
  if (lon > -56 && lon < -18 && lat > 60 && lat < 83) {
    if (((lon + 38) / 15) ** 2 + ((lat - 72) / 10) ** 2 < 0.82) return true;
  }
  // South America
  if (lon > -82 && lon < -34 && lat > -55 && lat < 12) {
    const widthScale = lat > -15 ? 20 : 12;
    if (((lon + 59) / widthScale) ** 2 + ((lat + 16) / 31) ** 2 < 0.85) return true;
  }
  // Africa
  if (lon > -18 && lon < 52 && lat > -35 && lat < 37) {
    const north = ((lon - 12) / 26) ** 2 + ((lat - 18) / 16) ** 2 < 0.88;
    const south = ((lon - 25) / 14) ** 2 + ((lat + 10) / 24) ** 2 < 0.86;
    if (north || south) return true;
  }
  // Western & Central Europe, Middle East, South & Southeast Asia
  if (lon > -10 && lon < 108 && lat > 6 && lat < 62) {
    const eu = ((lon - 13) / 21) ** 2 + ((lat - 48) / 11) ** 2 < 0.8;
    const me = ((lon - 47) / 17) ** 2 + ((lat - 25) / 13) ** 2 < 0.84;
    const sa = ((lon - 78) / 15) ** 2 + ((lat - 21) / 13) ** 2 < 0.8;
    const sea = ((lon - 101) / 11) ** 2 + ((lat - 14) / 11) ** 2 < 0.65;
    if (eu || me || sa || sea) return true;
  }
  // Australia
  if (lon > 113 && lon < 154 && lat > -39 && lat < -11) {
    if (((lon - 134) / 18) ** 2 + ((lat + 25) / 12) ** 2 < 0.86) return true;
  }
  // Antarctica
  if (latDeg < -71 + Math.sin(lonDeg * 0.08) * 3) return true;
  return false;
}

/**
 * Renders a CORS-safe, deterministic, high-contrast scientific equirectangular frame
 * onto an 800x400 Canvas for any of the 11 official NASA SVS/EIC tracks.
 */
export function renderDatasetFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  track: NasaTrack,
  width: number = CANVAS_WIDTH,
  height: number = CANVAS_HEIGHT
): void {
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const latDeg = 90 - (y / height) * 180;
    const absLat = Math.abs(latDeg);

    for (let x = 0; x < width; x++) {
      const lonDeg = (x / width) * 360 - 180;
      const land = isLandMass(lonDeg, latDeg);
      const idx = (y * width + x) * 4;

      // Multi-octave organic wave patterns for satellite filaments
      const wave1 = Math.sin(lonDeg * 0.08 + latDeg * 0.06) * Math.cos(latDeg * 0.11);
      const wave2 = Math.sin(lonDeg * 0.18 - latDeg * 0.15 + 1.4);
      const swirl = Math.sin(lonDeg * 0.05 + Math.sin(latDeg * 0.09) * 3.0);
      const n = smoothNoise(x * 0.75, y * 0.75, track.index);

      let r = 8;
      let g = 16;
      let b = 34;

      switch (track.id) {
        case 'caldwell_73': {
          const cx = (x - width * 0.5) / 190;
          const cy = (y - height * 0.5) / 120;
          const dist = Math.sqrt(cx * cx + cy * cy);
          const angle = Math.atan2(cy, cx);
          const spiral = Math.sin(angle * 3 - dist * 4.5 + wave1 * 1.6);
          const core = Math.exp(-dist * 1.8);
          const halo = Math.exp(-dist * 0.85) * Math.max(0, spiral);
          r = Math.min(255, Math.round(core * 255 + halo * 165 + (n > 0.994 ? 245 : 0)));
          g = Math.min(255, Math.round(core * 195 + halo * 125 + (n > 0.994 ? 245 : 0)));
          b = Math.min(
            255,
            Math.round(core * 150 + halo * 245 + Math.exp(-dist * 1.1) * 90 + (n > 0.994 ? 255 : 0))
          );
          break;
        }

        case 'night_lights_delta': {
          r = land ? 14 : 5;
          g = land ? 16 : 8;
          b = land ? 28 : 16;
          if (land && absLat < 62) {
            const urbanCluster = Math.sin(lonDeg * 0.22) * Math.cos(latDeg * 0.28) + wave2 * 0.4;
            if (urbanCluster > 0.65) {
              r = 185;
              g = 75;
              b = 248;
            } else if (urbanCluster < -0.78) {
              r = 240;
              g = 110;
              b = 25;
            }
          }
          break;
        }

        case 'sea_surface_currents':
        case 'perpetual_ocean_2': {
          if (land) {
            r = 18;
            g = 24;
            b = 34;
          } else {
            const tempFactor = Math.max(0, 1 - absLat / 75);
            const jet = Math.abs(swirl + wave2 * 0.45);
            const currentGlow = jet > 1.05 ? 1 : jet * 0.55;
            if (track.id === 'perpetual_ocean_2') {
              const gulfBias =
                lonDeg > -85 && lonDeg < -35 && latDeg > 20 && latDeg < 48 ? 1.35 : 0.75;
              const intensity = Math.min(1, currentGlow * gulfBias);
              r = Math.round(12 + intensity * 140);
              g = Math.round(45 + intensity * 190);
              b = Math.round(105 + intensity * 150);
            } else {
              r = Math.round(tempFactor * 235 * (0.65 + 0.35 * currentGlow));
              g = Math.round((1 - Math.abs(tempFactor - 0.5) * 1.6) * 200 + currentGlow * 45);
              b = Math.round((1 - tempFactor) * 240 + currentGlow * 35);
            }
          }
          break;
        }

        case 'geos_aerosols': {
          r = land ? 24 : 10;
          g = land ? 30 : 18;
          b = land ? 30 : 38;
          const dustBelt =
            Math.exp(-((latDeg - 16) ** 2) / 260) *
            Math.max(0, Math.sin((lonDeg + 20) * 0.05) + 0.4);
          const sulfateBelt =
            Math.exp(-((latDeg - 38) ** 2) / 220) * Math.max(0, wave1 + 0.3);
          const saltBelt = !land
            ? Math.exp(-((latDeg + 45) ** 2) / 350) * (0.6 + 0.4 * Math.abs(wave2))
            : 0;

          r = Math.min(255, Math.round(r + dustBelt * 225 + n * 6));
          g = Math.min(255, Math.round(g + sulfateBelt * 215 + n * 6));
          b = Math.min(255, Math.round(b + saltBelt * 235 + n * 8));
          break;
        }

        case 'air_quality_model': {
          r = land ? 22 : 12;
          g = land ? 34 : 38;
          b = land ? 46 : 75;
          const plume = Math.max(0, wave1 * 0.6 + swirl * 0.5);
          if (land && plume > 0.38) {
            const severity = Math.min(1, (plume - 0.38) * 1.8);
            r = Math.round(60 + severity * 195);
            g = Math.round(180 - severity * 120);
            b = Math.round(90 - severity * 60);
          } else if (!land) {
            r = 16;
            g = 115;
            b = 185;
          }
          break;
        }

        case 'dyamond_co2': {
          const co2Pulse = 0.5 + 0.5 * Math.sin(lonDeg * 0.07 + wave1 * 1.5);
          const belt = Math.exp(-((latDeg - 22) ** 2) / 1400);
          const ppmFactor = Math.min(1, co2Pulse * 0.7 + belt * 0.45);
          r = Math.round(25 + ppmFactor * 220);
          g = Math.round(95 + Math.sin(ppmFactor * Math.PI) * 135);
          b = Math.round(195 - ppmFactor * 145);
          break;
        }

        case 'iss_lightning': {
          r = land ? 14 : 6;
          g = land ? 18 : 10;
          b = land ? 32 : 22;
          const tropicalBand = absLat < 38 ? 1 : 0.15;
          const stormCell = land && tropicalBand > 0.5 && wave1 > 0.25;
          if (stormCell && n > 0.972) {
            r = 255;
            g = 252;
            b = 255;
          } else if (stormCell && n > 0.92) {
            r = 140;
            g = 195;
            b = 255;
          }
          break;
        }

        case 'atmospheric_river_3d': {
          r = land ? 18 : 10;
          g = land ? 26 : 24;
          b = land ? 38 : 54;
          const plumePath = Math.sin(lonDeg * 0.045) * 24 + 28;
          const distFromRiver = Math.abs(latDeg - plumePath);
          if (distFromRiver < 16) {
            const core = 1 - distFromRiver / 16;
            const vapor = Math.min(1, core * (0.75 + 0.35 * Math.abs(wave2)));
            r = Math.round(35 + vapor * 195);
            g = Math.round(145 + vapor * 100);
            b = Math.round(180 + vapor * 75);
          }
          break;
        }

        case 'gedi_forest_height': {
          if (!land) {
            r = 6;
            g = 12;
            b = 26;
          } else {
            const tropical = Math.exp(-(latDeg ** 2) / 360);
            const boreal = Math.exp(-((latDeg - 54) ** 2) / 140) * 0.55;
            const canopy = Math.min(
              1,
              Math.max(0.05, tropical * (0.65 + 0.35 * wave1) + boreal)
            );
            if (canopy > 0.78) {
              r = 185;
              g = 250;
              b = 210;
            } else if (canopy > 0.45) {
              r = 34;
              g = Math.round(135 + canopy * 95);
              b = 75;
            } else {
              r = 120;
              g = 68;
              b = 28;
            }
          }
          break;
        }

        default: {
          if (!land) {
            r = 10;
            g = Math.round(38 + (1 - absLat / 90) * 42);
            b = Math.round(92 + (1 - absLat / 90) * 75);
          } else if (absLat > 66) {
            r = 232;
            g = 240;
            b = 248;
          } else if (absLat < 22) {
            r = 36;
            g = 122;
            b = 64;
          } else {
            r = 138;
            g = 118;
            b = 88;
          }
          if (wave1 + wave2 > 1.25) {
            r = Math.min(255, r + 95);
            g = Math.min(255, g + 95);
            b = Math.min(255, b + 100);
          }
          break;
        }
      }

      // Faint 30-degree scientific graticule overlay
      const isGrid =
        Math.abs((lonDeg + 180) % 30) < 0.45 || Math.abs((latDeg + 90) % 30) < 0.45;
      if (isGrid) {
        r = Math.min(255, r + 14);
        g = Math.min(255, g + 22);
        b = Math.min(255, b + 30);
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
