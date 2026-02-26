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
const helmet = require('helmet');
const csrf = require('csurf');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
}

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS (must come before session + routes) ─────────────────────────────────
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,      // allow cookies
}));

// If running behind a reverse proxy (e.g. Heroku, Render, nginx), let Express
// know so that secure cookies work correctly when TLS is terminated upstream.
if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'scrozam-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: IS_PRODUCTION,   // enforce HTTPS-only cookies in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));

app.use(express.json({ limit: '256kb' }));

// ─── CSRF protection ──────────────────────────────────────────────────────────
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication requests, please slow down.' },
});

const detectLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 45,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many detection requests, please wait before retrying.' },
});

const scrobbleLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many scrobble requests, please slow down.' },
});

const pollingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Polling rate limit reached, please wait.' },
});

const albumArtLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many album art requests, please slow down.' },
});
app.use(globalLimiter);

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

// CSRF token endpoint for frontend to retrieve token
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Public auth routes
app.use('/auth', authLimiter, authRoute);

// Album art: POST requires auth (art lookup), GET /proxy is public (browser <img> tags don't send cookies)
app.use('/album-art', albumArtLimiter, (req, res, next) => {
    if (req.method === 'GET') return next(); // proxy endpoint – no auth needed
    requireAuth(req, res, next);
}, albumArtRoute);

// Protected routes
app.use('/detect-song',   requireAuth, detectLimiter, detectSongRoute);
app.use('/detected-song', requireAuth, pollingLimiter, detectedSongRoute);
app.use('/scrobble-song', requireAuth, requireLastFm, scrobbleLimiter, scrobbleSongRoute);

// Health check
app.get('/', (req, res) => res.send('Backend is running!'));

app.use((err, req, res, next) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Audio file is too large' });
    }
    return next(err);
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
