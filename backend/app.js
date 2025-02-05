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
    const token = req.query.token;

    if (!token) {
        return res.status(400).send('Missing token');
    }

    const method = 'auth.getSession';
    const params = `api_key${API_KEY}method${method}token${token}`;
    const api_sig = crypto.createHash('md5').update(params + SHARED_SECRET).digest('hex');

    try {
        const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
            params: {
                method: method,
                api_key: API_KEY,
                token: token,
                api_sig: api_sig,
                format: 'json'
            }
        });

        if (response.data && response.data.session) {
            SESSION_KEY = response.data.session.key;
            console.log('Session Key:', SESSION_KEY);

            // save the session key to a file
            fs.writeFileSync(sessionKeyPath, SESSION_KEY, 'utf8');

            res.send(`Session Key: ${SESSION_KEY}`);
        } else {
            res.status(500).send('Failed to retrieve session key');
        }
    } catch (error) {
        console.error('Error fetching session key:', error.response?.data || error.message);
        res.status(500).send('Error fetching session key');
    }
});
