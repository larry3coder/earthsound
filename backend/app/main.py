"""FastAPI backend entry point for EarthSound (NASA Space Apps Challenge 2026)."""

from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .audio.sonification import generate_midi_bytes, generate_wav_bytes
from .nasa.gibs import fetch_gibs_tile_bytes, get_track_by_id, load_track_catalog
from .vision.classifier import classify_dominant_signature, map_color_to_physical_unit
from .vision.image_processing import (
    decode_image_to_rgb,
    extract_image_features,
    slice_scan_columns,
)

app = FastAPI(
    title="EarthSound Sonification API",
    description="Open NASA Earth Observation and SVS sonification pipeline.",
    version="0.1.0-alpha",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RgbSummary(BaseModel):
    r: float = 80.0
    g: float = 140.0
    b: float = 180.0
    luminance: float | None = None


class SonifyPayload(BaseModel):
    trackId: str
    rgbSummary: RgbSummary


@app.get("/api/presets")
def api_presets():
    """Return the 11 official NASA SVS/EIC dataset track configurations."""
    return load_track_catalog()


@app.get("/api/gibs-tile")
async def api_gibs_tile(layer: str, date: str, z: int = 2, y: int = 1, x: int = 1):
    """Proxy an open NASA GIBS WMTS tile with CORS headers."""
    try:
        tile_bytes = await fetch_gibs_tile_bytes(layer=layer, date=date, z=z, y=y, x=x)
        return Response(content=tile_bytes, media_type="image/jpeg")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GIBS tile unavailable: {exc}") from exc


@app.post("/api/sonify")
def api_sonify(payload: SonifyPayload):
    """Map an RGB pixel summary to a Caldwell 73 reference pitch and physical unit."""
    track = get_track_by_id(payload.trackId)
    r, g, b = payload.rgbSummary.r, payload.rgbSummary.g, payload.rgbSummary.b
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    physical = map_color_to_physical_unit(r, g, b, track)
    return {
        "trackId": track["id"],
        "svsId": track["svs_id"],
        "luminance": round(lum, 2),
        "active": lum > 30.0,
        "recommendedNote": physical["note"],
        "physicalLabel": physical["label"],
        "physicalValue": physical["value"],
        "unit": track["physical_unit"],
        "bpm": track["bpm"],
    }


@app.post("/api/analyze-image")
async def api_analyze_image(trackId: str = Form(...), file: UploadFile = File(...)):
    """Analyze an uploaded satellite frame with OpenCV/NumPy and return spectral metrics."""
    track = get_track_by_id(trackId)
    raw = await file.read()
    rgb = decode_image_to_rgb(raw)
    features = extract_image_features(rgb)
    signature = classify_dominant_signature(features, track)
    return {"trackId": track["id"], "features": features, "signature": signature}


@app.post("/api/export-midi")
async def api_export_midi(trackId: str = Form("geos_aerosols"), file: UploadFile = File(...)):
    """Convert an uploaded image frame into a quantized Standard MIDI File."""
    track = get_track_by_id(trackId)
    raw = await file.read()
    rgb = decode_image_to_rgb(raw)
    columns = slice_scan_columns(rgb)
    midi_bytes = generate_midi_bytes(columns, track)
    return Response(
        content=midi_bytes,
        media_type="audio/midi",
        headers={"Content-Disposition": f'attachment; filename="earthsound-{track["id"]}.mid"'},
    )


@app.post("/api/export-wav")
async def api_export_wav(trackId: str = Form("geos_aerosols"), file: UploadFile = File(...)):
    """Synthesize a 16-bit PCM WAV file directly from an uploaded satellite image."""
    track = get_track_by_id(trackId)
    raw = await file.read()
    rgb = decode_image_to_rgb(raw)
    columns = slice_scan_columns(rgb)
    wav_bytes = generate_wav_bytes(columns, track)
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": f'attachment; filename="earthsound-{track["id"]}.wav"'},
    )
