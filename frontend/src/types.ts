export type Theme = "dark" | "light" | "system";

export type Modality =
  | "text"
  | "image"
  | "audio"
  | "document";

export interface AttachmentInfo {
  filename: string;
  filesize: number;
  filetype: string;
  modality: Modality;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: number;
  modality?: Modality;
  attachment?: AttachmentInfo;
  isLoading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  messages: Message[];
}

export interface AttachmentState {
  file: File;
  modality: Modality;
  previewUrl?: string;
}

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
