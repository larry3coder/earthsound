import React from 'react';
import { Accessibility, BarChart3, Globe2, Sliders } from 'lucide-react';
import { WorkspaceId } from '../../types/earthsound';

interface QuickStartProps {
  onNavigate: (workspace: WorkspaceId) => void;
}

const CARDS: Array<{
  id: WorkspaceId;
  step: string;
  title: string;
  description: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: WorkspaceId.EXPLORE,
    step: '01. Discover',
    title: 'Explore Global GIBS Imagery',
    description:
      'Navigate an interactive planetary map across regional climate presets, select observation dates, and inspect 11 official NASA SVS datasets.',
    action: 'Open Explore Map',
    icon: Globe2,
  },
  {
    id: WorkspaceId.STUDIO,
    step: '02. Listen',
    title: 'Real-Time Audio Studio',
    description:
      'Sweep the Radar Scanline across 800x400 frames, mix 4 RGB and percussion synth channels, or explore with Tactile Cursor Sonar.',
    action: 'Open Audio Studio',
    icon: Sliders,
  },
  {
    id: WorkspaceId.ANALYSIS,
    step: '03. Analyze',
    title: 'Spectral & Colorbar Metrics',
    description:
      'Examine RGB histograms, luminance contrast, harmonic dissonance ratios, and audition physical colorbar units directly.',
    action: 'Open Data Analysis',
    icon: BarChart3,
  },
  {
    id: WorkspaceId.ACCESSIBILITY,
    step: '04. Adapt',
    title: 'WCAG AAA Accessibility',
    description:
      'Switch instantly between Standard, High Contrast, Low Vision, and Audio Navigation modes with full keyboard shortcuts.',
    action: 'Configure Settings',
    icon: Accessibility,
  },
];

export const QuickStart: React.FC<QuickStartProps> = ({ onNavigate }) => {
  return (
    <section aria-labelledby="quickstart-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="quickstart-heading" className="text-xl font-semibold text-white">
          Quick Start Workspaces
        </h2>
        <span className="text-xs font-mono text-slate-400">
          Discover · Explore · Analyze
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="es-panel text-left p-5 rounded-2xl bg-[#0B1120] border border-sky-500/20 hover:border-sky-400/60 transition-colors flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-mono text-sky-400">{card.step}</span>
                  <Icon className="w-5 h-5 text-sky-400 shrink-0" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
              </div>
              <span className="text-sm font-medium text-sky-300">{card.action} &rarr;</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
