importtorch
fromtransformersimportAutoTokenizer,AutoModelForCausalLM
MODEL_ID="Qwen/Qwen2.5-1.5B-Instruct"
print("Loading model...")
tokenizer=AutoTokenizer.from_pretrained(MODEL_ID)
model=AutoModelForCausalLM.from_pretrained(
MODEL_ID,
torch_dtype=torch.float32,
)
model.eval()
test_cases=[
{
"text":"Kutte, main tera khoon pee jaunga",
"expected":"A threatening or aggressive expression, roughly meaning I'll kill you or make you pay.",
},
{
"text":"Usne meri naak katwa di",
"expected":"He or she brought shame or embarrassment on me.",
},
{
"text":"Mera dimaag mat kha",
"expected":"Stop annoying me.",
},
{
"text":"I am feeling under the weather",
"expected":"I am feeling unwell.",
},
{
"text":"Bhai, scene kya hai?",
"expected":"Bro, what's the situation or plan?",
},
]
forindex,caseinenumerate(test_cases,start=1):
    messages=[
{
"role":"system",
"content":(
"You understand Hindi, Roman Hindi, Hinglish, English, "
"idioms, slang, and figurative speech. "
"For each input, distinguish literal meaning from intended "
"meaning. Do not invent context. If multiple meanings are "
"possible, mention the uncertainty. Keep your response concise."
),
},
{
"role":"user",
"content":(
f"Interpret this expression:\n{case['text']}\n\n"
"Give:\n"
"1. Literal meaning\n"
"2. Intended meaning\n"
"3. Emotion or tone\n"
),
},
]
inputs=tokenizer.apply_chat_template(
messages,
add_generation_prompt=True,
tokenize=True,
return_dict=True,
return_tensors="pt",
)
withtorch.inference_mode():
        outputs=model.generate(
**inputs,
max_new_tokens=120,
do_sample=False,
)
new_tokens=outputs[0][inputs["input_ids"].shape[1]:]
answer=tokenizer.decode(new_tokens,skip_special_tokens=True)
print("\n"+"="*60)
print(f"TEST {index}: {case['text']}")
print(f"EXPECTED: {case['expected']}")
print(f"MODEL OUTPUT:\n{answer}")
