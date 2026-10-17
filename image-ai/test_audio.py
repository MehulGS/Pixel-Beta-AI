
from faster_whisper import WhisperModel

MODEL_SIZE = "base"

print("Loading Whisper model...")

model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type="int8",
)

print("Whisper model loaded!")

audio_path = input("Enter audio file path: ").strip().strip('"')

segments, info = model.transcribe(
    audio_path,
    language=None,
    task="transcribe",
    beam_size=5,
    vad_filter=False,
    condition_on_previous_text=False,
    temperature=0,
)

print(f"Detected language: {info.language}")
print(f"Language probability: {info.language_probability:.3f}")

transcript_parts = []

for segment in segments:
    text = segment.text.strip()
    if text:
        transcript_parts.append(text)
        print(
            f"[{segment.start:.1f}s - {segment.end:.1f}s] {segment.text}"
        )

transcript = " ".join(transcript_parts)

print("\n--- TRANSCRIPTION ---")
print(transcript)

print("\nDetected language:", info.language)
print("Language probability:", round(info.language_probability, 3))
