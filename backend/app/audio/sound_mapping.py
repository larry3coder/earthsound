"""Harmonic scale quantization, chord progression logic, and Caldwell 73 note mapping."""

from __future__ import annotations

from typing import Any

NOTE_OFFSETS = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}


def note_name_to_midi(note_name: str) -> int:
    """Convert scientific pitch notation (e.g. 'Eb4') to a MIDI note number."""
    note_name = note_name.strip()
    if len(note_name) < 2:
        return 60
    octave = int(note_name[-1])
    pitch = note_name[:-1]
    return max(0, min(127, (octave + 1) * 12 + NOTE_OFFSETS.get(pitch, 0)))


def midi_to_hz(midi_note: int) -> float:
    """Convert MIDI note number to frequency in Hz."""
    return 440.0 * (2.0 ** ((midi_note - 69) / 12.0))


def map_band_to_note(band_index: int, total_bands: int, scale: list[str]) -> str:
    """Caldwell 73 rule: northern bands (0) map to treble notes, southern bands to bass notes."""
    if not scale:
        return "C4"
    inverted = 1.0 - max(0, min(total_bands - 1, band_index)) / max(1, total_bands - 1)
    idx = min(len(scale) - 1, max(0, round(inverted * (len(scale) - 1))))
    return scale[idx]


def compute_harmony_modulation(sum_r: float, sum_g: float, sum_b: float, mode: str) -> dict[str, Any]:
    """Compute consonance-to-dissonance detune cents based on RGB balance."""
    total = max(1.0, sum_r + sum_g + sum_b)
    red_ratio = sum_r / total
    if mode == "consonance_dissonance" and red_ratio > 0.45:
        return {"quality": "Minor Tension", "detune_cents": min(32, round((red_ratio - 0.4) * 140))}
    if red_ratio > 0.37:
        return {"quality": "Suspended Equilibrium", "detune_cents": 10}
    return {"quality": "Major Consonance", "detune_cents": 0}
