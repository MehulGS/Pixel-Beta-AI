# InsightAI

A local-first multimodal AI application for image captioning, visual question answering, multilingual text understanding, and audio transcription/interpretation.

Everything runs on your own machine — no cloud API keys required.

---

## Features

| Feature | Model / Tool |
|---|---|
| Image captioning | BLIP (Salesforce/blip-image-captioning-base) |
| Visual Q&A | SmolVLM-256M-Instruct |
| Text understanding (Hindi / Hinglish / English) | qwen2.5:1.5b via Ollama |
| Audio transcription | faster-whisper (small, CPU, int8) |
| Audio understanding | qwen2.5:1.5b via Ollama |

---

## Requirements

- **Python 3.10+** with a virtual environment at `image-ai/.venv`
- **FFmpeg** installed and available in `PATH` (used for audio preprocessing)
- **Ollama** running locally at `http://127.0.0.1:11434` with the `qwen2.5:1.5b` model pulled
- **Node.js 18+** for the frontend

---

## Setup

### 1. Ollama

Install Ollama from https://ollama.com and pull the model:

```sh
ollama pull qwen2.5:1.5b
```

### 2. Python backend

```sh
cd image-ai
python -m venv .venv

# Windows PowerShell
.venv\Scripts\pip install fastapi uvicorn[standard] httpx pillow transformers torch torchvision faster-whisper

# First run will download BLIP, SmolVLM, and Whisper models automatically.
```

All dependencies already installed:

```
fastapi, uvicorn, httpx, pillow, transformers, torch (CPU), faster-whisper,
pydub, scipy, numpy, av
```

### 3. Frontend

```sh
cd frontend
npm install
```

---

## Running the application

Open **three** terminals:

**Terminal 1 — Ollama**
```sh
ollama serve
```

**Terminal 2 — FastAPI backend**
```sh
cd image-ai
.venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 3 — Vite frontend**
```sh
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## API Endpoints

### `GET /`
Returns application info and feature list.

### `GET /health`
Returns model load status.

### `POST /analyze`
Image captioning.

- Body: `multipart/form-data`
  - `file`: image (JPG, PNG, WebP, max 8 MB)
- Response: `{ filename, description, model }`

### `POST /ask`
Visual question answering.

- Body: `multipart/form-data`
  - `file`: image
  - `question`: string (max 1000 chars)
- Response: `{ filename, question, answer, model }`

### `POST /understand-text`
Multilingual text interpretation (Hindi, Hinglish, English, idioms).

- Body: `application/x-www-form-urlencoded`
  - `text`: string (max 5000 chars)
- Response: `{ input, answer, model, source }`

### `POST /transcribe-audio`
Audio transcription with automatic language detection.

- Body: `multipart/form-data`
  - `file`: audio (MP3, WAV, M4A, OGG, WebM, FLAC — max 25 MB)
  - `language` *(optional)*: `en`, `hi`, or omit for auto-detection
- Response:
```json
{
  "filename": "example.mp3",
  "language": "en",
  "language_probability": 0.95,
  "transcript": "Recognized speech here.",
  "segments": [
    { "start": 0.0, "end": 2.5, "text": "Recognized speech here." }
  ],
  "model": "faster-whisper-small",
  "transcription_status": "success"
}
```

`transcription_status` values: `success`, `empty_transcript`

### `POST /understand-audio`
Interprets an audio transcript using the local Ollama model.

- Body: `application/json`
```json
{
  "transcript": "Kutte, main tera khoon pee jaunga",
  "language": "hi",
  "filename": "dialogue.mp3"
}
```
- Response:
```json
{
  "transcript": "...",
  "analysis": "1. Language(s)...\n2. Summary...\n...",
  "model": "qwen2.5:1.5b",
  "source": "ollama"
}
```

`source` is `"known_phrase"` for exact matches in the built-in Hindi phrase dictionary (no Ollama required), or `"ollama"` for LLM analysis.

---

## Supported Audio Formats

| Format | Extension | Notes |
|---|---|---|
| MP3 | .mp3 | Most common |
| WAV | .wav | Recommended for best accuracy |
| M4A | .m4a | AAC audio |
| OGG | .ogg | Vorbis |
| WebM | .webm | Browser recordings |
| FLAC | .flac | Lossless |

Audio is converted to 16 kHz mono WAV via FFmpeg before transcription.
Maximum file size: 25 MB.

---

## Language Support

The Whisper `small` model supports 99 languages. Auto-detection is enabled by default. You can pass `language=en` or `language=hi` to override.

**Important limitations:**
- Language probability of 1.0 does not guarantee accurate word recognition.
- Noisy, compressed, comedic, or music-heavy audio will produce lower quality transcripts.
- Code-switching (mid-sentence Hindi/English mixing) is partially supported but may produce mixed results.
- Roman Hindi and Hinglish may be transcribed as Devanagari or as approximate English.
- The app reports uncertainty rather than fabricating a transcript.

---

## Running the test suite

The backend must be running before executing tests.

```sh
cd image-ai
.venv\Scripts\python.exe test_api.py
```

Optional: specify a different server URL:
```sh
.venv\Scripts\python.exe test_api.py --url http://127.0.0.1:8000
```

Tests cover:
- Health and root endpoints
- Empty audio upload
- Unsupported MIME type
- Oversized audio (>25 MB)
- Silent WAV transcription
- Real audio files (if present in image-ai/)
- Language override
- Empty transcript rejection
- Known Hindi phrase dictionary match
- English transcript via Ollama (skipped if Ollama unavailable)
- Text understanding regression

---

## Manual Tests Required

These require human evaluation and cannot be automated:

1. **Hindi speech** — verify Devanagari or Roman Hindi is transcribed correctly
2. **Roman Hindi / Hinglish** — e.g., "Kutte main tera khoon pee jaunga" audio
3. **English speech** — verify language is detected as `en`, not forced to `hi`
4. **Mixed Hindi-English** — verify code-switching is handled without mangling
5. **Comedy / noisy audio** — verify uncertainty is reported rather than fabricated text
6. **Ollama unavailable** — stop Ollama, try Understand Audio, expect 503 error in UI
7. **Image captioning** — upload any JPG/PNG and check BLIP description
8. **Visual Q&A** — upload image and ask a question
9. **Drag-and-drop** — test both image and audio drop zones

---

## Architecture

```
frontend/          React + Vite + TypeScript
  src/App.tsx      UI — image and audio sections
  src/App.css      Styling

image-ai/          Python backend
  main.py          FastAPI application
                   - BLIP image captioning
                   - SmolVLM visual Q&A
                   - faster-whisper audio transcription
                   - Ollama text/audio understanding
  test_api.py      Automated API tests
  test_audio.py    Interactive Whisper CLI tester
  test_summary.py  Interactive Ollama transcript interpreter
```

---

## Privacy

All inference runs locally. No audio, images, or text are sent to external services.
