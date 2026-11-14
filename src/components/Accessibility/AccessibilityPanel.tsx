import React from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { AccessibilityMode } from '../../types/earthsound';
import { ContrastController } from './ContrastController';
import { FontSizeController } from './FontSizeController';

interface AccessibilityPanelProps {
  isModal?: boolean;
  onClose?: () => void;
}

const INTERFACE_MODES: Array<{
  id: AccessibilityMode;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: AccessibilityMode.STANDARD,
    number: '01',
    title: 'Standard Mode',
    description: 'Default telemetry workspace with interactive maps, spectral charts, and 4-channel audio studio.',
  },
  {
    id: AccessibilityMode.HIGH_CONTRAST,
    number: '02',
    title: 'High Contrast Mode',
    description: 'Pure black and white WCAG AAA surfaces with distinct 2px borders and zero color-only indicators.',
  },
  {
    id: AccessibilityMode.LOW_VISION,
    number: '03',
    title: 'Low Vision Mode',
    description: 'Scaled 22px typography, enlarged 48px touch targets, and simplified visual layout density.',
  },
  {
    id: AccessibilityMode.AUDIO_NAV,
    number: '04',
    title: 'Audio Navigation Mode',
    description: 'Web Speech API voice guidance, automatic data readouts, audio confirmation cues, and full keyboard control.',
  },
];

const SHORTCUTS: Array<{ action: string; keyLabel: string }> = [
  { action: 'Capture / Play', keyLabel: 'Space' },
  { action: 'Camera / Upload', keyLabel: 'C' },
  { action: 'Stop Speech', keyLabel: 'S' },
  { action: 'Repeat Narration', keyLabel: 'R' },
  { action: 'Voice Navigation', keyLabel: 'V' },
  { action: 'Switch Modes', keyLabel: '1-5' },
  { action: 'Home / History', keyLabel: 'H' },
  { action: 'Quick Actions', keyLabel: 'Q' },
];

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isModal = false,
  onClose,
}) => {
  const {
    mode,
    setMode,
    autoReadResults,
    setAutoReadResults,
    reducedMotion,
    setReducedMotion,
    simplifiedUi,
    setSimplifiedUi,
    soundEffects,
    setSoundEffects,
    speak,
    stopSpeech,
    isSpeaking,
    playUiCue,
  } = useAccessibility();

  const content = (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            Accessibility &amp; Interface Settings
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure WCAG AAA display contrast, typography scaling, Web Speech API narration, and keyboard navigation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              isSpeaking
                ? stopSpeech()
                : speak(
                    `Accessibility panel. Current mode is ${mode.replace('_', ' ')}. Text size is ${document.documentElement.style.getPropertyValue('--es-font-size') || '18px'}.`,
                    true
                  )
            }
            aria-label={isSpeaking ? 'Stop speech readout' : 'Read accessibility settings aloud'}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-500/30 bg-slate-900 text-sky-300 hover:border-sky-400 text-sm font-medium whitespace-nowrap shrink-0"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? 'Stop Voice' : 'Read Panel'}</span>
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Accessibility Settings modal"
              className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Interface Modes */}
      <section aria-labelledby="es-interface-modes-heading">
        <h3 id="es-interface-modes-heading" className="text-base font-semibold text-slate-100 mb-3">
          Interface Modes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INTERFACE_MODES.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setMode(item.id);
                  playUiCue();
                }}
                className={`es-panel text-left p-4 rounded-xl border transition-colors ${
                  active
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-sky-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-base">
                    {item.number}. {item.title}
                  </span>
                  <span className="font-mono text-xs text-sky-300">
                    {active ? 'Active' : 'Select'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sliders and Toggles */}
      <section className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-xl p-5 space-y-1">
        <ContrastController />
        <FontSizeController />

        <ToggleRow
          label="Auto-read Results"
          description="Automatically narrate scanline notes, tactile sonar values, and analysis metrics via Web Speech API."
          checked={autoReadResults}
          onChange={(val) => {
            setAutoReadResults(val);
            playUiCue();
          }}
        />
        <ToggleRow
          label="Reduced Motion"
          description="Minimizes UI transitions and scanline glow animations for vestibular comfort."
          checked={reducedMotion}
          onChange={(val) => {
            setReducedMotion(val);
            playUiCue();
          }}
        />
        <ToggleRow
          label="Simplified UI"
          description="Hides secondary telemetry badges and expands spacing around primary controls."
          checked={simplifiedUi}
          onChange={(val) => {
            setSimplifiedUi(val);
            playUiCue();
          }}
        />
        <ToggleRow
          label="Sound Effects"
          description="Plays gentle spatial chime confirmations when switching workspaces or accessibility toggles."
          checked={soundEffects}
          onChange={(val) => {
            setSoundEffects(val);
            if (val) playUiCue();
          }}
          isLast
        />
      </section>

      {/* Keyboard Shortcuts Grid */}
      <section aria-labelledby="es-shortcuts-heading">
        <h3 id="es-shortcuts-heading" className="text-base font-semibold text-slate-100 mb-3">
          Keyboard Shortcuts
        </h3>
        <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.keyLabel}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800"
            >
              <span className="text-sm text-slate-200">{sc.action}</span>
              <kbd className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-sky-300">
                {sc.keyLabel}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  if (!isModal) {
    return <div className="max-w-4xl mx-auto">{content}</div>;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
    >
      <div className="es-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#060913] border border-sky-500/30 p-6">
        {content}
      </div>
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isLast?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
  isLast = false,
}) => (
  <div
    className={`flex items-center justify-between gap-4 py-3 ${
      isLast ? '' : 'border-b border-slate-800/80'
    }`}
  >
    <div>
      <p className="font-medium text-slate-100">{label}</p>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label}`}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
        checked ? 'bg-sky-400 border-white' : 'bg-slate-800 border-slate-600'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);
