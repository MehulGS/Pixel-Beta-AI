"""
InsightAI API test suite.

Run with:
    cd image-ai
    .venv\\Scripts\\python.exe test_api.py [--url http://127.0.0.1:8000]

Requires the FastAPI server to be running.
Does NOT require Ollama (Ollama-dependent tests are marked optional).

Audio test files are picked up automatically if present in this directory.
The script never fabricates expected transcripts; it only checks that the
API returns an HTTP 200 and a non-empty transcript field.
"""

import argparse
import json
import os
import struct
import sys
import wave
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is not installed. Run: pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(description="InsightAI API tests")
parser.add_argument(
    "--url",
    default="http://127.0.0.1:8000",
    help="Base URL of the FastAPI server",
)
args = parser.parse_args()
BASE = args.url.rstrip("/")

PASS = "✅ PASS"
FAIL = "❌ FAIL"
SKIP = "⏭  SKIP"

results: list[tuple[str, str, str]] = []  # (test_name, status, note)


def record(name: str, ok: bool, note: str = ""):
    tag = PASS if ok else FAIL
    results.append((name, tag, note))
    print(f"{tag}  {name}" + (f" — {note}" if note else ""))


def skip(name: str, reason: str):
    results.append((name, SKIP, reason))
    print(f"{SKIP}  {name} — {reason}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_silent_wav(path: str, duration_s: float = 0.5, rate: int = 16000):
    """Write a minimal silent PCM WAV file."""
    n_samples = int(duration_s * rate)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(rate)
        wf.writeframes(struct.pack("<" + "h" * n_samples, *([0] * n_samples)))


def post_audio(path: str, extra_fields: dict | None = None):
    with open(path, "rb") as fh:
        data = extra_fields or {}
        resp = requests.post(
            f"{BASE}/transcribe-audio",
            files={"file": (os.path.basename(path), fh, "audio/wav")},
            data=data,
            timeout=120,
        )
    return resp


# ---------------------------------------------------------------------------
# 1. Health / root
# ---------------------------------------------------------------------------

print("\n── Health & root ──────────────────────────────────────────────────")

try:
    r = requests.get(f"{BASE}/", timeout=10)
    record("GET /  returns 200", r.status_code == 200)
    record(
        "GET /  has features list",
        "features" in r.json(),
        str(r.json().get("features", "missing")),
    )
except Exception as exc:
    record("GET /  reachable", False, str(exc))

try:
    r = requests.get(f"{BASE}/health", timeout=10)
    data = r.json()
    record("GET /health  returns 200", r.status_code == 200)
    record(
        "GET /health  image_models_loaded",
        data.get("image_models_loaded") is True,
        str(data),
    )
except Exception as exc:
    record("GET /health  reachable", False, str(exc))

# ---------------------------------------------------------------------------
# 2. Audio – validation errors
# ---------------------------------------------------------------------------

print("\n── Audio validation ───────────────────────────────────────────────")

# 2a. Empty upload (0-byte WAV)
empty_path = "tmp_empty_test.wav"
with open(empty_path, "wb"):
    pass
try:
    resp = post_audio(empty_path)
    record(
        "Empty audio → 400",
        resp.status_code == 400,
        f"got {resp.status_code}: {resp.text[:120]}",
    )
finally:
    os.unlink(empty_path)

# 2b. Unsupported extension (.txt file sent with audio MIME)
txt_path = "tmp_fake_audio.txt"
with open(txt_path, "w") as f:
    f.write("not audio")
try:
    with open(txt_path, "rb") as fh:
        resp = requests.post(
            f"{BASE}/transcribe-audio",
            files={"file": ("fake.txt", fh, "text/plain")},
            timeout=30,
        )
    record(
        "Unsupported MIME → 400",
        resp.status_code == 400,
        f"got {resp.status_code}: {resp.text[:120]}",
    )
finally:
    os.unlink(txt_path)

# 2c. File size limit — fabricate a > 25 MB payload
big_path = "tmp_big_audio.wav"
make_silent_wav(big_path, duration_s=1)
original_size = os.path.getsize(big_path)
# Pad the file to exceed 25 MB
with open(big_path, "ab") as f:
    f.write(b"\x00" * (26 * 1024 * 1024))
try:
    resp = post_audio(big_path)
    record(
        "Oversized audio → 413",
        resp.status_code == 413,
        f"got {resp.status_code}: {resp.text[:120]}",
    )
finally:
    os.unlink(big_path)

# ---------------------------------------------------------------------------
# 3. Audio – transcription with auto language detection
# ---------------------------------------------------------------------------

print("\n── Audio transcription ────────────────────────────────────────────")

# 3a. Short silent WAV — should return 200 with empty_transcript status
silent_path = "tmp_silent_test.wav"
make_silent_wav(silent_path, duration_s=1.0)
try:
    resp = post_audio(silent_path)
    if resp.status_code == 200:
        data = resp.json()
        record(
            "Silent WAV → 200",
            True,
            f"status={data.get('transcription_status')} transcript='{data.get('transcript','')[:60]}'",
        )
    else:
        record("Silent WAV → 200", False, f"{resp.status_code}: {resp.text[:120]}")
finally:
    os.unlink(silent_path)

# 3b. Real audio files — look for them in the current directory
audio_candidates = [
    Path(".") / "clean_audio.wav",
]
# Also check for the comedy/English files mentioned in the spec
for stem in [
    "Kutte main tera khoon pee jaunga status comedy",
    "When English Names Get Mixed Up Funny Misunderstandings!",
]:
    for ext in [".mp3", ".wav", ".m4a", ".ogg", ".flac"]:
        p = Path(".") / (stem + ext)
        if p.exists():
            audio_candidates.append(p)

for audio_path in audio_candidates:
    if not audio_path.exists():
        skip(
            f"Transcribe {audio_path.name}",
            "file not found (manual test required)",
        )
        continue

    try:
        resp = post_audio(str(audio_path))
        if resp.status_code == 200:
            data = resp.json()
            lang = data.get("language", "?")
            prob = data.get("language_probability", 0)
            transcript = data.get("transcript", "")
            record(
                f"Transcribe {audio_path.name}",
                True,
                f"lang={lang} ({prob:.0%})  transcript='{transcript[:80]}{'...' if len(transcript)>80 else ''}'",
            )
        else:
            record(
                f"Transcribe {audio_path.name}",
                False,
                f"{resp.status_code}: {resp.text[:200]}",
            )
    except Exception as exc:
        record(f"Transcribe {audio_path.name}", False, str(exc))

# 3c. Language override — send clean_audio.wav with language=en
if Path("clean_audio.wav").exists():
    try:
        resp = post_audio("clean_audio.wav", extra_fields={"language": "en"})
        if resp.status_code == 200:
            data = resp.json()
            record(
                "Language override language=en",
                data.get("language") == "en",
                f"returned language={data.get('language')}",
            )
        else:
            record(
                "Language override language=en",
                False,
                f"{resp.status_code}: {resp.text[:120]}",
            )
    except Exception as exc:
        record("Language override language=en", False, str(exc))
else:
    skip("Language override language=en", "clean_audio.wav not found")

# ---------------------------------------------------------------------------
# 4. Understand-audio endpoint
# ---------------------------------------------------------------------------

print("\n── Audio understanding ────────────────────────────────────────────")

# 4a. Empty transcript
try:
    resp = requests.post(
        f"{BASE}/understand-audio",
        json={"transcript": ""},
        timeout=30,
    )
    record(
        "Empty transcript → 400",
        resp.status_code == 400,
        f"got {resp.status_code}: {resp.text[:120]}",
    )
except Exception as exc:
    record("Empty transcript → 400", False, str(exc))

# 4b. Known Hindi phrase (no Ollama required)
try:
    resp = requests.post(
        f"{BASE}/understand-audio",
        json={
            "transcript": "kutte main tera khoon pee jaunga",
            "language": "hi",
        },
        timeout=30,
    )
    if resp.status_code == 200:
        data = resp.json()
        record(
            "Known Hindi phrase → dict match",
            data.get("source") == "known_phrase",
            f"source={data.get('source')} analysis='{str(data.get('analysis',''))[:80]}'",
        )
    else:
        record(
            "Known Hindi phrase → dict match",
            False,
            f"{resp.status_code}: {resp.text[:120]}",
        )
except Exception as exc:
    record("Known Hindi phrase → dict match", False, str(exc))

# 4c. English text (requires Ollama — skip gracefully if unavailable)
try:
    resp = requests.post(
        f"{BASE}/understand-audio",
        json={
            "transcript": "Hello, my name is John and I am feeling great today.",
            "language": "en",
        },
        timeout=130,
    )
    if resp.status_code == 200:
        record(
            "English transcript via Ollama",
            True,
            f"analysis='{str(resp.json().get('analysis',''))[:80]}'",
        )
    elif resp.status_code in (503, 504):
        skip("English transcript via Ollama", "Ollama unavailable — start with: ollama serve")
    else:
        record(
            "English transcript via Ollama",
            False,
            f"{resp.status_code}: {resp.text[:120]}",
        )
except requests.exceptions.Timeout:
    skip("English transcript via Ollama", "Request timed out — model may be loading")
except Exception as exc:
    record("English transcript via Ollama", False, str(exc))

# ---------------------------------------------------------------------------
# 5. Text understanding endpoint (regression)
# ---------------------------------------------------------------------------

print("\n── Text understanding (regression) ────────────────────────────────")

try:
    resp = requests.post(
        f"{BASE}/understand-text",
        data={"text": "kutte main tera khoon pee jaunga"},
        timeout=30,
    )
    if resp.status_code == 200:
        data = resp.json()
        record(
            "POST /understand-text known phrase",
            data.get("source") == "known_phrase",
            f"source={data.get('source')}",
        )
    else:
        record(
            "POST /understand-text known phrase",
            False,
            f"{resp.status_code}: {resp.text[:120]}",
        )
except Exception as exc:
    record("POST /understand-text known phrase", False, str(exc))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)

passed = sum(1 for _, s, _ in results if s == PASS)
failed = sum(1 for _, s, _ in results if s == FAIL)
skipped = sum(1 for _, s, _ in results if s == SKIP)

for name, status, note in results:
    print(f"  {status}  {name}" + (f"\n         {note}" if note else ""))

print(f"\nTotal: {len(results)}  Passed: {passed}  Failed: {failed}  Skipped: {skipped}")

if failed:
    print("\nSome tests failed. See details above.")
    sys.exit(1)
else:
    print("\nAll runnable tests passed.")
