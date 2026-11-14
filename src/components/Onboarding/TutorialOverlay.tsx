import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { WorkspaceId } from '../../types/earthsound';

interface TutorialOverlayProps {
  onClose: () => void;
  onJumpToWorkspace: (workspace: WorkspaceId) => void;
}

const STEPS: Array<{
  title: string;
  tier: string;
  body: string;
  targetWorkspace: WorkspaceId;
  targetLabel: string;
}> = [
  {
    title: '1. Welcome to EarthSound',
    tier: 'Discover',
    body: 'EarthSound converts open NASA Earth Observation imagery and Scientific Visualization Studio datasets into structured, musical soundscapes.',
    targetWorkspace: WorkspaceId.HOME,
    targetLabel: 'Stay on Home',
  },
  {
    title: '2. Choose your experience',
    tier: 'Adapt',
    body: 'Switch anytime between Standard, High Contrast, Low Vision, and Audio Navigation modes using the Accessibility panel or shortcut Q.',
    targetWorkspace: WorkspaceId.ACCESSIBILITY,
    targetLabel: 'Open Accessibility',
  },
  {
    title: '3. Explore the Earth',
    tier: 'Explore',
    body: 'Browse global GIBS layers by coordinate and date, or select neutral climate presets like the Amazon Canopy, Gulf Stream, or Sahara Dust Corridor.',
    targetWorkspace: WorkspaceId.EXPLORE,
    targetLabel: 'Open Explore Map',
  },
  {
    title: '4. Listen to the Earth',
    tier: 'Sonify',
    body: 'Press Space in the Audio Studio to sweep the Radar Scanline, solo RGB instrument channels, or glide your cursor in Tactile Sonar mode.',
    targetWorkspace: WorkspaceId.STUDIO,
    targetLabel: 'Open Audio Studio',
  },
  {
    title: '5. Understand the data',
    tier: 'Analyze',
    body: 'Inspect RGB histograms, luminance contrast metrics, click interactive NASA Colorbar swatches to hear reference notes, and export WAV or MIDI.',
    targetWorkspace: WorkspaceId.ANALYSIS,
    targetLabel: 'Open Data Analysis',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onClose,
  onJumpToWorkspace,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const current = STEPS[stepIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="EarthSound 5-Step Guided Tour"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="es-panel w-full max-w-xl rounded-2xl bg-[#0B1120] border border-sky-400/40 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-sky-400">
              Guided Tour · Step {stepIndex + 1} of {STEPS.length} · {current.tier}
            </p>
            <h2 className="text-xl font-semibold text-white mt-1">{current.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guided tour"
            className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{current.body}</p>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, idx) => (
            <div
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= stepIndex ? 'bg-sky-400' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onJumpToWorkspace(current.targetWorkspace);
              onClose();
            }}
            className="text-sm font-medium text-sky-300 hover:underline whitespace-nowrap shrink-0"
          >
            {current.targetLabel}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-200 disabled:opacity-40 whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 whitespace-nowrap"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 whitespace-nowrap"
              >
                Finish Tour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
