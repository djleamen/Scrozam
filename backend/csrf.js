/**
 * Session-bound CSRF protection (synchronizer token pattern).
 * Replaces the deprecated csurf package: the token lives in the server-side
 * session and must be echoed back in the X-CSRF-Token header on every
 * state-changing request.
 *
 * Written by DJ Leamen 2024-2026
 */

const crypto = require('node:crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueToken(session) {
    if (!session.csrfToken) {
        session.csrfToken = crypto.randomBytes(32).toString('base64url');
    }
    return session.csrfToken;
}

function tokensMatch(expected, received) {
    if (typeof expected !== 'string' || typeof received !== 'string') return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function csrfProtection(req, res, next) {
    req.csrfToken = () => issueToken(req.session);
    if (SAFE_METHODS.has(req.method)) return next();
    if (tokensMatch(req.session?.csrfToken, req.get('x-csrf-token'))) return next();
    const err = new Error('Invalid CSRF token');
    err.code = 'EBADCSRFTOKEN';
    err.status = 403;
    return next(err);
}

module.exports = { csrfProtection, tokensMatch };
