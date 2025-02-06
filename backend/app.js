const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
console.log('ACR Access Key:', process.env.ACR_ACCESS_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors());

// Import routes
const detectSongRoute = require('./routes/detectSong');
const scrobbleSongRoute = require('./routes/scrobbleSong');
const detectedSongRoute = require('./routes/detectedSong');

const API_KEY = process.env.LAST_API_KEY;
const SHARED_SECRET = process.env.LAST_SHARED_SECRET;

app.use(express.json());

app.use('/detect-song', detectSongRoute);
app.use('/scrobble-song', scrobbleSongRoute);
app.use('/detected-song', detectedSongRoute);

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

// Try loading the session key from the file
let SESSION_KEY = null;
const sessionKeyPath = path.join(__dirname, 'session_key.txt');

try {
    SESSION_KEY = fs.readFileSync(sessionKeyPath, 'utf8').trim();
    console.log('Loaded session key:', SESSION_KEY);
} catch (error) {
    console.warn('No session key found. Please authenticate via /auth.');
}

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.get('/auth', (req, res) => {
    const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=http://localhost:3000/callback`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    console.log('Received callback with token:', req.query.token);

    const token = req.query.token;
    if (!token) {
        console.error('Missing token in callback.');
        return res.status(400).send('Missing token');
    }

    const method = 'auth.getSession';
    const params = {
        api_key: API_KEY,
        method: 'auth.getSession',
        token: token,
      };
      
      const stringToSign = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('') + SHARED_SECRET;
    const api_sig = crypto.createHash('md5').update(stringToSign).digest('hex');

      try {
        console.log('Preparing to make API request to exchange token...');
        const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
            params: {
                method: method,
                api_key: API_KEY,
                token: token,
                api_sig: api_sig,
                format: 'json',
            },
        });
    
        console.log('API response received:', response.data);  // <-- Print full response here
    
        if (response.data && response.data.session) {
            const sessionKey = response.data.session.key;
            console.log('Successfully retrieved session key:', sessionKey);
    
            fs.writeFileSync(sessionKeyPath, sessionKey, 'utf8');
            return res.send(`🎉 Successfully authenticated! Your session key is: ${sessionKey}`);
        } else {
            console.error('Failed to retrieve session key:', response.data);
            return res.status(500).send('Failed to retrieve session key.');
        }
    } catch (error) {
        console.error('Error fetching session key:', error.response?.data || error.message);
        return res.status(500).send('Error fetching session key.');
    }
});
