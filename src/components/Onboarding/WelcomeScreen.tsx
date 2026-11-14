import React, { useState } from 'react';
import { Accessibility, ArrowRight, Compass, Headphones } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { AccessibilityMode } from '../../types/earthsound';
import { EarthSoundLogo } from '../Layout/Header';

interface WelcomeScreenProps {
  onStartExploring: (experience: 'standard' | 'accessible') => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartExploring }) => {
  const { setMode, speak } = useAccessibility();
  const [selectedExperience, setSelectedExperience] = useState<'standard' | 'accessible'>('standard');

  const handleSelect = (choice: 'standard' | 'accessible') => {
    setSelectedExperience(choice);
    if (choice === 'accessible') {
      setMode(AccessibilityMode.AUDIO_NAV);
      speak('Accessibility-first audio navigation selected. High visibility and speech guidance ready.', true);
    } else {
      setMode(AccessibilityMode.STANDARD);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between p-6 sm:p-10">
      <div className="max-w-5xl mx-auto w-full my-auto py-8">
        <div className="flex flex-col items-center text-center mb-10">
          <EarthSoundLogo />
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-6 max-w-2xl text-balance">
            Welcome to EarthSound
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mt-4 max-w-2xl leading-relaxed">
            Translate Earth Observation satellite frames, atmospheric rivers, aerosol plumes, and forest canopy elevations into harmonious multi-track music grounded in the Caldwell 73 sonification framework.
          </p>
        </div>

        <section
          aria-labelledby="choose-experience-heading"
          className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-6 sm:p-8 mb-8"
        >
          <h2 id="choose-experience-heading" className="text-lg font-semibold text-white mb-4">
            Choose your experience
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              aria-pressed={selectedExperience === 'standard'}
              onClick={() => handleSelect('standard')}
              className={`text-left p-5 rounded-xl border transition-colors ${
                selectedExperience === 'standard'
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-sky-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-2 font-semibold text-base">
                  <Compass className="w-5 h-5 text-sky-400" />
                  Standard Telemetry Studio
                </span>
                <span className="font-mono text-xs text-sky-300">
                  {selectedExperience === 'standard' ? 'Selected' : 'Option 1'}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Full visual telemetry workspace with interactive Leaflet GIBS maps, real-time Radar Scanline canvas, 4-channel mixer, and spectral histograms.
              </p>
            </button>

            <button
              type="button"
              aria-pressed={selectedExperience === 'accessible'}
              onClick={() => handleSelect('accessible')}
              className={`text-left p-5 rounded-xl border transition-colors ${
                selectedExperience === 'accessible'
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-sky-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-2 font-semibold text-base">
                  <Accessibility className="w-5 h-5 text-sky-400" />
                  Accessibility-First Workflow
                </span>
                <span className="font-mono text-xs text-sky-300">
                  {selectedExperience === 'accessible' ? 'Selected' : 'Option 2'}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enables Web Speech API voice guidance, automatic physical data readouts, tactile cursor sonar narration, and full keyboard shortcuts.
              </p>
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Headphones recommended for 3D stereo panning and tactile sonar.</span>
            </div>

            <button
              type="button"
              onClick={() => onStartExploring(selectedExperience)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pt-4 border-t border-slate-900">
        EarthSound is an independent participant project utilizing open NASA Earth Observation and SVS data.
      </footer>
    </div>
  );
};
