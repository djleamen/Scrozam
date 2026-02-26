/**
 * Authentication routes for Scrozam.
 * Handles Google SSO verification and Last.fm OAuth connection.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const axios = require('axios');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const router = express.Router();
const { upsertUser, getUser, setLastFmSessionKey, safeUser } = require('../userStore');
require('dotenv').config();

const LAST_API_KEY = process.env.LAST_API_KEY;
const LAST_SHARED_SECRET = process.env.LAST_SHARED_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ─── Google SSO ───────────────────────────────────────────────────────────────

/**
 * POST /auth/google
 * Verifies a Google ID token credential from @react-oauth/google.
 * Creates a server session for the user.
 */
router.post('/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential' });
    }

    try {
        // Verify the Google ID token via Google's tokeninfo endpoint
        const googleRes = await axios.get(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
        );

        const { sub, email, name, picture } = googleRes.data;

        if (!sub) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const user = upsertUser(sub, { email, name, picture });
        req.session.userId = sub;

        console.log(`✅ Google sign-in: ${name} (${email})`);
        res.json({ user: safeUser(user) });

    } catch (error) {
        console.error('Google auth error:', error.response?.data || error.message);
        res.status(401).json({ error: 'Google authentication failed' });
    }
});

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * GET /auth/me
 * Returns the currently authenticated user, or 401 if not signed in.
 */
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = getUser(req.session.userId);
    if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: safeUser(user) });
});

/**
 * POST /auth/logout
 * Destroys the current session.
 */
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
});

// ─── Last.fm OAuth ────────────────────────────────────────────────────────────

/**
 * GET /auth/lastfm
 * Redirects the authenticated user to Last.fm to grant permissions.
 * Must be signed in with Google first.
 */
router.get('/lastfm', (req, res) => {
    if (!req.session.userId) {
        return res.redirect(`${FRONTEND_URL}/?error=not_authenticated`);
    }

    const callbackUrl = `${BACKEND_URL}/auth/lastfm/callback`;
    const authUrl = `https://www.last.fm/api/auth/?api_key=${LAST_API_KEY}&cb=${encodeURIComponent(callbackUrl)}`;
    res.redirect(authUrl);
});

/**
 * GET /auth/lastfm/callback
 * Receives the Last.fm token, exchanges it for a session key,
 * and stores it on the user's account.
 */
router.get('/lastfm/callback', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.redirect(`${FRONTEND_URL}/?error=lastfm_missing_token`);
    }

    if (!req.session.userId) {
        return res.redirect(`${FRONTEND_URL}/?error=not_authenticated`);
    }

    const params = {
        api_key: LAST_API_KEY,
        method: 'auth.getSession',
        token,
    };

    const stringToSign =
        Object.keys(params)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => `${key}${params[key]}`)
            .join('') + LAST_SHARED_SECRET;

    const api_sig = crypto.createHash('md5').update(stringToSign).digest('hex');

    try {
        const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
            params: { ...params, api_sig, format: 'json' },
            family: 4,
        });

        const sessionKey = response.data?.session?.key;
        if (!sessionKey) {
            console.error('Last.fm session exchange failed:', response.data);
            return res.redirect(`${FRONTEND_URL}/?error=lastfm_auth_failed`);
        }

        setLastFmSessionKey(req.session.userId, sessionKey);
        console.log(`🎶 Last.fm connected for user ${req.session.userId}`);

        res.redirect(`${FRONTEND_URL}/?lastfm=connected`);

    } catch (error) {
        console.error('Last.fm callback error:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}/?error=lastfm_auth_failed`);
    }
});

module.exports = router;
