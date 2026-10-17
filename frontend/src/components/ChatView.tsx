import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { EmptyState } from "./EmptyState";
import { generateId } from "../lib/storage";
import {
  analyzeImage,
  askAboutImage,
  understandText,
  transcribeAudio,
  understandAudio,
  summarizeDocument,
  askDocument,
} from "../lib/api";
import type { AttachmentState, Conversation, Message, Modality } from "../types";

interface Props {
  conversation: Conversation | null;
  onAppendMessage: (convId: string, msg: Message) => void;
  onPatchMessage: (convId: string, msgId: string, updates: Partial<Message>) => void;
  onNeedNewConversation: () => string;
  activeId: string | null;
  suggestionText?: string | null;
  onSuggestionConsumed?: () => void;
}

export function ChatView({
  conversation,
  onAppendMessage,
  onPatchMessage,
  onNeedNewConversation,
  activeId,
  suggestionText,
  onSuggestionConsumed,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stickyAttachment, setStickyAttachment] = useState<AttachmentState | null>(null);

  // Track which conversation "owns" the current sticky attachment so we only
  // clear it when the user navigates to a *different* conversation, not when
  // the very first message auto-creates a new conversation for this attachment.
  const stickyConvIdRef = useRef<string | null>(null);

  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevActiveIdRef.current !== activeId) {
      const prevId = prevActiveIdRef.current;
      prevActiveIdRef.current = activeId;

      // Only clear the sticky attachment if we are switching to a conversation
      // that is NOT the one that owns the current attachment.
      // This prevents the auto-created conversation from wiping the attachment
      // that was just set in the same handleSend call.
      const switchingAway = activeId !== stickyConvIdRef.current && prevId !== null;
      if (switchingAway) {
        if (stickyAttachment?.previewUrl) URL.revokeObjectURL(stickyAttachment.previewUrl);
        setStickyAttachment(null);
        stickyConvIdRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleSend = useCallback(
    async (text: string, newAttachment: AttachmentState | null) => {
      if (isLoading) return;

      const attachment: AttachmentState | null = newAttachment ?? stickyAttachment;

      if (newAttachment) {
        if (stickyAttachment?.previewUrl && stickyAttachment.previewUrl !== newAttachment.previewUrl) {
          URL.revokeObjectURL(stickyAttachment.previewUrl);
        }
        setStickyAttachment(newAttachment);
      }

      let convId = activeId;
      if (!convId) convId = onNeedNewConversation();

      // Record that this conversation owns the sticky attachment so the
      // activeId-change effect won't clear it when the new conv ID is set.
      if (newAttachment) {
        stickyConvIdRef.current = convId;
      } else if (!stickyAttachment) {
        stickyConvIdRef.current = null;
      }

      const modality: Modality = attachment?.modality ?? "text";

      const userMsg: Message = {
        id: generateId("msg"),
        role: "user",
        content: text || `[${attachment?.file.name ?? "file"}]`,
        timestamp: Date.now(),
        modality,
        attachment: newAttachment
          ? {
              filename: newAttachment.file.name,
              filesize: newAttachment.file.size,
              filetype: newAttachment.file.type,
              modality,
            }
          : undefined,
      };
      onAppendMessage(convId, userMsg);

      const aiMsgId = generateId("msg");
      onAppendMessage(convId, {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        modality,
        isLoading: true,
      });
      setIsLoading(true);

      try {
        let responseText = "";

        if (modality === "image" && attachment) {
          if (text.trim()) {
            const res = await askAboutImage(attachment.file, text);
            responseText = res.answer;
          } else {
            const res = await analyzeImage(attachment.file);
            responseText = `**Image Analysis**\n\n${res.description}\n\n*Model: BLIP Image Captioning*`;
          }
        } else if (modality === "audio" && attachment) {
          const transcribeRes = await transcribeAudio(attachment.file);
          const langLabel = transcribeRes.language
            ? ` (${transcribeRes.language.toUpperCase()}, ${Math.round(transcribeRes.language_probability * 100)}% confidence)`
            : "";

          if (transcribeRes.transcription_status === "empty_transcript" || !transcribeRes.transcript) {
            responseText = "⚠️ No speech detected. The file may be silent, too noisy, or in an unsupported format.";
          } else {
            responseText = `**Transcript**${langLabel}\n\n${transcribeRes.transcript}\n\n---\n`;
            try {
              const understandRes = await understandAudio(
                transcribeRes.transcript,
                transcribeRes.language,
                transcribeRes.filename
              );
              responseText += `**Analysis**\n\n${understandRes.analysis}`;
            } catch {
              responseText += "*(Audio understanding unavailable — Ollama may not be running.)*";
            }
          }
        } else if (modality === "document" && attachment) {
          if (text.trim()) {
            const res = await askDocument(attachment.file, text);
            responseText = res.answer;
          } else {
            const res = await summarizeDocument(attachment.file);
            responseText = res.summary;
          }
        } else {
          if (!text.trim()) {
            responseText = "Please enter a question or attach a file.";
          } else {
            const res = await understandText(text);
            responseText = res.answer;
          }
        }

        onPatchMessage(convId, aiMsgId, {
          content: responseText,
          isLoading: false,
          timestamp: Date.now(),
        });
      } catch (err) {
        onPatchMessage(convId, aiMsgId, {
          role: "error",
          content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
          isLoading: false,
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, activeId, stickyAttachment, onAppendMessage, onPatchMessage, onNeedNewConversation]
  );

  const clearStickyAttachment = useCallback(() => {
    if (stickyAttachment?.previewUrl) URL.revokeObjectURL(stickyAttachment.previewUrl);
    setStickyAttachment(null);
    stickyConvIdRef.current = null;
  }, [stickyAttachment]);

  const messages = conversation?.messages ?? [];

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-composer-area">
        <MessageComposer
          onSend={handleSend}
          isLoading={isLoading}
          initialText={suggestionText}
          onInitialTextConsumed={onSuggestionConsumed}
          stickyAttachment={stickyAttachment}
          onClearStickyAttachment={clearStickyAttachment}
        />
        <p className="chat-footer-note">
          Pixel Beta AI · All inference runs locally · Responses may be inaccurate
        </p>
      </div>
    </div>
  );
}
