import requests
import time
import hashlib
import hmac
import os
import base64

# add YOUR ACRCloud credentials
access_key = "YOUR_ACCESS"
access_secret = "YOUR_SECRET"
requrl = "YOUR_URL"

http_method = "POST"
http_uri = "/v1/identify"
data_type = "audio"
signature_version = "1"
timestamp = str(int(time.time()))

string_to_sign = http_method + "\n" + http_uri + "\n" + access_key + "\n" + data_type + "\n" + signature_version + "\n" + timestamp
signature = base64.b64encode(hmac.new(access_secret.encode('utf-8'), string_to_sign.encode('utf-8'), hashlib.sha1).digest()).decode('utf-8')

file_path = "YOUR_AUDIO_FILE_PATH.mp3"
sample_bytes = os.path.getsize(file_path)

files = {
    "sample": ("audio.mp3", open(file_path, "rb"), "audio/mpeg")
}

data = {
    "access_key": access_key,
    "sample_bytes": sample_bytes,
    "timestamp": timestamp,
    "signature": signature,
    "data_type": data_type,
    "signature_version": signature_version
}

response = requests.post(requrl, files=files, data=data)
response.encoding = "utf-8"

print("Response status code:", response.status_code)
print("Response body:", response.text)