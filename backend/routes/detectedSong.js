const express = require('express');
const router = express.Router();

let detectedSong = null;  // Store the last detected song

// Store the detected song on POST
router.post('/', (req, res) => {
    detectedSong = req.body;
    console.log('Stored detected song:', detectedSong);  
    res.status(200).send('Song data received');
});

// Return the last detected song on GET, then clear it
router.get('/', (req, res) => {
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