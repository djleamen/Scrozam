const express = require('express');
const bodyParser = require('body-parser');
const detectSongRoute = require('./routes/detectSong');
const scrobbleSongRoute = require('./routes/scrobbleSong');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' })); // up to 10 MB payloads

// Routes
app.use('/detect-song', detectSongRoute);
app.use('/scrobble-song', scrobbleSongRoute);

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});