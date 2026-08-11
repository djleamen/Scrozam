/**
 * In-memory song store for Scrozam.
 * Replaces the HTTP POST to /detected-song from within detectSong.js
 * to avoid internal circular HTTP calls.
 *
 * Detected songs are keyed by the authenticated user's id so that
 * concurrent users never receive one another's results. Both routes that
 * use this store run behind requireAuth, so a userId is always available.
 *
 * Written by DJ Leamen 2024-2026
 */

// Map<userId, { title: string, artist: string }>
const detectedSongs = new Map();

/**
 * Stores the most recently detected song for a user.
 * @param {string} userId - Authenticated user's id (Google sub)
 * @param {{ title: string, artist: string }} song
 */
function setDetectedSong(userId, song) {
    if (!userId) return;
    detectedSongs.set(userId, song);
    console.log('📀 Stored detected song in songStore:', song);
}

/**
 * Returns the most recently detected song for a user and clears it.
 * @param {string} userId - Authenticated user's id (Google sub)
 * @returns {{ title: string, artist: string } | null}
 */
function popDetectedSong(userId) {
    if (!userId) return null;
    const song = detectedSongs.get(userId) ?? null;
    detectedSongs.delete(userId);
    return song;
}

module.exports = { setDetectedSong, popDetectedSong };
