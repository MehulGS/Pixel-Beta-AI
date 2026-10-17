# Architecture — Pixel Beta AI

## Overview

Pixel Beta AI is a three-tier local application:

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React frontend at localhost:5173)             │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Sidebar  │  │ ChatView │  │ MessageComposer       │ │
│  │ (history)│  │(messages)│  │ (text + file upload)  │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│                      │                                  │
│              localStorage (persistence)                 │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTP (fetch API)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Python FastAPI (port 8000)                             │
│                                                         │
│  POST /analyze          → BLIP (image captioning)       │
│  POST /ask              → SmolVLM (visual Q&A)          │
│  POST /understand-text  → Ollama                        │
│  POST /transcribe-audio → faster-whisper                │
│  POST /understand-audio → Ollama                        │
│  POST /document/extract → pypdf                         │
│  POST /document/summarize → Ollama                      │
│  POST /document/ask     → Ollama                        │
└─────────────────────────────────┬───────────────────────┘
                                  │ HTTP (httpx)
                                  ▼
┌─────────────────────────────────────────────────────────┐
│  Ollama (port 11434)                                    │
│  Model: qwen2.5:1.5b                                    │
│  Handles: text understanding, audio analysis,           │
│           PDF summarization, document Q&A               │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

**Entry point:** `frontend/src/main.tsx`  
Mounts the React application into `#root` in `index.html`.

**Root component:** `frontend/src/App.tsx`  
Orchestrates theme, conversation state, and the two-column layout (sidebar + chat).

**Component tree:**
```
App
├── Sidebar
│   ├── (branding, New Chat button, search)
│   ├── ConversationList
│   │   └── (conversation items, rename/delete menus)
│   └── ThemeSelector
└── ChatView
    ├── EmptyState (when no messages)
    │   └── AnimatedAICore
    ├── MessageBubble (one per message)
    └── MessageComposer
        └── AttachmentPreview
```

**State management:**  
No Redux or Zustand — plain React hooks.
- `useConversations` — conversation list, active conversation, CRUD
- `useTheme` — current theme, persistence, OS sync
- Local `useState` per component for UI-only state (e.g. isDragging, menuOpenId)

**Persistence:**  
`frontend/src/lib/storage.ts` wraps `localStorage`.  
All conversations and messages are JSON-serialised into the browser store.

**API calls:**  
`frontend/src/lib/api.ts` contains one function per FastAPI endpoint.  
No component ever calls `fetch()` directly — it always goes through this module.

## Backend Architecture

**Entry point:** `image-ai/main.py`  
A single FastAPI application with all routes defined inline.

**Model lifecycle:**  
- BLIP and SmolVLM are loaded at startup via the `lifespan` context manager.
- Whisper is loaded lazily on the first audio request (saves ~200 MB RAM at startup).
- All models run on CPU with float32 / int8 quantisation.

**Request flow — image captioning:**
```
Browser → POST /analyze (FormData: file) →
  read_image() validates type + size →
  BLIP tokenizes + generates →
  returns { filename, description, model }
```

**Request flow — audio transcription:**
```
Browser → POST /transcribe-audio (FormData: file) →
  validate MIME type →
  write to temp file →
  FFmpeg converts to 16kHz mono WAV →
  Whisper transcribes →
  cleanup temp files →
  returns { transcript, segments, language, ... }
```

**Request flow — document Q&A:**
```
Browser → POST /document/ask (FormData: file + question) →
  pypdf extracts text from each page →
  first 12,000 chars sent to Ollama →
  Ollama generates answer →
  returns { filename, question, answer }
```

## Data Flow

```
User uploads file in browser
    ↓
File object lives in browser memory (never written to disk)
    ↓
Browser sends file via FormData to FastAPI
    ↓
FastAPI writes to a temp file (Python's tempfile module)
    ↓
AI model reads the temp file
    ↓
FastAPI deletes the temp file (finally block)
    ↓
Result text returned as JSON
    ↓
Browser stores the text result in localStorage
    ↓
File itself is NOT stored — only the AI response text
```

## Conversation Persistence

```
Conversation created → stored in localStorage["pba_conversations"]
Message sent → appended to conversation.messages → re-serialised
Page refreshed → useConversations reads localStorage on mount
Active conv ID → localStorage["pba_active_conv"]
Theme → localStorage["pba_theme"]
```

## CORS

The FastAPI backend allows requests only from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

This prevents other websites from calling the local AI API.

## Security notes

- Files are validated for MIME type, extension, and size before processing.
- Temp files are deleted in `finally` blocks regardless of errors.
- AI model output is rendered as markdown (not raw HTML) — no XSS risk.
- No authentication is implemented — this is a local-only tool.
- Do not expose port 8000 or 11434 to the internet without adding authentication.
