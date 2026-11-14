import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Calendar, Compass, Layers, Play } from 'lucide-react';
import { NasaTrack, RegionalPreset } from '../types/earthsound';
import { isLandMass, REGIONAL_PRESETS } from '../utils/sonificationMath';
import { useAccessibility } from '../context/AccessibilityContext';

interface EarthMapProps {
  tracks: NasaTrack[];
  selectedTrack: NasaTrack;
  onSelectTrack: (track: NasaTrack) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  coordinates: { lat: number; lon: number; zoom: number };
  onChangeCoordinates: (coords: { lat: number; lon: number; zoom: number }) => void;
  onSendToStudio: () => void;
}

/**
 * Converts Web Mercator tile (x, y, z) pixel (px, py) to (lon, lat) in degrees.
 */
function tilePixelToLonLat(
  tileX: number,
  tileY: number,
  z: number,
  px: number,
  py: number,
  tileSize: number
): [number, number] {
  const n = Math.pow(2, z);
  const worldX = tileX + px / tileSize;
  const worldY = tileY + py / tileSize;
  const lon = (worldX / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * worldY) / n)));
  const lat = (latRad * 180) / Math.PI;
  return [lon, lat];
}

export const EarthMap: React.FC<EarthMapProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  selectedDate,
  onChangeDate,
  coordinates,
  onChangeCoordinates,
  onSendToStudio,
}) => {
  const { announce, playUiCue } = useAccessibility();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const [gibsOverlayEnabled, setGibsOverlayEnabled] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coordinates.lat, coordinates.lon],
      zoom: coordinates.zoom,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: true,
    });

    // Self-contained procedural Earth telemetry basemap (zero external API keys required)
    const TelemetryBaseLayer = L.GridLayer.extend({
      createTile(coords: L.Coords) {
        const tile = document.createElement('canvas');
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;
        const ctx = tile.getContext('2d');
        if (ctx) {
          const step = 4;
          for (let py = 0; py < size.y; py += step) {
            for (let px = 0; px < size.x; px += step) {
              const [lon, lat] = tilePixelToLonLat(coords.x, coords.y, coords.z, px, py, size.x);
              const land = isLandMass(lon, lat);
              ctx.fillStyle = land ? '#132238' : '#060c1a';
              ctx.fillRect(px, py, step, step);
            }
          }
          // Subtle telemetry tile crosshair
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, size.x, size.y);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.font = '10px monospace';
          ctx.fillText(`Z${coords.z} (${coords.x},${coords.y})`, 8, 16);
        }
        return tile;
      },
    });
    new (TelemetryBaseLayer as unknown as new () => L.GridLayer)().addTo(map);

    const marker = L.circleMarker([coordinates.lat, coordinates.lon], {
      radius: 9,
      color: '#38BDF8',
      fillColor: '#38BDF8',
      fillOpacity: 0.35,
      weight: 2,
    }).addTo(map);
    markerRef.current = marker;

    map.on('moveend', () => {
      const center = map.getCenter();
      onChangeCoordinates({
        lat: Number(center.lat.toFixed(3)),
        lon: Number(center.lng.toFixed(3)),
        zoom: map.getZoom(),
      });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      announce(
        `Map focus moved to latitude ${e.latlng.lat.toFixed(2)}, longitude ${e.latlng.lng.toFixed(2)}.`,
        false
      );
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update NASA GIBS WMTS overlay when track, date, or toggle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gibsLayerRef.current) {
      map.removeLayer(gibsLayerRef.current);
      gibsLayerRef.current = null;
    }

    if (gibsOverlayEnabled) {
      const tileUrl = `/api/gibs-tile?layer=${encodeURIComponent(
        selectedTrack.gibs_layer
      )}&date=${encodeURIComponent(selectedDate)}&z={z}&y={y}&x={x}`;

      gibsLayerRef.current = L.tileLayer(tileUrl, {
        opacity: 0.72,
        maxZoom: 8,
        attribution: 'Open NASA GIBS / EOSDIS Imagery',
      }).addTo(map);
    }
  }, [selectedTrack, selectedDate, gibsOverlayEnabled]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lat - coordinates.lat) > 0.25 ||
      Math.abs(current.lng - coordinates.lon) > 0.25 ||
      map.getZoom() !== coordinates.zoom
    ) {
      map.setView([coordinates.lat, coordinates.lon], coordinates.zoom);
      markerRef.current?.setLatLng([coordinates.lat, coordinates.lon]);
    }
  }, [coordinates]);

  const handleSelectPreset = (preset: RegionalPreset) => {
    onChangeCoordinates({ lat: preset.lat, lon: preset.lon, zoom: preset.zoom });
    const match = tracks.find((t) => t.id === preset.recommendedTrackId);
    if (match) onSelectTrack(match);
    playUiCue();
    announce(`Selected region ${preset.name}. ${preset.summary}`, true);
  };

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-5">
          <label
            htmlFor="gibs-layer-select"
            className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1.5"
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>NASA SVS / GIBS Layer ({tracks.length} Datasets)</span>
          </label>
          <select
            id="gibs-layer-select"
            value={selectedTrack.id}
            onChange={(e) => {
              const next = tracks.find((t) => t.id === e.target.value);
              if (next) {
                onSelectTrack(next);
                announce(`Selected layer ${next.title}.`, true);
              }
            }}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-sky-400"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.index}. {t.short_title} (SVS {t.svs_id})
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label
            htmlFor="gibs-date-input"
            className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1.5"
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Observation Date</span>
          </label>
          <input
            id="gibs-date-input"
            type="date"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-mono focus:border-sky-400"
          />
        </div>

        <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            aria-pressed={gibsOverlayEnabled}
            onClick={() => setGibsOverlayEnabled((v) => !v)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap ${
              gibsOverlayEnabled
                ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            {gibsOverlayEnabled ? 'GIBS Overlay: On' : 'GIBS Overlay: Off'}
          </button>

          <button
            type="button"
            onClick={onSendToStudio}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            <span>Sonify in Studio</span>
          </button>
        </div>
      </div>

      {/* Map + Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 es-panel rounded-2xl overflow-hidden border border-sky-500/20 bg-[#060913] relative min-h-[460px]">
          <div
            ref={mapContainerRef}
            data-testid="earthsound-leaflet-map"
            aria-label="Interactive Global Earth Observation Map"
            className="w-full h-[460px] lg:h-full min-h-[460px]"
          />
          <div className="absolute bottom-3 left-3 z-[400] bg-[#060913]/90 border border-sky-500/30 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 tabular-nums pointer-events-none">
            LAT {coordinates.lat.toFixed(2)}° · LON {coordinates.lon.toFixed(2)}° · Z{coordinates.zoom}
          </div>
        </div>

        <aside className="lg:col-span-4 es-panel bg-[#0B1120] border border-sky-500/20 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Compass className="w-4 h-4 text-sky-400" />
              <h3>Climate &amp; Ocean Presets</h3>
            </div>

            <div className="space-y-2.5">
              {REGIONAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-sky-400/50 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">{preset.name}</p>
                  <p className="text-[11px] font-mono text-sky-300 mt-0.5">{preset.region}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{preset.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-200">{selectedTrack.title}</p>
            <p>{selectedTrack.synthesis_role}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};
