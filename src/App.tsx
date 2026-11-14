import React, { useCallback, useEffect, useRef, useState } from 'react';
import tracksData from '../nasa_jukebox_tracks.json';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import {
  AccessibilityMode,
  ImageAnalysisMetrics,
  MixerChannelState,
  NasaTrack,
  ScanColumnTelemetry,
  SonificationMode,
  WorkspaceId,
} from './types/earthsound';
import { MainLayout } from './components/Layout/MainLayout';
import { WelcomeScreen } from './components/Onboarding/WelcomeScreen';
import { QuickStart } from './components/Onboarding/QuickStart';
import { TutorialOverlay } from './components/Onboarding/TutorialOverlay';
import { AccessibilityPanel } from './components/Accessibility/AccessibilityPanel';
import { ScreenReader } from './components/Accessibility/ScreenReader';
import { KeyboardNavigation } from './components/Accessibility/KeyboardNavigation';
import { Explorer } from './pages/Explorer';
import { Studio } from './pages/Studio';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Learn } from './pages/Learn';
import { toneEngine } from './utils/toneEngine';
import {
  downloadExportedMidi,
  downloadExportedWav,
  fetchTrackCatalog,
  triggerBlobDownload,
} from './services/api';
import { generateMidiFromBands, generateWavFromBands } from './utils/audioExport';
import {
  analyzeFullImageData,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  renderDatasetFrameToCanvas,
} from './utils/sonificationMath';

const DEFAULT_CHANNELS: MixerChannelState[] = [
  {
    id: 'melody',
    name: 'Ch 1 · Melody',
    subtitle: 'Caldwell 73 PolySynth',
    volume: 0.85,
    muted: false,
    solo: false,
    activity: 0,
  },
  {
    id: 'rgb',
    name: 'Ch 2 · RGB Layers',
    subtitle: 'FM / AM / Chimes',
    volume: 0.75,
    muted: false,
    solo: false,
    activity: 0,
  },
  {
    id: 'bass',
    name: 'Ch 3 · Rhythm & Bass',
    subtitle: 'LFO Breathing Bass',
    volume: 0.7,
    muted: false,
    solo: false,
    activity: 0,
  },
  {
    id: 'percussion',
    name: 'Ch 4 · Percussion',
    subtitle: 'Flash Triggers (L > 240)',
    volume: 0.8,
    muted: false,
    solo: false,
    activity: 0,
  },
];

const EarthSoundAppInner: React.FC = () => {
  const { announce, speak, mode, setMode } = useAccessibility();

  const initialAutoStart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [hasStarted, setHasStarted] = useState<boolean>(initialAutoStart);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(
    initialAutoStart ? WorkspaceId.STUDIO : WorkspaceId.HOME
  );
  const [showAccessibilityModal, setShowAccessibilityModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const [tracks, setTracks] = useState<NasaTrack[]>(tracksData as NasaTrack[]);
  const [selectedTrack, setSelectedTrack] = useState<NasaTrack>(
    (tracksData as NasaTrack[])[4] || (tracksData as NasaTrack[])[0] // Default to GEOS Aerosols
  );
  const [selectedDate, setSelectedDate] = useState<string>('2024-06-15');
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number; zoom: number }>({
    lat: 19.5,
    lon: -15.2,
    zoom: 4,
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(selectedTrack.bpm);
  const [sonificationMode, setSonificationMode] = useState<SonificationMode>(
    SonificationMode.RADAR_SCANLINE
  );
  const [channels, setChannels] = useState<MixerChannelState[]>(DEFAULT_CHANNELS);
  const [telemetry, setTelemetry] = useState<ScanColumnTelemetry | null>(null);
  const [analysisMetrics, setAnalysisMetrics] = useState<ImageAnalysisMetrics | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const exportGetterRef = useRef<
    (() => Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }>) | null
  >(null);

  useEffect(() => {
    void fetchTrackCatalog().then((loaded) => {
      if (loaded && loaded.length === 11) {
        setTracks(loaded);
      }
    });
  }, []);

  // Ensure Data Analysis metrics are computed whenever selectedTrack changes even before Studio mounts
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_WIDTH;
    offscreen.height = CANVAS_HEIGHT;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    renderDatasetFrameToCanvas(ctx, selectedTrack, CANVAS_WIDTH, CANVAS_HEIGHT);
    const rgba = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    setAnalysisMetrics(analyzeFullImageData(rgba, CANVAS_WIDTH, CANVAS_HEIGHT, selectedTrack));
  }, [selectedTrack]);

  const handleSelectTrack = useCallback((track: NasaTrack) => {
    setSelectedTrack(track);
    setBpm(track.bpm);
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (!isPlaying) {
      await toneEngine.ensureStarted();
      setIsPlaying(true);
      announce(`Playing ${selectedTrack.short_title} at ${bpm} beats per minute.`, false);
    } else {
      setIsPlaying(false);
      announce('Sonification paused.', false);
    }
  }, [isPlaying, selectedTrack, bpm, announce]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setChannels((prev) => prev.map((c) => ({ ...c, activity: 0 })));
    announce('Sonification stopped.', false);
  }, [announce]);

  const handleScanTelemetry = useCallback(
    (colTelemetry: ScanColumnTelemetry) => {
      setTelemetry(colTelemetry);

      if (isPlaying) {
        toneEngine.triggerScanTelemetry(colTelemetry, selectedTrack, channels);
        const totalRgb = Math.max(1, colTelemetry.sumR + colTelemetry.sumG + colTelemetry.sumB);
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.id === 'melody') {
              return { ...ch, activity: Math.min(1, colTelemetry.meanLuminance / 200) };
            }
            if (ch.id === 'rgb') {
              return { ...ch, activity: Math.min(1, totalRgb / 5500) };
            }
            if (ch.id === 'bass') {
              return { ...ch, activity: Math.min(1, colTelemetry.contrastIndex / 90) };
            }
            return { ...ch, activity: colTelemetry.flashCount > 0 ? 1 : 0.08 };
          })
        );
      }
    },
    [isPlaying, selectedTrack, channels]
  );

  const handleToggleMute = (id: MixerChannelState['id']) => {
    setChannels((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, muted: !c.muted } : c));
      toneEngine.syncMixerChannels(next);
      return next;
    });
  };

  const handleToggleSolo = (id: MixerChannelState['id']) => {
    setChannels((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, solo: !c.solo } : c));
      toneEngine.syncMixerChannels(next);
      return next;
    });
  };

  const handleChangeVolume = (id: MixerChannelState['id'], volume: number) => {
    setChannels((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, volume } : c));
      toneEngine.syncMixerChannels(next);
      return next;
    });
  };

  const handleExportWav = async () => {
    setIsExporting(true);
    try {
      const bandColumns = exportGetterRef.current?.() ?? [];
      try {
        await downloadExportedWav(
          { trackId: selectedTrack.id, bandColumns },
          `earthsound-${selectedTrack.id}.wav`
        );
      } catch {
        const bytes = generateWavFromBands(bandColumns, selectedTrack, 22050);
        triggerBlobDownload(
          new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' }),
          `earthsound-${selectedTrack.id}.wav`
        );
      }
      announce(`Exported WAV audio for ${selectedTrack.short_title}.`, true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMidi = async () => {
    setIsExporting(true);
    try {
      const bandColumns = exportGetterRef.current?.() ?? [];
      try {
        await downloadExportedMidi(
          { trackId: selectedTrack.id, bandColumns },
          `earthsound-${selectedTrack.id}.mid`
        );
      } catch {
        const bytes = generateMidiFromBands(bandColumns, selectedTrack);
        triggerBlobDownload(
          new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' }),
          `earthsound-${selectedTrack.id}.mid`
        );
      }
      announce(`Exported MIDI sequence for ${selectedTrack.short_title}.`, true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNavigate = useCallback(
    (workspace: WorkspaceId) => {
      setActiveWorkspace(workspace);
      announce(`Opened ${workspace} workspace.`, false);
    },
    [announce]
  );

  return (
    <>
      <ScreenReader />
      <KeyboardNavigation
        onNavigate={(ws) => {
          setHasStarted(true);
          handleNavigate(ws);
        }}
        onTogglePlay={() => {
          if (hasStarted) void handleTogglePlay();
        }}
        onTriggerUpload={() => {
          setHasStarted(true);
          setActiveWorkspace(WorkspaceId.STUDIO);
          setTimeout(() => uploadInputRef.current?.click(), 50);
        }}
        onRepeatNarration={() => {
          speak(
            `Active dataset: ${selectedTrack.title}. ${selectedTrack.legend_audio_en}`,
            true
          );
        }}
        onOpenAccessibilityModal={() => setShowAccessibilityModal((v) => !v)}
        onToggleVoiceNav={() => {
          if (mode === AccessibilityMode.AUDIO_NAV) {
            setMode(AccessibilityMode.STANDARD);
          } else {
            setMode(AccessibilityMode.AUDIO_NAV);
          }
        }}
      />

      {!hasStarted ? (
        <WelcomeScreen
          onStartExploring={(exp) => {
            setHasStarted(true);
            setActiveWorkspace(exp === 'accessible' ? WorkspaceId.STUDIO : WorkspaceId.HOME);
          }}
        />
      ) : (
        <MainLayout
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={handleNavigate}
          onOpenAccessibility={() => setShowAccessibilityModal(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          activeTrackTitle={selectedTrack.title}
        >
          {activeWorkspace === WorkspaceId.HOME && (
            <div className="max-w-6xl mx-auto space-y-8">
              <section className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <p className="text-xs font-mono text-sky-400">
                    Earth Information Jukebox · 11 NASA SVS Datasets
                  </p>
                  <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                    Hear Planetary Telemetry as Structured Music
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Move fluidly across Discover, Explore, and Analyze workspaces—from global satellite mapping to real-time 4-channel synthesis and spectral analysis.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleNavigate(WorkspaceId.STUDIO)}
                    className="px-5 py-3 rounded-xl bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 whitespace-nowrap"
                  >
                    Launch Audio Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTutorial(true)}
                    className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm font-medium hover:border-sky-400 whitespace-nowrap"
                  >
                    5-Step Guide
                  </button>
                </div>
              </section>

              <QuickStart onNavigate={handleNavigate} />
            </div>
          )}

          {activeWorkspace === WorkspaceId.EXPLORE && (
            <Explorer
              tracks={tracks}
              selectedTrack={selectedTrack}
              onSelectTrack={handleSelectTrack}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              coordinates={coordinates}
              onChangeCoordinates={setCoordinates}
              onSendToStudio={() => handleNavigate(WorkspaceId.STUDIO)}
            />
          )}

          {activeWorkspace === WorkspaceId.STUDIO && (
            <Studio
              tracks={tracks}
              selectedTrack={selectedTrack}
              onSelectTrack={handleSelectTrack}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onStop={handleStop}
              bpm={bpm}
              onChangeBpm={setBpm}
              sonificationMode={sonificationMode}
              onChangeMode={setSonificationMode}
              channels={channels}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onChangeVolume={handleChangeVolume}
              telemetry={telemetry}
              onScanTelemetry={handleScanTelemetry}
              onAnalysisReady={setAnalysisMetrics}
              onExportColumnsReady={(getter) => {
                exportGetterRef.current = getter;
              }}
              onExportWav={handleExportWav}
              onExportMidi={handleExportMidi}
              isExporting={isExporting}
              uploadInputRef={uploadInputRef}
            />
          )}

          {activeWorkspace === WorkspaceId.ANALYSIS && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    03. Scientific Data &amp; Spectral Analysis
                  </h1>
                  <p className="text-sm text-slate-400">
                    Active Dataset: {selectedTrack.title} · Audition colorbar stops or inspect RGB distributions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate(WorkspaceId.STUDIO)}
                  className="px-4 py-2 rounded-xl border border-sky-500/30 bg-slate-900 text-xs font-medium text-sky-300 hover:border-sky-400 whitespace-nowrap"
                >
                  Back to Studio
                </button>
              </div>
              <AnalysisPanel track={selectedTrack} metrics={analysisMetrics} />
            </div>
          )}

          {activeWorkspace === WorkspaceId.LEARN && (
            <Learn
              tracks={tracks}
              onSelectAndListen={(track) => {
                handleSelectTrack(track);
                handleNavigate(WorkspaceId.STUDIO);
              }}
            />
          )}

          {activeWorkspace === WorkspaceId.ACCESSIBILITY && <AccessibilityPanel />}
        </MainLayout>
      )}

      {showAccessibilityModal && (
        <AccessibilityPanel isModal onClose={() => setShowAccessibilityModal(false)} />
      )}

      {showTutorial && (
        <TutorialOverlay
          onClose={() => setShowTutorial(false)}
          onJumpToWorkspace={(ws) => {
            setHasStarted(true);
            handleNavigate(ws);
          }}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AccessibilityProvider>
      <EarthSoundAppInner />
    </AccessibilityProvider>
  );
}
