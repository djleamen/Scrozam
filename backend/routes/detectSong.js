const axios = require('axios');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

router.post('/', upload.single('sample'), async (req, res) => {
    // retrieve audio file buffer from request
    const audioData = req.file.buffer; 

    if (!audioData) {
        return res.status(400).send("No audio data provided");
    }

    try {
        const response = await axios.post('YOUR_URL', {
            access_key: 'YOUR_ACCESS',
            sample_bytes: audioData.length,
            data_type: 'audio',
            signature_version: '1',
            audio: audioData.toString('base64') // convert to base64
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error detecting song:", error.message);
        res.status(500).send("Error detecting song");
    }
});

module.exports = router;