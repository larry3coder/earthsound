import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Radio, Upload, Volume2 } from 'lucide-react';
import {
  ImageAnalysisMetrics,
  NasaTrack,
  ScanColumnTelemetry,
  SonarReading,
  SonificationMode,
} from '../types/earthsound';
import {
  analyzeFullImageData,
  analyzeScanColumn,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeSonarReading,
  renderDatasetFrameToCanvas,
} from '../utils/sonificationMath';
import { sampleCanvasColumnsForExport } from '../utils/audioExport';
import { toneEngine } from '../utils/toneEngine';
import { useAccessibility } from '../context/AccessibilityContext';

interface ImageViewerProps {
  track: NasaTrack;
  isPlaying: boolean;
  bpm: number;
  sonificationMode: SonificationMode;
  onChangeMode: (mode: SonificationMode) => void;
  onScanTelemetry: (telemetry: ScanColumnTelemetry) => void;
  onAnalysisReady: (metrics: ImageAnalysisMetrics) => void;
  onExportColumnsReady: (
    getter: () => Array<{ bands: Array<{ luminance: number; r: number; g: number; b: number }> }>
  ) => void;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  track,
  isPlaying,
  bpm,
  sonificationMode,
  onChangeMode,
  onScanTelemetry,
  onAnalysisReady,
  onExportColumnsReady,
  uploadInputRef,
}) => {
  const { announce, reducedMotion, speak } = useAccessibility();
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanXRef = useRef<number>(0);

  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [uploadedImgEl, setUploadedImgEl] = useState<HTMLImageElement | null>(null);
  const [sonarReading, setSonarReading] = useState<SonarReading | null>(null);
  const [scanXDisplay, setScanXDisplay] = useState<number>(0);
  const lastSonarAudioRef = useRef<number>(0);

  // Provide export column sampler to parent Studio/AudioPlayer
  useEffect(() => {
    onExportColumnsReady(() => {
      const canvas = baseCanvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [];
      return sampleCanvasColumnsForExport(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, 24);
    });
  }, [onExportColumnsReady]);

  // Draw base dataset frame (or user-uploaded photo) onto the 800x400 canvas
  const drawBaseFrame = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (uploadedImgEl) {
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(uploadedImgEl, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      renderDatasetFrameToCanvas(ctx, track, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    const fullRgba = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    const metrics = analyzeFullImageData(fullRgba, CANVAS_WIDTH, CANVAS_HEIGHT, track);
    onAnalysisReady(metrics);

    // Emit initial column telemetry at current scanX
    const colData = ctx.getImageData(scanXRef.current, 0, 1, CANVAS_HEIGHT).data;
    onScanTelemetry(analyzeScanColumn(colData, scanXRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, track));
  }, [track, uploadedImgEl, onAnalysisReady, onScanTelemetry]);

  useEffect(() => {
    drawBaseFrame();
  }, [drawBaseFrame]);

  // Draw glowing vertical Radar Scanline & sonar reticle on overlay canvas
  const drawOverlay = useCallback(
    (scanX: number, sonar: SonarReading | null) => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Vertical Radar Scanline
      ctx.save();
      if (!reducedMotion) {
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 14;
      }
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, CANVAS_HEIGHT);
      ctx.stroke();

      // Subtle trailing sweep gradient
      const grad = ctx.createLinearGradient(Math.max(0, scanX - 36), 0, scanX, 0);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(0, scanX - 36), 0, Math.min(36, scanX), CANVAS_HEIGHT);
      ctx.restore();

      // Tactile Cursor Sonar Crosshair
      if (sonar) {
        ctx.save();
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sonar.x, sonar.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sonar.x - 18, sonar.y);
        ctx.lineTo(sonar.x + 18, sonar.y);
        ctx.moveTo(sonar.x, sonar.y - 18);
        ctx.lineTo(sonar.x, sonar.y + 18);
        ctx.stroke();
        ctx.restore();
      }
    },
    [reducedMotion]
  );

  useEffect(() => {
    drawOverlay(scanXRef.current, sonarReading);
  }, [drawOverlay, sonarReading, track]);

  // Radar Scanline Engine: scanX += 4 every ~100ms scaled by BPM
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(55, Math.round((100 * 110) / Math.max(60, bpm)));
    const timer = window.setInterval(() => {
      const canvas = baseCanvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      scanXRef.current = (scanXRef.current + 4) % CANVAS_WIDTH;
      setScanXDisplay(scanXRef.current);

      const colRgba = ctx.getImageData(scanXRef.current, 0, 1, CANVAS_HEIGHT).data;
      const telemetry = analyzeScanColumn(
        colRgba,
        scanXRef.current,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        track
      );
      onScanTelemetry(telemetry);
      drawOverlay(scanXRef.current, sonarReading);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, bpm, track, onScanTelemetry, drawOverlay, sonarReading]);

  const handleCanvasPointer = (clientX: number, clientY: number, triggerSound: boolean) => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = Math.max(0, Math.min(CANVAS_WIDTH - 1, Math.round((clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - 1, Math.round((clientY - rect.top) * scaleY)));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const startX = Math.max(0, Math.min(CANVAS_WIDTH - 5, x - 2));
    const startY = Math.max(0, Math.min(CANVAS_HEIGHT - 5, y - 2));
    const cluster = ctx.getImageData(startX, startY, 5, 5).data;
    const reading = computeSonarReading(cluster, x, y, CANVAS_WIDTH, CANVAS_HEIGHT, track);
    setSonarReading(reading);

    if (
      triggerSound &&
      (sonificationMode === SonificationMode.TACTILE_SONAR || !isPlaying)
    ) {
      const now = performance.now();
      if (now - lastSonarAudioRef.current > 110) {
        lastSonarAudioRef.current = now;
        void toneEngine.playReferenceNote(reading.note, reading.pan, '16n');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setUploadedImgEl(img);
      setUploadedImageName(file.name);
      announce(`Loaded custom image ${file.name} onto the 800 by 400 sonification canvas.`, true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {uploadedImageName ? `Custom Frame: ${uploadedImageName}` : track.title}
          </h2>
          <p className="text-xs text-slate-400">
            {track.synthesis_role} · SVS {track.svs_id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3 Real-Time Sonification Modes */}
          <div
            role="group"
            aria-label="Sonification Mode Selector"
            className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800"
          >
            <button
              type="button"
              aria-pressed={sonificationMode === SonificationMode.RADAR_SCANLINE}
              onClick={() => onChangeMode(SonificationMode.RADAR_SCANLINE)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                sonificationMode === SonificationMode.RADAR_SCANLINE
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Radar Scanline
            </button>
            <button
              type="button"
              aria-pressed={sonificationMode === SonificationMode.MULTITRACK_RGB}
              onClick={() => onChangeMode(SonificationMode.MULTITRACK_RGB)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                sonificationMode === SonificationMode.MULTITRACK_RGB
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Multi-Track RGB
            </button>
            <button
              type="button"
              aria-pressed={sonificationMode === SonificationMode.TACTILE_SONAR}
              onClick={() => {
                onChangeMode(SonificationMode.TACTILE_SONAR);
                announce('Tactile Cursor Sonar active. Move pointer across the map to probe pixels.', true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                sonificationMode === SonificationMode.TACTILE_SONAR
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tactile Sonar
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="sr-only"
            aria-label="Upload custom satellite or camera image"
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-medium text-slate-200 hover:border-sky-400 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload Image</span>
          </button>

          {uploadedImgEl && (
            <button
              type="button"
              onClick={() => {
                setUploadedImgEl(null);
                setUploadedImageName(null);
              }}
              className="px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:border-sky-400 whitespace-nowrap"
            >
              Reset NASA Frame
            </button>
          )}
        </div>
      </div>

      {/* 800x400 Dual-Layer Canvas Stage */}
      <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-slate-800 bg-[#060913]">
        <canvas
          ref={baseCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          data-testid="sonification-base-canvas"
          className="w-full h-full block"
        />
        <canvas
          ref={overlayCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          data-testid="sonification-overlay-canvas"
          aria-label="Interactive 800 by 400 satellite sonification canvas. Move pointer to inspect pixel values or click to hear Tactile Sonar pitch."
          onMouseMove={(e) => handleCanvasPointer(e.clientX, e.clientY, true)}
          onClick={(e) => {
            handleCanvasPointer(e.clientX, e.clientY, true);
            if (sonarReading) {
              speak(
                `${track.short_title}: ${sonarReading.physicalValue} ${sonarReading.unit}. Note ${sonarReading.note}.`,
                true
              );
            }
          }}
          onMouseLeave={() => setSonarReading(null)}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Tactile Cursor Sonar Floating Tooltip */}
        {sonarReading && (
          <div
            role="status"
            data-testid="tactile-sonar-tooltip"
            className="pointer-events-none absolute top-3 left-3 max-w-sm rounded-xl bg-[#060913]/95 border border-sky-400/50 px-3.5 py-2.5 text-xs text-slate-100 space-y-1"
          >
            <div className="flex items-center gap-2 font-semibold text-sky-300">
              <Crosshair className="w-3.5 h-3.5" />
              <span>
                {track.short_title}: ~{sonarReading.physicalValue} {sonarReading.unit} — Note{' '}
                {sonarReading.note}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 tabular-nums">
              ({sonarReading.x}, {sonarReading.y}) · RGB({sonarReading.r}, {sonarReading.g},{' '}
              {sonarReading.b}) · L={sonarReading.luminance} · Pan {sonarReading.pan}
            </div>
          </div>
        )}

        {/* Bottom Telemetry Strip */}
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-[#060913]/90 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300 tabular-nums flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            Scan X: {scanXDisplay}px / {CANVAS_WIDTH}px
          </span>
        </div>
      </div>

      {/* Audio Legend Readout Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          {track.legend_audio_en}
        </p>
        <button
          type="button"
          onClick={() => speak(track.legend_audio_en, true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-slate-900 text-xs text-sky-300 hover:border-sky-400 whitespace-nowrap shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Speak Legend</span>
        </button>
      </div>
    </div>
  );
};
