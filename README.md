# Pixel Beta AI

A local-first multimodal AI workspace for image, audio, and document understanding — all running on your own machine. No cloud API keys, no data sent to external servers.

---

## What it can do

| Feature | How to use it |
|---|---|
| Image captioning | Attach a JPG/PNG/WebP and send without a question |
| Visual Q&A | Attach an image and ask a specific question |
| Text understanding | Type Hindi, Hinglish, English, idioms, or slang |
| Audio transcription | Attach an MP3/WAV/M4A/etc — transcript is returned automatically |
| Audio understanding | After transcription, the AI interprets the content |
| PDF summarization | Attach a PDF and send without a question |
| PDF Q&A | Attach a PDF and ask a question about its content |

---

## Technology stack

| Component | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Backend | Python 3.11, FastAPI |
| Image captioning | BLIP (Salesforce/blip-image-captioning-base) |
| Visual Q&A | SmolVLM-256M-Instruct |
| Text/audio/document AI | qwen2.5:1.5b via Ollama |
| Audio transcription | faster-whisper (small, CPU, int8) |
| Audio preprocessing | FFmpeg |
| PDF extraction | pypdf |
| Conversation storage | Browser localStorage (local, no server required) |

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11.9 | Must match the .venv |
| Node.js | 18+ | For the frontend |
| Ollama | Latest | [https://ollama.com](https://ollama.com) |
| FFmpeg | Any recent | Must be in PATH |

**Operating system:** Windows (PowerShell). macOS/Linux should work with minor command adjustments.

---

## Installation and setup

### 1. Install Ollama and pull the model

Download Ollama from [https://ollama.com](https://ollama.com), install it, then open a terminal and run:

```powershell
ollama pull qwen2.5:1.5b
```

This downloads the language model (~1 GB). You only need to do this once.

### 2. Install FFmpeg

Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html).

Add `ffmpeg.exe` to your system PATH. To verify:

```powershell
ffmpeg -version
```

FFmpeg is required for audio format conversion before transcription.

### 3. Set up the Python virtual environment

The `.venv` is already present in `image-ai/`. If you need to recreate it:

```powershell
cd image-ai
python -m venv .venv
.venv\Scripts\pip install fastapi "uvicorn[standard]" httpx pillow transformers torch torchvision faster-whisper pypdf python-multipart
```

First startup will automatically download BLIP, SmolVLM, and the Whisper model weights (~1–2 GB total). This only happens once; they are cached by HuggingFace.

### 4. Install frontend dependencies

```powershell
cd frontend
npm install
```

---

## Running the application

You need **three terminals** open simultaneously.

**Terminal 1 — Ollama (the language model server)**
```powershell
ollama serve
```
Leave this running. Ollama listens on port 11434.

**Terminal 2 — Python backend (the AI API)**
```powershell
cd image-ai
.venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Leave this running. The API listens on port 8000.
On first startup it will download and load the image models — this takes 1–3 minutes.

**Terminal 3 — React frontend (the web UI)**
```powershell
cd frontend
npm run dev
```
Leave this running. The UI is available at: **http://localhost:5173**

Open http://localhost:5173 in your browser.

---

## Required ports

| Service | Port |
|---|---|
| Vite (frontend) | 5173 |
| FastAPI (backend) | 8000 |
| Ollama | 11434 |

If a port is already in use, you will get a "port already in use" error. Stop the other process or change the port in the relevant config.

---

## Conversation persistence

All conversation history is stored in your browser's `localStorage` under the key prefix `pba_`. This data:

- Survives page refreshes and browser restarts.
- Is stored only in your browser — nothing leaves your computer.
- Can be cleared by clearing browser data (Settings → Clear browsing data).
- Contains only text (filenames, messages, AI responses) — uploaded files are NOT stored.

---

## Environment variables

No environment variables are required for local use. The application connects to:
- `http://127.0.0.1:8000` (FastAPI backend)
- `http://127.0.0.1:11434` (Ollama)

Both addresses are hardcoded as local-only defaults.

---

## Build commands

**Frontend production build:**
```powershell
cd frontend
npm run build
```
Output goes to `frontend/dist/`.

**Frontend type check (no build):**
```powershell
cd frontend
npx tsc --noEmit
```

**Backend tests (requires the FastAPI server to be running):**
```powershell
cd image-ai
.venv\Scripts\python test_api.py
```

---

## Troubleshooting

See `docs/TROUBLESHOOTING.md` for detailed solutions to common errors.

Quick checks:
- **"Ollama is unavailable"** — run `ollama serve` in a terminal
- **"Image models not loaded"** — wait for startup, check Terminal 2 for errors
- **"CORS error"** — make sure you are using http://localhost:5173 not a different port
- **"Cannot find module"** — run `npm install` in the `frontend/` folder

---

## Project structure

```
multimodal-ai/
├── README.md                 ← You are here
├── docs/                     ← All documentation
│   ├── ARCHITECTURE.md
│   ├── BEGINNER_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── AI_MODELS.md
│   ├── DATA_AND_PRIVACY.md
│   ├── TROUBLESHOOTING.md
│   └── ROADMAP.md
│
├── frontend/                 ← React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx           ← Root layout component
│   │   ├── App.css           ← Complete design system (CSS variables + styles)
│   │   ├── types.ts          ← All TypeScript type definitions
│   │   ├── components/       ← UI components
│   │   │   ├── AnimatedAICore.tsx
│   │   │   ├── AttachmentPreview.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageComposer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ThemeSelector.tsx
│   │   ├── hooks/            ← Custom React hooks
│   │   │   ├── useConversations.ts
│   │   │   └── useTheme.ts
│   │   └── lib/              ← Non-UI utilities
│   │       ├── api.ts        ← All API calls
│   │       └── storage.ts    ← localStorage persistence
│   ├── index.html
│   └── package.json
│
├── image-ai/                 ← Python backend
│   ├── main.py               ← FastAPI application (all endpoints)
│   ├── test_api.py           ← Automated API tests
│   └── .venv/                ← Python virtual environment
│
└── state/                    ← (reserved for future server-side storage)
```

---

## Privacy

All AI inference runs locally on your computer. No images, audio, text, or PDF content is sent to external servers. The only network requests are:
- Your browser → `http://127.0.0.1:8000` (local Python server)
- Python server → `http://127.0.0.1:11434` (local Ollama)

No telemetry. No accounts. No internet required after initial model downloads.

---

## Current limitations

- Image models: BLIP and SmolVLM are small models. Accuracy on complex or ambiguous scenes is limited.
- Audio: Long audio files (>25 MB) are rejected. Noisy audio may produce incorrect transcripts.
- PDF: Scanned (image-based) PDFs cannot be read without OCR (not yet implemented).
- Conversations: Stored in browser localStorage. Clearing browser data removes all history.
- Performance: Models run on CPU. Each request takes several seconds to a minute depending on hardware.
