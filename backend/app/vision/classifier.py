"""Maps pixel RGB signatures to NASA dataset physical scales and dominant atmospheric classes."""

from __future__ import annotations

from typing import Any

from .image_processing import compute_bt709_luminance


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    cleaned = hex_color.lstrip("#")
    return (int(cleaned[0:2], 16), int(cleaned[2:4], 16), int(cleaned[4:6], 16))


def map_color_to_physical_unit(
    r: float, g: float, b: float, track: dict[str, Any]
) -> dict[str, Any]:
    """Match an observed RGB pixel to the closest colorbar stop and interpolate its physical value."""
    stops = track.get("colorbar_stops", [])
    phys_min, phys_max = track.get("physical_range", [0, 100])
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    if not stops:
        val = phys_min + (lum / 255.0) * (phys_max - phys_min)
        return {"label": "Luminance Estimate", "value": round(val, 2), "note": "C4"}

    best_stop = stops[0]
    best_dist = float("inf")
    for stop in stops:
        sr, sg, sb = _hex_to_rgb(stop["color"])
        dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2
        if dist < best_dist:
            best_dist = dist
            best_stop = stop

    lum_est = phys_min + (lum / 255.0) * (phys_max - phys_min)
    blended = max(phys_min, min(phys_max, best_stop["value"] * 0.72 + lum_est * 0.28))
    return {
        "label": best_stop["label"],
        "value": round(float(blended), 2),
        "note": best_stop["note"],
        "unit": track.get("physical_unit", ""),
    }


def classify_dominant_signature(features: dict[str, Any], track: dict[str, Any]) -> str:
    """Summarize the physical telemetry signature of an analyzed Earth frame."""
    r = features["mean_r"]
    g = features["mean_g"]
    b = features["mean_b"]
    if r >= g and r >= b:
        return f"Dominant Red Channel: {track['layers']['red']['label']}"
    if g >= r and g >= b:
        return f"Dominant Green Channel: {track['layers']['green']['label']}"
    return f"Dominant Blue Channel: {track['layers']['blue']['label']}"
