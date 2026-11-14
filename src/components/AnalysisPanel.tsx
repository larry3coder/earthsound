import React, { useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Volume2 } from 'lucide-react';
import { ColorbarStop, ImageAnalysisMetrics, NasaTrack } from '../types/earthsound';
import { toneEngine } from '../utils/toneEngine';
import { useAccessibility } from '../context/AccessibilityContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface AnalysisPanelProps {
  track: NasaTrack;
  metrics: ImageAnalysisMetrics | null;
}

const BIN_LABELS = Array.from({ length: 16 }, (_, i) => `${i * 16}`);

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ track, metrics }) => {
  const { speak, announce } = useAccessibility();
  const [selectedStop, setSelectedStop] = useState<ColorbarStop | null>(
    track.colorbar_stops[0] ?? null
  );

  const handleAuditionColorStop = (stop: ColorbarStop) => {
    setSelectedStop(stop);
    void toneEngine.playReferenceNote(stop.note, 0, '4n');
    const message = `${track.short_title}. ${stop.label}. Reference note ${stop.note}.`;
    announce(message, true);
    speak(message, true);
  };

  const chartData = {
    labels: BIN_LABELS,
    datasets: [
      {
        label: `Red (${track.layers.red.label})`,
        data: metrics?.histogramR ?? new Array(16).fill(0),
        backgroundColor: 'rgba(248, 113, 113, 0.75)',
        borderRadius: 3,
      },
      {
        label: `Green (${track.layers.green.label})`,
        data: metrics?.histogramG ?? new Array(16).fill(0),
        backgroundColor: 'rgba(52, 211, 153, 0.75)',
        borderRadius: 3,
      },
      {
        label: `Blue (${track.layers.blue.label})`,
        data: metrics?.histogramB ?? new Array(16).fill(0),
        backgroundColor: 'rgba(56, 189, 248, 0.8)',
        borderRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { size: 11 } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        title: {
          display: true,
          text: 'Pixel Share (%)',
          color: '#94a3b8',
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI Scientific Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Mean Luminance (BT.709)"
          value={metrics ? `${metrics.meanLuminance}` : '0.0'}
          unit="/ 255"
          detail={metrics && metrics.meanLuminance > 30 ? 'Above L > 30 Threshold' : 'Silent Range'}
        />
        <MetricCard
          label="Contrast Std. Dev."
          value={metrics ? `${metrics.contrastStdDev}` : '0.0'}
          unit="sigma"
          detail={`Edge Density: ${metrics?.edgeDensity ?? 0}%`}
        />
        <MetricCard
          label="Dominant Spectral Band"
          value={metrics?.dominantBand.split(' ')[0] ?? 'Blue'}
          unit={metrics?.dominantBand.split(' ').slice(1).join(' ') ?? ''}
          detail={`Mean RGB (${metrics?.meanR ?? 0}, ${metrics?.meanG ?? 0}, ${metrics?.meanB ?? 0})`}
        />
        <MetricCard
          label="Harmonic Tension"
          value={`${Math.round((metrics?.estimatedDissonance ?? 0) * 100)}%`}
          unit="detune index"
          detail={track.mode.replace('_', ' ')}
        />
      </div>

      {/* RGB Histogram Chart + Musical Harmony Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-label="RGB Channel Spectral Histogram"
          className="lg:col-span-8 es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                RGB Spectral Distribution Histogram
              </h3>
              <p className="text-xs text-slate-400">
                16-bin channel intensity breakdown driving multi-track synth balance
              </p>
            </div>
            <span className="font-mono text-xs text-sky-300 tabular-nums">
              {track.physical_unit}
            </span>
          </div>
          <div className="h-[280px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </section>

        <section
          aria-label="Musical Harmony Breakdown"
          className="lg:col-span-4 es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 flex flex-col justify-between gap-4"
        >
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">Musical Harmony Breakdown</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {metrics?.harmonySummary ?? track.legend_audio_en}
            </p>

            <div className="pt-2 space-y-2 text-xs border-t border-slate-800">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Quantized Scale</span>
                <span className="font-mono text-sky-300 text-right">
                  {track.musical_scale.slice(0, 6).join(' ')}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Base Tempo</span>
                <span className="font-mono text-white tabular-nums">{track.bpm} BPM</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Red Voice</span>
                <span className="text-slate-200">{track.layers.red.label}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Green Voice</span>
                <span className="text-slate-200">{track.layers.green.label}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Blue Voice</span>
                <span className="text-slate-200">{track.layers.blue.label}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              speak(
                `Analysis for ${track.title}. Mean luminance ${metrics?.meanLuminance ?? 0}. ${metrics?.harmonySummary ?? ''}`,
                true
              )
            }
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-sky-500/30 bg-slate-900 text-xs font-medium text-sky-300 hover:border-sky-400"
          >
            <Volume2 className="w-4 h-4" />
            <span>Narrate Analysis Metrics</span>
          </button>
        </section>
      </div>

      {/* Interactive NASA Colorbar Legend */}
      <section
        aria-labelledby="colorbar-legend-heading"
        className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="colorbar-legend-heading" className="text-base font-semibold text-white">
              Interactive NASA Colorbar Legend
            </h3>
            <p className="text-xs text-slate-400">
              Click any color stop to audition its quantized reference note and hear its physical unit value.
            </p>
          </div>
          {selectedStop && (
            <div className="font-mono text-xs text-sky-300 tabular-nums">
              Selected: {selectedStop.label} · Note {selectedStop.note}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {track.colorbar_stops.map((stop) => {
            const isSelected = selectedStop?.label === stop.label;
            return (
              <button
                key={stop.label}
                type="button"
                onClick={() => handleAuditionColorStop(stop)}
                aria-label={`Audition colorbar stop ${stop.label}, reference note ${stop.note}`}
                className={`text-left rounded-xl p-3 border transition-colors ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/15'
                    : 'border-slate-800 bg-slate-900/70 hover:border-sky-500/50'
                }`}
              >
                <div
                  className="h-6 w-full rounded-md border border-white/15 mb-2.5"
                  style={{ backgroundColor: stop.color }}
                />
                <p className="text-xs font-medium text-white leading-snug">{stop.label}</p>
                <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
                  <span>{stop.value} {track.physical_unit.split(' ').pop()}</span>
                  <span className="text-sky-300 font-semibold">{stop.note}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  unit: string;
  detail: string;
}> = ({ label, value, unit, detail }) => (
  <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-4 space-y-1">
    <p className="text-xs text-slate-400">{label}</p>
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-semibold text-white font-mono tabular-nums">{value}</span>
      <span className="text-xs font-mono text-slate-400">{unit}</span>
    </div>
    <p className="text-xs text-sky-300/90 pt-1">{detail}</p>
  </div>
);
