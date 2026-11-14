import React from 'react';
import { Download, Music2, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { MixerChannelState, NasaTrack, ScanColumnTelemetry } from '../types/earthsound';

interface AudioPlayerProps {
  track: NasaTrack;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  channels: MixerChannelState[];
  onToggleMute: (id: MixerChannelState['id']) => void;
  onToggleSolo: (id: MixerChannelState['id']) => void;
  onChangeVolume: (id: MixerChannelState['id'], volume: number) => void;
  telemetry: ScanColumnTelemetry | null;
  onExportWav: () => void;
  onExportMidi: () => void;
  isExporting: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  isPlaying,
  onTogglePlay,
  onStop,
  bpm,
  onChangeBpm,
  channels,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
  telemetry,
  onExportWav,
  onExportMidi,
  isExporting,
}) => {
  return (
    <section
      aria-label="4-Channel Synthesizer Mixer and Export Controls"
      className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-5"
    >
      {/* Transport + BPM + Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause sonification (Space)' : 'Play sonification (Space)'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 whitespace-nowrap"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={onStop}
            aria-label="Stop sonification"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400 text-sm whitespace-nowrap"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>

        <div className="flex items-center gap-3 min-w-[200px]">
          <label htmlFor="es-bpm-slider" className="text-xs font-medium text-slate-300 whitespace-nowrap">
            Tempo
          </label>
          <input
            id="es-bpm-slider"
            type="range"
            min={60}
            max={160}
            value={bpm}
            onChange={(e) => onChangeBpm(Number(e.target.value))}
            aria-label="Tempo in beats per minute"
            className="w-32 accent-sky-400 cursor-pointer"
          />
          <span className="font-mono text-xs text-sky-300 tabular-nums whitespace-nowrap">
            {bpm} BPM
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={onExportWav}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-500/30 bg-slate-900 text-xs font-medium text-sky-200 hover:border-sky-400 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export WAV</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={onExportMidi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-500/30 bg-slate-900 text-xs font-medium text-sky-200 hover:border-sky-400 disabled:opacity-50 whitespace-nowrap"
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Export MIDI</span>
          </button>
        </div>
      </div>

      {/* Live Scanline Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <span className="text-slate-400 block">Active Notes</span>
          <span className="font-mono text-sm text-white font-semibold tabular-nums">
            {telemetry?.activeNotes.length ? telemetry.activeNotes.join(' · ') : '—'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <span className="text-slate-400 block">Mean Luminance</span>
          <span className="font-mono text-sm text-sky-300 font-semibold tabular-nums">
            {telemetry ? `${telemetry.meanLuminance} / 255` : '0 / 255'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <span className="text-slate-400 block">RGB Balance</span>
          <span className="font-mono text-sm text-slate-200 tabular-nums">
            {telemetry
              ? `R:${telemetry.sumR} G:${telemetry.sumG} B:${telemetry.sumB}`
              : 'R:0 G:0 B:0'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <span className="text-slate-400 block">Harmony State</span>
          <span className="font-mono text-sm text-slate-200">
            {telemetry?.harmonyQuality ?? 'Major Consonance'}
          </span>
        </div>
      </div>

      {/* 4-Channel Mixer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => {
          const channelSubtitle =
            ch.id === 'rgb'
              ? `${track.layers.red.instrument} / ${track.layers.green.instrument} / ${track.layers.blue.instrument}`
              : ch.subtitle;

          return (
            <div
              key={ch.id}
              className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{ch.name}</h3>
                  <span className="font-mono text-xs text-sky-300 tabular-nums">
                    {Math.round(ch.volume * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{channelSubtitle}</p>
              </div>

              {/* Real-time Activity Bar */}
              <div
                aria-hidden="true"
                className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800"
              >
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{
                    width: `${ch.muted ? 0 : Math.min(100, Math.round(ch.activity * ch.volume * 100))}%`,
                  }}
                />
              </div>

              <div className="space-y-2.5">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={ch.volume}
                  aria-label={`${ch.name} channel volume`}
                  onChange={(e) => onChangeVolume(ch.id, Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={ch.muted}
                    aria-label={`Mute ${ch.name}`}
                    onClick={() => onToggleMute(ch.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      ch.muted
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-400'
                    }`}
                  >
                    {ch.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>Mute</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={ch.solo}
                    aria-label={`Solo ${ch.name}`}
                    onClick={() => onToggleSolo(ch.id)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      ch.solo
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-400'
                    }`}
                  >
                    Solo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
