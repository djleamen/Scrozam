/**
 * Route to store and retrieve the last detected song.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const router = express.Router();

let detectedSong = null;  // Store the last detected song

router.post('/', (req, res) => {
    /**
     * POST /detectedSong
     * Request body: { title: string, artist: string, album: string, ... }
     * Response: 200 OK
     */
    detectedSong = req.body;
    console.log('Stored detected song:', detectedSong);  
    res.status(200).send('Song data received');
});

router.get('/', (req, res) => {
    /**
     * GET /detectedSong
     * Response: { title: string, artist: string, album: string, ... } or null
     */
    if (detectedSong) {
        console.log(`🎧 Sending detected song to frontend: ${detectedSong.title} - ${detectedSong.artist}`);
    } else {
        console.log('📭 No new song detected, returning null.');
    }
    
    if (detectedSong) {
        const songToSend = { ...detectedSong };  // Copy the song before resetting
        detectedSong = null;  // **RESET detected song after sending**
        res.json(songToSend);
    } else {
        res.json(null);  // Send null if no song is detected
    }
});

module.exports = router;
