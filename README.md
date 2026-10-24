# Pixel Beta AI

**PIXEL OS — Local-First Multimodal AI Workspace**

Pixel Beta AI is a local-first multimodal AI workspace designed to understand images, audio, documents, and text while providing conversational AI, persistent memory, and voice interaction. It combines a React-based interface, a FastAPI backend, locally hosted AI models, and SQLite-backed memory.

The long-term goal is to evolve PIXEL into a personal AI operating system with modular capabilities, natural voice interaction, persistent context, and intelligent assistance—all while keeping control of data and execution on the user's machine.

## Features

| Feature | Description |
|---|---|
| Conversational AI | Chat with PIXEL using a locally hosted Ollama language model. |
| Context-aware conversations | Supply recent conversation history and saved memories to PIXEL when generating responses. |
| Persistent memory | Store user-approved facts and preferences in a local SQLite database. |
| Memory management | View, search, filter, add, and delete saved memories from the interface. |
| Memory suggestions | Detect supported explicit statements, suggest a memory, and request user approval before saving. |
| Image captioning | Attach JPG, PNG, or WebP images to generate descriptions. |
| Visual question answering | Ask questions about an attached image. |
| Text understanding | Process English, Hindi, Hinglish, idioms, and informal language using the local language model. |
| Audio transcription | Transcribe supported audio formats using faster-whisper. |
| Audio understanding | Interpret transcribed audio content using the local language model. |
| PDF summarization | Extract and summarize text from PDF documents. |
| PDF question answering | Ask questions about the text extracted from an attached PDF. |
| Voice wake word | Activate PIXEL through a configured local wake-word listener. |
| Voice interaction | Use microphone input and spoken responses where supported by the browser and configured voice components. |
| Conversation persistence | Keep the frontend conversation list and messages in browser localStorage. |
| Theme and interface | Use a React-based chat workspace with conversation navigation and theme support. |

### Memory and conversation storage

PIXEL uses two storage mechanisms:

- **Browser localStorage:** Stores frontend conversations, message history, and related interface state.
- **SQLite:** Stores server-side conversation messages and saved memory facts.

These are separate storage systems. Browser conversation history and SQLite conversation history are not automatically the same database.

Memory suggestions are based on supported text patterns. A suggestion is saved only after the user approves it. More advanced automatic fact extraction, memory deduplication, and reliable conflict resolution are planned improvements.

## Technology stack

| Component | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Backend | Python 3.11, FastAPI |
| API server | Uvicorn |
| Local language model runtime | Ollama |
| Language model | `qwen2.5:1.5b` |
| Image captioning | BLIP — `Salesforce/blip-image-captioning-base` |
| Visual question answering | SmolVLM — `HuggingFaceTB/SmolVLM-256M-Instruct` |
| Audio transcription | faster-whisper (`small`, CPU, INT8) |
| Audio preprocessing | FFmpeg |
| PDF extraction | pypdf |
| Memory database | SQLite |
| Frontend conversation storage | Browser localStorage |
| Voice wake-word detection | OpenWakeWord with a custom `hey_pixel.onnx` model |
| API communication | HTTP requests to the local FastAPI backend |

## Project prerequisites

| Requirement | Version / Details |
|---|---|
| Operating system | Windows with PowerShell |
| Python | 3.11.9 recommended for the existing virtual environment |
| Node.js | 18 or later; use a version compatible with the installed Vite dependencies |
| npm | Installed with Node.js |
| Ollama | Installed with the required model pulled locally |
| FFmpeg | Installed and available in `PATH` |
| RAM and storage | Sufficient for the selected models and their cached weights |
| Microphone | Required for voice input and wake-word interaction |

macOS and Linux may work with adjustments to commands, paths, and audio configuration.

## Installation and setup

### 1. Clone or open the project

Open PowerShell and navigate to the project root:

```powershell
cd C:\multimodal-ai
```

If you are using a fresh checkout, clone your repository first and enter the resulting project directory.

### 2. Install Ollama and download the language model

Download Ollama from [ollama.com](https://ollama.com).

Pull the configured model:

```powershell
ollama pull qwen2.5:1.5b
```

Check that the model is available:

```powershell
ollama list
```

Ollama must be running before PIXEL can use its language-model endpoints. If Ollama is not already running as a background service, start it with:

```powershell
ollama serve
```

### 3. Install FFmpeg

Download FFmpeg from [ffmpeg.org/download.html](https://ffmpeg.org/download.html).

Add the FFmpeg executable directory to your system `PATH`.

Verify the installation:

```powershell
ffmpeg -version
```

FFmpeg is used for audio preprocessing and format conversion.

### 4. Set up the Python backend

Navigate to the backend directory:

```powershell
cd C:\multimodal-ai\image-ai
```

The project uses an existing `.venv`. To recreate it if necessary:

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install fastapi "uvicorn[standard]" httpx pillow transformers torch torchvision faster-whisper pypdf python-multipart
```

If the project has a maintained `requirements.txt`, use that file instead so that dependency versions remain consistent:

```powershell
python -m pip install -r requirements.txt
```

**Important:** Confirm that the requirements file includes every dependency used by the current backend, including any dependencies required by the memory and voice modules.

The first model initialization may download model weights from Hugging Face. These downloads require internet access and can consume several gigabytes of storage. Subsequent runs can use cached weights.

### 5. Install frontend dependencies

Open another PowerShell terminal:

```powershell
cd C:\multimodal-ai\frontend
npm install
```

For a clean, reproducible installation when `package-lock.json` is available, use:

```powershell
npm ci
```

Use `npm ci` when the lockfile matches `package.json`.

## Running PIXEL

Start the services in separate terminals.

### Terminal 1 — Ollama

If Ollama is not already running:

```powershell
ollama serve
```

Default endpoint:

`http://127.0.0.1:11434`

### Terminal 2 — FastAPI backend

```powershell
cd C:\multimodal-ai\image-ai
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
```

The backend is available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

The backend initializes the memory database during startup. Initial model loading can take several minutes, depending on the machine and whether the models are already cached.

### Terminal 3 — React frontend

```powershell
cd C:\multimodal-ai\frontend
npm run dev
```

Open the application:

[http://localhost:5173](http://localhost:5173)

Keep the required services running while using PIXEL.

### Optional — Start the voice wake-word listener

The wake-word listener is a separate Python process.

Open another PowerShell terminal:

```powershell
cd C:\multimodal-ai\image-ai
.\.venv\Scripts\python.exe -m pixel_voice.listener
```

The listener requires the configured wake-word model and microphone settings to be available. The current configuration uses the `hey_pixel.onnx` model, 16 kHz mono audio, and a configured microphone input.

If the listener fails to start, check microphone permissions, the configured device index, and the existence of the wake-word model.

## Local API endpoints

The following endpoints are implemented or used by the current application.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/chat` | Generate a conversational response using recent history and saved memories. |
| `POST` | `/understand-text` | Process text using the text-understanding pipeline. |
| `POST` | `/understand-audio` | Interpret audio-related text or a transcript. |
| `POST` | `/memory/conversations` | Save a conversation message to SQLite. |
| `GET` | `/memory/conversations/{conversation_id}` | Retrieve stored messages for a conversation. |
| `POST` | `/memory/facts` | Save a memory fact. |
| `GET` | `/memory/facts` | List saved memory facts, optionally filtered by category. |
| `DELETE` | `/memory/facts/{memory_id}` | Delete a saved memory by its database ID. |
| `GET` | `/voice/status` | Check voice listener status. |
| `GET` | `/voice/events?after_id={id}` | Retrieve voice events after a specified event ID. |
| `POST` | `/voice/wake` | Handle the configured voice wake action. |

The image, audio, and document endpoints are also part of the backend. For their exact request fields and response schemas, use the interactive API documentation at `/docs` and the maintained API reference.

### Example: save a memory

Request:

```http
POST /memory/facts
Content-Type: application/json
```

Body:

```json
{
  "content": "Favorite programming language: JavaScript",
  "category": "preferences"
}
```

### Example: chat with PIXEL

Request:

```http
POST /chat
Content-Type: application/json
```

Body:

```json
{
  "conversation_id": "example_conversation",
  "message": "What is my favorite programming language?"
}
```

The chat endpoint uses the supplied message, recent server-side conversation history, and saved memories as context for the local language model. The response includes the generated answer and model/source information.

These examples demonstrate the request format; actual answers depend on the saved data and model output.

## Database and local data

The SQLite memory database is stored at:

```text
image-ai/data/pixel_memory.db
```

The memory module is located in:

```text
image-ai/pixel_memory/
├── database.py
└── service.py
```

The database stores conversation messages and saved memory facts. The backend initializes the database when the application starts.

### Browser storage

The frontend stores conversation and interface state in browser localStorage. Existing storage keys include:

- `pba_conversations`
- `pba_active_conv`
- `pba_theme`

Browser storage survives page refreshes and browser restarts unless the relevant site data is cleared.

Deleting a browser conversation does not necessarily delete the corresponding SQLite records, and deleting a SQLite memory does not automatically erase text that may still exist in a browser conversation.

## Configuration and ports

The current local setup uses these default endpoints:

| Service | Address |
|---|---|
| Frontend | `http://localhost:5173` |
| FastAPI | `http://127.0.0.1:8000` |
| Ollama | `http://127.0.0.1:11434` |

No external AI API key is required for the configured local language model and inference workflow.

The current application uses local endpoint defaults. If you change ports or host addresses, update the relevant frontend and backend configuration consistently.

## Build and test commands

### Frontend production build

```powershell
cd C:\multimodal-ai\frontend
npm run build
```

The production build is written to:

```text
frontend/dist/
```

### Frontend TypeScript check

```powershell
cd C:\multimodal-ai\frontend
npx tsc --noEmit
```

### Backend API tests

Start the backend first if the test suite requires a running API server. Then run:

```powershell
cd C:\multimodal-ai\image-ai
.\.venv\Scripts\python.exe test_api.py
```

## Troubleshooting

### Ollama is unavailable

Confirm that Ollama is running:

```powershell
ollama list
```

If needed, start the server:

```powershell
ollama serve
```

Check that the required `qwen2.5:1.5b` model is installed.

### The backend cannot connect to Ollama

Check that the backend is configured to use:

`http://127.0.0.1:11434`

Verify that the Ollama server is running and that the model can be loaded.

### Image models are not loaded

Wait for model initialization to finish. Check the backend terminal for download errors, missing packages, or insufficient memory.

### Frontend API or CORS errors

Confirm that the frontend is running at the configured origin and that FastAPI is listening on port `8000`.

Check the backend's CORS configuration if you use a different frontend port or hostname.

### Python package errors

Confirm that the virtual environment is activated and that the correct Python executable is being used:

```powershell
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip list
```

### Voice wake-word detection is not working

Check that the microphone is accessible, the correct device index is configured, and the `hey_pixel.onnx` file exists. Also confirm that the voice listener is running and that browser microphone permissions are granted for browser-based speech recognition.

### Memory is not available in a new conversation

Check `/memory/facts` to verify that the fact was saved. Then verify that `/chat` is loading memories and that the frontend sends the expected conversation ID and message.

If conflicting facts exist, PIXEL may generate an inconsistent answer until memory deduplication and conflict-resolution logic are implemented.

For more details, see `docs/TROUBLESHOOTING.md`.

## Project structure

```text
multimodal-ai/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BEGINNER_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── AI_MODELS.md
│   ├── DATA_AND_PRIVACY.md
│   ├── TROUBLESHOOTING.md
│   └── ROADMAP.md
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── MemoryView.css
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── AnimatedAICore.tsx
│   │   │   ├── AttachmentPreview.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── MemoryView.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageComposer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ThemeSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useConversations.ts
│   │   │   └── useTheme.ts
│   │   └── lib/
│   │       ├── api.ts
│   │       └── storage.ts
│   ├── index.html
│   └── package.json
│
├── image-ai/
│   ├── main.py
│   ├── test_api.py
│   ├── pixel_memory/
│   │   ├── database.py
│   │   └── service.py
│   ├── pixel_voice/
│   │   └── listener.py
│   ├── data/
│   │   └── pixel_memory.db
│   └── .venv/
│
└── state/
    └── (reserved for future storage)
```

This is a logical overview of the main components, not an exhaustive inventory of every file in the repository. The actual project may include additional modules, model files, configuration files, and generated assets.

## Privacy and data handling

PIXEL is designed for local-first use and does not require an external AI API key for its configured local inference pipeline.

- Text chat inference uses the locally hosted Ollama model.
- Image, audio, and document processing uses locally configured models and libraries.
- Server-side conversation messages and memory facts are stored in the local SQLite database.
- Frontend conversations and interface state are stored in browser localStorage.
- Model downloads require internet access during initial setup or when updating uncached models.
- Browser-based speech recognition may use browser- or operating-system-provided services; its processing location depends on the implementation and browser. Do not assume that every voice input is processed exclusively offline without verifying the chosen speech-recognition path.
- No cloud AI service is required by the configured local model workflow, but network access and data handling should be reviewed before adding external integrations.

**Security note:** Local storage does not automatically encrypt data. Anyone with access to the Windows account, browser profile, or database files may be able to inspect stored information. Avoid saving passwords, authentication tokens, or other highly sensitive secrets as memories.

## Current limitations

- **Model accuracy:** BLIP and SmolVLM are relatively small models and may struggle with complex images, fine details, or ambiguous scenes.
- **CPU performance:** Inference can take several seconds or longer depending on hardware and input size.
- **Audio quality:** Noisy recordings and difficult accents may reduce transcription accuracy.
- **Audio file size:** Large files may be rejected by the current backend limits.
- **Scanned PDFs:** Image-based PDFs require OCR, which is not yet included in the described workflow.
- **Memory extraction:** Automatic suggestions currently use supported text patterns rather than a general-purpose fact-extraction model.
- **Memory conflicts:** Deduplication and reliable updates to existing memories are still improvements to implement.
- **Storage synchronization:** Browser localStorage and SQLite are separate and do not automatically synchronize all deletion and retention operations.
- **Voice support:** Microphone selection, wake-word sensitivity, and browser speech-recognition behavior depend on the local environment.
- **Production deployment:** The project is primarily configured for local development. Production deployment requires additional security, configuration, and operational work.

## Roadmap

Potential next improvements for PIXEL include:

- Reliable memory deduplication and updates to existing facts.
- Conflict resolution that prioritizes the latest user-approved memory.
- Better fact extraction with explicit user approval before saving.
- Improved conversation-history retrieval and context management.
- More robust voice interaction and offline speech recognition.
- Expanded local tools and modular AI capabilities.
- Better automated testing, error handling, and production readiness.

## Contributing

PIXEL is being developed incrementally. Changes should preserve existing multimodal functionality, local-first inference, and user control over persistent memory.

When adding a feature, update the relevant documentation, validate the frontend build and backend behavior, and document any new dependencies or configuration requirements.

---

**Pixel Beta AI — Building toward PIXEL OS, one capability at a time.**