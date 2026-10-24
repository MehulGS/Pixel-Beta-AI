
import time

import numpy as np
import pyaudiowpatch as pyaudio
import requests
from openwakeword.model import Model

from pixel_voice.bridge import set_listener_status


MODEL_PATH = r"models\hey_pixel.onnx"
MODEL_NAME = "hey_pixel"

API_URL = "http://127.0.0.1:8000/voice/wake"

MIC_DEVICE_INDEX = 1
SAMPLE_RATE = 16000
CHUNK_SIZE = 1280
THRESHOLD = 0.5
COOLDOWN_SECONDS = 3.0


def main():
    print("Loading Hey Pixel model...")

    model = Model(
        wakeword_models=[MODEL_PATH],
        inference_framework="onnx",
    )

    audio = pyaudio.PyAudio()
    stream = None

    try:
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=SAMPLE_RATE,
            input=True,
            input_device_index=MIC_DEVICE_INDEX,
            frames_per_buffer=CHUNK_SIZE,
        )

        print("PIXEL wake-word listener started.")
        print("Say: Hey Pixel")
        print("Press Ctrl+C to stop.")

        set_listener_status(True)
        last_detection_time = 0.0

        while True:
            raw_audio = stream.read(
                CHUNK_SIZE,
                exception_on_overflow=False,
            )
            audio_frame = np.frombuffer(raw_audio, dtype=np.int16)
            predictions = model.predict(audio_frame)

            now = time.time()

            for name, score in predictions.items():
                if (
                    name == MODEL_NAME
                    and score >= THRESHOLD
                    and now - last_detection_time >= COOLDOWN_SECONDS
                ):
                    print(f"Hey Pixel detected (score: {score:.2f})")

                    try:
                        response = requests.post(API_URL, timeout=3)
                        response.raise_for_status()
                        print("Wake event sent:", response.json())
                        last_detection_time = now
                    except requests.RequestException as exc:
                        print("Could not send wake event:", exc)

    except KeyboardInterrupt:
        print("\nStopping PIXEL listener...")

    finally:
        set_listener_status(False)

        if stream is not None:
            stream.stop_stream()
            stream.close()

        audio.terminate()
        print("PIXEL listener stopped.")


if __name__ == "__main__":
    main()
