const axios = require('axios');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const audioData = req.body.audio;

    if (!audioData) {
        return res.status(400).send("No audio data provided");
    }

    try {
        const response = await axios.post('YOUR_URL', {
            access_key: 'YOUR_ACCESS',
            access_secret: 'YOUR_SECRET',
            data_type: 'audio',
            sample_bytes: audioData.length,
            audio: audioData
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error detecting song:", error);
        res.status(500).send("Error detecting song");
    }
});

module.exports = router;