import React from 'react';
import { ExternalLink } from 'lucide-react';
import { NasaTrack } from '../types/earthsound';

interface LearnProps {
  tracks: NasaTrack[];
  onSelectAndListen: (track: NasaTrack) => void;
}

export const Learn: React.FC<LearnProps> = ({ tracks, onSelectAndListen }) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          04. Scientific Documentation &amp; Caldwell 73 Framework
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          EarthSound translates multispectral Earth Observation data into structured polyphonic soundscapes using deterministic mathematical mappings and harmonic scale quantization.
        </p>
      </div>

      {/* Independent Project Disclaimer */}
      <section
        aria-label="Project Attribution and Independence Notice"
        className="es-panel bg-[#0B1120] border border-sky-400/40 rounded-2xl p-5"
      >
        <h2 className="text-base font-semibold text-white mb-1">
          Open Data Attribution Notice
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          EarthSound is an independent participant project utilizing open NASA Earth Observation and SVS data. All eleven datasets listed below are openly hosted by the NASA Scientific Visualization Studio and Earth Information Center without proprietary emblems.
        </p>
      </section>

      {/* Caldwell 73 Math Breakdown */}
      <section aria-labelledby="caldwell-math-heading" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-mono text-sky-400">01. Pitch Mapping</p>
          <h3 id="caldwell-math-heading" className="text-base font-semibold text-white">
            Latitude Band Quantization
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Each 400px scan column is partitioned into 16 latitudinal bands. Northern bands map to upper octave frequencies while southern bands anchor bass notes within the track&apos;s harmonic scale.
          </p>
        </div>

        <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-mono text-sky-400">02. Luminance Gate</p>
          <h3 className="text-base font-semibold text-white">
            ITU-R BT.709 Amplitude
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-mono text-xs bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            L = 0.2126R + 0.7152G + 0.0722B
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Bands remain silent when L &le; 30 (dark ocean/space) and trigger percussive synth strikes when lightning or storm spikes exceed L &gt; 240.
          </p>
        </div>

        <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-mono text-sky-400">03. Spectral Timbre</p>
          <h3 className="text-base font-semibold text-white">
            RGB Instrument Synthesis
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Red channels drive warm FM cello/pad synthesis (dust, heat, CO2), Green drives AM woodwinds (vegetation, sulfates), and Blue triggers crystalline chimes (sea salt, currents, vapor).
          </p>
        </div>
      </section>

      {/* 11 Official NASA SVS & EIC Datasets Attribution Table */}
      <section aria-labelledby="catalog-table-heading" className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 id="catalog-table-heading" className="text-lg font-semibold text-white">
            Catalog of 11 Official NASA SVS &amp; EIC Resources
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono text-slate-400 bg-slate-900/60">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Dataset Title</th>
                <th className="py-3 px-4">SVS ID</th>
                <th className="py-3 px-4">Sonification Architecture</th>
                <th className="py-3 px-4">Physical Unit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tracks.map((track) => (
                <tr key={track.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-mono text-xs text-sky-400 tabular-nums">
                    {String(track.index).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">
                    <a
                      href={track.svs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-sky-300"
                    >
                      <span>{track.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300 tabular-nums">
                    {track.svs_id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{track.synthesis_role}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {track.physical_unit}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectAndListen(track)}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-400/40 text-xs font-medium text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-colors whitespace-nowrap"
                    >
                      Open in Studio
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
