import React from 'react';
import { Accessibility, HelpCircle } from 'lucide-react';

/**
 * Custom EarthSound SVG Logo ONLY:
 * Minimalist glowing white planetary horizon arc crowned by a four-pointed star
 * with "EarthSound" typography below it. Never renders any NASA emblem.
 */
export const EarthSoundLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="inline-flex flex-col items-center select-none">
    <svg
      width={compact ? 116 : 164}
      height={compact ? 42 : 58}
      viewBox="0 0 180 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="EarthSound planetary horizon and four-pointed star emblem"
    >
      <defs>
        <filter id="es-arc-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Four-pointed star crowning the horizon */}
      <path
        d="M90 3 L93.2 13.8 L104 17 L93.2 20.2 L90 31 L86.8 20.2 L76 17 L86.8 13.8 Z"
        fill="#FFFFFF"
        filter="url(#es-arc-glow)"
      />
      {/* Glowing white planetary horizon arc */}
      <path
        d="M20 56 C52 29, 128 29, 160 56 C126 36, 54 36, 20 56 Z"
        fill="#FFFFFF"
        filter="url(#es-arc-glow)"
      />
    </svg>
    <span
      className={`font-display tracking-tight text-white whitespace-nowrap ${
        compact ? 'text-base -mt-1' : 'text-2xl mt-0.5'
      }`}
    >
      <strong className="font-bold">Earth</strong>
      <span className="font-normal text-slate-200">Sound</span>
    </span>
  </div>
);

interface HeaderProps {
  onOpenAccessibility: () => void;
  onOpenTutorial: () => void;
  activeTrackTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAccessibility,
  onOpenTutorial,
  activeTrackTitle,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 border-b border-sky-500/20 bg-[#060913]/95">
      <div className="flex items-center gap-6 shrink-0">
        <EarthSoundLogo compact />
      </div>

      <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 truncate max-w-md">
        <span className="text-slate-500">Active Stream</span>
        <span aria-hidden="true">·</span>
        <span className="text-slate-200 font-medium truncate">{activeTrackTitle}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenTutorial}
          aria-label="Open 5-step guided tour"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-sky-400 text-xs font-medium whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span>Guide</span>
        </button>
        <button
          type="button"
          onClick={onOpenAccessibility}
          aria-label="Open Accessibility Quick Settings (Shortcut Q)"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 text-xs whitespace-nowrap shrink-0"
        >
          <Accessibility className="w-4 h-4" />
          <span>Accessibility</span>
        </button>
      </div>
    </header>
  );
};
