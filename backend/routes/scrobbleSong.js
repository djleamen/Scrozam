const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.LAST_API_KEY;
const SHARED_SECRET = process.env.LAST_SHARED_SECRET;

let SESSION_KEY;

// Load session key from file
try {
    SESSION_KEY = fs.readFileSync(path.join(__dirname, '../session_key.txt'), 'utf8').trim();
    console.log('Loaded session key:', SESSION_KEY);
} catch (error) {
    console.error('No session key found. Please authenticate via /auth.');
    // process.exit(1);
}

// Function to generate the API signature
function generateSignature(params) {
    const keys = Object.keys(params).sort();  // Sort keys alphabetically
    let stringToSign = '';

    keys.forEach((key) => {
      // Remove array notation like [0], [1] when adding to signature
      const cleanKey = key.replace(/\[\d+\]$/, '');
      stringToSign += cleanKey + params[key];  // Concatenate cleaned key-value pairs
    });

    stringToSign += SHARED_SECRET;  // Append the shared secret
    console.log('Corrected string to sign:', stringToSign);
    return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex');
}

router.post('/', async (req, res) => {
    const { artist, title, album = '', chosenByUser = '1' } = req.body;

    if (!artist || !title) {
        return res.status(400).send('Artist and title are required');
    }

    const timestamp = Math.floor(Date.now() / 1000);  // Current Unix timestamp

    // Prepare scrobble parameters using array notation
    const params = {
        method: 'track.scrobble',
        api_key: API_KEY,
        sk: SESSION_KEY,
        'artist[0]': artist,
        'track[0]': title,
        'timestamp[0]': timestamp.toString(),
        'album[0]': album,
        'chosenByUser[0]': chosenByUser,
        format: 'json'
    };

    // Generate API signature
    params.api_sig = generateSignature(params);

    try {
        const response = await axios.post(
            'https://ws.audioscrobbler.com/2.0/',
            new URLSearchParams(params).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 10000,  // Set a 10-second timeout
              family: 4,  // Force IPv4
            }
          );

        if (response.data && response.data.scrobbles) {
            console.log('Scrobble Response:', response.data);
            res.json({ message: 'Song scrobbled successfully!', scrobbles: response.data.scrobbles });
        } else {
            console.error('Failed to scrobble song:', response.data);
            res.status(500).send('Failed to scrobble song');
        }
    } catch (error) {
        console.error('Error scrobbling song:', error.response?.data || error.message);
        res.status(500).send('Error scrobbling song');
    }
});

module.exports = router;