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

// load session key from file
try {
    SESSION_KEY = fs.readFileSync(path.join(__dirname, '../session_key.txt'), 'utf8').trim();
    console.log('Loaded session key:', SESSION_KEY);
} catch (error) {
    console.error('No session key found. Please authenticate via /auth.');
    ///process.exit(1); // exit if no session key is found
}

// function to generate the api signature
function generateSignature(params) {
    const keys = Object.keys(params).sort(); // sort alphabetically
    let stringToSign = '';

    keys.forEach((key) => {
        stringToSign += key + params[key];
    });

    stringToSign += SHARED_SECRET; 
    console.log('String to sign:', stringToSign);
    return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex');
}

router.post('/', async (req, res) => {
    const { artist, title } = req.body;

    if (!artist || !title) {
        return res.status(400).send('Artist and title are required');
    }

    const timestamp = Math.floor(Date.now() / 1000); // current unix timestamp
    const params = {
        method: 'track.scrobble',
        api_key: API_KEY,
        sk: SESSION_KEY,
        artist: artist,
        track: title,
        timestamp: timestamp.toString(),
        format: 'json'
    };

    // generate api signature
    params.api_sig = generateSignature(params);

    try {
        // send request to Last.fm
        const response = await axios.post('https://ws.audioscrobbler.com/2.0/', new URLSearchParams(params).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data && response.data.scrobbles) {
            res.json({ message: 'Song scrobbled successfully!', scrobbles: response.data.scrobbles });
        } else {
            console.error('Failed to scrobble song:', response.data);
            res.status(500).send('Failed to scrobble song');
        }
    } catch (error) {
        console.error('Error scrobbling song:', error.response?.data || error.message);
        console.error('Request params:', params);
        res.status(500).send('Error scrobbling song');
    }
});

module.exports = router;