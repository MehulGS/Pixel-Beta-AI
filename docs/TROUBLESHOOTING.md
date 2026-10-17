# Troubleshooting — Pixel Beta AI

## The browser shows a blank white page

**Cause:** JavaScript error during startup.  
**Fix:** Open browser DevTools (F12 → Console) and check for red errors.  
Most common cause: the frontend can't connect to the backend, but this usually shows a user-visible error rather than a blank page.

---

## "Pixel Beta AI is thinking…" never ends / spinner doesn't stop

**Cause:** The backend is not reachable.  
**Steps:**
1. Confirm FastAPI is running: open http://127.0.0.1:8000/health in your browser.
2. If it shows an error or doesn't load, restart Terminal 2 (`uvicorn`).
3. Check Terminal 2 for Python exceptions.

---

## "Ollama is unavailable" error

**Cause:** Ollama is not running.  
**Fix:** Open a terminal and run:
```powershell
ollama serve
```
Keep it running while using the app.

If Ollama is running but still errors:
```powershell
ollama list
```
Make sure `qwen2.5:1.5b` appears. If not:
```powershell
ollama pull qwen2.5:1.5b
```

---

## FastAPI won't start: "ModuleNotFoundError"

**Cause:** Missing Python package or wrong virtual environment.  
**Fix:**
```powershell
cd image-ai
.venv\Scripts\python -c "import fastapi; print('ok')"
```
If this fails, reinstall:
```powershell
.venv\Scripts\pip install fastapi "uvicorn[standard]" httpx pillow transformers torch torchvision faster-whisper pypdf python-multipart
```

---

## "Port 8000 already in use"

**Cause:** Another process (or a previous uvicorn) is using port 8000.  
**Fix:**
```powershell
# Find what is using port 8000
netstat -ano | findstr :8000
# Kill it (replace 1234 with the PID from above)
taskkill /PID 1234 /F
```

---

## Image models not loading (long startup / crash)

**Cause:** First run downloads BLIP and SmolVLM from HuggingFace (~1 GB).  
This requires internet. Watch Terminal 2 — you will see download progress.

If the download fails:
- Check your internet connection.
- Try again — HuggingFace downloads are resumable.
- Make sure you have 4+ GB free disk space.

---

## Audio transcription fails

**"FFmpeg is not installed"** — Install FFmpeg and add it to PATH.
```powershell
ffmpeg -version   # should print version info
```

**"Whisper model loading"** — The first audio request downloads the Whisper `small` model (~250 MB). Wait for it.

**"No speech detected"** — The audio may be silent, too short, or too noisy. Try a different file.

**"Unsupported MIME type"** — The file extension must be .mp3, .wav, .m4a, .ogg, .webm, or .flac.

---

## PDF shows "No readable text found"

**Cause:** The PDF is scanned (images of text, not actual text).  
Scanned PDFs require OCR, which is not yet implemented.

**Workaround:** Use a PDF that was created digitally (exported from Word, Google Docs, etc.).

---

## CORS error in browser console

Error message: `Access to fetch at 'http://127.0.0.1:8000' has been blocked by CORS policy`

**Cause:** The frontend is running on a different port than expected.  
**Fix:** The backend allows only `http://localhost:5173` and `http://127.0.0.1:5173`.  
Make sure you start the frontend with `npm run dev` and access it at exactly `http://localhost:5173`.

---

## Conversation history disappeared

**Cause:** Browser data was cleared, or you are using a different browser/profile.  
**Note:** History is stored in `localStorage` — it is browser-specific. Incognito mode does not persist it.

---

## npm install fails

```powershell
cd frontend
npm cache clean --force
npm install
```

If Node.js is outdated, download Node.js 18+ from https://nodejs.org.

---

## TypeScript errors after editing

```powershell
cd frontend
npx tsc --noEmit
```

This shows all type errors without building. Fix errors before running `npm run build`.

---

## The animated AI core is not visible

**Cause:** `prefers-reduced-motion` is enabled in your OS accessibility settings.  
The core shows in a static (non-animated) form in that case — this is intentional.

To re-enable animations, turn off "Reduce motion" in your OS settings.
