/**
 * Main backend application file for Scrozam.
 * Handles authentication with Google SSO + Last.fm and sets up routes for
 * song detection and scrobbling.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// ─── CORS (must come before session + routes) ─────────────────────────────────
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,      // allow cookies
}));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'scrozam-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,          // set true in production with HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));

app.use(express.json());

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

// ─── Auth middleware ──────────────────────────────────────────────────────────
const { getUser } = require('./userStore');

/**
 * Requires the request to have an active Google-authenticated session.
 */
function requireAuth(req, res, next) {
    if (!req.session.userId || !getUser(req.session.userId)) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

/**
 * Requires the user to also have a connected Last.fm account.
 */
function requireLastFm(req, res, next) {
    const user = getUser(req.session.userId);
    if (!user?.lastfmSessionKey) {
        return res.status(403).json({ error: 'Last.fm connection required' });
    }
    next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoute        = require('./routes/auth');
const detectSongRoute  = require('./routes/detectSong');
const scrobbleSongRoute = require('./routes/scrobbleSong');
const detectedSongRoute = require('./routes/detectedSong');
const albumArtRoute     = require('./routes/albumArt');

// Public auth routes
app.use('/auth', authRoute);

// Album art: POST requires auth (art lookup), GET /proxy is public (browser <img> tags don't send cookies)
app.use('/album-art', (req, res, next) => {
    if (req.method === 'GET') return next(); // proxy endpoint – no auth needed
    requireAuth(req, res, next);
}, albumArtRoute);

// Protected routes
app.use('/detect-song',   requireAuth, detectSongRoute);
app.use('/detected-song', requireAuth, detectedSongRoute);
app.use('/scrobble-song', requireAuth, requireLastFm, scrobbleSongRoute);

// Health check
app.get('/', (req, res) => res.send('Backend is running!'));

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
