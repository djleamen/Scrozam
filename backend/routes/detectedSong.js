const express = require('express');
const router = express.Router();

let detectedSong = null;  // Store the last detected song

// Store the detected song on POST
router.post('/', (req, res) => {
    detectedSong = req.body;
    console.log('Stored detected song:', detectedSong);  // Log the detected song
    res.status(200).send('Song data received');
});

// Return the last detected song on GET
router.get('/', (req, res) => {
    console.log('Returning detected song to frontend:', detectedSong);  // Log what is being returned
    res.json(detectedSong);
});

module.exports = router;