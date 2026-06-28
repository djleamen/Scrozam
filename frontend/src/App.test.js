import { render, screen } from '@testing-library/react';
import App, { timeAgo, appendToHistory } from './App';

// ── timeAgo ──────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  const base = 1_000_000_000_000;

  test('shows "now" for anything under 45 seconds', () => {
    expect(timeAgo(base, base)).toBe('now');
    expect(timeAgo(base, base + 44_000)).toBe('now');
  });

  test('rounds up to at least 1m once past the "now" window', () => {
    expect(timeAgo(base, base + 50_000)).toBe('1m');
  });

  test('reports whole minutes under an hour', () => {
    expect(timeAgo(base, base + 5 * 60_000)).toBe('5m');
    expect(timeAgo(base, base + 59 * 60_000)).toBe('59m');
  });

  test('switches to hours at and beyond 60 minutes', () => {
    expect(timeAgo(base, base + 60 * 60_000)).toBe('1h');
    expect(timeAgo(base, base + 3 * 60 * 60_000)).toBe('3h');
  });
});

// ── appendToHistory ──────────────────────────────────────────────────────────

describe('appendToHistory', () => {
  test('prepends a new entry', () => {
    const next = appendToHistory([], 'Lady Gaga', 'Killah', 1);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ artist: 'Lady Gaga', title: 'Killah', at: 1 });
  });

  test('ignores a consecutive repeat of the current track', () => {
    const first = appendToHistory([], 'A', 'Song', 1);
    const second = appendToHistory(first, 'A', 'Song', 2);
    expect(second).toBe(first); // unchanged reference
    expect(second).toHaveLength(1);
  });

  test('allows the same track again if it was not the most recent', () => {
    let h = appendToHistory([], 'A', 'Song', 1);
    h = appendToHistory(h, 'B', 'Other', 2);
    h = appendToHistory(h, 'A', 'Song', 3);
    expect(h).toHaveLength(3);
    expect(h[0]).toMatchObject({ artist: 'A', title: 'Song', at: 3 });
  });

  test('caps the log at 25 entries', () => {
    let h = [];
    for (let i = 0; i < 30; i += 1) {
      h = appendToHistory(h, `Artist ${i}`, `Track ${i}`, i);
    }
    expect(h).toHaveLength(25);
    expect(h[0].title).toBe('Track 29'); // newest kept
    expect(h[24].title).toBe('Track 5'); // oldest within the cap
  });
});

// ── Authenticated render smoke test ──────────────────────────────────────────

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'DJ Leamen',
      picture: 'https://example.com/avatar.png',
      lastfmConnected: true,
      preferences: { theme: 'midnight', font: 'segoe' },
    },
    loading: false,
    refreshUser: jest.fn(),
    logout: jest.fn(),
    savePreferences: jest.fn(),
    authFetch: jest.fn(() => new Promise(() => {})), // never resolves; no network in tests
    backendUrl: 'http://localhost:3000',
  }),
}));

test('renders the stage with the brand and an empty listening log', () => {
  const { unmount } = render(<App />);
  expect(screen.getByText('Scrozam!')).toBeInTheDocument();
  expect(screen.getByText('Recently caught')).toBeInTheDocument();
  expect(
    screen.getByText('Songs you catch this session show up here.')
  ).toBeInTheDocument();
  unmount(); // clear the component's polling/clock intervals
});
