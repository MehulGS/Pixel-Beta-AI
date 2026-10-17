import {
  useEffect, useRef, useState,
  type KeyboardEvent, type DragEvent,
} from "react";
import { Plus, Send, Mic, FileAudio, FileText, ImageIcon, X } from "lucide-react";
import type { AttachmentState } from "../types";
import { AttachmentPreview } from "./AttachmentPreview";
import { detectModality, validateFile, formatFileSize } from "../lib/api";

interface Props {
  onSend: (text: string, attachment: AttachmentState | null) => void;
  isLoading: boolean;
  disabled?: boolean;
  initialText?: string | null;
  onInitialTextConsumed?: () => void;
  stickyAttachment?: AttachmentState | null;
  onClearStickyAttachment?: () => void;
}

function StickyIcon({ modality }: { modality: string }) {
  if (modality === "image") return <ImageIcon size={13} />;
  if (modality === "audio") return <FileAudio size={13} />;
  return <FileText size={13} />;
}

export function MessageComposer({
  onSend,
  isLoading,
  disabled,
  initialText,
  onInitialTextConsumed,
  stickyAttachment,
  onClearStickyAttachment,
}: Props) {
  const [text, setText] = useState("");
  const [newAttachment, setNewAttachment] = useState<AttachmentState | null>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastInitialTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialText && initialText !== lastInitialTextRef.current) {
      lastInitialTextRef.current = initialText;
      setText(initialText);
      onInitialTextConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialText, onInitialTextConsumed]);

  const effectiveAttachment = newAttachment ?? stickyAttachment ?? null;
  const canSend =
    !isLoading && !disabled &&
    (text.trim().length > 0 || effectiveAttachment !== null);

  function acceptFile(file: File) {
    setFileError("");
    const error = validateFile(file);
    if (error) { setFileError(error); return; }

    const modality = detectModality(file);
    if (!modality) { setFileError("Unsupported file type."); return; }

    if (newAttachment?.previewUrl) URL.revokeObjectURL(newAttachment.previewUrl);
    const previewUrl = modality === "image" ? URL.createObjectURL(file) : undefined;
    setNewAttachment({ file, modality, previewUrl });
  }

  function removeNewAttachment() {
    if (newAttachment?.previewUrl) URL.revokeObjectURL(newAttachment.previewUrl);
    setNewAttachment(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSend() {
    if (!canSend) return;
    onSend(text.trim(), newAttachment);
    setText("");
    if (newAttachment?.previewUrl) URL.revokeObjectURL(newAttachment.previewUrl);
    setNewAttachment(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setIsDragging(true); }

  function handleDragLeave(e: DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  return (
    <div
      className={`composer ${isDragging ? "composer--dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="composer-drag-overlay" aria-hidden="true">Drop your file here</div>
      )}

      {stickyAttachment && !newAttachment && (
        <div className="composer-sticky-context">
          <span className="sticky-icon">
            <StickyIcon modality={stickyAttachment.modality} />
          </span>
          <span className="sticky-label">
            Asking about:&nbsp;
            <strong>{stickyAttachment.file.name}</strong>
            <span className="sticky-meta">
              &nbsp;· {stickyAttachment.modality.toUpperCase()} · {formatFileSize(stickyAttachment.file.size)}
            </span>
          </span>
          <button
            className="sticky-clear"
            onClick={onClearStickyAttachment}
            aria-label="Clear file context"
            title="Stop using this file"
            type="button"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {newAttachment && (
        <AttachmentPreview attachment={newAttachment} onRemove={removeNewAttachment} />
      )}

      {fileError && <p className="composer-error" role="alert">{fileError}</p>}

      <div className="composer-row">
        <button
          type="button"
          className="composer-plus"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled}
          aria-label="Attach a file"
          title="Attach image, audio, or PDF"
        >
          <Plus size={19} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.mp3,.wav,.m4a,.ogg,.webm,.flac,application/pdf,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        <textarea
          ref={textareaRef}
          className="composer-input"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? "Pixel Beta AI is thinking…"
              : stickyAttachment && !newAttachment
              ? `Ask another question about ${stickyAttachment.file.name}…`
              : "Ask anything, or attach a file…"
          }
          disabled={isLoading || disabled}
          rows={1}
          maxLength={5000}
          aria-label="Message input"
        />

        <button
          type="button"
          className="composer-mic"
          disabled={isLoading || disabled}
          aria-label="Voice input (coming soon)"
          title="Voice input — coming soon"
        >
          <Mic size={17} />
        </button>

        <button
          type="button"
          className={`composer-send ${canSend ? "composer-send--active" : ""}`}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="composer-loading-dot" aria-hidden="true" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      <p className="composer-hint">
        Enter to send · Shift+Enter for new line · Drag &amp; drop files
      </p>
    </div>
  );
}
