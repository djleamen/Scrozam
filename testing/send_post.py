import os
import json
import pyaudio
import wave
import time
import base64
import hmac
import hashlib
import requests
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ACRCloud credentials
ACCESS_KEY = os.getenv("ACR_ACCESS_KEY")
ACCESS_SECRET = os.getenv("ACR_ACCESS_SECRET")
REQ_URL = os.getenv("ACR_URL")

# Audio configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 5

# Initialize PyAudio
audio = pyaudio.PyAudio()

def record_audio():
    print("Recording audio...")
    stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
    frames = []

    for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
        try:
            data = stream.read(CHUNK, exception_on_overflow=False)
        except OSError as e:
            print(f"Buffer overflow: {e}")
            continue
        frames.append(data)

    stream.stop_stream()
    stream.close()

    # Save frames to a WAV byte stream
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))

    return buffer.getvalue()

def generate_signature():
    timestamp = str(int(time.time()))
    string_to_sign = f"POST\n/v1/identify\n{ACCESS_KEY}\naudio\n1\n{timestamp}"
    signature = base64.b64encode(hmac.new(ACCESS_SECRET.encode('utf-8'), string_to_sign.encode('utf-8'), hashlib.sha1).digest()).decode('utf-8')
    return signature, timestamp

def send_audio_to_acrcloud(audio_bytes):
    sample_bytes = len(audio_bytes)
    signature, timestamp = generate_signature()

    files = {"sample": ("audio.wav", audio_bytes, "audio/wav")}
    data = {
        "access_key": ACCESS_KEY,
        "sample_bytes": sample_bytes,
        "timestamp": timestamp,
        "signature": signature,
        "data_type": "audio",
        "signature_version": "1"
    }

    response = requests.post(REQ_URL, files=files, data=data)
    return response

def main():
    while True:
        audio_bytes = record_audio()

        try:
            print("Sending audio to ACRCloud...")
            response = send_audio_to_acrcloud(audio_bytes)

            if response.status_code == 200:
                result = response.json()
                if result['status']['code'] == 0:  # Song detected
                    music_info = result['metadata']['music'][0]
                    title = music_info['title']
                    artist = music_info['artists'][0]['name']
                    print(f"Song detected: {title} by {artist}")

                    # Send detected song data to backend
                    song_data = {
                        "title": title,
                        "artist": artist
                    }
                    requests.post('http://localhost:3000/detected-song', json=song_data)

                    # Stop after detecting a song if configured
                    if os.getenv("STOP_AFTER_DETECT", "True") == "True":
                        break
                else:
                    print("Song detection failed. Response:", result)
            else:
                print("Error from ACRCloud. Status Code:", response.status_code)
                print(response.text)

        except Exception as e:
            print("An error occurred during detection:", str(e))

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        audio.terminate()