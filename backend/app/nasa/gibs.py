"""NASA GIBS WMTS tile fetcher and catalog metadata for the 11 official NASA SVS/EIC datasets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

CATALOG_PATH = Path(__file__).resolve().parents[2] / "nasa_jukebox_tracks.json"
GIBS_WMTS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best"


def load_track_catalog() -> list[dict[str, Any]]:
    """Load the 11 official NASA SVS and EIC dataset definitions."""
    with CATALOG_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def get_track_by_id(track_id: str) -> dict[str, Any]:
    """Return a single track configuration by ID, defaulting to the first catalog entry."""
    catalog = load_track_catalog()
    for item in catalog:
        if item["id"] == track_id:
            return item
    return catalog[0]


async def fetch_gibs_tile_bytes(
    layer: str,
    date: str,
    z: int,
    y: int,
    x: int,
    tile_matrix_set: str = "250m",
) -> bytes:
    """Fetch a tile from NASA GIBS WMTS without requiring an API key."""
    url = f"{GIBS_WMTS_BASE}/{layer}/default/{date}/{tile_matrix_set}/{z}/{y}/{x}.jpg"
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content
