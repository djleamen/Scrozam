const express = require('express');
const router = express.Router();

let detectedSong = null;

router.post('/', (req, res) => {
    detectedSong = req.body;
    res.status(200).send('Song data received');
});

router.get('/', (req, res) => {
    res.json(detectedSong);
});

module.exports = router;