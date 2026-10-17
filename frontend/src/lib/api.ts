import type {
  AnalyzeResponse,
  AskResponse,
  UnderstandTextResponse,
  TranscribeResponse,
  UnderstandAudioResponse,
  DocumentSummaryResponse,
  DocumentAskResponse,
  Modality,
} from "../types";

export const API_URL = "http://127.0.0.1:8000";

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function analyzeImage(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function askAboutImage(file: File, question: string): Promise<AskResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("question", question);
  const res = await fetch(`${API_URL}/ask`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function understandText(text: string): Promise<UnderstandTextResponse> {
  const form = new FormData();
  form.append("text", text);
  const res = await fetch(`${API_URL}/understand-text`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function transcribeAudio(file: File, language?: string): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("file", file);
  if (language && language !== "auto") form.append("language", language);
  const res = await fetch(`${API_URL}/transcribe-audio`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function understandAudio(
  transcript: string,
  language?: string,
  filename?: string
): Promise<UnderstandAudioResponse> {
  const res = await fetch(`${API_URL}/understand-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, language, filename }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function summarizeDocument(file: File): Promise<DocumentSummaryResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/document/summarize`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function askDocument(file: File, question: string): Promise<DocumentAskResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("question", question);
  const res = await fetch(`${API_URL}/document/ask`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/webm",
  "audio/flac", "audio/x-flac", "video/webm", "video/ogg",
  "application/octet-stream",
]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac"]);
const PDF_TYPES = new Set(["application/pdf"]);
const PDF_EXTS = new Set([".pdf"]);

function getExt(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? "." + parts[parts.length - 1] : "";
}

export function detectModality(file: File): Modality | null {
  const type = file.type.toLowerCase();
  const ext = getExt(file.name);
  if (IMAGE_TYPES.has(type) || IMAGE_EXTS.has(ext)) return "image";
  if (PDF_TYPES.has(type) || PDF_EXTS.has(ext)) return "document";
  if (AUDIO_TYPES.has(type) || AUDIO_EXTS.has(ext)) {
    if (type === "application/octet-stream" && !AUDIO_EXTS.has(ext)) return null;
    return "audio";
  }
  return null;
}

export function validateFile(file: File): string | null {
  const modality = detectModality(file);
  if (modality === null) {
    return `Unsupported file type "${file.type || getExt(file.name)}". Accepted: JPG, PNG, WebP, MP3, WAV, M4A, OGG, WebM, FLAC, PDF.`;
  }
  if (modality === "image" && file.size > 8 * 1024 * 1024) return "Image must not exceed 8 MB.";
  if (modality === "audio" && file.size > 25 * 1024 * 1024) return "Audio must not exceed 25 MB.";
  if (modality === "document" && file.size > 10 * 1024 * 1024) return "PDF must not exceed 10 MB.";
  if (file.size === 0) return "The selected file is empty.";
  return null;
}
