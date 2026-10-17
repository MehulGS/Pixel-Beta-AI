import { useRef, useState } from "react";
import {
  Copy,
  FileAudio,
  ImagePlus,
  LoaderCircle,
  Mic,
  Sparkles,
  Upload,
  X,
  FileText
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessage = {
  question: string;
  answer: string;
};

type AudioSegment = {
  start: number;
  end: number;
  text: string;
};

type TranscriptResult = {
  filename: string;
  language: string;
  language_probability: number;
  transcript: string;
  segments: AudioSegment[];
  model: string;
  transcription_status: string;
};

type AudioUnderstandingResult = {
  transcript: string;
  analysis: string;
  model: string;
  source: string;
};


type DocumentPage = {
  page: number;
  text: string;
};

type DocumentSummaryResult = {
  filename: string;
  summary: string;
};

type DocumentAnswerResult = {
  filename: string;
  question: string;
  answer: string;
};


// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  // ── Image state ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // ── Audio state ───────────────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioError, setAudioError] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptResult, setTranscriptResult] =
    useState<TranscriptResult | null>(null);
  const [understanding, setUnderstanding] = useState(false);
  const [audioUnderstanding, setAudioUnderstanding] =
    useState<AudioUnderstandingResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // ── Document AI state ─────────────────────────────────────────────
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [documentSummary, setDocumentSummary] =
    useState<DocumentSummaryResult | null>(null);
  const [documentQuestion, setDocumentQuestion] = useState("");
  const [documentAnswer, setDocumentAnswer] =
    useState<DocumentAnswerResult | null>(null);
  const [extractingDocument, setExtractingDocument] = useState(false);
  const [summarizingDocument, setSummarizingDocument] = useState(false);
  const [askingDocument, setAskingDocument] = useState(false);


  const ALLOWED_AUDIO_EXTS = ".mp3,.wav,.m4a,.ogg,.webm,.flac";
  const MAX_AUDIO_MB = 25;

  // ── Image handlers ────────────────────────────────────────────────────────

  function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > 8 * 1024 * 1024) {
      setError("Image size must not exceed 8 MB.");
      return;
    }

    setFile(selectedFile);
    setChatHistory([]);
    setQuestion("");
    setPreview(URL.createObjectURL(selectedFile));
    setDescription("");
    setError("");
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setDescription("");
    setChatHistory([]);
    setQuestion("");
    setError("");
  }

  async function analyzeImage() {
    if (!file) return;

    setLoading(true);
    setError("");
    setDescription("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Image analysis failed.");
      setDescription(data.description);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Check that the Python API is running.`
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function askAboutImage() {
    if (!file || !question.trim()) return;

    setAsking(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question.trim());

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Question failed.");
      setChatHistory((prev) => [
        ...prev,
        { question: question.trim(), answer: data.answer },
      ]);
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to get an answer."
      );
    } finally {
      setAsking(false);
    }
  }

  // ── Audio handlers ────────────────────────────────────────────────────────

  function handleAudioFile(selectedFile?: File) {
    if (!selectedFile) return;

    const allowedTypes = new Set([
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/ogg",
      "audio/webm",
      "audio/flac",
      "audio/x-flac",
      "video/webm",
      "video/ogg",
    ]);

    const allowedExts = new Set([
      ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac",
    ]);

    const ext = selectedFile.name.includes(".")
      ? "." + selectedFile.name.split(".").pop()!.toLowerCase()
      : "";

    // Some browsers report audio/mpeg for both MP3 and M4A; fallback to ext.
    const typeOk = allowedTypes.has(selectedFile.type) || allowedTypes.has("application/octet-stream");
    const extOk = allowedExts.has(ext);

    if (!typeOk && !extOk) {
      setAudioError(
        "Unsupported file type. Please upload MP3, WAV, M4A, OGG, WebM, or FLAC."
      );
      return;
    }

    if (selectedFile.size === 0) {
      setAudioError("The selected file is empty.");
      return;
    }

    if (selectedFile.size > MAX_AUDIO_MB * 1024 * 1024) {
      setAudioError(`Audio file must not exceed ${MAX_AUDIO_MB} MB.`);
      return;
    }

    setAudioFile(selectedFile);
    setAudioError("");
    setTranscriptResult(null);
    setAudioUnderstanding(null);
  }

  function clearAudio() {
    setAudioFile(null);
    setAudioError("");
    setTranscriptResult(null);
    setAudioUnderstanding(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  async function transcribeAudio() {
    if (!audioFile || transcribing) return;

    setTranscribing(true);
    setAudioError("");
    setTranscriptResult(null);
    setAudioUnderstanding(null);

    const formData = new FormData();
    formData.append("file", audioFile);
    // language omitted → backend defaults to auto-detect

    try {
      const response = await fetch(`${API_URL}/transcribe-audio`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Transcription failed.");
      setTranscriptResult(data as TranscriptResult);
    } catch (err) {
      setAudioError(
        err instanceof Error
          ? `${err.message} Check that the Python API is running.`
          : "Transcription failed."
      );
    } finally {
      setTranscribing(false);
    }
  }

  async function understandAudio() {
    if (!transcriptResult || understanding) return;

    setUnderstanding(true);
    setAudioUnderstanding(null);

    try {
      const response = await fetch(`${API_URL}/understand-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptResult.transcript,
          language: transcriptResult.language,
          filename: transcriptResult.filename,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.detail || "Audio understanding failed."
        );
      setAudioUnderstanding(data as AudioUnderstandingResult);
    } catch (err) {
      setAudioError(
        err instanceof Error
          ? err.message
          : "Audio understanding failed."
      );
    } finally {
      setUnderstanding(false);
    }
  }

  function copyTranscript() {
    if (!transcriptResult?.transcript) return;
    navigator.clipboard.writeText(transcriptResult.transcript).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function languageLabel(code: string | undefined): string {
    const map: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      ur: "Urdu",
      pa: "Punjabi",
      mr: "Marathi",
      ta: "Tamil",
      te: "Telugu",
      kn: "Kannada",
      ml: "Malayalam",
      gu: "Gujarati",
      bn: "Bengali",
    };
    if (!code) return "Unknown";
    return map[code] ?? code.toUpperCase();
  }


  // ── Document AI handlers ──────────────────────────────────────────

  function handleDocumentFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setDocumentError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size === 0) {
      setDocumentError("The selected PDF is empty.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setDocumentError("PDF size must not exceed 10 MB.");
      return;
    }

    setDocumentFile(selectedFile);
    setDocumentError("");
    setDocumentSummary(null);
    setDocumentAnswer(null);
    setDocumentQuestion("");
  }

  function clearDocument() {
    setDocumentFile(null);
    setDocumentError("");
    setDocumentSummary(null);
    setDocumentAnswer(null);
    setDocumentQuestion("");
  }

  async function summarizeDocument() {
    if (!documentFile || summarizingDocument) return;

    setSummarizingDocument(true);
    setDocumentError("");
    setDocumentSummary(null);

    const formData = new FormData();
    formData.append("file", documentFile);

    try {
      const response = await fetch(
        `${API_URL}/document/summarize`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "PDF summarization failed.");
      }

      setDocumentSummary(data as DocumentSummaryResult);
    } catch (err) {
      setDocumentError(
        err instanceof Error
          ? `${err.message} Check that the Python API and Ollama are running.`
          : "Unable to summarize PDF."
      );
    } finally {
      setSummarizingDocument(false);
    }
  }

  async function askDocumentQuestion() {
    if (
      !documentFile ||
      !documentQuestion.trim() ||
      askingDocument
    ) {
      return;
    }

    setAskingDocument(true);
    setDocumentError("");
    setDocumentAnswer(null);

    const formData = new FormData();
    formData.append("file", documentFile);
    formData.append("question", documentQuestion.trim());

    try {
      const response = await fetch(
        `${API_URL}/document/ask`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Document question failed.");
      }

      setDocumentAnswer(data as DocumentAnswerResult);
    } catch (err) {
      setDocumentError(
        err instanceof Error
          ? `${err.message} Check that the Python API and Ollama are running.`
          : "Unable to answer the document question."
      );
    } finally {
      setAskingDocument(false);
    }
  }


  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="app">
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Sparkles size={22} />
          </span>
          InsightAI
        </a>
        <span className="nav-label">IMAGE & AUDIO UNDERSTANDING</span>
      </header>

      <section className="hero">
        <span className="eyebrow">
          <Sparkles size={15} /> POWERED BY LOCAL AI
        </span>

        <h1>
          Give your content
          <br />
          <span>meaning.</span>
        </h1>

        <p className="subtitle">
          Upload an image or audio file and let AI describe, answer, and
          interpret — all running on your own machine.
        </p>

        {/* ── Image Section ── */}
        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <h2>Analyze an image</h2>
              <p>Upload a photo to get an AI-generated description.</p>
            </div>
            <ImagePlus size={25} className="heading-icon" />
          </div>

          {!preview ? (
            <label
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span className="upload-icon">
                <Upload size={27} />
              </span>
              <strong>Drop your image here</strong>
              <span className="muted">or click to browse files</span>
              <span className="file-types">JPG · PNG · WEBP · MAX 8 MB</span>
            </label>
          ) : (
            <div className="preview-card">
              <img src={preview} alt="Selected image preview" />
              <div className="preview-info">
                <strong>{file?.name}</strong>
                <span className="muted">
                  {file ? (file.size / 1024).toFixed(1) + " KB" : ""}
                </span>
              </div>
              <button
                className="icon-button"
                onClick={clearImage}
                aria-label="Remove image"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <button
            className="analyze-button"
            onClick={analyzeImage}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="spin" size={19} /> Analyzing
                image...
              </>
            ) : (
              <>
                <Sparkles size={19} /> Understand this image
              </>
            )}
          </button>

          {description && (
            <section className="result-card" aria-live="polite">
              <span className="result-label">
                <Sparkles size={16} /> AI ANALYSIS
              </span>
              <h3>What I see</h3>
              <p>{description}</p>
              <span className="model-label">Model: BLIP Image Captioning</span>
            </section>
          )}

          <section className="question-section">
            <h3>Ask about your image</h3>
            <p>Ask a specific question about the uploaded image.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askAboutImage();
              }}
              className="question-form"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is the person wearing?"
                maxLength={1000}
                disabled={!file || asking}
                aria-label="Question about the image"
              />
              <button type="submit" disabled={!file || !question.trim() || asking}>
                {asking ? "Thinking..." : "Ask AI"}
              </button>
            </form>

            <div className="chat-history" aria-live="polite">
              {chatHistory.map((msg, i) => (
                <div className="chat-pair" key={`${i}-${msg.question}`}>
                  <div className="chat-question">
                    <span>You</span>
                    <p>{msg.question}</p>
                  </div>
                  <div className="chat-answer">
                    <strong>✨ InsightAI</strong>
                    <p>{msg.answer}</p>
                  </div>
                </div>
              ))}
              {asking && (
                <div className="chat-answer">
                  <strong>✨ InsightAI</strong>
                  <p>Analyzing your image...</p>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* ── Audio Section ── */}
        <section className="workspace audio-workspace">
          <div className="workspace-heading">
            <div>
              <h2>Transcribe audio</h2>
              <p>
                Upload an audio file to get a transcript and AI
                interpretation.
              </p>
            </div>
            <Mic size={25} className="heading-icon" />
          </div>

          {!audioFile ? (
            <label
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleAudioFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept={ALLOWED_AUDIO_EXTS}
                onChange={(e) => handleAudioFile(e.target.files?.[0])}
                aria-label="Select audio file"
              />
              <span className="upload-icon">
                <FileAudio size={27} />
              </span>
              <strong>Drop your audio here</strong>
              <span className="muted">or click to browse files</span>
              <span className="file-types">
                MP3 · WAV · M4A · OGG · WEBM · FLAC · MAX 25 MB
              </span>
            </label>
          ) : (
            <div className="preview-card audio-preview-card">
              <span className="audio-file-icon">
                <FileAudio size={36} />
              </span>
              <div className="preview-info">
                <strong>{audioFile.name}</strong>
                <span className="muted">{formatFileSize(audioFile.size)}</span>
              </div>
              <button
                className="icon-button"
                onClick={clearAudio}
                aria-label="Remove audio file"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {audioError && <p className="error-message">{audioError}</p>}

          <button
            className="analyze-button"
            onClick={transcribeAudio}
            disabled={!audioFile || transcribing}
          >
            {transcribing ? (
              <>
                <LoaderCircle className="spin" size={19} /> Transcribing...
              </>
            ) : (
              <>
                <Mic size={19} /> Transcribe Audio
              </>
            )}
          </button>

          {/* Transcript result */}
          {transcriptResult && (
            <section className="result-card" aria-live="polite">
              <div className="result-label-row">
                <span className="result-label">
                  <Mic size={16} /> TRANSCRIPT
                </span>
                <span className="lang-badge">
                  {languageLabel(transcriptResult.language)}{" "}
                  {transcriptResult.language_probability > 0
                    ? `· ${(transcriptResult.language_probability * 100).toFixed(0)}%`
                    : ""}
                </span>
              </div>

              {transcriptResult.transcription_status === "empty_transcript" && (
                <p className="transcript-warning">
                  ⚠️ No speech detected. The audio may be silent, too noisy, or
                  in an unsupported format.
                </p>
              )}

              {transcriptResult.transcript ? (
                <>
                  <p className="transcript-text">{transcriptResult.transcript}</p>
                  <button
                    className="copy-button"
                    onClick={copyTranscript}
                    aria-label="Copy transcript to clipboard"
                  >
                    <Copy size={14} />
                    {copyFeedback ? "Copied!" : "Copy transcript"}
                  </button>
                </>
              ) : (
                <p className="muted transcript-text">
                  (No transcript returned)
                </p>
              )}

              <span className="model-label">
                Model: {transcriptResult.model}
              </span>

              {/* Understand Audio button */}
              {transcriptResult.transcript && (
                <button
                  className="analyze-button understand-button"
                  onClick={understandAudio}
                  disabled={understanding}
                  style={{ marginTop: "16px" }}
                >
                  {understanding ? (
                    <>
                      <LoaderCircle className="spin" size={19} /> Analyzing
                      transcript...
                    </>
                  ) : (
                    <>
                      <Sparkles size={19} /> Understand Audio
                    </>
                  )}
                </button>
              )}
            </section>
          )}

          {/* Audio understanding result */}
          {audioUnderstanding && (
            <section className="result-card understanding-card" aria-live="polite">
              <span className="result-label">
                <Sparkles size={16} /> AUDIO UNDERSTANDING
              </span>
              <h3>What it means</h3>
              <pre className="understanding-text">
                {audioUnderstanding.analysis}
              </pre>
              <span className="model-label">
                Model:{" "}
                {audioUnderstanding.source === "known_phrase"
                  ? "InsightAI Phrase Dictionary"
                  : audioUnderstanding.model}
              </span>
            </section>
          )}
        </section>

        
        {/* ── Document AI Section ── */}
        <section className="workspace document-workspace">
          <div className="workspace-heading">
            <div>
              <h2>Understand a Document</h2>
              <p>Upload a PDF to summarize it or ask questions about its content.</p>
            </div>
            <FileText size={25} className="heading-icon" />
          </div>

          {!documentFile ? (
            <label className="upload-zone">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handleDocumentFile(e.target.files?.[0])}
              />
              <span className="upload-icon">
                <Upload size={27} />
              </span>
              <strong>Choose your PDF document</strong>
              <span className="muted">Click to browse files</span>
              <span className="file-types">PDF · MAX 10 MB</span>
            </label>
          ) : (
            <div className="preview-card">
              <span className="audio-file-icon">
                <FileText size={36} />
              </span>
              <div className="preview-info">
                <strong>{documentFile.name}</strong>
                <span className="muted">
                  {formatFileSize(documentFile.size)}
                </span>
              </div>
              <button
                className="icon-button"
                onClick={clearDocument}
                aria-label="Remove PDF"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {documentError && (
            <p className="error-message">{documentError}</p>
          )}

          <button
            className="analyze-button"
            onClick={summarizeDocument}
            disabled={!documentFile || summarizingDocument}
          >
            {summarizingDocument ? (
              <>
                <LoaderCircle className="spin" size={19} />
                Summarizing PDF...
              </>
            ) : (
              <>
                <Sparkles size={19} />
                Summarize PDF
              </>
            )}
          </button>

          {documentSummary && (
            <section className="result-card" aria-live="polite">
              <span className="result-label">
                <Sparkles size={16} /> DOCUMENT SUMMARY
              </span>
              <h3>{documentSummary.filename}</h3>
              <div className="document-result-text">
                {documentSummary.summary}
              </div>
            </section>
          )}

          <section className="question-section">
            <h3>Ask questions about your PDF</h3>
            <p>Get answers based on the uploaded document.</p>

            <form
              className="question-form"
              onSubmit={(e) => {
                e.preventDefault();
                askDocumentQuestion();
              }}
            >
              <input
                type="text"
                value={documentQuestion}
                onChange={(e) => setDocumentQuestion(e.target.value)}
                placeholder="What are the key points in this document?"
                maxLength={1000}
                disabled={!documentFile || askingDocument}
                aria-label="Question about the PDF"
              />
              <button
                type="submit"
                disabled={
                  !documentFile ||
                  !documentQuestion.trim() ||
                  askingDocument
                }
              >
                {askingDocument ? "Thinking..." : "Ask AI"}
              </button>
            </form>
          </section>

          {documentAnswer && (
            <section className="result-card" aria-live="polite">
              <span className="result-label">
                <Sparkles size={16} /> DOCUMENT ANSWER
              </span>
              <h3>Your question</h3>
              <p>{documentAnswer.question}</p>
              <h3>InsightAI's answer</h3>
              <div className="document-result-text">
                {documentAnswer.answer}
              </div>
            </section>
          )}
        </section>


        <p className="privacy-note">
          <span className="status-dot" />
          AI inference runs locally on your computer.
        </p>
      </section>

      <footer>INSIGHTAI · YOUR PERSONAL AI WORKSPACE</footer>
    </main>
  );
}

export default App;
