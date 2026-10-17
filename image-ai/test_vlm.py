
import torch
from transformers import AutoProcessor, AutoModelForImageTextToText

MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct"

print("Loading SmolVLM model...")

processor = AutoProcessor.from_pretrained(MODEL_ID)
model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
)

model.eval()

print("Model loaded successfully!")

image_path = input("Enter your image path: ").strip().strip('"')
question = input("Ask a question about the image: ").strip()

from PIL import Image

image = Image.open(image_path).convert("RGB")

messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": question},
        ],
    }
]

prompt = processor.apply_chat_template(
    messages,
    add_generation_prompt=True,
)

inputs = processor(
    text=prompt,
    images=[image],
    return_tensors="pt",
)

with torch.inference_mode():
    output = model.generate(
        **inputs,
        max_new_tokens=100,
    )

answer = processor.decode(
    output[0],
    skip_special_tokens=True,
)

print("\nAI answer:")
print(answer)
