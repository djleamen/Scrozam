import pyaudio
import time
import hashlib
import hmac
import requests
import base64
import os
import wave
import io

# ACRCloud credentials
access_key = "YOUR_KEY"
access_secret = "YOUR_SECRET"
requrl = "YOUR_URL"

http_method = "POST"
http_uri = "/v1/identify"
data_type = "audio"
signature_version = "1"

# user-configurable option to stop after detecting a song
stop_after_detect = True  # change to False if you want continuous listening!

# audio parameters (feel free to play around with, these are recommended settings)
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 5

audio = pyaudio.PyAudio()
stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

print("Listening for music...")

try:
    while True:
        frames = []

        # capture audio 
        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            try:
                data = stream.read(CHUNK, exception_on_overflow=False)
            except OSError as e:
                print(f"Buffer overflow: {e}")
                continue
            frames.append(data)

        # create a buffer to store wav data
        buffer = io.BytesIO()

        # write frames to wav format using the wave module
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))

        audio_bytes = buffer.getvalue()
        sample_bytes = len(audio_bytes)

        # generate timestamp and signature
        timestamp = str(int(time.time()))
        string_to_sign = http_method + "\n" + http_uri + "\n" + access_key + "\n" + data_type + "\n" + signature_version + "\n" + timestamp
        signature = base64.b64encode(hmac.new(access_secret.encode('utf-8'), string_to_sign.encode('utf-8'), hashlib.sha1).digest()).decode('utf-8')

        # prepare request
        files = {"sample": ("audio.wav", audio_bytes, "audio/wav")}
        data = {
            "access_key": access_key,
            "sample_bytes": sample_bytes,
            "timestamp": timestamp,
            "signature": signature,
            "data_type": data_type,
            "signature_version": signature_version
        }

        # send request to ACRCloud
        response = requests.post(requrl, files=files, data=data)
        response.encoding = "utf-8"

        print("Response status code:", response.status_code)
        print("Response body:", response.text)

        # stop listening if a song was detected and stop_after_detect is True
        if response.status_code == 200:
            result = response.json()
            if result['status']['code'] == 0:  # Song detected successfully
                print("Song detected:", result['metadata']['music'][0]['title'], "by", result['metadata']['music'][0]['artists'][0]['name'])
                if stop_after_detect:
                    break

except KeyboardInterrupt:
    print("\nStopping...")
finally:
    stream.stop_stream()
    stream.close()
    audio.terminate()