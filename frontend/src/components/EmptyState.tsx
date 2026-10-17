import { useEffect, useState } from "react";
import { AnimatedAICore } from "./AnimatedAICore";
import { API_URL } from "../lib/api";

type ServiceStatus = "checking" | "online" | "offline";

interface SystemHealth {
  llm: ServiceStatus;
  vision: ServiceStatus;
  vlm: ServiceStatus;
  audio: ServiceStatus;
  pdf: ServiceStatus;
}

async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function StatusDot({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`empty-panel-dot empty-panel-dot--${
        status === "online" ? "online" : status === "offline" ? "offline" : "checking"
      }`}
    />
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const map = {
    online: { label: "ONLINE", cls: "empty-panel-status--online" },
    offline: { label: "OFFLINE", cls: "empty-panel-status--offline" },
    checking: { label: "···", cls: "empty-panel-status--checking" },
  };
  const { label, cls } = map[status];
  return <span className={`empty-panel-status ${cls}`}>{label}</span>;
}

export function EmptyState() {
  const [health, setHealth] = useState<SystemHealth>({
    llm: "checking",
    vision: "checking",
    vlm: "checking",
    audio: "checking",
    pdf: "checking",
  });

  useEffect(() => {
    checkBackendHealth().then((alive) => {
      setHealth({
        llm:    alive ? "online" : "offline",
        vision: alive ? "online" : "offline",
        vlm:    alive ? "online" : "offline",
        audio:  alive ? "online" : "offline",
        pdf:    alive ? "online" : "offline",
      });
    });
  }, []);

  return (
    <div className="empty-state">
      <div className="empty-panels-layout">
        <div className="empty-panel">
          <div className="empty-panel-title">AI ONLINE</div>
          {["MULTIMODAL", "VISION", "AUDIO", "DOCUMENTS", "TEXT", "LOCAL INFERENCE"].map((cap) => (
            <div key={cap} className="empty-panel-item">
              <span className="empty-panel-label">{cap}</span>
            </div>
          ))}
        </div>

        <div className="empty-core">
          <AnimatedAICore size={300} />
        </div>

        <div className="empty-panel">
          <div className="empty-panel-title">SYSTEM STATUS</div>
          {[
            { key: "llm",    label: "LLM (Ollama)" },
            { key: "vision", label: "Vision (BLIP)" },
            { key: "vlm",    label: "VLM (SmolVLM)" },
            { key: "audio",  label: "Whisper (Audio)" },
            { key: "pdf",    label: "PDF (pypdf)" },
          ].map(({ key, label }) => {
            const status = health[key as keyof SystemHealth];
            return (
              <div key={key} className="empty-panel-item">
                <StatusDot status={status} />
                <span className="empty-panel-label" style={{ flex: 1 }}>{label}</span>
                <StatusBadge status={status} />
              </div>
            );
          })}
          <div className="empty-panel-section">
            <div className="empty-panel-title" style={{ marginBottom: 6 }}>READY</div>
            {["ASK ANYTHING", "UPLOAD A FILE", "EXPLORE IDEAS", "ANALYZE CONTENT"].map((action) => (
              <div key={action} className="empty-panel-item">
                <span className="empty-panel-label">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h1 className="empty-title">
        <span className="empty-title-word1">Pixel </span>
        <span className="empty-title-word2">Beta AI</span>
      </h1>
      <p className="empty-subtitle">YOUR LOCAL MULTIMODAL AI WORKSPACE</p>
      <p className="empty-hint">
        Upload an image, audio file, or PDF — or just type a question below.
      </p>
    </div>
  );
}
