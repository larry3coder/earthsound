export enum WorkspaceId {
  HOME = 'home',
  EXPLORE = 'explore',
  STUDIO = 'studio',
  ANALYSIS = 'analysis',
  LEARN = 'learn',
  ACCESSIBILITY = 'accessibility',
}

export enum AccessibilityMode {
  STANDARD = 'standard',
  HIGH_CONTRAST = 'high_contrast',
  LOW_VISION = 'low_vision',
  AUDIO_NAV = 'audio_nav',
}

export enum SonificationMode {
  RADAR_SCANLINE = 'radar_scanline',
  MULTITRACK_RGB = 'multitrack_rgb',
  TACTILE_SONAR = 'tactile_sonar',
}

export interface ColorbarStop {
  stop: number;
  color: string;
  label: string;
  value: number;
  note: string;
}

export interface LayerVoiceConfig {
  label: string;
  instrument: string;
  note_range: 'low' | 'mid' | 'high';
}

export interface NasaTrack {
  id: string;
  index: number;
  title: string;
  short_title: string;
  svs_id: string;
  svs_url: string;
  gibs_layer: string;
  mode: string;
  synthesis_role: string;
  musical_scale: string[];
  bpm: number;
  physical_unit: string;
  physical_range: [number, number];
  legend_audio_en: string;
  colorbar_stops: ColorbarStop[];
  layers: {
    red: LayerVoiceConfig;
    green: LayerVoiceConfig;
    blue: LayerVoiceConfig;
  };
}

export interface RegionalPreset {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  zoom: number;
  recommendedTrackId: string;
  summary: string;
}

export interface MixerChannelState {
  id: 'melody' | 'rgb' | 'bass' | 'percussion';
  name: string;
  subtitle: string;
  volume: number; // 0 to 1
  muted: boolean;
  solo: boolean;
  activity: number; // 0 to 1 real-time meter
}

export interface ScanBandSample {
  bandIndex: number; // 0 (top/North) to 15 (bottom/South)
  r: number;
  g: number;
  b: number;
  luminance: number;
  note: string;
  active: boolean;
  flash: boolean;
}

export interface ScanColumnTelemetry {
  scanX: number;
  width: number;
  bands: ScanBandSample[];
  sumR: number;
  sumG: number;
  sumB: number;
  meanLuminance: number;
  contrastIndex: number;
  flashCount: number;
  activeNotes: string[];
  harmonyQuality: 'Major Consonance' | 'Suspended Equilibrium' | 'Minor Tension';
  detuneCents: number;
  stereoPan: number;
}

export interface SonarReading {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  luminance: number;
  note: string;
  physicalLabel: string;
  physicalValue: number;
  unit: string;
  pan: number;
}

export interface ImageAnalysisMetrics {
  meanR: number;
  meanG: number;
  meanB: number;
  meanLuminance: number;
  contrastStdDev: number;
  edgeDensity: number;
  dominantBand: 'Red (Thermal/Dust)' | 'Green (Biosphere/Sulfates)' | 'Blue (Ocean/Vapor)';
  histogramR: number[]; // 16 bins
  histogramG: number[]; // 16 bins
  histogramB: number[]; // 16 bins
  harmonySummary: string;
  estimatedDissonance: number; // 0 to 1
}
