import { render, screen, fireEvent, act } from '@testing-library/react';
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

// Default never resolves (no network in tests); individual tests can swap it.
let mockAuthFetch = jest.fn(() => new Promise(() => {}));

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
    authFetch: (...args) => mockAuthFetch(...args),
    backendUrl: 'http://localhost:3000',
  }),
}));

beforeEach(() => {
  mockAuthFetch = jest.fn(() => new Promise(() => {}));
});

test('renders the stage with the brand and an empty listening log', () => {
  const { unmount } = render(<App />);
  expect(screen.getByText('Scrozam!')).toBeInTheDocument();
  expect(screen.getByText('Recently caught')).toBeInTheDocument();
  expect(
    screen.getByText('Songs you catch this session show up here.')
  ).toBeInTheDocument();
  unmount(); // clear the component's polling/clock intervals
});

// ── Recording-loop async transitions ─────────────────────────────────────────

describe('recording loop', () => {
  let recorders;
  let tracks;

  beforeEach(() => {
    jest.useFakeTimers();
    recorders = [];
    tracks = [{ stop: jest.fn() }];

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => tracks }) },
    });

    class FakeMediaRecorder {
      constructor() {
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
        recorders.push(this);
      }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        if (this.ondataavailable) this.ondataavailable({ data: new Blob([]) });
        if (this.onstop) this.onstop();
      }
    }
    global.MediaRecorder = FakeMediaRecorder;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete global.MediaRecorder;
  });

  // Flush awaited microtasks between synchronous steps of an async handler.
  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const startListening = async ({ continuous }) => {
    render(<App />);
    if (continuous) {
      fireEvent.click(screen.getByRole('checkbox'));
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start listening' }));
    });
    await flush(); // resolve getUserMedia and reach startRecording
  };

  test('a Stop during an in-flight detection does not restart the mic', async () => {
    let resolveDetect;
    mockAuthFetch = jest.fn((url) => {
      if (url.includes('/detect-song')) {
        return new Promise((resolve) => { resolveDetect = resolve; });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    await startListening({ continuous: true });
    expect(recorders).toHaveLength(1);

    // The 10s cap fires mediaRecorder.stop(), whose onstop awaits /detect-song.
    await act(async () => { jest.advanceTimersByTime(10000); });
    await flush();

    // User presses Stop while the detection request is still in flight.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop listening' }));
    });

    // Detection now resolves successfully; continuous mode was on at queue time.
    await act(async () => { resolveDetect({ ok: true, status: 200, json: async () => ({ artist: 'A', title: 'B' }) }); });
    await flush();
    await act(async () => { jest.advanceTimersByTime(500); });
    await flush();

    // No second recorder was constructed and the stream was released.
    expect(recorders).toHaveLength(1);
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  test('a detection error releases the mic when not in continuous mode', async () => {
    mockAuthFetch = jest.fn((url) => {
      if (url.includes('/detect-song')) return Promise.reject(new Error('network'));
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    await startListening({ continuous: false });
    expect(recorders).toHaveLength(1);

    await act(async () => { jest.advanceTimersByTime(10000); });
    await flush();
    await act(async () => { jest.advanceTimersByTime(500); });
    await flush();

    // Error path released the stream and did not queue another recording.
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(recorders).toHaveLength(1);
  });
});
