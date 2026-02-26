/**
 * In-memory user store for Scrozam.
 * Maps Google sub (user ID) to user profile and Last.fm session key.
 * 
 * Written by DJ Leamen 2024-2026
 */

const users = {};

/**
 * Creates or retrieves a user entry.
 * @param {string} googleSub - Google user subject ID
 * @param {{ email: string, name: string, picture: string }} profile - Google profile data
 * @returns {{ googleSub, email, name, picture, lastfmSessionKey }}
 */
function upsertUser(googleSub, profile) {
    if (!users[googleSub]) {
        users[googleSub] = {
            googleSub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            lastfmSessionKey: null,
        };
    } else {
        // Update profile info in case it changed
        users[googleSub].email = profile.email;
        users[googleSub].name = profile.name;
        users[googleSub].picture = profile.picture;
    }
    return users[googleSub];
}

/**
 * Gets a user by their Google sub.
 * @param {string} googleSub
 * @returns {object|undefined}
 */
function getUser(googleSub) {
    return users[googleSub];
}

/**
 * Sets the Last.fm session key for a user.
 * @param {string} googleSub
 * @param {string} sessionKey
 */
function setLastFmSessionKey(googleSub, sessionKey) {
    if (users[googleSub]) {
        users[googleSub].lastfmSessionKey = sessionKey;
    }
}

/**
 * Returns a safe public representation of a user (no sensitive fields).
 * @param {object} user
 */
function safeUser(user) {
    if (!user) return null;
    return {
        googleSub: user.googleSub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        lastfmConnected: !!user.lastfmSessionKey,
    };
}

module.exports = { upsertUser, getUser, setLastFmSessionKey, safeUser };
