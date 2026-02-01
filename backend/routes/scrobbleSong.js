/**
 * Route to scrobble songs to Last.fm.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const API_KEY = process.env.LAST_API_KEY;
const SHARED_SECRET = process.env.LAST_SHARED_SECRET.trim();

let SESSION_KEY;

function loadSessionKey() {
    /**
     * Loads the Last.fm session key from a local file.
     */
    try {
        SESSION_KEY = fs.readFileSync(path.join(__dirname, '../session_key.txt'), 'utf8').trim();
        console.log('Loaded session key:', SESSION_KEY);
    } catch (error) {
        console.error('No session key found. Please authenticate via /auth.', error.message);
    }
}

loadSessionKey();

console.log('Loaded SHARED_SECRET');
function generateSignature(params) {
    /**
     * Generates the Last.fm API signature.
     * 
     * @param {Object} params - The parameters to include in the signature
     * @returns {string} - The generated MD5 signature
     */
    // Remove 'format' before generating the signature
    const paramsForSignature = { ...params };
    delete paramsForSignature['format']; 

    const keys = Object.keys(paramsForSignature).sort((a, b) => a.localeCompare(b));  // Sort keys by ASCII order

    let stringToSign = '';
    keys.forEach((key) => {
        stringToSign += key + paramsForSignature[key];  // Concatenate key-value pairs
    });

    // Append SHARED_SECRET exactly as it is
    stringToSign += SHARED_SECRET.trim();

    console.log('Final String for Signing (without format=json):', stringToSign);

    return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex');
}

router.post('/', async (req, res) => {
    /**
     * POST /scrobbleSong
     * Request body: { artist: string, title: string, album: string, chosenByUser: string }
     * Response: { message: string, scrobbles: object } or error message
     */
    const { artist, title, album = '', chosenByUser = '1' } = req.body;

    if (!artist || !title) {
        return res.status(400).send('Artist and title are required');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Reload session key from file before making the request
    loadSessionKey();

    // Scrobble parameters (WITHOUT format=json in the signature)
    const params = {
        'method': 'track.scrobble',
        'api_key': API_KEY,
        'sk': SESSION_KEY,
        'artist': artist,
        'track': title,
        'timestamp': timestamp.toString(),
        'chosenByUser': chosenByUser,
    };

    // Generate API signature (without format=json)
    params['api_sig'] = generateSignature(params);

    // Add 'format=json' ONLY to the request, NOT in the signature
    params['format'] = 'json';

    // Log only non-sensitive parameters for debugging
    const safeParams = {
        method: params.method,
        artist: params.artist,
        track: params.track,
        album: album,
        timestamp: params.timestamp,
        chosenByUser: params.chosenByUser,
        format: params.format
    };
    console.log('Corrected Request parameters (safe):', safeParams);

    try {
        const response = await axios.post('https://ws.audioscrobbler.com/2.0/', 
            new URLSearchParams(params).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,  // Set 10-second timeout
            family: 4,  // Force IPv4 in case of IPv6 issues
        });

        console.log('API response:', response.data);

        if (response.data?.scrobbles) {
            console.log(`🎵 Scrobbled successfully -> ${artist} - ${title} @ ${new Date(timestamp * 1000).toLocaleString()}`);
            res.json({ message: 'Song scrobbled successfully!', scrobbles: response.data.scrobbles });
        } else {
            console.error('❌ Failed to scrobble song:', response.data);
            res.status(500).send('Failed to scrobble song');
        }
    } catch (error) {
        console.error('Error scrobbling song:', error.response?.data || error.message);
        res.status(500).send('Error scrobbling song');
    }
});

module.exports = router;
