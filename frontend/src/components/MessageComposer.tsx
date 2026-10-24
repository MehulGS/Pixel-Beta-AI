import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type DragEvent,
} from "react";
import {
  Plus,
  Send,
  Mic,
  FileAudio,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";
import type { AttachmentState } from "../types";
import { AttachmentPreview } from "./AttachmentPreview";
import { detectModality, validateFile, formatFileSize } from "../lib/api";

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface Props {
  onSend: (text: string, attachment: AttachmentState | null) => void;
  isLoading: boolean;
  voiceCommandRequest?: number;
  onVoiceCommandFinished?: () => void;
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
  voiceCommandRequest = 0,
  disabled,
  initialText,
  onInitialTextConsumed,
  stickyAttachment,
  onVoiceCommandFinished,
  onClearStickyAttachment,
}: Props) {
  const [text, setText] = useState("");
  const lastVoiceCommandRequestRef = useRef(0);
  const [newAttachment, setNewAttachment] = useState<AttachmentState | null>(
    null
  );
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastInitialTextRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Keep track of final results already added, so browser events cannot append
  // the same recognized phrase more than once.
  const processedFinalResultsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (initialText && initialText !== lastInitialTextRef.current) {
      lastInitialTextRef.current = initialText;
      setText(initialText);
      onInitialTextConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialText, onInitialTextConsumed]);

  // Stop microphone recognition if this component unmounts.
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        try {
          recognition.stop();
        } catch {
          // The recognition session may already have stopped.
        }
      }
    };
  }, []);


  useEffect(() => {
    if (
      voiceCommandRequest === 0 ||
      voiceCommandRequest === lastVoiceCommandRequestRef.current
    ) {
      return;
    }

    lastVoiceCommandRequestRef.current = voiceCommandRequest;

    if (isLoading || disabled) {
      setVoiceError("PIXEL is busy. Please try again when it is ready.");
      onVoiceCommandFinished?.();
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SpeechRecognitionAPI =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError("Automatic voice input requires Chrome or Edge.");
      onVoiceCommandFinished?.();
      return;
    }

    // Stop any previous automatic recognition session.
    const previousRecognition = recognitionRef.current;
    if (previousRecognition) {
      previousRecognition.onresult = null;
      previousRecognition.onerror = null;
      previousRecognition.onend = null;

      try {
        previousRecognition.stop();
      } catch {
        // The previous session may already have stopped.
      }

      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI();
    let finalTranscript = "";
    let submitted = false;
    let silenceTimer: number | undefined;
    let hasSpeech = false;

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    const finish = () => {
      if (submitted) return;
      submitted = true;

      if (silenceTimer !== undefined) {
        window.clearTimeout(silenceTimer);
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      setIsListening(false);
      onVoiceCommandFinished?.();

      const command = finalTranscript.trim();

      if (!command) {
        setVoiceError("I didn't catch that. Say Hey Pixel and try again.");
        return;
      }

      setVoiceError("");
      setText("");

      // Pass the unsent attachment along with the voice question.
      const attachmentToSend = newAttachment;

      if (attachmentToSend) {
        // Transfer ownership to ChatView. Do not revoke its preview URL here.
        setNewAttachment(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setFileError("");
      }

      onSend(command, attachmentToSend);


    };

    const resetSilenceTimer = () => {
      if (silenceTimer !== undefined) {
        window.clearTimeout(silenceTimer);
      }

      // Wait longer so a short pause doesn't submit an incomplete question.
      silenceTimer = window.setTimeout(finish, 3000);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const phrase = result[0].transcript.trim();

        if (result.isFinal && phrase) {
          finalTranscript += `${phrase} `;
          hasSpeech = true;
        } else if (phrase) {
          interimTranscript += `${phrase} `;
        }
      }

      const visibleTranscript =
        `${finalTranscript} ${interimTranscript}`.trim();

      if (visibleTranscript) {
        setText(visibleTranscript);
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" ||
        event.error === "service-not-allowed") {
        setVoiceError("Allow microphone access in your browser settings.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (submitted) return;

      // Do not submit merely because the browser ended recognition.
      // Give the user another chance if the browser stops unexpectedly.
      if (hasSpeech) {
        resetSilenceTimer();
      } else {
        setIsListening(false);
        setVoiceError("No speech detected. Say Hey Pixel and try again.");

        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        onVoiceCommandFinished?.();
      }
    };

    recognitionRef.current = recognition;
    setVoiceError("");

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError(
        "Could not start automatic voice input. Check microphone permission."
      );
      onVoiceCommandFinished?.();
    }

    return () => {
      if (silenceTimer !== undefined) {
        window.clearTimeout(silenceTimer);
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        try {
          recognition.stop();
        } catch {
          // Recognition may already have stopped.
        }
      }
    };
  }, [
    voiceCommandRequest,
    isLoading,
    disabled,
    onSend,
    onVoiceCommandFinished,
    newAttachment
  ]);


  const effectiveAttachment = newAttachment ?? stickyAttachment ?? null;
  const canSend =
    !isLoading &&
    !disabled &&
    (text.trim().length > 0 || effectiveAttachment !== null);

  function acceptFile(file: File) {
    setFileError("");
    const error = validateFile(file);

    if (error) {
      setFileError(error);
      return;
    }

    const modality = detectModality(file);

    if (!modality) {
      setFileError("Unsupported file type.");
      return;
    }

    if (newAttachment?.previewUrl) {
      URL.revokeObjectURL(newAttachment.previewUrl);
    }

    const previewUrl =
      modality === "image" ? URL.createObjectURL(file) : undefined;

    setNewAttachment({ file, modality, previewUrl });
  }

  function removeNewAttachment() {
    if (newAttachment?.previewUrl) {
      URL.revokeObjectURL(newAttachment.previewUrl);
    }

    setNewAttachment(null);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSend() {
    if (!canSend) return;

    // Stop voice recognition before submitting the message.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // The recognition session may already have stopped.
      }
    }

    onSend(text.trim(), newAttachment);
    setText("");

    if (newAttachment?.previewUrl) {
      URL.revokeObjectURL(newAttachment.previewUrl);
    }

    setNewAttachment(null);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);

    const element = e.target;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }

  function handleMicClick() {
    setVoiceError("");

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        setIsListening(false);
        recognitionRef.current = null;
      }
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SpeechRecognitionAPI =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError(
        "Voice input is not supported in this browser. Try the latest Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    // A new recognition session has its own result indexes.
    processedFinalResultsRef.current.clear();

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        // Interim results change while you speak. Do not append them.
        // Only add each final result index once.
        if (
          result.isFinal &&
          !processedFinalResultsRef.current.has(i)
        ) {
          processedFinalResultsRef.current.add(i);
          finalTranscript += result[0].transcript;
        }
      }

      const cleanedTranscript = finalTranscript.trim();

      if (cleanedTranscript) {
        setText((previous) => {
          const separator = previous.trim() ? " " : "";
          return `${previous}${separator}${cleanedTranscript}`;
        });
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError(
          "Microphone permission denied. Allow microphone access in your browser settings."
        );
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Click the mic and try speaking again.");
      } else if (event.error !== "aborted") {
        setVoiceError(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError("Could not start voice input. Please try again.");
    }
  }

  return (
    <div
      className={`composer ${isDragging ? "composer--dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="composer-drag-overlay" aria-hidden="true">
          Drop your file here
        </div>
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
              &nbsp;· {stickyAttachment.modality.toUpperCase()} ·{" "}
              {formatFileSize(stickyAttachment.file.size)}
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
        <AttachmentPreview
          attachment={newAttachment}
          onRemove={removeNewAttachment}
        />
      )}

      {fileError && (
        <p className="composer-error" role="alert">
          {fileError}
        </p>
      )}

      {voiceError && (
        <p className="composer-error" role="alert">
          {voiceError}
        </p>
      )}

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
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) acceptFile(file);
          }}
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
                : isListening
                  ? "Listening… speak now"
                  : "Ask anything, or attach a file…"
          }
          disabled={isLoading || disabled}
          rows={1}
          maxLength={5000}
          aria-label="Message input"
        />

        <button
          type="button"
          className={`composer-mic ${isListening ? "composer-mic--active" : ""}`}
          onClick={handleMicClick}
          disabled={isLoading || disabled}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          title={isListening ? "Stop voice input" : "Start voice input"}
          aria-pressed={isListening}
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
        Enter to send · Shift+Enter for new line · Click mic to speak
      </p>
    </div>
  );
}
