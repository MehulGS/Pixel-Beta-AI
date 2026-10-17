import asyncio
import os
import re
import subprocess
import tempfile
from contextlib import asynccontextmanager
from io import BytesIO
from typing import List, Optional

import httpx
import torch
from faster_whisper import WhisperModel
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    AutoModelForImageTextToText,
    AutoProcessor,
    BlipForConditionalGeneration,
    BlipProcessor,
)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BLIP_ID = "Salesforce/blip-image-captioning-base"
VLM_ID = "HuggingFaceTB/SmolVLM-256M-Instruct"
WHISPER_MODEL_SIZE = "small"

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

MAX_IMAGE_SIZE = 8 * 1024 * 1024   # 8 MB
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_TEXT_LENGTH = 5000
MAX_QUESTION_LENGTH = 1000

ALLOWED_AUDIO_TYPES = {
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
    # Some browsers send these for common formats
    "video/webm",
    "video/ogg",
    "application/octet-stream",  # fallback for unknown MIME from some systems
}

ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac"
}


# --------------------------------------------------
# Model instances
# --------------------------------------------------

blip_processor = None
blip_model = None
vlm_processor = None
vlm_model = None

# Whisper model is loaded on first audio request to avoid
# slowing startup when only image features are used.
whisper_model: Optional[WhisperModel] = None
_whisper_lock = asyncio.Lock()


# --------------------------------------------------
# Known Hindi / Hinglish phrase dictionary
# --------------------------------------------------

HINDI_PHRASES = {
    "kutte main tera khoon pee jaunga": {
        "literal_meaning": "You dog, I will drink your blood.",
        "intended_meaning": (
            "An aggressive threat. Depending on context, "
            "it can mean 'I'll kill you' or 'I'll make you pay'."
        ),
        "emotion": "Anger or aggression",
        "confidence": "High for the general threatening tone",
    },
    "usne meri naak katwa di": {
        "literal_meaning": "He/she got my nose cut.",
        "intended_meaning": "He/she brought shame or embarrassment on me.",
        "emotion": "Embarrassment or disappointment",
        "confidence": "High",
    },
    "mera dimaag mat kha": {
        "literal_meaning": "Don't eat my brain.",
        "intended_meaning": "Stop annoying or bothering me.",
        "emotion": "Irritation",
        "confidence": "High",
    },
    "bhai scene kya hai": {
        "literal_meaning": "Bro, what is the scene?",
        "intended_meaning": "Bro, what is the situation or plan?",
        "emotion": "Usually casual curiosity",
        "confidence": "High",
    },
    "aaj toh uski band baj gayi": {
        "literal_meaning": "Today, his/her band got disrupted.",
        "intended_meaning": (
            "He/she got into trouble, got scolded, "
            "or had a very difficult time, depending on context."
        ),
        "emotion": "Often humorous, teasing, or sympathetic",
        "confidence": "High for the general idiomatic meaning",
    },
}


def normalize_text(text: str) -> str:
    """Normalize case, punctuation, and repeated whitespace for phrase matching."""
    text = text.casefold()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


NORMALIZED_PHRASES = {
    normalize_text(phrase): details
    for phrase, details in HINDI_PHRASES.items()
}


def find_known_phrase(text: str):
    """Return a known-phrase dictionary entry for an exact match, or None."""
    normalized = normalize_text(text)
    # Exact match first
    if normalized in NORMALIZED_PHRASES:
        return NORMALIZED_PHRASES[normalized]
    # Check whether the text is substantially covered by one known phrase
    for phrase_key, details in NORMALIZED_PHRASES.items():
        words = phrase_key.split()
        # Only match if the phrase contains at least 4 words AND the
        # normalized input is exactly that phrase (or differs only in
        # surrounding whitespace/punctuation already stripped above).
        if len(words) >= 4 and normalized == phrase_key:
            return details
    return None


# --------------------------------------------------
# Model lifecycle
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global blip_processor, blip_model, vlm_processor, vlm_model

    print("Loading BLIP model...")
    blip_processor = BlipProcessor.from_pretrained(BLIP_ID)
    blip_model = BlipForConditionalGeneration.from_pretrained(BLIP_ID)
    blip_model.eval()
    print("BLIP model loaded.")

    print("Loading SmolVLM model...")
    vlm_processor = AutoProcessor.from_pretrained(VLM_ID)
    vlm_model = AutoModelForImageTextToText.from_pretrained(
        VLM_ID,
        torch_dtype=torch.float32,
    )
    vlm_model.eval()
    print("SmolVLM model loaded.")

    print("InsightAI image models are ready. Whisper loads on first audio request.")

    yield

    print("InsightAI shutting down.")


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="InsightAI",
    description=(
        "Local image captioning, visual question answering, "
        "multilingual text understanding, and audio transcription."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "InsightAI API is running",
        "version": "1.1.0",
        "features": [
            "image-captioning",
            "visual-question-answering",
            "multilingual-text-understanding",
            "audio-transcription",
            "audio-understanding",
        ],
    }


@app.get("/health")
def health():
    return {
        "api": "ok",
        "ollama_model": OLLAMA_MODEL,
        "image_models_loaded": blip_model is not None and vlm_model is not None,
        "whisper_loaded": whisper_model is not None,
        "whisper_model_size": WHISPER_MODEL_SIZE,
    }


# --------------------------------------------------
# Image validation helper
# --------------------------------------------------

async def read_image(file: UploadFile) -> Image.Image:
    allowed_types = {"image/jpeg", "image/png", "image/webp"}

    try:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Upload a JPG, PNG, or WebP image.",
            )

        contents = await file.read(MAX_IMAGE_SIZE + 1)

        if not contents:
            raise HTTPException(status_code=400, detail="The file is empty.")

        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image must not exceed 8 MB.",
            )

        try:
            with Image.open(BytesIO(contents)) as src:
                src.verify()
            with Image.open(BytesIO(contents)) as src:
                return src.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid image file.",
            )
    finally:
        await file.close()


# --------------------------------------------------
# Image captioning
# POST /analyze
# --------------------------------------------------

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    image = await read_image(file)

    try:
        inputs = blip_processor(images=image, return_tensors="pt")

        with torch.inference_mode():
            output = blip_model.generate(**inputs, max_new_tokens=60)

        description = blip_processor.decode(output[0], skip_special_tokens=True)

        return {
            "filename": file.filename,
            "description": description,
            "model": BLIP_ID,
        }
    finally:
        image.close()


# --------------------------------------------------
# Visual question answering
# POST /ask
# --------------------------------------------------

@app.post("/ask")
async def ask_about_image(
    file: UploadFile = File(...),
    question: str = Form(...),
):
    question = question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Please enter a question.")

    if len(question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Question must be under 1000 characters.",
        )

    image = await read_image(file)

    try:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": question},
                ],
            }
        ]

        prompt = vlm_processor.apply_chat_template(
            messages, add_generation_prompt=True
        )
        inputs = vlm_processor(text=prompt, images=[image], return_tensors="pt")

        with torch.inference_mode():
            output = vlm_model.generate(**inputs, max_new_tokens=100, do_sample=False)

        new_tokens = output[:, inputs["input_ids"].shape[1]:]
        answer = vlm_processor.batch_decode(
            new_tokens, skip_special_tokens=True
        )[0].strip()

        return {
            "filename": file.filename,
            "question": question,
            "answer": answer,
            "model": VLM_ID,
        }
    finally:
        image.close()


# --------------------------------------------------
# Multilingual text understanding
# POST /understand-text
# --------------------------------------------------

@app.post("/understand-text")
async def understand_text(text: str = Form(...)):
    text = text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Please enter some text.")

    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Text must be under 5000 characters.",
        )

    # 1. Check known phrases before calling the LLM.
    known_phrase = find_known_phrase(text)
    if known_phrase:
        return {
            "input": text,
            "answer": (
                f"Literal meaning: {known_phrase['literal_meaning']}\n"
                f"Intended meaning: {known_phrase['intended_meaning']}\n"
                f"Emotion or tone: {known_phrase['emotion']}\n"
                f"Confidence: {known_phrase['confidence']}"
            ),
            "model": "InsightAI Hindi Phrase Dictionary",
            "source": "known_phrase",
        }

    # 2. Unknown phrases go to Ollama.
    prompt = f"""You are a careful multilingual text interpreter.

The input may be English, Hindi, Roman Hindi, Hinglish,
an idiom, slang, or figurative speech.

Analyze only the supplied text.

Return these four sections:
1. Literal meaning
2. Intended meaning
3. Emotion or tone
4. Uncertainty

Rules:
- Do not invent events, characters, weapons, or background.
- Do not treat Roman Hindi words as English automatically.
- Distinguish literal meaning from figurative meaning.
- If the intended meaning is uncertain, say so.
- Do not claim certainty without enough context.
- Keep the response concise.

Input:
{text}
"""

    return await _call_ollama(prompt, text)


# --------------------------------------------------
# Ollama helper (shared by text and audio endpoints)
# --------------------------------------------------

async def _call_ollama(prompt: str, input_text: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            response.raise_for_status()
            result = response.json()

        answer = result.get("response", "").strip()
        if not answer:
            raise HTTPException(
                status_code=502,
                detail="Ollama returned an empty response.",
            )

        return {
            "input": input_text,
            "answer": answer,
            "model": OLLAMA_MODEL,
            "source": "ollama",
        }

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ollama is unavailable. Start Ollama and "
                "make sure the local API is accessible at "
                "http://127.0.0.1:11434."
            ),
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The local model took too long to respond.",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Ollama returned HTTP {exc.response.status_code}. "
                "Check that the configured model is installed."
            ),
        )
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an invalid response.",
        )


# --------------------------------------------------
# Audio validation helpers
# --------------------------------------------------

def _validate_audio_extension(filename: Optional[str]) -> str:
    """Return a safe file extension from the filename, or raise HTTP 400."""
    if not filename:
        return ".audio"
    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file extension '{ext}'. "
                "Supported: MP3, WAV, M4A, OGG, WebM, FLAC."
            ),
        )
    return ext or ".audio"


def _is_audio_content_type_acceptable(content_type: Optional[str]) -> bool:
    """
    Return True if the MIME type looks like an audio file.
    Some browsers/platforms report generic types for valid audio, so we
    accept 'application/octet-stream' and fall back to extension validation.
    """
    if content_type is None:
        return True  # defer to extension check
    return content_type.split(";")[0].strip() in ALLOWED_AUDIO_TYPES


def _ffmpeg_available() -> bool:
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _convert_to_wav(input_path: str) -> str:
    """
    Use FFmpeg to convert input audio to 16-kHz mono WAV (PCM s16le).
    Returns the path to the converted temporary file.
    Raises HTTPException if FFmpeg fails.
    """
    output_fd, output_path = tempfile.mkstemp(suffix=".wav")
    os.close(output_fd)

    cmd = [
        "ffmpeg",
        "-y",              # overwrite output if it exists
        "-i", input_path,
        "-ar", "16000",    # 16 kHz
        "-ac", "1",        # mono
        "-f", "wav",       # PCM WAV
        "-acodec", "pcm_s16le",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=120,
        )
    except FileNotFoundError:
        os.unlink(output_path)
        raise HTTPException(
            status_code=500,
            detail="FFmpeg is not installed or not available in PATH.",
        )
    except subprocess.TimeoutExpired:
        os.unlink(output_path)
        raise HTTPException(
            status_code=500,
            detail="FFmpeg conversion timed out.",
        )

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        os.unlink(output_path)
        raise HTTPException(
            status_code=400,
            detail=f"FFmpeg could not process the audio file: {stderr[-300:]}",
        )

    return output_path


# --------------------------------------------------
# Whisper model loader (thread-safe, lazy)
# --------------------------------------------------

async def _get_whisper_model() -> WhisperModel:
    global whisper_model
    if whisper_model is not None:
        return whisper_model

    async with _whisper_lock:
        # Double-check after acquiring the lock
        if whisper_model is not None:
            return whisper_model

        print("Loading Whisper model (this happens once)...")
        whisper_model = await asyncio.to_thread(
            WhisperModel,
            WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8",
        )
        print("Whisper model loaded.")

    return whisper_model


# --------------------------------------------------
# Transcription segment schema
# --------------------------------------------------

class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


# --------------------------------------------------
# Audio transcription
# POST /transcribe-audio
# --------------------------------------------------

@app.post("/transcribe-audio")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Transcribe an audio file.

    - **file**: Audio file (MP3, WAV, M4A, OGG, WebM, FLAC — max 25 MB)
    - **language**: Optional language code (`en`, `hi`) or `auto` for
      automatic detection. Defaults to automatic detection.

    Returns the transcript, detected language, language probability,
    per-segment timestamps, and model name.
    """
    # ------ Validate content type ------
    if not _is_audio_content_type_acceptable(file.content_type):
        await file.close()
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported MIME type. Upload a supported audio file: "
                "MP3, WAV, M4A, OGG, WebM, or FLAC."
            ),
        )

    # ------ Validate extension ------
    ext = _validate_audio_extension(file.filename)

    # ------ Read and size-check ------
    contents = await file.read(MAX_AUDIO_SIZE + 1)
    await file.close()

    if not contents:
        raise HTTPException(status_code=400, detail="The audio file is empty.")

    if len(contents) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio must not exceed 25 MB.",
        )

    # ------ Resolve language setting ------
    # None / "auto" → let Whisper auto-detect
    # "en" / "hi" etc. → pass directly to Whisper
    whisper_language: Optional[str] = None
    if language and language.lower() != "auto":
        whisper_language = language.lower()

    # ------ Write to temp file ------
    temp_orig_path: Optional[str] = None
    temp_wav_path: Optional[str] = None

    try:
        orig_fd, temp_orig_path = tempfile.mkstemp(suffix=ext)
        os.close(orig_fd)
        with open(temp_orig_path, "wb") as f:
            f.write(contents)

        # ------ Audio preprocessing ------
        # Convert to 16-kHz mono WAV for best Whisper compatibility.
        # Whisper / faster-whisper can read many formats directly, but
        # normalising to PCM WAV avoids ffmpeg-inside-the-library failures
        # on unusual encodings (e.g. variable-bitrate M4A, OGG).
        inference_path = temp_orig_path
        if _ffmpeg_available():
            temp_wav_path = _convert_to_wav(temp_orig_path)
            inference_path = temp_wav_path
        # If FFmpeg is missing we fall back to the original file and let
        # faster-whisper attempt to decode it directly.

        # ------ Load Whisper (lazy, thread-safe) ------
        model = await _get_whisper_model()

        # ------ Run transcription off the event loop ------
        def _transcribe():
            segs, info = model.transcribe(
                inference_path,
                beam_size=5,
                task="transcribe",          # never translate by default
                language=whisper_language,  # None → auto-detect
                vad_filter=False,           # keep all audio; VAD can drop
                                            # short or quiet speech segments
                condition_on_previous_text=False,
                temperature=0.0,
                log_prob_threshold=-1.0,    # accept all segments
                no_speech_threshold=0.6,
            )
            # Materialise the generator *inside* the thread so we don't
            # hold a reference across to_thread boundaries.
            segment_list = [
                {
                    "start": round(s.start, 2),
                    "end": round(s.end, 2),
                    "text": s.text.strip(),
                }
                for s in segs
            ]
            return segment_list, info

        segments_data, info = await asyncio.to_thread(_transcribe)

        # ------ Build transcript ------
        transcript = " ".join(
            seg["text"] for seg in segments_data if seg["text"]
        ).strip()

        transcription_status = "success"
        if not transcript:
            transcription_status = "empty_transcript"

        return {
            "filename": file.filename,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "transcript": transcript,
            "segments": segments_data,
            "model": f"faster-whisper-{WHISPER_MODEL_SIZE}",
            "transcription_status": transcription_status,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(exc)}",
        )
    finally:
        if temp_orig_path and os.path.exists(temp_orig_path):
            try:
                os.unlink(temp_orig_path)
            except OSError:
                pass
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.unlink(temp_wav_path)
            except OSError:
                pass


# --------------------------------------------------
# Audio understanding
# POST /understand-audio
# --------------------------------------------------

class UnderstandAudioRequest(BaseModel):
    transcript: str
    language: Optional[str] = None
    filename: Optional[str] = None


@app.post("/understand-audio")
async def understand_audio(payload: UnderstandAudioRequest):
    """
    Interpret an audio transcript using the local Ollama model.

    - **transcript**: The text produced by /transcribe-audio.
    - **language**: Optional detected language code from transcription.
    - **filename**: Optional original filename for context.

    Returns a structured analysis: language note, summary, main points,
    literal/intended meaning, idioms, emotion/tone, and uncertainty flags.

    The model is `qwen2.5:1.5b` running locally via Ollama.
    Ollama must be running at http://127.0.0.1:11434.
    """
    transcript = payload.transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript is empty. Transcribe audio first.",
        )

    if len(transcript) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Transcript is too long (max 5000 characters).",
        )

    # Flag clearly failed or suspiciously short transcripts
    transcription_warning = ""
    if len(transcript) < 10:
        transcription_warning = (
            "\n\n⚠️ Note: The transcript is very short and may be incomplete "
            "or inaccurate. Treat this analysis with caution."
        )

    # Check known Hindi phrases first (quick path, no LLM needed)
    known = find_known_phrase(transcript)
    if known:
        answer = (
            f"Literal meaning: {known['literal_meaning']}\n"
            f"Intended meaning: {known['intended_meaning']}\n"
            f"Emotion or tone: {known['emotion']}\n"
            f"Confidence: {known['confidence']}"
        )
        return {
            "transcript": transcript,
            "analysis": answer + transcription_warning,
            "model": "InsightAI Hindi Phrase Dictionary",
            "source": "known_phrase",
        }

    lang_hint = ""
    if payload.language:
        if payload.language == "hi":
            lang_hint = (
                "The audio was detected as Hindi. "
                "The transcript may be in Devanagari script or Roman Hindi."
            )
        elif payload.language == "en":
            lang_hint = "The audio was detected as English."
        else:
            lang_hint = f"The audio was detected as language code '{payload.language}'."

    prompt = f"""You are a multilingual audio transcript interpreter.

{lang_hint}

The transcript below was produced by automatic speech recognition (Whisper).
It may contain:
- Hindi in Devanagari script or Roman letters (Romanised Hindi / Hinglish)
- English
- Code-switching between Hindi and English
- Recognition errors or uncertain words

Analyse the transcript carefully.

Provide these sections, in order:
1. Language(s) detected and whether the text appears mixed-language
2. Concise summary (1–3 sentences)
3. Main points or dialogue meaning
4. Literal meaning (if the text uses figurative or idiomatic language)
5. Intended meaning, idioms, slang, or figurative expressions
6. Emotion or tone (only if clearly supported by the text)
7. Uncertainty (flag anything that seems garbled, ambiguous, or likely mis-transcribed)

Rules:
- Do not invent events, characters, weapons, or a backstory.
- Do not treat Roman Hindi words as English names automatically.
- If the transcript looks garbled or clearly wrong, say so.
- Never fabricate a meaning when the transcript is insufficient.
- Keep the response factual and concise.

Transcript:
{transcript}
"""

    result = await _call_ollama(prompt, transcript)

    return {
        "transcript": transcript,
        "analysis": result["answer"] + transcription_warning,
        "model": result["model"],
        "source": result["source"],
    }
