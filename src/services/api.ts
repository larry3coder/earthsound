import tracksData from '../../nasa_jukebox_tracks.json';
import { NasaTrack } from '../types/earthsound';

export interface SonifyBandRequest {
  trackId: string;
  bandColumns: Array<{
    bands: Array<{ luminance: number; r: number; g: number; b: number }>;
  }>;
}

export async function fetchTrackCatalog(): Promise<NasaTrack[]> {
  try {
    const res = await fetch('/api/presets');
    if (!res.ok) throw new Error('Preset catalog unavailable');
    return (await res.json()) as NasaTrack[];
  } catch {
    return tracksData as NasaTrack[];
  }
}

export async function requestServerSonification(payload: {
  trackId: string;
  rgbSummary: { r: number; g: number; b: number; luminance: number };
}) {
  const res = await fetch('/api/sonify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Sonification request failed (${res.status})`);
  }
  return res.json();
}

export async function downloadExportedMidi(payload: SonifyBandRequest, filename: string): Promise<void> {
  const res = await fetch('/api/export-midi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('MIDI export failed');
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

export async function downloadExportedWav(payload: SonifyBandRequest, filename: string): Promise<void> {
  const res = await fetch('/api/export-wav', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('WAV export failed');
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
