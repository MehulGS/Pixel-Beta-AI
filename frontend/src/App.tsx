
import { useState } from "react";
import { ImagePlus, Sparkles, Upload, X, LoaderCircle } from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setPreview(URL.createObjectURL(selectedFile));
    setDescription("");
    setError("");
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setDescription("");
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

      if (!response.ok) {
        throw new Error(data.detail || "Image analysis failed.");
      }

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

  return (
    <main className="app">
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon"><Sparkles size={22} /></span>
          InsightAI
        </a>
        <span className="nav-label">IMAGE UNDERSTANDING</span>
      </header>

      <section className="hero">
        <span className="eyebrow">
          <Sparkles size={15} /> POWERED BY COMPUTER VISION
        </span>

        <h1>Give your images<br /><span>meaning.</span></h1>

        <p className="subtitle">
          Upload an image and let AI describe what it sees.
          Simple, intelligent, and running on your own machine.
        </p>

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
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <span className="upload-icon"><Upload size={27} /></span>
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
              <button className="icon-button" onClick={clearImage} aria-label="Remove image">
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
              <><LoaderCircle className="spin" size={19} /> Analyzing image...</>
            ) : (
              <><Sparkles size={19} /> Understand this image</>
            )}
          </button>

          {description && (
            <section className="result-card" aria-live="polite">
              <span className="result-label"><Sparkles size={16} /> AI ANALYSIS</span>
              <h3>What I see</h3>
              <p>{description}</p>
              <span className="model-label">Model: BLIP Image Captioning</span>
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
