/**
 * In-memory song store for Scrozam.
 * Replaces the HTTP POST to /detected-song from within detectSong.js
 * to avoid internal circular HTTP calls.
 * 
 * Written by DJ Leamen 2024-2026
 */

let detectedSong = null;

/**
 * Stores the most recently detected song.
 * @param {{ title: string, artist: string }} song
 */
function setDetectedSong(song) {
    detectedSong = song;
    console.log('📀 Stored detected song in songStore:', song);
}

/**
 * Returns the most recently detected song and clears it.
 * @returns {{ title: string, artist: string } | null}
 */
function popDetectedSong() {
    const song = detectedSong;
    detectedSong = null;
    return song;
}

module.exports = { setDetectedSong, popDetectedSong };
