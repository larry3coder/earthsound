"""4-voice polyphonic WAV and Standard MIDI generation using NumPy and MIDIUtil."""

from __future__ import annotations

import io
import wave
from typing import Any

import numpy as np
from midiutil import MIDIFile

from .sound_mapping import map_band_to_note, midi_to_hz, note_name_to_midi


def generate_midi_bytes(columns: list[list[dict[str, float]]], track: dict[str, Any]) -> bytes:
    """Generate a multi-channel Standard MIDI File from scanned latitude bands."""
    midi = MIDIFile(1)
    bpm = int(track.get("bpm", 100))
    scale = track.get("musical_scale", ["C4", "E4", "G4"])
    midi.addTempo(0, 0, bpm)

    step_beats = 0.5
    for step_idx, bands in enumerate(columns):
        time_beat = step_idx * step_beats
        for band in bands:
            lum = band["luminance"]
            if lum > 30.0:
                note_name = map_band_to_note(int(band["band_index"]), len(bands), scale)
                pitch = note_name_to_midi(note_name)
                velocity = min(115, max(32, int((lum / 255.0) * 110)))
                r, g, b = band["r"], band["g"], band["b"]
                channel = 0 if (r >= g and r >= b) else (1 if g >= b else 2)
                midi.addNote(0, channel, pitch, time_beat, step_beats * 0.85, velocity)

    buf = io.BytesIO()
    midi.writeFile(buf)
    return buf.getvalue()


def generate_wav_bytes(
    columns: list[list[dict[str, float]]],
    track: dict[str, Any],
    sample_rate: int = 22050,
) -> bytes:
    """Synthesize a 16-bit PCM WAV file from the top 4 luminous latitude bands per scan step."""
    bpm = max(60, int(track.get("bpm", 100)))
    scale = track.get("musical_scale", ["C4", "E4", "G4"])
    sec_per_step = 60.0 / bpm / 2.0
    total_samples = int((max(1, len(columns)) * sec_per_step + 0.4) * sample_rate)
    audio = np.zeros(total_samples, dtype=np.float32)

    for step_idx, bands in enumerate(columns):
        start_idx = int(step_idx * sec_per_step * sample_rate)
        note_len = int(sec_per_step * 1.3 * sample_rate)
        active = sorted(
            [b for b in bands if b["luminance"] > 30.0],
            key=lambda item: item["luminance"],
            reverse=True,
        )[:4]

        for band in active:
            note_name = map_band_to_note(int(band["band_index"]), len(bands), scale)
            freq = midi_to_hz(note_name_to_midi(note_name))
            amp = (band["luminance"] / 255.0) * 0.2
            end_idx = min(total_samples, start_idx + note_len)
            n = end_idx - start_idx
            if n <= 0:
                continue
            t = np.arange(n, dtype=np.float32) / sample_rate
            env = np.exp(-3.0 * (np.arange(n, dtype=np.float32) / max(1, note_len)))
            attack = min(n, int(sample_rate * 0.02))
            if attack > 0:
                env[:attack] *= np.linspace(0.0, 1.0, attack, dtype=np.float32)
            tone = 0.78 * np.sin(2.0 * np.pi * freq * t) + 0.22 * np.sin(4.0 * np.pi * freq * t)
            audio[start_idx:end_idx] += tone * env * amp

    pcm = np.clip(audio, -0.95, 0.95)
    pcm_int16 = (pcm * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_int16.tobytes())
    return buf.getvalue()
