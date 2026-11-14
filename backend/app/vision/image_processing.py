"""Computer vision image processing for EarthSound (BT.709 luminance, RGB extraction, contrast, spatial edges)."""

from __future__ import annotations

import io
from typing import Any

import cv2
import numpy as np
from PIL import Image

LUMINANCE_THRESHOLD = 30.0
FLASH_THRESHOLD = 240.0


def decode_image_to_rgb(image_bytes: bytes, target_size: tuple[int, int] = (800, 400)) -> np.ndarray:
    """Decode uploaded or fetched image bytes to an RGB uint8 NumPy array."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    resized = pil_img.resize(target_size, Image.Resampling.BILINEAR)
    return np.asarray(resized, dtype=np.uint8)


def compute_bt709_luminance(rgb: np.ndarray) -> np.ndarray:
    """Compute ITU-R BT.709 relative luminance: L = 0.2126R + 0.7152G + 0.0722B."""
    r = rgb[..., 0].astype(np.float32)
    g = rgb[..., 1].astype(np.float32)
    b = rgb[..., 2].astype(np.float32)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def extract_image_features(rgb: np.ndarray) -> dict[str, Any]:
    """Extract RGB channel statistics, luminance, RMS contrast, and Sobel edge density."""
    lum = compute_bt709_luminance(rgb)
    gray = lum.astype(np.uint8)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges > 0) * 100.0)

    return {
        "mean_r": round(float(np.mean(rgb[..., 0])), 2),
        "mean_g": round(float(np.mean(rgb[..., 1])), 2),
        "mean_b": round(float(np.mean(rgb[..., 2])), 2),
        "mean_luminance": round(float(np.mean(lum)), 2),
        "contrast_std": round(float(np.std(lum)), 2),
        "edge_density": round(edge_density, 2),
        "flash_pixel_ratio": round(float(np.mean(lum > FLASH_THRESHOLD) * 100.0), 4),
    }


def slice_scan_columns(rgb: np.ndarray, num_steps: int = 24, num_bands: int = 16) -> list[list[dict[str, float]]]:
    """Sample vertical scan columns across the image and divide each column into 16 latitudinal bands."""
    height, width, _ = rgb.shape
    lum = compute_bt709_luminance(rgb)
    band_h = max(1, height // num_bands)
    columns: list[list[dict[str, float]]] = []

    for step in range(num_steps):
        x = min(width - 1, int((step / max(1, num_steps)) * width))
        bands: list[dict[str, float]] = []
        for b in range(num_bands):
            y0 = b * band_h
            y1 = height if b == num_bands - 1 else y0 + band_h
            band_rgb = rgb[y0:y1, x, :]
            band_lum = lum[y0:y1, x]
            bands.append(
                {
                    "band_index": float(b),
                    "r": float(np.mean(band_rgb[:, 0])),
                    "g": float(np.mean(band_rgb[:, 1])),
                    "b": float(np.mean(band_rgb[:, 2])),
                    "luminance": float(np.mean(band_lum)),
                    "flash": 1.0 if float(np.max(band_lum)) > FLASH_THRESHOLD else 0.0,
                }
            )
        columns.append(bands)
    return columns
