
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"

print("Loading text model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
)
model.eval()

print("Text model loaded successfully!")

transcript = input("Paste your audio transcription: ").strip()


messages = [
    {
        "role": "system",
        "content": (
            "You are a Hindi and Hinglish dialogue interpreter. "
            "The transcript may be Hindi written using English letters. "
            "Do not interpret Hindi words as English names. "
            "Do not invent stories or events. "
            "Explain the literal meaning first, then the emotion and intent. "
            "If the input is a threat or dramatic dialogue, identify it as such. "
            "Keep the answer short and factual."
        )
    },
    {
        "role": "user",
        "content": (
            "Interpret this Roman Hindi dialogue. "
            "Give its English meaning, emotion, and likely intent:\n\n"
            + transcript
        )
    }
]


inputs = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt",
)

with torch.inference_mode():
    outputs = model.generate(
        **inputs,
        max_new_tokens=220,
        do_sample=False,
    )

new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
answer = tokenizer.decode(new_tokens, skip_special_tokens=True)

print("\n--- AUDIO UNDERSTANDING ---")
print(answer)
