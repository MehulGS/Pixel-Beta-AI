import { AnimatedAICore } from "./AnimatedAICore";

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-core">
        <AnimatedAICore size={240} />
      </div>
      <h1 className="empty-title">Pixel Beta AI</h1>
      <p className="empty-subtitle">Your local multimodal AI workspace</p>
      <p className="empty-hint">
        Upload an image, audio file, or PDF — or just type a question below.
      </p>
    </div>
  );
}
