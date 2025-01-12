const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
    const { artist, title } = req.body;

    try {
        const response = await axios.post('LASTFM_API_URL', { artist, title });
        res.json({ message: 'Song scrobbled successfully!' });
    } catch (error) {
        console.error('Error scrobbling song:', error);
        res.status(500).send('Error scrobbling song');
    }
});

module.exports = router;