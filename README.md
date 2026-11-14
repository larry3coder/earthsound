# EarthSound — The Earth Information Jukebox (Alpha)

EarthSound translates open NASA Earth Observation satellite imagery, Earth Information Center (EIC) frames, and NASA GIBS layers into harmonious, scientifically grounded multi-track music based on the NASA Caldwell 73 sonification framework.

> **Attribution Notice**: EarthSound is an independent participant project utilizing open NASA Earth Observation and SVS data.

## Core Interaction Tiers

1. **Discover**: Onboarding, experience selector (Standard vs. Accessibility-First), and 5-step guided tour.
2. **Explore**: Interactive Leaflet.js global map with NASA GIBS WMTS overlays, date selection, and 800x400 Radar Scanline + Tactile Cursor Sonar Studio.
3. **Analyze**: Chart.js RGB spectral histograms, ITU-R BT.709 luminance & contrast metrics, interactive clickable NASA Colorbar legends, and WAV/MIDI export.

## Accessibility Modes (WCAG AAA)

- **Standard Mode**: Deep space telemetry dark interface (`#060913` / `#0B1120`).
- **High Contrast Mode**: Pure monochrome contrast with 2px borders and zero color-only signaling.
- **Low Vision Mode**: Scaled typography (`22px`), 48px minimum control heights, and simplified layout.
- **Audio Navigation Mode**: Web Speech API (`window.speechSynthesis`) voice guidance, ARIA live regions, and full keyboard shortcuts (`Space`, `S`, `V`, `H`, `C`, `R`, `1-5`, `Q`).

## Running Locally

### Live Full-Stack Web App (Node + Vite + Express on Port 3000)
```bash
npm install
npm run dev
```

### Optional Python FastAPI DSP Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
