# API Reference — Pixel Beta AI Backend

Base URL: `http://127.0.0.1:8000`

All endpoints verified against `image-ai/main.py`.

---

## GET /

**Purpose:** Check if the API is running. Returns app info.

**Response:**
```json
{
  "message": "Pixel Beta AI API is running",
  "version": "2.0.0",
  "features": ["image-captioning", "visual-question-answering", ...]
}
```

---

## GET /health

**Purpose:** Check model load status.

**Response:**
```json
{
  "api": "ok",
  "ollama_model": "qwen2.5:1.5b",
  "image_models_loaded": true,
  "whisper_loaded": false,
  "whisper_model_size": "small"
}
```

`whisper_loaded` is `false` until the first audio request is made (lazy loading).

---

## POST /analyze

**Purpose:** Generate an AI caption for an image using BLIP.

**Request:** `multipart/form-data`
- `file` (required): Image file. Accepted: JPG, PNG, WebP. Max: 8 MB.

**Response:**
```json
{
  "filename": "photo.jpg",
  "description": "a dog sitting on a grass field",
  "model": "Salesforce/blip-image-captioning-base"
}
```

**Errors:**
- `400` — wrong file type or empty file
- `413` — file exceeds 8 MB
- `500` — model inference error

**Called by:** `api.ts → analyzeImage()`

---

## POST /ask

**Purpose:** Answer a question about an image using SmolVLM.

**Request:** `multipart/form-data`
- `file` (required): Image file. Same constraints as /analyze.
- `question` (required): String. Max 1000 characters.

**Response:**
```json
{
  "filename": "photo.jpg",
  "question": "What colour is the dog?",
  "answer": "The dog is brown.",
  "model": "HuggingFaceTB/SmolVLM-256M-Instruct"
}
```

**Errors:**
- `400` — missing question, empty question, or invalid image

**Called by:** `api.ts → askAboutImage()`

---

## POST /understand-text

**Purpose:** Interpret English, Hindi, Hinglish, idioms, or slang using Ollama.

**Request:** `multipart/form-data` (form fields, no file)
- `text` (required): String. Max 5000 characters.

**Response:**
```json
{
  "input": "mera dimaag mat kha",
  "answer": "1. Literal meaning: Don't eat my brain...",
  "model": "qwen2.5:1.5b",
  "source": "ollama"
}
```

If the input matches a known Hindi phrase, `source` is `"known_phrase"` and no Ollama call is made.

**Errors:**
- `400` — empty text or text too long
- `503` — Ollama not running
- `504` — Ollama timeout

**Called by:** `api.ts → understandText()`

---

## POST /transcribe-audio

**Purpose:** Transcribe an audio file using faster-whisper.

**Request:** `multipart/form-data`
- `file` (required): Audio file. Accepted: MP3, WAV, M4A, OGG, WebM, FLAC. Max: 25 MB.
- `language` (optional): Language code (`en`, `hi`, etc.) or omit for auto-detection.

**Response:**
```json
{
  "filename": "recording.mp3",
  "language": "en",
  "language_probability": 0.987,
  "transcript": "Hello, how are you today?",
  "segments": [
    { "start": 0.0, "end": 2.5, "text": "Hello, how are you today?" }
  ],
  "model": "faster-whisper-small",
  "transcription_status": "success"
}
```

`transcription_status` is `"success"` or `"empty_transcript"`.

**Errors:**
- `400` — unsupported format, empty file, extension not allowed
- `413` — file exceeds 25 MB
- `500` — FFmpeg or Whisper error

**Called by:** `api.ts → transcribeAudio()`

---

## POST /understand-audio

**Purpose:** Analyse a transcript using Ollama. Called after /transcribe-audio.

**Request:** `application/json`
```json
{
  "transcript": "Hello, how are you?",
  "language": "en",
  "filename": "recording.mp3"
}
```

**Response:**
```json
{
  "transcript": "Hello, how are you?",
  "analysis": "1. Language: English\n2. Summary: ...",
  "model": "qwen2.5:1.5b",
  "source": "ollama"
}
```

**Errors:**
- `400` — empty transcript or transcript too long
- `503` — Ollama not running

**Called by:** `api.ts → understandAudio()`

---

## POST /document/extract

**Purpose:** Extract raw text from a PDF, page by page.

**Request:** `multipart/form-data`
- `file` (required): PDF file.

**Response:**
```json
{
  "filename": "report.pdf",
  "total_pages": 5,
  "extracted_pages": 5,
  "text": "Page 1:\n...\n\nPage 2:\n...",
  "pages": [
    { "page": 1, "text": "..." },
    { "page": 2, "text": "..." }
  ]
}
```

**Errors:**
- `400` — not a PDF, empty file
- `422` — no readable text found (scanned PDF)

**Called by:** Not directly called by the frontend in the current UI (used internally or for debugging).

---

## POST /document/summarize

**Purpose:** Summarize a PDF using Ollama.

**Request:** `multipart/form-data`
- `file` (required): PDF file. Max 10 MB.

**Response:**
```json
{
  "filename": "report.pdf",
  "summary": "## Overview\n\nThis document describes..."
}
```

**Limitation:** Only the first 12,000 characters of text are sent to Ollama.

**Errors:**
- `400` — not a PDF, unreadable PDF
- `422` — no readable text
- `503` — Ollama not running

**Called by:** `api.ts → summarizeDocument()`

---

## POST /document/ask

**Purpose:** Answer a question about a PDF using Ollama.

**Request:** `multipart/form-data`
- `file` (required): PDF file.
- `question` (required): String.

**Response:**
```json
{
  "filename": "report.pdf",
  "question": "What is the conclusion?",
  "answer": "The conclusion states that..."
}
```

**Limitation:** Only the first 12,000 characters of extracted text are sent to Ollama.

**Errors:**
- `400` — not a PDF, missing question
- `422` — no readable text
- `503` — Ollama not running

**Called by:** `api.ts → askDocument()`
