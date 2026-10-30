/**
 * Tests for the session-bound CSRF middleware.
 *
 * Written by DJ Leamen 2024-2026
 */

const test = require('node:test');
const assert = require('node:assert');
const { csrfProtection } = require('./csrf');

function run(method, session, header) {
    const req = { method, session, get: (name) => (name === 'x-csrf-token' ? header : undefined) };
    let error = 'not called';
    csrfProtection(req, {}, (err) => { error = err; });
    return { req, error };
}

test('safe methods pass and can mint a token', () => {
    const session = {};
    const { req, error } = run('GET', session);
    assert.strictEqual(error, undefined);
    const token = req.csrfToken();
    assert.ok(token.length > 20);
    assert.strictEqual(req.csrfToken(), token, 'token is stable within a session');
});

test('mutating request with the session token passes', () => {
    const session = {};
    const token = run('GET', session).req.csrfToken();
    assert.strictEqual(run('POST', session, token).error, undefined);
});

test('mutating request without or with a wrong token is rejected', () => {
    const session = {};
    const token = run('GET', session).req.csrfToken();
    const sameLengthWrong = (token[0] === 'A' ? 'B' : 'A') + token.slice(1);
    for (const header of [undefined, '', 'x', `${token}x`, sameLengthWrong]) {
        const { error } = run('PATCH', session, header);
        assert.strictEqual(error?.code, 'EBADCSRFTOKEN', `header ${header} should be rejected`);
    }
});

test('a session that never minted a token rejects mutations', () => {
    assert.strictEqual(run('POST', {}, 'anything').error?.code, 'EBADCSRFTOKEN');
});
