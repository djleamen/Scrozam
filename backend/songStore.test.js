/**
 * Tests for the in-memory song store.
 *
 * Uses Node's built-in test runner (node:test) so the backend gains
 * coverage without pulling in a test framework. The store keys detections
 * by userId and expires them on a TTL, so the tests focus on cross-user
 * isolation and expiry — the two behaviours that keep detections private
 * and the map bounded.
 *
 * Written by DJ Leamen 2024-2026
 */

const test = require('node:test');
const assert = require('node:assert');

// Silence the store's console.log so test output stays readable.
const originalLog = console.log;
console.log = () => {};

const { setDetectedSong, popDetectedSong, entryCount } = require('./songStore');

const ENTRY_TTL_MS = 5 * 60 * 1000;
const SONG = { title: 'Bohemian Rhapsody', artist: 'Queen' };

// Pin Date.now so TTL behaviour is deterministic; each test restores it.
function withClock(startMs, fn) {
    const realNow = Date.now;
    let current = startMs;
    Date.now = () => current;
    const advance = (ms) => { current += ms; };
    try {
        fn(advance);
    } finally {
        Date.now = realNow;
    }
}

test('stores and pops a song for a user', () => {
    withClock(1000, () => {
        setDetectedSong('user-a', SONG);
        assert.deepStrictEqual(popDetectedSong('user-a'), SONG);
    });
});

test('pop clears the entry so a second pop returns null', () => {
    withClock(1000, () => {
        setDetectedSong('user-a', SONG);
        popDetectedSong('user-a');
        assert.strictEqual(popDetectedSong('user-a'), null);
    });
});

test('one user never receives another user\'s song', () => {
    withClock(1000, () => {
        setDetectedSong('user-a', SONG);
        assert.strictEqual(popDetectedSong('user-b'), null);
        // user-a's entry is untouched by user-b's poll.
        assert.deepStrictEqual(popDetectedSong('user-a'), SONG);
    });
});

test('an entry past its TTL is treated as absent', () => {
    withClock(1000, (advance) => {
        setDetectedSong('user-a', SONG);
        advance(ENTRY_TTL_MS + 1);
        assert.strictEqual(popDetectedSong('user-a'), null);
    });
});

test('an entry within its TTL is still returned', () => {
    withClock(1000, (advance) => {
        setDetectedSong('user-a', SONG);
        advance(ENTRY_TTL_MS - 1);
        assert.deepStrictEqual(popDetectedSong('user-a'), SONG);
    });
});

test('a later write prunes another user\'s expired entry', () => {
    withClock(1000, (advance) => {
        setDetectedSong('user-a', SONG);
        advance(ENTRY_TTL_MS + 1);
        // user-a is expired but still physically present until a write prunes it.
        assert.strictEqual(entryCount(), 1);
        // user-b writing prunes the expired user-a entry rather than growing the
        // map, so the count stays at 1 instead of climbing to 2. Asserting the
        // count (not just a null pop) is what actually exercises prune-on-write:
        // a null pop alone would pass even if pruning never ran.
        setDetectedSong('user-b', { title: 'Africa', artist: 'Toto' });
        assert.strictEqual(entryCount(), 1);
        // user-a is genuinely gone, not merely treated as absent on read.
        assert.strictEqual(popDetectedSong('user-a'), null);
        popDetectedSong('user-b');
    });
});

test('a falsy userId is ignored on write and read', () => {
    withClock(1000, () => {
        setDetectedSong('', SONG);
        assert.strictEqual(popDetectedSong(''), null);
        assert.strictEqual(popDetectedSong(undefined), null);
    });
});

test.after(() => {
    console.log = originalLog;
});
