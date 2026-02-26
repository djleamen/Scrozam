/**
 * Route to store and retrieve the last detected song.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const router = express.Router();
const { popDetectedSong } = require('../songStore');

router.get('/', (req, res) => {
    /**
     * GET /detected-song
     * Returns the most recently detected song and clears it, or null.
     */
    const song = popDetectedSong();
    if (song) {
        console.log(`🎧 Sending detected song to frontend: ${song.title} - ${song.artist}`);
    } else {
        console.log('📭 No new song detected, returning null.');
    }
    res.json(song);  // null or song object
});

module.exports = router;
