// =============================================================================
// types.ts — All shared TypeScript types for Pixel Beta AI
//
// What is TypeScript? It's JavaScript with "types" — rules that say what kind
// of data a variable can hold. This prevents bugs like passing a number where
// text is expected.
//
// A "type" defines the shape of an object. For example:
//   type Dog = { name: string; age: number }
// means every Dog must have a name (text) and age (number).
// =============================================================================

// -----------------------------------------------------------------------------
// Theme
// "dark" | "light" | "system" means the value must be one of those three strings.
// -----------------------------------------------------------------------------
export type Theme = "dark" | "light" | "system";

// -----------------------------------------------------------------------------
// Modality — which kind of file/request is this message about?
// -----------------------------------------------------------------------------
export type Modality =
  | "text"        // plain text question to Ollama
  | "image"       // image captioning or visual Q&A
  | "audio"       // audio transcription + understanding
  | "document";   // PDF extraction, summary, or Q&A

// -----------------------------------------------------------------------------
// AttachmentInfo — metadata about an uploaded file (we do NOT store the file
// itself in history — only its name, size, and type so the user can see what
// was uploaded).
// -----------------------------------------------------------------------------
export interface AttachmentInfo {
  filename: string;
  filesize: number;   // bytes
  filetype: string;   // MIME type, e.g. "image/jpeg"
  modality: Modality;
}

// -----------------------------------------------------------------------------
// Message — one chat bubble in a conversation.
// role: "user" = the human, "assistant" = the AI, "system" = internal notices
// -----------------------------------------------------------------------------
export interface Message {
  id: string;           // unique ID, e.g. "msg_1698765432000_abc"
  role: "user" | "assistant" | "error";
  content: string;      // text content of the message
  timestamp: number;    // Unix ms, e.g. Date.now()
  modality?: Modality;  // which AI modality produced this message
  attachment?: AttachmentInfo; // info about the uploaded file, if any
  isLoading?: boolean;  // true while AI is still generating a response
}

// -----------------------------------------------------------------------------
// Conversation — one chat thread (like a ChatGPT conversation).
// -----------------------------------------------------------------------------
export interface Conversation {
  id: string;           // unique ID, e.g. "conv_1698765432000_xyz"
  title: string;        // user-visible name, generated from first message
  createdAt: number;    // Unix ms
  updatedAt: number;    // Unix ms — updated when a new message is added
  pinned: boolean;      // whether the user pinned this conversation
  messages: Message[];  // array of all messages in order
}

// -----------------------------------------------------------------------------
// AttachmentState — the file the user has selected in the composer,
// before they send. This is NOT stored in history (it's temporary).
// -----------------------------------------------------------------------------
export interface AttachmentState {
  file: File;                 // the actual browser File object
  modality: Modality;         // detected type
  previewUrl?: string;        // only for images — object URL for <img>
}

// -----------------------------------------------------------------------------
// API response types — match the actual FastAPI response shapes.
// These are used when we call fetch() and parse the JSON response.
// -----------------------------------------------------------------------------

export interface AnalyzeResponse {
  filename: string;
  description: string;
  model: string;
}

export interface AskResponse {
  filename: string;
  question: string;
  answer: string;
  model: string;
}

export interface UnderstandTextResponse {
  input: string;
  answer: string;
  model: string;
  source: string;
}

export interface AudioSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeResponse {
  filename: string;
  language: string;
  language_probability: number;
  transcript: string;
  segments: AudioSegment[];
  model: string;
  transcription_status: string;
}

export interface UnderstandAudioResponse {
  transcript: string;
  analysis: string;
  model: string;
  source: string;
}

export interface DocumentExtractResponse {
  filename: string;
  total_pages: number;
  extracted_pages: number;
  text: string;
  pages: Array<{ page: number; text: string }>;
}

export interface DocumentSummaryResponse {
  filename: string;
  summary: string;
}

export interface DocumentAskResponse {
  filename: string;
  question: string;
  answer: string;
}
