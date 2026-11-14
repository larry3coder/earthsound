import React from 'react';
import { Disc3 } from 'lucide-react';
import {
  ImageAnalysisMetrics,
  MixerChannelState,
  NasaTrack,
  ScanColumnTelemetry,
  SonificationMode,
} from '../types/earthsound';
import { ImageViewer } from '../components/ImageViewer';
import { AudioPlayer } from '../components/AudioPlayer';
import { useAccessibility } from '../context/AccessibilityContext';

interface StudioProps {
  tracks: NasaTrack[];
  selectedTrack: NasaTrack;
  onSelectTrack: (track: NasaTrack) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  sonificationMode: SonificationMode;
  onChangeMode: (mode: SonificationMode) => void;
  channels: MixerChannelState[];
  onToggleMute: (id: MixerChannelState['id']) => void;
  onToggleSolo: (id: MixerChannelState['id']) => void;
  onChangeVolume: (id: MixerChannelState['id'], volume: number) => void;
  telemetry: ScanColumnTelemetry | null;
  onScanTelemetry: (telemetry: ScanColumnTelemetry) => void;
  onAnalysisReady: (metrics: ImageAnalysisMetrics) => void;
  onExportColumnsReady: (
    getter: () => Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }>
  ) => void;
  onExportWav: () => void;
  onExportMidi: () => void;
  isExporting: boolean;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
}

export const Studio: React.FC<StudioProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  isPlaying,
  onTogglePlay,
  onStop,
  bpm,
  onChangeBpm,
  sonificationMode,
  onChangeMode,
  channels,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
  telemetry,
  onScanTelemetry,
  onAnalysisReady,
  onExportColumnsReady,
  onExportWav,
  onExportMidi,
  isExporting,
  uploadInputRef,
}) => {
  const { announce, playUiCue } = useAccessibility();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            02. Audio Studio &amp; Scanline Engine
          </h1>
          <p className="text-xs text-slate-400">
            Select any of the 11 NASA SVS datasets, sweep the Radar Scanline, or probe pixels with Tactile Cursor Sonar.
          </p>
        </div>

        {/* Quick Dataset Dropdown for instant keyboard selection */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="studio-track-select" className="text-xs text-slate-400 whitespace-nowrap">
            Active Track
          </label>
          <select
            id="studio-track-select"
            value={selectedTrack.id}
            onChange={(e) => {
              const next = tracks.find((t) => t.id === e.target.value);
              if (next) {
                onSelectTrack(next);
                onChangeBpm(next.bpm);
                playUiCue();
                announce(`Loaded ${next.title}. ${next.legend_audio_en}`, true);
              }
            }}
            className="rounded-xl bg-[#0B1120] border border-sky-500/30 px-3 py-1.5 text-xs text-white focus:border-sky-400"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                #{String(t.index).padStart(2, '0')} · {t.short_title} (SVS {t.svs_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compact Single-Row Scrollable Jukebox Strip */}
      <section aria-labelledby="jukebox-tracks-heading" className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Disc3 className="w-3.5 h-3.5 text-sky-400" />
          <h2 id="jukebox-tracks-heading">Earth Information Jukebox Catalog (11 Datasets)</h2>
        </div>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-1.5">
          {tracks.map((track) => {
            const active = track.id === selectedTrack.id;
            return (
              <button
                key={track.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onSelectTrack(track);
                  onChangeBpm(track.bpm);
                  playUiCue();
                  announce(`Loaded ${track.title}. ${track.legend_audio_en}`, true);
                }}
                className={`text-left px-3 py-2 rounded-xl border transition-colors min-w-[168px] shrink-0 ${
                  active
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-sky-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-sky-400">
                    #{String(track.index).padStart(2, '0')} · {track.svs_id}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {track.bpm}
                  </span>
                </div>
                <p className="text-xs font-medium mt-0.5 truncate">{track.short_title}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 800x400 Canvas + Radar Scanline + Tactile Sonar */}
      <ImageViewer
        track={selectedTrack}
        isPlaying={isPlaying}
        bpm={bpm}
        sonificationMode={sonificationMode}
        onChangeMode={onChangeMode}
        onScanTelemetry={onScanTelemetry}
        onAnalysisReady={onAnalysisReady}
        onExportColumnsReady={onExportColumnsReady}
        uploadInputRef={uploadInputRef}
      />

      {/* 4-Channel Synthesizer Mixer & Export */}
      <AudioPlayer
        track={selectedTrack}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onStop={onStop}
        bpm={bpm}
        onChangeBpm={onChangeBpm}
        channels={channels}
        onToggleMute={onToggleMute}
        onToggleSolo={onToggleSolo}
        onChangeVolume={onChangeVolume}
        telemetry={telemetry}
        onExportWav={onExportWav}
        onExportMidi={onExportMidi}
        isExporting={isExporting}
      />
    </div>
  );
};
