import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { NasaTrack } from './src/types/earthsound';
import { generateMidiFromBands, generateWavFromBands } from './src/utils/audioExport';
import { computeLuminance, estimatePhysicalValueFromColor } from './src/utils/sonificationMath';

const PORT = 3000;
const tracksPath = path.resolve(process.cwd(), 'nasa_jukebox_tracks.json');
const tracks: NasaTrack[] = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Catalog of all 11 official NASA SVS / EIC resources
  app.get('/api/presets', (_req, res) => {
    res.json(tracks);
  });

  // 2. Server-side Caldwell 73 sonification & physical mapping endpoint
  app.post('/api/sonify', (req, res) => {
    const { trackId, rgbSummary } = req.body ?? {};
    const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
    const r = Number(rgbSummary?.r ?? 80);
    const g = Number(rgbSummary?.g ?? 140);
    const b = Number(rgbSummary?.b ?? 180);
    const luminance = computeLuminance(r, g, b);
    const { stop, estimatedValue } = estimatePhysicalValueFromColor(r, g, b, track);

    res.json({
      trackId: track.id,
      svsId: track.svs_id,
      luminance: Number(luminance.toFixed(1)),
      active: luminance > 30,
      recommendedNote: stop.note,
      physicalLabel: stop.label,
      physicalValue: estimatedValue,
      unit: track.physical_unit,
      bpm: track.bpm,
    });
  });

  // 3. NASA GIBS WMTS tile proxy (EPSG:3857 GoogleMapsCompatible) with CORS headers & transparent fallback
  app.get('/api/gibs-tile', async (req, res) => {
    const layer = String(req.query.layer || 'MODIS_Terra_CorrectedReflectance_TrueColor');
    const date = String(req.query.date || '2024-06-15');
    const z = Number(req.query.z ?? 2);
    const y = Number(req.query.y ?? 1);
    const x = Number(req.query.x ?? 1);

    const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${encodeURIComponent(
      layer
    )}/default/${encodeURIComponent(date)}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const upstream = await fetch(gibsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (upstream.ok) {
        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        const arrayBuf = await upstream.arrayBuffer();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(arrayBuf));
        return;
      }
    } catch {
      // Fall through to transparent telemetry reticle if upstream GIBS is unreachable
    }

    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="transparent"/>
      <path d="M0 128 H256 M128 0 V256" stroke="#38bdf8" stroke-opacity="0.12" stroke-width="1"/>
      <text x="10" y="244" fill="#38bdf8" fill-opacity="0.45" font-family="monospace" font-size="9">${layer.slice(0, 28)}</text>
    </svg>`;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgFallback);
  });

  // 4. MIDI export endpoint
  app.post('/api/export-midi', (req, res) => {
    const { trackId, bandColumns } = req.body ?? {};
    const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
    const cols = Array.isArray(bandColumns) && bandColumns.length > 0 ? bandColumns : [];
    const midiBytes = generateMidiFromBands(cols, track);

    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('Content-Disposition', `attachment; filename="earthsound-${track.id}.mid"`);
    res.send(Buffer.from(midiBytes));
  });

  // 5. WAV export endpoint
  app.post('/api/export-wav', (req, res) => {
    const { trackId, bandColumns } = req.body ?? {};
    const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
    const cols = Array.isArray(bandColumns) && bandColumns.length > 0 ? bandColumns : [];
    const wavBytes = generateWavFromBands(cols, track, 22050);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="earthsound-${track.id}.wav"`);
    res.send(Buffer.from(wavBytes));
  });

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EarthSound server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EarthSound server:', err);
  process.exit(1);
});
