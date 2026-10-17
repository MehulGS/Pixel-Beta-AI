# Pixel Beta AI — Libraries & Models Guide

> Simple explanation for beginners and new developers.
> Yeh document batata hai ki humne kaunsi Python libraries use ki hain, kaunse AI models use kiye hain, aur kyun — bilkul simple language mein.

---

## Table of Contents

1. [Python Libraries](#python-libraries)
2. [AI Models](#ai-models)
3. [How Everything Works Together](#how-everything-works-together)
4. [Why Local? Why Not Cloud?](#why-local-why-not-cloud)

---

## Python Libraries

### What is a Python Library?

Sochho ek toolbox hai. Agar aapko ek screw driver chahiye, tum khud nahin banate — toolbox se nikalte ho. Python library bhi aisi hi hai. Kisi aur ne pehle se code likh ke package kar diya hai. Hum `import` karke use karte hain.

---

### 1. FastAPI

**Kya hai:**
FastAPI ek web framework hai. Matlab — yeh ek "server" banata hai jo browser ya frontend se requests sunata hai aur jawab deta hai.

**Kyun use kiya:**
- Bahut fast hai (naam mein FastAPI isliye hai)
- Automatically API documentation banata hai (`/docs` pe jaake dekh sakte ho)
- Async support hai — matlab ek saath kai requests handle kar sakta hai bina ruke
- Code likhna easy hai, errors kam hote hain

**Kaise kaam karta hai:**
```
Browser/Frontend  →  HTTP Request  →  FastAPI  →  AI Model  →  Response  →  Browser
```
Jab tum frontend mein image upload karte ho, woh `/analyze` endpoint pe jaati hai. FastAPI uss request ko pakadta hai, BLIP model ko deta hai, aur result wapas bhejta hai.

**Real use in our project:**
```python
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # yeh function tab chalta hai jab POST /analyze call hoti hai
```

---

### 2. Uvicorn (FastAPI ke saath chalta hai)

**Kya hai:**
Uvicorn ek ASGI server hai. Simple bolo toh — FastAPI app ko actually "run" karta hai aur internet se connections accept karta hai.

**Analogy:**
FastAPI ek restaurant ka menu hai. Uvicorn woh waiter hai jo door pe khada hai aur customers ko andar laata hai.

**Kyun use kiya:**
FastAPI khud run nahi hota — use ek server chahiye. Uvicorn sabse fast aur recommended option hai.

---

### 3. Transformers (by Hugging Face)

**Kya hai:**
Yeh library hai jo thousands of pre-trained AI models ko easily use karne deti hai. Hugging Face ek company hai jo AI models publicly available karti hai — jaise GitHub code ke liye hai, Hugging Face AI models ke liye hai.

**Kyun use kiya:**
- BLIP (image captioning) model isi library se load hota hai
- SmolVLM (visual question answering) model bhi isi se aata hai
- Bina Transformers ke, in models ko khud se set up karna bahut mushkil hota — koi alag format, koi alag loading logic

**Kaise kaam karta hai:**
```python
from transformers import BlipProcessor, BlipForConditionalGeneration

# Model internet se download hota hai pehli baar (cache ho jaata hai)
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
```

`from_pretrained` matlab — Hugging Face se trained weights download karo aur model ready karo.

---

### 4. PyTorch (torch)

**Kya hai:**
PyTorch ek deep learning framework hai — basically woh foundation hai jis pe almost sab AI models bane hote hain. Facebook (Meta) ne banaya hai.

**Kyun use kiya:**
BLIP aur SmolVLM dono PyTorch mein bane hain. Transformers library PyTorch use karti hai internally. Bina PyTorch ke koi model run nahi hoga.

**Kaise kaam karta hai (simple):**
```
Image ka data → Numbers (tensors) mein convert → Model ka math → Output numbers → Text
```
PyTorch in "numbers ke batches" (tensors) ko GPU ya CPU pe process karta hai.

**Yeh line important hai:**
```python
with torch.inference_mode():
    output = model.generate(...)
```
`inference_mode()` matlab — sirf predict karo, training mat karo. Yeh memory aur speed ke liye better hai.

---

### 5. Pillow (PIL)

**Kya hai:**
PIL (Python Imaging Library) — Python mein images open, edit, aur process karne ke liye sabse popular library.

**Kyun use kiya:**
Jab user image upload karta hai toh woh raw bytes hoti hain. Pillow un bytes ko actual Image object mein convert karta hai jise AI model samajh sake.

**Kaise kaam karta hai:**
```python
from PIL import Image
from io import BytesIO

# Raw bytes → Image object
image = Image.open(BytesIO(file_contents)).convert("RGB")
```

`convert("RGB")` important hai — kuch images RGBA (transparent) ya grayscale hoti hain. AI model ko RGB chahiye (Red, Green, Blue — 3 channels).

---

### 6. faster-whisper

**Kya hai:**
OpenAI ke Whisper model ka ek faster, optimized version. Whisper ek speech-to-text (audio → text) model hai.

**Original Whisper vs faster-whisper:**
| | Original Whisper | faster-whisper |
|---|---|---|
| Speed | Slow | 4x faster |
| Memory | More | Less |
| Accuracy | Same | Same |

**Kyun use kiya:**
- Laptop/PC pe locally chalana tha
- Original Whisper slow tha CPU pe
- faster-whisper `int8` quantization use karta hai — matlab model ke numbers ko chota kar deta hai speed ke liye, accuracy almost same rehti hai

**Kaise kaam karta hai:**
```
Audio file → Whisper model sunta hai → Text segments nikalta hai → Language detect karta hai
```

```python
model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe("audio.wav", beam_size=5)
# info.language = "hi" (Hindi detect hua)
# segments = per-second text pieces
```

---

### 7. pypdf

**Kya hai:**
PDF files se text nikaalne ki library. Pure Python mein hai, koi extra software install nahi karna.

**Kyun use kiya:**
- Simple aur lightweight hai
- PDF ke har page ka text alag nikal sakta hai
- Encrypted PDF detect kar sakta hai (aur error deta hai)

**Kaise kaam karta hai:**
```python
from pypdf import PdfReader
from io import BytesIO

reader = PdfReader(BytesIO(pdf_bytes))
for page in reader.pages:
    text = page.extract_text()  # page ka text
```

**Limitation:** Sirf text-based PDFs kaam karte hain. Scanned PDFs (jisme text actually image hai) ke liye OCR (Optical Character Recognition) chahiye hoga — jo abhi implement nahi hai.

---

### 8. httpx

**Kya hai:**
Ek modern HTTP client library. Requests library ka async version. Yeh FastAPI ke andar se Ollama ke API ko call karta hai.

**Kyun use kiya:**
- `requests` library synchronous hai (blocking) — ek response aane tak ruka rehta hai
- `httpx` async hai — baaki kaam karta rehta hai jab tak Ollama response nahi deta
- FastAPI async-based hai toh `httpx` perfect fit hai

**Kaise kaam karta hai:**
```python
async with httpx.AsyncClient(timeout=120.0) as client:
    response = await client.post(
        "http://127.0.0.1:11434/api/generate",
        json={"model": "qwen2.5:1.5b", "prompt": "..."}
    )
```
`await` matlab — yahan ruko jab tak Ollama jawab de, lekin dusre requests block mat karo.

---

### 9. Pydantic

**Kya hai:**
Data validation library. FastAPI ke saath automatically aati hai. Ensure karta hai ki incoming data sahi format mein hai.

**Kyun use kiya:**
```python
class UnderstandAudioRequest(BaseModel):
    transcript: str
    language: Optional[str] = None
```

Agar koi galat data bheje (jaise transcript ki jagah number de), Pydantic automatically 422 error return karta hai — hume manually check nahi karna.

---

### 10. python-multipart

**Kya hai:**
File uploads handle karne ke liye. Jab browser file bhejta hai, woh `multipart/form-data` format mein aati hai. Yeh library use parse karti hai.

**Kyun use kiya:**
FastAPI ko file upload support ke liye yeh chahiye. Bina iske `UploadFile` kaam nahi karta.

---

### 11. asyncio (built-in Python)

**Kya hai:**
Python ki built-in library jo async programming enable karti hai. Install nahi karna — Python ke saath aata hai.

**Kyun use kiya:**
AI models CPU-intensive hain — inhe run karne mein time lagta hai. `asyncio.to_thread()` use karke hum AI processing ek alag thread mein karte hain taaki main server block na ho.

```python
# Model ek alag thread mein chalta hai
result = await asyncio.to_thread(run_model_function)
```

---

## AI Models

### What is an AI Model?

Ek AI model basically ek bahut bada mathematical function hai. Usse millions of examples pe train kiya gaya hota hai. Jab tum input dete ho (image, text, audio), woh apna "experience" use karke output deta hai.

---

### Model 1: BLIP — Image Captioning

**Full name:** Bootstrapping Language-Image Pre-training

**ID:** `Salesforce/blip-image-captioning-base`

**Kya karta hai:**
Image dekh ke uska description likhta hai.

**Example:**
- Input: [photo of a dog running in a park]
- Output: "a brown dog running in a green park"

**Kyun yeh model choose kiya:**

| Reason | Detail |
|--------|--------|
| Free & Open Source | Salesforce ne publicly release kiya hai |
| Lightweight | `base` version — laptop pe chalane layak |
| Good accuracy | General images ke liye bahut accha kaam karta hai |
| Well maintained | Transformers library officially support karta hai |

**Kaise kaam karta hai (simple):**
```
Image → Pixels → Numbers (tensors) → BLIP encoder → Visual features
Text prompt → Tokenizer → Numbers → BLIP decoder → Caption words
```

BLIP ke 2 parts hain:
1. **Image encoder** — image ko feature vectors mein convert karta hai (visual understanding)
2. **Text decoder** — in features se English words generate karta hai (language generation)

**Size:** ~990 MB download (pehli baar)

---

### Model 2: SmolVLM — Visual Question Answering

**Full name:** Small Vision Language Model

**ID:** `HuggingFaceTB/SmolVLM-256M-Instruct`

**Kya karta hai:**
Image aur question dono ko ek saath samajhta hai aur detailed answer deta hai.

**BLIP se farq kya hai:**

| | BLIP | SmolVLM |
|---|---|---|
| Task | Image caption (describe) | Image + Question → Answer |
| Input | Only image | Image + Text question |
| Output | Short description | Detailed conversational answer |
| Size | ~990 MB | ~500 MB |

**Example:**
- Image: [photo of a menu card]
- Question: "What is the price of pasta?"
- Output: "According to the menu, pasta is priced at $12.99"

**Kyun yeh model choose kiya:**

| Reason | Detail |
|--------|--------|
| 256M parameters | "256M" matlab 256 million parameters — chhota size, CPU pe fast |
| Instruct version | Specifically question-answering ke liye fine-tuned |
| Free | Hugging Face pe freely available |
| Chat template support | Standard format mein input leta hai |

**Kaise kaam karta hai:**
```
Image → Visual encoder (image features)
Question → Text encoder (text features)
Both features → Combined → Answer generation
```

Chat template use karta hai:
```python
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image_object},
            {"type": "text", "text": "What is in this image?"}
        ]
    }
]
```

**Size:** ~500 MB download

---

### Model 3: Whisper (faster-whisper small)

**Full name:** Whisper (by OpenAI), faster-whisper implementation

**Size variant used:** `small`

**Kya karta hai:**
Audio file sunata hai aur text mein convert karta hai (Speech-to-Text / Transcription). Hindi, English, aur 90+ languages support karta hai.

**Whisper size variants:**

| Size | Parameters | Speed | Accuracy |
|------|-----------|-------|----------|
| tiny | 39M | Fastest | Basic |
| base | 74M | Fast | OK |
| **small** | **244M** | **Good** | **Good** ✅ |
| medium | 769M | Slow | Better |
| large | 1550M | Very slow | Best |

**Kyun `small` choose kiya:**
- `tiny` aur `base` Hindi ke saath struggle karte hain
- `small` Hindi, Hinglish, English sab theek se handle karta hai
- `medium` aur `large` consumer laptop pe bahut slow hain
- Perfect balance: accuracy acha, speed acceptable

**Kyun faster-whisper choose kiya (not original OpenAI Whisper):**
- Original Whisper PyTorch-based hai — CPU pe slow
- faster-whisper CTranslate2 engine use karta hai — 4x faster
- `int8` compute type — model weights 32-bit se 8-bit mein compress hoti hain, 2x less memory

**Kaise kaam karta hai:**
```
Audio file → WAV format convert (16kHz, mono) → Whisper model
→ Audio chunks mein divide → Per-chunk text → Language probability
→ Final transcript + timestamps
```

**Language detection bhi karta hai automatically:**
```python
segments, info = model.transcribe(audio_path)
print(info.language)          # "hi" (Hindi detect hua)
print(info.language_probability)  # 0.97 (97% confident)
```

**Size:** ~480 MB download

---

### Model 4: Qwen 2.5 1.5B — Text Understanding & Analysis

**Full name:** Qwen 2.5, 1.5 Billion parameters

**Running via:** Ollama (separately installed)

**Model ID in Ollama:** `qwen2.5:1.5b`

**Kya karta hai:**
General text understanding — questions ke jawab, Hindi/Hinglish phrases ka matlab, audio transcripts ka analysis, PDF summarization.

**Kyun yeh model choose kiya:**

| Reason | Detail |
|--------|--------|
| 1.5B parameters | Bahut chhota — RAM 2–4 GB enough |
| Hindi/Hinglish | Hindi text samajhta hai, not just English |
| Instruction following | Rules follow karta hai (rules deke output format control kar sakte hain) |
| Qwen series quality | Alibaba ka model, surprisingly good for its size |
| Ollama support | Easily install aur run |

**1.5B matlab kya:**
- B = Billion
- 1.5 Billion = 150 crore parameters
- Comparison: GPT-3 = 175B, GPT-4 = ~1 Trillion
- Hum 1.5B use karte hain kyunki yeh laptop pe chalata hai

**Kaise kaam karta hai:**
```
Our prompt (instructions + user text)
→ Ollama API call (HTTP POST to localhost:11434)
→ Qwen model processes on CPU
→ Generated text response
→ Return to user
```

Ollama basically ek "local ChatGPT server" hai jo aapke computer pe chalta hai. Hum httpx se usse HTTP request bhejte hain jaise koi website se data maangta hai.

**Prompt engineering use hota hai:**
```
System: "You are a Hindi interpreter. Follow these rules..."
User: "Interpret: kutte main tera khoon pee jaunga"
Model: "Literal meaning: You dog, I will drink your blood..."
```

**Size:** ~900 MB download via Ollama

---

## How Everything Works Together

```
User Action               Component Used
─────────────────────────────────────────────────────

Image upload + no question
  └─ Frontend sends image to POST /analyze
  └─ FastAPI receives → read_image() validates
  └─ BLIP processes image → caption text
  └─ Response sent back to frontend

Image upload + question asked
  └─ Frontend sends image + question to POST /ask
  └─ FastAPI validates both
  └─ SmolVLM processes image + question → answer
  └─ Response sent back

Audio file upload
  └─ Frontend sends audio to POST /transcribe-audio
  └─ FastAPI validates file type and size
  └─ FFmpeg converts to WAV (if available)
  └─ faster-whisper transcribes → text + language
  └─ POST /understand-audio called with transcript
  └─ Qwen (via Ollama) analyzes transcript
  └─ Both results combined → sent to frontend

Text question typed
  └─ Frontend sends text to POST /understand-text
  └─ FastAPI checks Hindi phrase dictionary first
  └─ If known phrase → instant answer (no AI needed)
  └─ If unknown → Qwen (via Ollama) answers
  └─ Response sent back

PDF upload
  └─ Frontend sends PDF to POST /document/summarize or /document/ask
  └─ pypdf extracts text from each page
  └─ Qwen (via Ollama) summarizes or answers
  └─ Response sent back
```

---

## Why Local? Why Not Cloud?

Shayad tumhare mann mein sawaal aaya hoga — "OpenAI API use karte, itna mushkil kyun kiya?"

| Factor | Cloud API (OpenAI etc.) | Our Local Setup |
|--------|------------------------|-----------------|
| Cost | Pay per request | Free (hardware only) |
| Privacy | Data leaves your computer | Data stays on device |
| Internet | Required | Not required after setup |
| Speed | Depends on internet | Depends on CPU |
| Limits | Rate limits apply | No limits |
| Control | Company controls model | You control everything |

**Pixel Beta AI ka main goal hai:** Ek fully local, private, free multimodal AI workspace banana — jahan tumhara data kabhi bhi internet pe na jaye.

---

## Quick Reference Card

```
Library         Purpose                      Why We Chose It
──────────────────────────────────────────────────────────────────
FastAPI         Web server / API             Fast, async, auto-docs
Transformers    Load AI models               Hugging Face ecosystem
PyTorch         Run AI computations          Industry standard
Pillow          Image processing             Simple, reliable
faster-whisper  Audio transcription          4x faster than original
pypdf           PDF text extraction          Lightweight, no deps
httpx           Call Ollama API              Async HTTP client
Pydantic        Data validation              Built into FastAPI

Model           Task                         Why We Chose It
──────────────────────────────────────────────────────────────────
BLIP base       Image captioning             Free, good, 1GB
SmolVLM 256M    Visual Q&A                   Small, fast, capable
Whisper small   Audio → Text                 Hindi support, balanced
Qwen 2.5 1.5B   Text analysis / QA          Hindi aware, runs on laptop
```
