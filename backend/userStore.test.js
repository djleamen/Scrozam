/**
 * Tests for the JSON-backed user store.
 *
 * Uses Node's built-in test runner (node:test) so the backend gains coverage
 * without a test framework. The store's stated invariant is that every
 * mutation is written back to users.json; these tests focus on that
 * persistence contract (especially the profile-update path, which used to
 * mutate in memory without saving) and on safeUser never leaking the Last.fm
 * session key. The filesystem is stubbed so the tests count saveStore() writes
 * instead of touching the real store on disk.
 *
 * Written by DJ Leamen 2024-2026
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

// Silence the store's startup/save logging so test output stays readable.
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

// Stub the filesystem before requiring the store: it reads users.json on load
// and writes it on every mutation. Stubbing keeps the tests off disk and lets
// us count how many times the store persisted via writeCount.
let writeCount = 0;
const realFs = {
    existsSync: fs.existsSync,
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    renameSync: fs.renameSync,
    chmodSync: fs.chmodSync,
    statSync: fs.statSync,
    unlinkSync: fs.unlinkSync,
};
fs.existsSync = () => false;                 // no existing store on disk
fs.writeFileSync = () => { writeCount += 1; }; // count each saved revision
fs.renameSync = () => {};
fs.chmodSync = () => {};
fs.statSync = () => ({ mode: 0o600 });

const {
    upsertUser,
    getUser,
    setLastFmSessionKey,
    setPreferences,
    safeUser,
} = require('./userStore');

const SUB = 'google-sub-1';
const PROFILE = { email: 'ada@example.com', name: 'Ada Lovelace', picture: 'https://img/a.png' };

test('upsertUser creates a user and persists it', () => {
    writeCount = 0;
    const user = upsertUser(SUB, PROFILE);
    assert.strictEqual(user.email, PROFILE.email);
    assert.strictEqual(user.lastfmSessionKey, null);
    assert.strictEqual(writeCount, 1, 'creating a user should save the store once');
});

test('a changed profile on re-login is applied and persisted', () => {
    writeCount = 0;
    const updated = upsertUser(SUB, {
        email: 'ada@newmail.com',
        name: 'Ada King',
        picture: 'https://img/a2.png',
    });
    assert.strictEqual(updated.name, 'Ada King');
    assert.strictEqual(updated.email, 'ada@newmail.com');
    assert.strictEqual(updated.picture, 'https://img/a2.png');
    assert.strictEqual(writeCount, 1, 'a changed profile must be written back to disk');
    // The change is reflected in the live store, not just the returned object.
    assert.strictEqual(getUser(SUB).name, 'Ada King');
});

test('an unchanged re-login does not rewrite the store', () => {
    writeCount = 0;
    upsertUser(SUB, {
        email: 'ada@newmail.com',
        name: 'Ada King',
        picture: 'https://img/a2.png',
    });
    assert.strictEqual(writeCount, 0, 'a no-op re-login should not persist');
});

test('setLastFmSessionKey and setPreferences persist their mutations', () => {
    writeCount = 0;
    setLastFmSessionKey(SUB, 'secret-session-key');
    setPreferences(SUB, { theme: 'solar' });
    assert.strictEqual(writeCount, 2, 'each mutation should save the store');
    const user = getUser(SUB);
    assert.strictEqual(user.lastfmSessionKey, 'secret-session-key');
    assert.strictEqual(user.preferences.theme, 'solar');
    assert.strictEqual(user.preferences.font, 'segoe', 'existing preferences are preserved');
});

test('safeUser never exposes the Last.fm session key', () => {
    const safe = safeUser(getUser(SUB));
    assert.strictEqual(safe.lastfmConnected, true);
    assert.strictEqual(safe.lastfmSessionKey, undefined);
    assert.strictEqual(safe.name, 'Ada King');
});

test('safeUser returns null for a missing user', () => {
    assert.strictEqual(safeUser(undefined), null);
});

test.after(() => {
    Object.assign(fs, realFs);
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
});
