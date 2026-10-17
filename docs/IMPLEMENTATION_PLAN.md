# Pixel Beta AI — Implementation Plan

## Audit Summary (October 2026)

### Verified Working
- All 9 backend endpoints (GET /, GET /health, POST /analyze, POST /ask, POST /understand-text, POST /transcribe-audio, POST /understand-audio, POST /document/extract, POST /document/summarize, POST /document/ask)
- Frontend TypeScript compilation (0 errors)
- Frontend production build (clean)
- Image captioning, visual Q&A, audio transcription, audio understanding, text understanding, PDF extraction, PDF summarization, PDF Q&A
- CORS configured for localhost:5173

### Missing / Not Implemented
- Persistent conversation history (no database, no localStorage, no IndexedDB)
- Sidebar with conversation list
- New Chat functionality
- Conversation rename/delete
- Unified message composer
- Attachment menu with drag-and-drop
- Modality auto-detection
- Dark/Light/System theme selector
- Pixel Beta AI branding (still says InsightAI everywhere)
- Cyberpunk design system
- Animated AI core (empty state)
- Component structure (everything is one giant App.tsx + App.css)
- Mobile responsive layout
- Reduced-motion support
- Markdown rendering for AI responses
- Complete documentation set

### Known Bugs
- `index.css` defines a `#root` with fixed 1126px max-width which conflicts with App.tsx's own layout
- Browser title is "frontend" (not meaningful)
- "InsightAI" brand name appears in UI, footer, API responses, and docs

### Existing Constraints Preserved
- Backend stays Python/FastAPI at port 8000
- Frontend stays React/Vite/TypeScript at port 5173
- All AI runs locally via Ollama + HuggingFace models
- No cloud APIs, no authentication required

---

## Milestone Plan

### Milestone 1 — Planning & Docs scaffold ✅
- Create docs/ directory
- Write IMPLEMENTATION_PLAN.md, ARCHITECTURE.md, ROADMAP.md, DECISIONS.md

### Milestone 2 — Design system & brand
- CSS custom properties (tokens) for cyberpunk theme
- Dark / Light / System theme support
- index.html title update
- Font imports
- Color palette defined

### Milestone 3 — Component structure
- Split App.tsx into components:
  - AppLayout, Sidebar, ChatView, MessageList, MessageBubble
  - MessageComposer, AttachmentPreview, AnimatedAICore, EmptyState
  - ThemeSelector, ConversationList
- Create src/types.ts for shared TypeScript types
- Create src/lib/api.ts for all API calls
- Create src/lib/storage.ts for persistence
- Create src/hooks/ for custom hooks

### Milestone 4 — Conversation persistence
- localStorage-based conversation store (lightweight, local-first, no server DB needed)
- Conversation CRUD: create, read, update (rename), delete
- Message storage with stable IDs and timestamps
- Auto-generated titles from first message
- Selected conversation survives refresh

### Milestone 5 — Unified composer & attachments
- Text input with Send button
- Plus (+) button for file picker
- Drag-and-drop zone
- File validation (type + size)
- Attachment preview component
- Modality auto-detection

### Milestone 6 — AI integration in unified UI
- Route each modality to correct backend endpoint
- Display responses in chat bubbles
- Handle loading / error states
- Preserve all existing endpoint behavior

### Milestone 7 — Reliability & UX polish
- Loading indicators
- Error recovery
- Markdown rendering
- Responsive layout (mobile drawer)
- Reduced-motion support
- Accessible focus indicators

### Milestone 8 — Complete documentation
- README.md (root)
- All docs/ files

### Milestone 9 — Final verification
- TypeScript check
- Production build
- Smoke test checklist

---

## Persistence Architecture Decision

**Choice: localStorage with JSON serialization**

Reason: The app is local-first, single-user, runs in the browser. SQLite would require a backend API layer for CRUD operations. IndexedDB is appropriate for large binary files but is complex for structured conversation data. localStorage is:
- Already available in every browser
- Zero extra dependencies
- Survives page refresh and browser restart
- Adequate for the expected data volume (text conversations, no file contents stored)
- Easy to understand for a beginner

**Limits:** ~5–10 MB per origin. Large file attachments are NOT stored — only metadata (filename, size, type) and AI results are stored as text.

**What is stored:**
- Conversation list (id, title, createdAt, updatedAt, pinned)
- Messages per conversation (id, role, content, timestamp, modality, attachmentInfo)

**What is NOT stored:**
- Uploaded files (images, audio, PDFs) — these are browser File objects, not persisted
- Model weights — these remain in Python/.venv

**Deletion:** Clearing browser data or calling localStorage.clear() removes all history.
