/**
 * In-memory user store for Scrozam, backed by a JSON file for persistence.
 * On startup the store is loaded from users.json; every mutation saves it back.
 * This means Last.fm session keys and preferences survive server restarts.
 * 
 * Written by DJ Leamen 2024-2026
 */

const fs   = require('node:fs');
const path = require('node:path');

const STORE_PATH = path.join(__dirname, 'users.json');

// ── Load from disk (or start fresh) ──────────────────────────────────────────

let users = {};

try {
    if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        users = JSON.parse(raw);
        console.log(`📂 Loaded ${Object.keys(users).length} user(s) from store.`);
    }
} catch (err) {
    console.warn('⚠️  Could not load users.json, starting fresh.', err.message);
    users = {};
}

// ── Persistence helper ────────────────────────────────────────────────────────

function saveStore() {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ Failed to save users.json:', err.message);
    }
}

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
            preferences: { theme: 'midnight', font: 'segoe' },
        };
        saveStore();
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
        saveStore();
    }
}

/**
 * Sets personalization preferences for a user.
 * @param {string} googleSub
 * @param {{ theme?: string, font?: string }} prefs
 */
function setPreferences(googleSub, prefs) {
    if (users[googleSub]) {
        users[googleSub].preferences = {
            ...users[googleSub].preferences,
            ...prefs,
        };
        saveStore();
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
        preferences: user.preferences || { theme: 'midnight', font: 'segoe' },
    };
}

module.exports = { upsertUser, getUser, setLastFmSessionKey, setPreferences, safeUser };
