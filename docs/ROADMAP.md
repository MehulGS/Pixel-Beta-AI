# Roadmap — Pixel Beta AI

Status key: ✅ Complete · 🔄 In Progress · ⏳ Planned · 💡 Idea

---

## Completed (v2.0)

- ✅ Rename product from InsightAI to Pixel Beta AI
- ✅ Cyberpunk dark theme with CSS variable design system
- ✅ Light and System themes
- ✅ Persistent sidebar with conversation history
- ✅ New Chat creates a new conversation
- ✅ Conversation rename
- ✅ Conversation delete
- ✅ Conversation pin
- ✅ Conversation grouping (Today / Yesterday / Last 7 Days / Older)
- ✅ Conversation search
- ✅ localStorage persistence (survives refresh and restart)
- ✅ Auto-generated conversation titles
- ✅ Unified message composer (text + file attachment)
- ✅ Plus button file picker
- ✅ Drag-and-drop file upload
- ✅ File type validation (MIME + extension)
- ✅ Attachment preview (thumbnail/icon + filename + size)
- ✅ Automatic modality detection (image / audio / PDF / text)
- ✅ Image captioning (BLIP)
- ✅ Visual Q&A (SmolVLM)
- ✅ Audio transcription (faster-whisper)
- ✅ Audio understanding (Ollama)
- ✅ Text understanding (Ollama)
- ✅ PDF summarization (pypdf + Ollama)
- ✅ PDF Q&A (pypdf + Ollama)
- ✅ Animated AI core (empty state, CSS/SVG)
- ✅ Typing indicator while AI is processing
- ✅ Markdown rendering for AI responses
- ✅ Error messages in conversation
- ✅ Reduced-motion support
- ✅ Mobile responsive layout with drawer sidebar
- ✅ Accessible keyboard navigation and focus indicators
- ✅ Component-based architecture (split from single App.tsx)
- ✅ README with verified setup instructions
- ✅ Documentation suite (ARCHITECTURE, TROUBLESHOOTING, ROADMAP, etc.)
- ✅ Backend renamed to Pixel Beta AI
- ✅ Browser title updated

---

## Planned (v2.1)

- ⏳ Conversation export to plain text or Markdown
- ⏳ Copy message button on AI responses
- ⏳ Regenerate (retry) last AI response
- ⏳ Keyboard shortcut for New Chat (Ctrl+N)
- ⏳ Auto-scroll toggle (pin to bottom vs. free scroll)
- ⏳ Message search within a conversation
- ⏳ Conversation title editing inline in the header

---

## Planned (v2.2)

- ⏳ Scanned PDF support via OCR (Tesseract or similar)
- ⏳ Longer document handling with text chunking + retrieval
- ⏳ Page-aware PDF answers with citation (page number references)
- ⏳ Audio language override in the UI (currently auto-detects)
- ⏳ Copy transcript button
- ⏳ Multiple attachment support (requires backend changes)

---

## Future ideas

- 💡 SQLite backend for conversation storage (beyond browser localStorage limits)
- 💡 Conversation import/export as JSON
- 💡 Larger Ollama model selection in UI settings
- 💡 Image generation via a local diffusion model
- 💡 Speech synthesis for AI responses
- 💡 Optional cloud deployment mode (with authentication)
- 💡 Plugin/extension architecture for additional modalities
