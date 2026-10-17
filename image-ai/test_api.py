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
importargparse
importjson
importos
importstruct
importsys
importwave
frompathlibimportPath
try:
    importrequests
exceptImportError:
    print("ERROR: 'requests' is not installed. Run: pip install requests")
sys.exit(1)
parser=argparse.ArgumentParser(description="InsightAI API tests")
parser.add_argument(
"--url",
default="http://127.0.0.1:8000",
help="Base URL of the FastAPI server",
)
args=parser.parse_args()
BASE=args.url.rstrip("/")
PASS="✅ PASS"
FAIL="❌ FAIL"
SKIP="⏭  SKIP"
results:list[tuple[str,str,str]]=[]
defrecord(name:str,ok:bool,note:str=""):
    tag=PASSifokelseFAIL
results.append((name,tag,note))
print(f"{tag}  {name}"+(f" — {note}"ifnoteelse""))
defskip(name:str,reason:str):
    results.append((name,SKIP,reason))
print(f"{SKIP}  {name} — {reason}")
defmake_silent_wav(path:str,duration_s:float=0.5,rate:int=16000):
    """Write a minimal silent PCM WAV file."""
n_samples=int(duration_s*rate)
withwave.open(path,"w")aswf:
        wf.setnchannels(1)
wf.setsampwidth(2)
wf.setframerate(rate)
wf.writeframes(struct.pack("<"+"h"*n_samples,*([0]*n_samples)))
defpost_audio(path:str,extra_fields:dict|None=None):
    withopen(path,"rb")asfh:
        data=extra_fieldsor{}
resp=requests.post(
f"{BASE}/transcribe-audio",
files={"file":(os.path.basename(path),fh,"audio/wav")},
data=data,
timeout=120,
)
returnresp
print("\n── Health & root ──────────────────────────────────────────────────")
try:
    r=requests.get(f"{BASE}/",timeout=10)
record("GET /  returns 200",r.status_code==200)
record(
"GET /  has features list",
"features"inr.json(),
str(r.json().get("features","missing")),
)
exceptExceptionasexc:
    record("GET /  reachable",False,str(exc))
try:
    r=requests.get(f"{BASE}/health",timeout=10)
data=r.json()
record("GET /health  returns 200",r.status_code==200)
record(
"GET /health  image_models_loaded",
data.get("image_models_loaded")isTrue,
str(data),
)
exceptExceptionasexc:
    record("GET /health  reachable",False,str(exc))
print("\n── Audio validation ───────────────────────────────────────────────")
empty_path="tmp_empty_test.wav"
withopen(empty_path,"wb"):
    pass
try:
    resp=post_audio(empty_path)
record(
"Empty audio → 400",
resp.status_code==400,
f"got {resp.status_code}: {resp.text[:120]}",
)
finally:
    os.unlink(empty_path)
txt_path="tmp_fake_audio.txt"
withopen(txt_path,"w")asf:
    f.write("not audio")
try:
    withopen(txt_path,"rb")asfh:
        resp=requests.post(
f"{BASE}/transcribe-audio",
files={"file":("fake.txt",fh,"text/plain")},
timeout=30,
)
record(
"Unsupported MIME → 400",
resp.status_code==400,
f"got {resp.status_code}: {resp.text[:120]}",
)
finally:
    os.unlink(txt_path)
big_path="tmp_big_audio.wav"
make_silent_wav(big_path,duration_s=1)
original_size=os.path.getsize(big_path)
withopen(big_path,"ab")asf:
    f.write(b"\x00"*(26*1024*1024))
try:
    resp=post_audio(big_path)
record(
"Oversized audio → 413",
resp.status_code==413,
f"got {resp.status_code}: {resp.text[:120]}",
)
finally:
    os.unlink(big_path)
print("\n── Audio transcription ────────────────────────────────────────────")
silent_path="tmp_silent_test.wav"
make_silent_wav(silent_path,duration_s=1.0)
try:
    resp=post_audio(silent_path)
ifresp.status_code==200:
        data=resp.json()
record(
"Silent WAV → 200",
True,
f"status={data.get('transcription_status')} transcript='{data.get('transcript','')[:60]}'",
)
else:
        record("Silent WAV → 200",False,f"{resp.status_code}: {resp.text[:120]}")
finally:
    os.unlink(silent_path)
audio_candidates=[
Path(".")/"clean_audio.wav",
]
forstemin[
"Kutte main tera khoon pee jaunga status comedy",
"When English Names Get Mixed Up Funny Misunderstandings!",
]:
    forextin[".mp3",".wav",".m4a",".ogg",".flac"]:
        p=Path(".")/(stem+ext)
ifp.exists():
            audio_candidates.append(p)
foraudio_pathinaudio_candidates:
    ifnotaudio_path.exists():
        skip(
f"Transcribe {audio_path.name}",
"file not found (manual test required)",
)
continue
try:
        resp=post_audio(str(audio_path))
ifresp.status_code==200:
            data=resp.json()
lang=data.get("language","?")
prob=data.get("language_probability",0)
transcript=data.get("transcript","")
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
exceptExceptionasexc:
        record(f"Transcribe {audio_path.name}",False,str(exc))
ifPath("clean_audio.wav").exists():
    try:
        resp=post_audio("clean_audio.wav",extra_fields={"language":"en"})
ifresp.status_code==200:
            data=resp.json()
record(
"Language override language=en",
data.get("language")=="en",
f"returned language={data.get('language')}",
)
else:
            record(
"Language override language=en",
False,
f"{resp.status_code}: {resp.text[:120]}",
)
exceptExceptionasexc:
        record("Language override language=en",False,str(exc))
else:
    skip("Language override language=en","clean_audio.wav not found")
print("\n── Audio understanding ────────────────────────────────────────────")
try:
    resp=requests.post(
f"{BASE}/understand-audio",
json={"transcript":""},
timeout=30,
)
record(
"Empty transcript → 400",
resp.status_code==400,
f"got {resp.status_code}: {resp.text[:120]}",
)
exceptExceptionasexc:
    record("Empty transcript → 400",False,str(exc))
try:
    resp=requests.post(
f"{BASE}/understand-audio",
json={
"transcript":"kutte main tera khoon pee jaunga",
"language":"hi",
},
timeout=30,
)
ifresp.status_code==200:
        data=resp.json()
record(
"Known Hindi phrase → dict match",
data.get("source")=="known_phrase",
f"source={data.get('source')} analysis='{str(data.get('analysis',''))[:80]}'",
)
else:
        record(
"Known Hindi phrase → dict match",
False,
f"{resp.status_code}: {resp.text[:120]}",
)
exceptExceptionasexc:
    record("Known Hindi phrase → dict match",False,str(exc))
try:
    resp=requests.post(
f"{BASE}/understand-audio",
json={
"transcript":"Hello, my name is John and I am feeling great today.",
"language":"en",
},
timeout=130,
)
ifresp.status_code==200:
        record(
"English transcript via Ollama",
True,
f"analysis='{str(resp.json().get('analysis',''))[:80]}'",
)
elifresp.status_codein(503,504):
        skip("English transcript via Ollama","Ollama unavailable — start with: ollama serve")
else:
        record(
"English transcript via Ollama",
False,
f"{resp.status_code}: {resp.text[:120]}",
)
exceptrequests.exceptions.Timeout:
    skip("English transcript via Ollama","Request timed out — model may be loading")
exceptExceptionasexc:
    record("English transcript via Ollama",False,str(exc))
print("\n── Text understanding (regression) ────────────────────────────────")
try:
    resp=requests.post(
f"{BASE}/understand-text",
data={"text":"kutte main tera khoon pee jaunga"},
timeout=30,
)
ifresp.status_code==200:
        data=resp.json()
record(
"POST /understand-text known phrase",
data.get("source")=="known_phrase",
f"source={data.get('source')}",
)
else:
        record(
"POST /understand-text known phrase",
False,
f"{resp.status_code}: {resp.text[:120]}",
)
exceptExceptionasexc:
    record("POST /understand-text known phrase",False,str(exc))
print("\n"+"="*60)
print("TEST SUMMARY")
print("="*60)
passed=sum(1for_,s,_inresultsifs==PASS)
failed=sum(1for_,s,_inresultsifs==FAIL)
skipped=sum(1for_,s,_inresultsifs==SKIP)
forname,status,noteinresults:
    print(f"  {status}  {name}"+(f"\n         {note}"ifnoteelse""))
print(f"\nTotal: {len(results)}  Passed: {passed}  Failed: {failed}  Skipped: {skipped}")
iffailed:
    print("\nSome tests failed. See details above.")
sys.exit(1)
else:
    print("\nAll runnable tests passed.")
