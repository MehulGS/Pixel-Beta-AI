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

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPixelGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  return "Good evening!";
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

  const [voiceCommandRequest, setVoiceCommandRequest] = useState(0);
  const [wakeStatus, setWakeStatus] = useState("Waiting for Hey Pixel...");
  const lastWakeEventIdRef = useRef(0);
  const hasGreetedRef = useRef(false);
  const wakeSessionActiveRef = useRef(false);

  // Voice replies are enabled by default. The user can pause/resume them using
  // the speaker control rendered below the chat.
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stickyConvIdRef = useRef<string | null>(null);

  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevActiveIdRef.current !== activeId) {
      const prevId = prevActiveIdRef.current;
      prevActiveIdRef.current = activeId;

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

  // Stop speech when leaving this chat view or unmounting.
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakResponse = useCallback((responseText: string) => {
    if (!voiceRepliesEnabled || !("speechSynthesis" in window)) return;

    const plainText = stripMarkdownForSpeech(responseText);
    if (!plainText) return;

    // Cancel any previous utterance to prevent overlapping replies.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      speechUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      speechUtteranceRef.current = null;
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceRepliesEnabled]);

  const handleVoiceCommandFinished = useCallback(() => {
    wakeSessionActiveRef.current = false;
  }, []);

  const speakGreeting = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        `${getPixelGreeting()} Pixel is listening. How can I help you?`
      );

      utterance.lang = "en-IN";
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechUtteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;

    const pollWakeEvents = async () => {
      try {
        // On first connection, skip events created before this page opened.
        if (lastWakeEventIdRef.current === 0) {
          const initialResponse = await fetch(
            "http://127.0.0.1:8000/voice/events?after_id=0"
          );

          if (!initialResponse.ok) {
            throw new Error("Could not connect to PIXEL voice API.");
          }

          const initialData = await initialResponse.json();

          if (disposed) return;

          lastWakeEventIdRef.current = initialData.latest_id ?? 0;
          setWakeStatus("Waiting for Hey Pixel...");
          return;
        }

        const response = await fetch(
          `http://127.0.0.1:8000/voice/events?after_id=${lastWakeEventIdRef.current}`
        );

        if (!response.ok) {
          throw new Error("Could not read wake events.");
        }

        const data = await response.json();

        if (disposed) return;

        for (const event of data.events ?? []) {
          lastWakeEventIdRef.current = Math.max(
            lastWakeEventIdRef.current,
            event.id
          );

          if (event.type === "wake" && !wakeSessionActiveRef.current) {
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
            speechUtteranceRef.current = null;
            setIsSpeaking(false);
            wakeSessionActiveRef.current = true;

            const shouldGreet = !hasGreetedRef.current;

            if (shouldGreet) {
              hasGreetedRef.current = true;
              setWakeStatus("PIXEL is starting. Speaking greeting...");

              void speakGreeting().then(() => {
                setWakeStatus("PIXEL is listening. Speak your command.");
                setVoiceCommandRequest((value) => value + 1);
              });
            } else {
              setWakeStatus("Hey Pixel detected. Listening for your command...");
              setVoiceCommandRequest((value) => value + 1);
            }
          }
        }

        lastWakeEventIdRef.current = Math.max(
          lastWakeEventIdRef.current,
          data.latest_id ?? 0
        );
      } catch {
        if (!disposed) {
          setWakeStatus("Voice API disconnected. Check the backend.");
        }
      }
    };

    void pollWakeEvents();

    timer = window.setInterval(() => {
      void pollWakeEvents();
    }, 1000);

    return () => {
      disposed = true;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [speakGreeting]);

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
            responseText = "No speech detected. The file may be silent, too noisy, or in an unsupported format.";
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
              responseText += "Audio understanding unavailable — Ollama may not be running.";
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

        // Speak the completed answer after it has been saved to chat history.
        speakResponse(responseText);
      } catch (err) {
        const errorText = `Something went wrong. ${err instanceof Error ? err.message : "Please try again."
          }`;

        onPatchMessage(convId, aiMsgId, {
          role: "error",
          content: `⚠️ ${errorText}`,
          isLoading: false,
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      activeId,
      stickyAttachment,
      onAppendMessage,
      onPatchMessage,
      onNeedNewConversation,
      speakResponse,
    ]
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
        <div className="chat-voice-controls">
          <button
            type="button"
            className="chat-voice-toggle"
            onClick={() => {
              setVoiceRepliesEnabled((enabled) => {
                const nextEnabled = !enabled;
                if (!nextEnabled) stopSpeaking();
                return nextEnabled;
              });
            }}
            aria-pressed={voiceRepliesEnabled}
            title={voiceRepliesEnabled ? "Turn off spoken replies" : "Turn on spoken replies"}
          >
            {voiceRepliesEnabled ? "🔊 Voice replies on" : "🔇 Voice replies off"}
          </button>

          {isSpeaking && (
            <button
              type="button"
              className="chat-voice-toggle"
              onClick={stopSpeaking}
              title="Stop the current spoken reply"
            >
              Stop speaking
            </button>
          )}
        </div>

        <MessageComposer
          onSend={handleSend}
          isLoading={isLoading}
          voiceCommandRequest={voiceCommandRequest}
          onVoiceCommandFinished={handleVoiceCommandFinished}
          initialText={suggestionText}
          onInitialTextConsumed={onSuggestionConsumed}
          stickyAttachment={stickyAttachment}
          onClearStickyAttachment={clearStickyAttachment}
        />

        <p className="chat-footer-note">
          {wakeStatus}
          Pixel Beta AI · All inference runs locally · Responses may be inaccurate
        </p>
      </div>
    </div>
  );
}
