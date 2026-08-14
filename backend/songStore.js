/**
 * In-memory song store for Scrozam.
 * Replaces the HTTP POST to /detected-song from within detectSong.js
 * to avoid internal circular HTTP calls.
 *
 * Detected songs are keyed by the authenticated user's id so that
 * concurrent users never receive one another's results. Both routes that
 * use this store run behind requireAuth, so a userId is always available.
 *
 * A detected song is only relevant for the brief window between detection
 * and the frontend's next poll, so each entry carries a short TTL. Expired
 * entries are pruned on every write, which keeps the map from growing
 * unbounded when a user detects a song but never polls (e.g. disconnects).
 *
 * Written by DJ Leamen 2024-2026
 */

// Map<userId, { song: { title, artist }, expiresAt: number }>
const detectedSongs = new Map();

// A pending detection is short-lived; the frontend polls shortly after.
const ENTRY_TTL_MS = 5 * 60 * 1000;

/**
 * Removes any entries that have passed their TTL.
 * @param {number} now - Current timestamp in ms
 */
function pruneExpired(now) {
    for (const [userId, entry] of detectedSongs) {
        if (entry.expiresAt <= now) {
            detectedSongs.delete(userId);
        }
    }
}

/**
 * Stores the most recently detected song for a user.
 * @param {string} userId - Authenticated user's id (Google sub)
 * @param {{ title: string, artist: string }} song
 */
function setDetectedSong(userId, song) {
    if (!userId) return;
    const now = Date.now();
    pruneExpired(now);
    detectedSongs.set(userId, { song, expiresAt: now + ENTRY_TTL_MS });
    console.log('📀 Stored detected song in songStore:', song);
}

/**
 * Returns the most recently detected song for a user and clears it.
 * Entries past their TTL are treated as absent.
 * @param {string} userId - Authenticated user's id (Google sub)
 * @returns {{ title: string, artist: string } | null}
 */
function popDetectedSong(userId) {
    if (!userId) return null;
    const entry = detectedSongs.get(userId);
    detectedSongs.delete(userId);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.song;
}

module.exports = { setDetectedSong, popDetectedSong };
