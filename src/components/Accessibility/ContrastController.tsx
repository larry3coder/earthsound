import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const ContrastController: React.FC = () => {
  const { highContrast, setHighContrast, playUiCue } = useAccessibility();

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800/80">
      <div>
        <p className="font-medium text-slate-100">High Contrast Mode</p>
        <p className="text-sm text-slate-400">
          WCAG AAA pure monochrome contrast with distinct 2px borders and zero color-only signaling.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={highContrast}
        aria-label="Toggle High Contrast Mode"
        onClick={() => {
          setHighContrast(!highContrast);
          playUiCue();
        }}
        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
          highContrast
            ? 'bg-sky-400 border-white'
            : 'bg-slate-800 border-slate-600'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            highContrast ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
