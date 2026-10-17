import { X, FileAudio, FileText, ImageIcon } from "lucide-react";
import type { AttachmentState } from "../types";
import { formatFileSize } from "../lib/api";

interface Props {
  attachment: AttachmentState;
  onRemove: () => void;
}

const MODALITY_LABELS: Record<string, string> = {
  image: "Image",
  audio: "Audio",
  document: "PDF",
  text: "Text",
};

export function AttachmentPreview({ attachment, onRemove }: Props) {
  const { file, modality, previewUrl } = attachment;

  return (
    <div className="attachment-preview">
      <div className="attachment-icon">
        {modality === "image" && previewUrl ? (
          <img src={previewUrl} alt="Preview" className="attachment-thumb" />
        ) : modality === "audio" ? (
          <FileAudio size={22} />
        ) : modality === "document" ? (
          <FileText size={22} />
        ) : (
          <ImageIcon size={22} />
        )}
      </div>

      <div className="attachment-info">
        <span className="attachment-filename" title={file.name}>
          {file.name.length > 32 ? file.name.slice(0, 29) + "…" : file.name}
        </span>
        <span className="attachment-meta">
          {MODALITY_LABELS[modality]} · {formatFileSize(file.size)}
        </span>
      </div>

      <button
        className="attachment-remove"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
