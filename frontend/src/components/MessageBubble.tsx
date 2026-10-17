import ReactMarkdown from "react-markdown";
import { FileAudio, FileText, ImageIcon, LoaderCircle } from "lucide-react";
import type { Message } from "../types";

interface Props {
  message: Message;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ModalityIcon({ modality }: { modality?: string }) {
  if (modality === "audio") return <FileAudio size={13} />;
  if (modality === "document") return <FileText size={13} />;
  if (modality === "image") return <ImageIcon size={13} />;
  return null;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <div className={`msg-row ${isUser ? "msg-row--user" : "msg-row--assistant"} ${isError ? "msg-row--error" : ""}`}>
      {!isUser && (
        <div className="msg-avatar" aria-hidden="true">
          {message.isLoading ? <LoaderCircle size={14} className="spin" /> : isError ? "!" : "P"}
        </div>
      )}

      <div className="msg-bubble-wrapper">
        {isUser && message.attachment && (
          <div className="msg-attachment-badge">
            <ModalityIcon modality={message.attachment.modality} />
            <span>{message.attachment.filename}</span>
            <span className="msg-attachment-size">{message.attachment.modality?.toUpperCase()}</span>
          </div>
        )}

        <div className="msg-bubble-row">
          {isUser && (
            <div className="msg-avatar msg-avatar--user" aria-hidden="true">U</div>
          )}

          <div className={`msg-bubble ${isUser ? "msg-bubble--user" : "msg-bubble--assistant"} ${isError ? "msg-bubble--error" : ""}`}>
            {message.isLoading ? (
              <span className="typing-indicator" aria-label="AI is thinking">
                <span /><span /><span />
              </span>
            ) : isUser ? (
              <p className="msg-text">{message.content}</p>
            ) : (
              <div className="msg-markdown">
                <ReactMarkdown disallowedElements={["script", "iframe", "object", "embed"]} unwrapDisallowed>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        <div className="msg-meta">
          {message.modality && !isUser && (
            <span className="msg-modality-tag">
              <ModalityIcon modality={message.modality} />
              {message.modality}
            </span>
          )}
          <span className="msg-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
