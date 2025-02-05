const axios = require('axios');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const crypto = require('crypto');  // For HMAC signature generation
require('dotenv').config();
const fs = require('fs');

const ACRCloud_API_URL = process.env.ACR_URL;
const ACCESS_KEY = process.env.ACR_ACCESS_KEY;
const ACCESS_SECRET = process.env.ACR_SHARED;

const upload = multer();

router.post('/', upload.single('sample'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).send('No audio data provided');
  }

  // 1. Calculate audio sample size
  const sampleBytes = req.file.buffer.length;

  // 2. Generate the HMAC-SHA1 signature
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `POST\n/v1/identify\n${ACCESS_KEY}\naudio\n1\n${timestamp}`;
  const signature = crypto.createHmac('sha1', ACCESS_SECRET).update(stringToSign).digest('base64');

  // 3. Prepare form data
  const formData = new FormData();
  formData.append('access_key', ACCESS_KEY);
  formData.append('sample_bytes', sampleBytes.toString());  // Include sample size
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('data_type', 'audio');
  formData.append('signature_version', '1');
  formData.append('sample', req.file.buffer, {
    filename: 'audio.wav',
    contentType: 'audio/wav',
  });

  try {
    const headers = formData.getHeaders();
    const response = await axios.post(ACRCloud_API_URL, formData, { headers });

    console.log('ACRCloud Response:', response.data);

    if (response.data.status.code === 0) {
      const { title, artists } = response.data.metadata.music[0];
      res.json({ title, artist: artists[0].name });
    } else {
      console.error('Song detection failed:', response.data.status.msg);
      res.status(500).send('Song detection failed');
    }
  } catch (error) {
    console.error('Error detecting song:', error.message);
    res.status(500).send('Error detecting song');
  }
});

module.exports = router;