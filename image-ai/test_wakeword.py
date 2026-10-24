
import time

import numpy as np
import pyaudiowpatch as pyaudio
from openwakeword.model import Model

COOLDOWN_SECONDS = 2.0

MODEL_PATH = r"models\hey_pixel.onnx"
MODEL_NAME = "hey_pixel"

MIC_DEVICE_INDEX = 1
SAMPLE_RATE = 16000
CHUNK_SIZE = 1280
THRESHOLD = 0.5
TEST_DURATION_SECONDS = 30


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

        print(f"Listening for '{MODEL_NAME}' for {TEST_DURATION_SECONDS} seconds.")
        print("Say: Hey Pixel")
        print("Press Ctrl+C to stop.")

        last_detection_time = 0.0
        end_time = time.time() + TEST_DURATION_SECONDS

        while time.time() < end_time:
            raw_audio = stream.read(
                CHUNK_SIZE,
                exception_on_overflow=False,
            )

            audio_frame = np.frombuffer(raw_audio, dtype=np.int16)
            predictions = model.predict(audio_frame)

            now = time.time()

            for name, score in predictions.items():
                if (
                    score >= THRESHOLD
                    and now - last_detection_time >= COOLDOWN_SECONDS
                ):
                    print(
                        f"Wake-word '{name}' detected "
                        f"with score {score:.2f}!"
                    )
                    last_detection_time = now

        print("Test finished.")

    except KeyboardInterrupt:
        print("\nStopped by user.")

    finally:
        if stream is not None:
            stream.stop_stream()
            stream.close()

        audio.terminate()


if __name__ == "__main__":
    main()
