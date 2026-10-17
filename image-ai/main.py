
from contextlib import asynccontextmanager
from io import BytesIO
from fastapi.middleware.cors import CORSMiddleware
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from transformers import BlipProcessor, BlipForConditionalGeneration

MODEL_NAME = "Salesforce/blip-image-captioning-base"

processor = None
model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global processor, model

    print("Loading AI image model...")

    processor = BlipProcessor.from_pretrained(MODEL_NAME)
    model = BlipForConditionalGeneration.from_pretrained(MODEL_NAME)
    model.eval()

    print("AI model loaded successfully!")
    yield


app = FastAPI(
    title="Image Understanding AI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Image Understanding AI is running"}


@app.post("/analyze")
def analyze_image(file: UploadFile = File(...)):
    allowed_types = {"image/jpeg", "image/png", "image/webp"}

    if file.content_type not in allowed_types:
        raise HTTPException(400, "Upload JPG, PNG, or WebP.")

    contents = file.file.read(8 * 1024 * 1024 + 1)

    if not contents:
        raise HTTPException(400, "The file is empty.")

    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(413, "Maximum image size is 8 MB.")

    try:
        with Image.open(BytesIO(contents)) as source:
            source.verify()

        with Image.open(BytesIO(contents)) as source:
            image = source.convert("RGB")

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "Invalid image file.")

    try:
        inputs = processor(images=image, return_tensors="pt")

        with torch.inference_mode():
            output = model.generate(
                **inputs,
                max_new_tokens=60,
            )

        description = processor.decode(
            output[0],
            skip_special_tokens=True,
        )

        return {
            "filename": file.filename,
            "description": description,
            "model": MODEL_NAME,
        }

    except Exception:
        raise HTTPException(500, "Image analysis failed.")

    finally:
        file.file.close()
