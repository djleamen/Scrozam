/*
  This route is responsible for detecting the song from the audio sample provided by the client.
  It calculates the audio sample size, generates an HMAC-SHA1 signature, and sends the audio sample to the ACRCloud API.
  If a song is detected, it stores the song on the backend and sends the song data back to the client.
  If no song is detected, it returns a 204 status code to the client.
*/

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

  // 4. Send the audio sample to ACRCloud API
  try {
    const headers = formData.getHeaders();
    const response = await axios.post(ACRCloud_API_URL, formData, { headers });

    console.log('ACRCloud Response:', response.data);

    if (response.data.status.code === 0) {
      const musicData = response.data.metadata.music[0];
      console.log('Full music data from ACRCloud:', musicData);
    
      // Extract title and artist correctly
      const title = musicData.title;
      const artist = musicData.artists[0].name;
    
      // Log what’s being sent back to the frontend
      console.log(`Detected Song -> Title: ${title}, Artist: ${artist}`);
    
      try {
        // Store the detected song on the backend
        await axios.post('http://localhost:3000/detected-song', {
          title,
          artist,
        });
      
        console.log(`Posted detected song to backend: ${title} by ${artist}`);
        res.json({ title, artist });  // Return the detected song to the client
      } catch (postError) {
        console.error('Failed to store detected song on backend:', postError);
        res.status(500).send('Failed to store detected song');
      }
    } else if (response.data.status.code === 1001) {
      console.warn('No result detected. Retrying...');
      res.status(204).send('No result detected. Please try again.');
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