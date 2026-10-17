import type { Conversation, Message, Theme } from "../types";

const KEYS = {
  CONVERSATIONS: "pba_conversations",
  ACTIVE: "pba_active_conv",
  THEME: "pba_theme",
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("[storage] Could not write to localStorage — quota exceeded?");
  }
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function generateTitle(firstMessage: string, modality?: string): string {
  const trimmed = firstMessage.trim();
  if (!trimmed) {
    const fallbacks: Record<string, string> = {
      image: "Image Analysis",
      audio: "Audio Transcription",
      document: "Document Q&A",
      text: "Text Understanding",
    };
    return fallbacks[modality ?? "text"] ?? "New Conversation";
  }
  return trimmed.length > 52 ? trimmed.slice(0, 49) + "…" : trimmed;
}

export function loadConversations(): Conversation[] {
  return readJson<Conversation[]>(KEYS.CONVERSATIONS) ?? [];
}

function saveConversations(conversations: Conversation[]): void {
  writeJson(KEYS.CONVERSATIONS, conversations);
}

export function createConversation(): Conversation {
  const now = Date.now();
  const conv: Conversation = {
    id: generateId("conv"),
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    messages: [],
  };
  saveConversations([conv, ...loadConversations()]);
  return conv;
}

export function getConversation(id: string): Conversation | null {
  return loadConversations().find((c) => c.id === id) ?? null;
}

export function addMessage(conversationId: string, message: Message): Conversation | null {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === conversationId);
  if (idx === -1) return null;

  const conv = { ...all[idx] };
  conv.messages = [...conv.messages, message];
  conv.updatedAt = Date.now();

  if (conv.title === "New Conversation" && message.role === "user" && message.content.trim()) {
    conv.title = generateTitle(message.content, message.modality);
  }

  all[idx] = conv;
  saveConversations(all);
  return conv;
}

export function updateMessage(
  conversationId: string,
  messageId: string,
  updates: Partial<Message>
): Conversation | null {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === conversationId);
  if (idx === -1) return null;

  const conv = { ...all[idx] };
  conv.messages = conv.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m));
  conv.updatedAt = Date.now();
  all[idx] = conv;
  saveConversations(all);
  return conv;
}

export function renameConversation(id: string, newTitle: string): void {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], title: newTitle.trim() || "Untitled", updatedAt: Date.now() };
  saveConversations(all);
}

export function deleteConversation(id: string): void {
  saveConversations(loadConversations().filter((c) => c.id !== id));
}

export function togglePin(id: string): void {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], pinned: !all[idx].pinned };
  saveConversations(all);
}

export function loadActiveConversationId(): string | null {
  return localStorage.getItem(KEYS.ACTIVE);
}

export function saveActiveConversationId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(KEYS.ACTIVE);
  } else {
    localStorage.setItem(KEYS.ACTIVE, id);
  }
}

export function loadTheme(): Theme {
  const stored = localStorage.getItem(KEYS.THEME);
  if (stored === "dark" || stored === "light" || stored === "system") return stored;
  return "dark";
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(KEYS.THEME, theme);
}
