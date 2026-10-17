# Data and Privacy — Pixel Beta AI

## Where conversation data is stored

Conversation history is stored in your browser's **localStorage**.

- Key: `pba_conversations` — JSON array of all conversations and messages
- Key: `pba_active_conv` — ID of the most recently selected conversation
- Key: `pba_theme` — your selected theme ("dark", "light", or "system")

localStorage is browser-specific. If you use Chrome and then Firefox, they have separate localStorage databases. Incognito/private windows do not persist localStorage across sessions.

**What IS stored:**
- Conversation titles
- Message text (your questions and AI responses)
- Timestamps
- File metadata (filename, size, type) shown in message badges

**What is NOT stored:**
- Uploaded image, audio, or PDF files — these exist only in browser memory while the tab is open
- Model weights
- Any data from the Python backend

---

## How uploaded files are handled

1. When you select a file, the browser holds it in memory as a `File` object.
2. When you send a message, the file is transmitted via HTTP to `http://127.0.0.1:8000` (your local Python server).
3. The Python server writes the file to a **temporary file** using Python's `tempfile` module.
4. The AI model reads and processes the temp file.
5. The temp file is **deleted** immediately after processing, in a `finally` block (runs even if there is an error).
6. Only the AI result (text) is returned to the browser.
7. The browser does NOT store the file itself — only the result text is saved in localStorage.

---

## What data leaves the computer

**Nothing.** All network communication is between processes on the same computer:
- Browser → `http://127.0.0.1:8000` (local Python server)
- Python server → `http://127.0.0.1:11434` (local Ollama)

`127.0.0.1` is the loopback address — it only accepts connections from the same machine.

The only external network activity is:
- Downloading model weights (BLIP, SmolVLM, Whisper) from HuggingFace on first startup — these are AI model files, not your data
- Downloading the Ollama model with `ollama pull` — same, these are model files

After initial setup, the app works entirely offline.

---

## Temporary file cleanup

All uploaded files are written to temporary files on disk during processing. The Python backend:

1. Creates a temp file with `tempfile.mkstemp()`
2. Processes it
3. Deletes it with `os.unlink()` in a `finally` block

A `finally` block runs regardless of whether the code succeeds or fails. So even if the AI crashes mid-processing, the temp file is cleaned up.

If the Python process itself crashes (e.g., `Ctrl+C` during a request), the OS will reclaim temp files when the process exits. Python's `tempfile` module uses the OS temp directory (`%TEMP%` on Windows).

---

## Deletion behaviour

- **Delete a conversation** — the conversation object is removed from localStorage. The data cannot be recovered.
- **Clear browser data** — all `pba_*` keys in localStorage are deleted. All conversations and settings are lost.
- **Reinstall the app** — does not affect localStorage. Your conversations survive uninstalling and reinstalling the frontend code.
- **Format the computer** — all localStorage data is lost.

---

## Backup and export

There is currently no built-in export feature. You can manually back up your data:

1. Open browser DevTools (F12)
2. Go to Application → Local Storage → http://localhost:5173
3. Copy the value of `pba_conversations`
4. Save it as a `.json` file

To restore: paste it back into the `pba_conversations` key.

A proper export feature is planned for v2.1 (see ROADMAP.md).

---

## Security limitations

This application is designed for **local, single-user use only**.

- No authentication is implemented
- No rate limiting is implemented
- The FastAPI server accepts requests from localhost only (CORS configuration)
- Do NOT expose port 8000 or 11434 to the internet or a shared network without adding authentication and rate limiting

If you run this application on a shared computer, other users of that computer can access `http://127.0.0.1:8000` and potentially access the AI models. They cannot access your conversation history (which is in your browser's localStorage, not on the server).
