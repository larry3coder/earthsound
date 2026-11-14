import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const FontSizeController: React.FC = () => {
  const { textSize, setTextSize, playUiCue } = useAccessibility();

  return (
    <div className="py-3 border-b border-slate-800/80">
      <div className="flex items-center justify-between gap-4 mb-2">
        <label htmlFor="es-text-size-slider" className="font-medium text-slate-100">
          Text Size
        </label>
        <span className="font-mono text-sm text-sky-300 tabular-nums">{textSize}px</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease text size"
          onClick={() => {
            setTextSize(textSize - 1);
            playUiCue();
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400 text-sm font-mono whitespace-nowrap shrink-0"
        >
          A-
        </button>
        <input
          id="es-text-size-slider"
          type="range"
          min={14}
          max={26}
          step={1}
          value={textSize}
          onChange={(e) => setTextSize(Number(e.target.value))}
          aria-label="Adjust global text size in pixels"
          className="w-full accent-sky-400 cursor-pointer"
        />
        <button
          type="button"
          aria-label="Increase text size"
          onClick={() => {
            setTextSize(textSize + 1);
            playUiCue();
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400 text-sm font-mono whitespace-nowrap shrink-0"
        >
          A+
        </button>
      </div>
    </div>
  );
};
