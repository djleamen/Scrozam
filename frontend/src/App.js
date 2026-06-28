/**
 * Main frontend application file for Scrozam.
 * Handles audio recording, song detection, displaying track info, and scrobbling to Last.fm.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import SettingsDropdown from './components/SettingsDropdown';
import OrbitDot from './components/OrbitDot';

// Compact relative timestamp for the listening log ("now", "4m", "2h").
function timeAgo(ts, now) {
  const seconds = Math.floor((now - ts) / 1000);
  if (seconds < 45) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

// ── Main app (only rendered when fully authenticated) ─────────────────────────

function MainApp() {
  /**
   * Core Scrozam experience: microphone listening, song detection,
   * album art, and Last.fm scrobbling. Only shown when the user has
   * both a Google session and a connected Last.fm account.
   */
  const { user, logout, authFetch, backendUrl } = useAuth();
  const recordMarkSrc = `${process.env.PUBLIC_URL}/branding/signal-vinyl/primary/signal-vinyl-primary-128.png`;

  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [albumArt, setAlbumArt] = useState(null);
  const [albumArtLoading, setAlbumArtLoading] = useState(false);
  const [transientOrbitState, setTransientOrbitState] = useState(null);
  const [history, setHistory] = useState([]); // this session's detected tracks
  const [now, setNow] = useState(() => Date.now());

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const orbitStateTimeoutRef = useRef(null);
  const lastScrobbledTrack = useRef('');
  const lastAlbumArtTrack = useRef('');
  const lastPolledTrack = useRef(''); // tracks what the poll loop has already handled

  const flashOrbitState = useCallback((state, duration = 500) => {
    if (orbitStateTimeoutRef.current) {
      clearTimeout(orbitStateTimeoutRef.current);
    }

    setTransientOrbitState(state);
    orbitStateTimeoutRef.current = setTimeout(() => {
      setTransientOrbitState(null);
      orbitStateTimeoutRef.current = null;
    }, duration);
  }, []);

  const orbitState = transientOrbitState || (isListening ? 'listening' : 'ready');

  // Prompt shown under the disc before/while listening (a detected track
  // replaces it with the title + artist).
  let discPrompt = 'Tap the record to listen';
  if (isListening) discPrompt = 'Listening… tap to stop';

  // Append a freshly detected track to the session log (dedupe consecutive
  // repeats so a held track isn't logged on every poll).
  const addToHistory = useCallback((artist, title) => {
    setHistory((prev) => {
      const key = `${artist}-${title}`;
      if (prev[0]?.key === key) return prev;
      const entry = { key, artist, title, art: null, at: Date.now() };
      return [entry, ...prev].slice(0, 25);
    });
  }, []);

  // Keep relative timestamps in the log fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchAlbumArt = useCallback(async (artist, title) => {
    /**
     * Fetches album art from the backend for the given artist and title.
     * Caches the last fetched track to avoid redundant requests.
     */
    const trackKey = `${artist}-${title}`;
    if (trackKey === lastAlbumArtTrack.current) {
      console.log(`🎨 Album art already cached for: ${artist} - ${title}`);
      return;
    }

    console.log(`🎨 Fetching album art for: ${artist} - ${title}`);
    // Clear any artwork from the previous track so we never show stale art
    // (or an alt text that no longer matches) while the new fetch is in flight.
    setAlbumArt(null);
    setAlbumArtLoading(true);

    try {
      const response = await authFetch(`${backendUrl}/album-art`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, title }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.albumArt) {
          setAlbumArt(data.albumArt);
          lastAlbumArtTrack.current = trackKey;
          // Backfill the matching log entry's thumbnail (reuses this fetch,
          // no extra request).
          setHistory((prev) =>
            prev.map((e) => (e.key === trackKey && !e.art ? { ...e, art: data.albumArt } : e))
          );
        }
      } else {
        console.error('Failed to fetch album art:', response.status);
      }
    } catch (error) {
      console.error('Error fetching album art:', error);
    }

    setAlbumArtLoading(false);
  }, [authFetch, backendUrl]);

  const handleNewTrack = useCallback(async (artist, title) => {
    /**
     * Scrobbles a new track to Last.fm.
     * Guards against duplicate scrobbles of the same track.
     */
    if (`${artist}-${title}` === lastScrobbledTrack.current) return;
    lastScrobbledTrack.current = `${artist}-${title}`;

    try {
      const response = await authFetch(`${backendUrl}/scrobble-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, title }),
      });
      if (response.ok) {
        console.log(`✅ Scrobbled: ${title} by ${artist}`);
        flashOrbitState('success', 450);
      } else {
        console.error('Failed to scrobble song');
        flashOrbitState('error', 700);
      }
    } catch (error) {
      console.error('Error scrobbling to Last.fm:', error);
      flashOrbitState('error', 700);
    }
  }, [authFetch, backendUrl, flashOrbitState]);

  useEffect(() => {
    return () => {
      if (orbitStateTimeoutRef.current) {
        clearTimeout(orbitStateTimeoutRef.current);
      }
    };
  }, []);

  // Poll for detected songs every 3 seconds
  useEffect(() => {
    // Don't flag the orbit on every failed poll; only react once the
    // backend looks genuinely unreachable, then keep retrying quietly.
    const MAX_CONSECUTIVE_POLL_ERRORS = 5;
    let consecutivePollErrors = 0;

    const fetchTrack = async () => {
      try {
        const response = await authFetch(`${backendUrl}/detected-song`);
        if (!response.ok) {
          throw new Error(`Polling failed with status ${response.status}`);
        }
        consecutivePollErrors = 0;
        const data = await response.json();

        if (data?.title && data?.artist) {
          const trackKey = `${data.artist}-${data.title}`;
          // Update UI state
          setTrackInfo(data);
          // Only fetch art / scrobble once per unique track (don't call inside setState)
          if (trackKey !== lastPolledTrack.current) {
            lastPolledTrack.current = trackKey;
            addToHistory(data.artist, data.title);
            fetchAlbumArt(data.artist, data.title);
            handleNewTrack(data.artist, data.title);
          }
        }
      } catch (error) {
        consecutivePollErrors += 1;
        console.error('Error fetching detected song:', error);
        if (consecutivePollErrors === MAX_CONSECUTIVE_POLL_ERRORS) {
          flashOrbitState('error', 2000);
        }
      }
    };

    const interval = setInterval(fetchTrack, 3000);
    return () => clearInterval(interval);
  }, [authFetch, backendUrl, fetchAlbumArt, handleNewTrack, flashOrbitState, addToHistory]);

  const stopStream = useCallback(() => {
    setIsListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const handleStartListening = async () => {
    /**
     * Starts microphone access and begins recording audio for song detection.
     */
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const startRecording = () => {
        const mediaRecorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('sample', audioBlob, 'audio.wav');

          try {
            const response = await authFetch(`${backendUrl}/detect-song`, {
              method: 'POST',
              body: formData,
            });

            if (response.status === 204) {
              console.warn('No result detected. Retrying…');
              flashOrbitState('error', 700);
              if (continuousListening) setTimeout(startRecording, 500);
              else stopStream();
              return;
            }

            if (!response.ok) throw new Error('Song detection failed');

            const songData = await response.json();
            setTrackInfo(songData);
            addToHistory(songData.artist, songData.title);
            fetchAlbumArt(songData.artist, songData.title);

            if (continuousListening) setTimeout(startRecording, 500);
            else stopStream();

          } catch (error) {
            console.error('Error detecting song:', error);
            flashOrbitState('error', 700);
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        }, 10000);
      };

      startRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      flashOrbitState('error', 700);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    setContinuousListening(false);
    setIsListening(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    console.log('Stopped listening!');
  };

  return (
    <div className="App app-shell">
      <div className="user-header">
        <div className="app-brand-mini">
          <OrbitDot state="idle" size="sm" />
          <span className="app-brand-name">Scrozam!</span>
        </div>
        <img src={user.picture} alt={user.name} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <span className="lastfm-badge">Last.fm connected</span>
        <SettingsDropdown />
        <button className="logout-btn" onClick={logout}>Sign out</button>
      </div>

      <main className="stage">
        <button
          type="button"
          className={`stage-disc${albumArtLoading ? ' is-loading' : ''}`}
          data-state={orbitState}
          onClick={isListening ? handleStopListening : handleStartListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {albumArt ? (
            <img
              className="stage-disc-art"
              src={albumArt}
              alt={trackInfo ? `${trackInfo.title} album art` : 'Album art'}
            />
          ) : (
            <img className="stage-disc-mark" src={recordMarkSrc} alt="" aria-hidden="true" />
          )}
        </button>

        <div className="stage-track" aria-live="polite">
          {trackInfo ? (
            <>
              <h1 className="stage-title">{trackInfo.title}</h1>
              <p className="stage-artist">{trackInfo.artist}</p>
            </>
          ) : (
            <p className="stage-cta">{discPrompt}</p>
          )}
        </div>

        <label className="continuous-toggle" htmlFor="continuousModeToggle">
          <input
            id="continuousModeToggle"
            type="checkbox"
            checked={continuousListening}
            onChange={(e) => setContinuousListening(e.target.checked)}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span>Keep listening between songs</span>
        </label>

        <section className="history" aria-label="Recently caught tracks">
          <p className="history-label">Recently caught</p>
          {history.length === 0 ? (
            <p className="history-empty">Songs you catch this session show up here.</p>
          ) : (
            <ul className="history-list">
              {history.map((h) => (
                <li className="history-row" key={`${h.key}-${h.at}`}>
                  {h.art ? (
                    <img className="history-thumb" src={h.art} alt="" aria-hidden="true" />
                  ) : (
                    <span className="history-thumb history-thumb--empty" aria-hidden="true">
                      <OrbitDot state="idle" size="sm" />
                    </span>
                  )}
                  <span className="history-meta">
                    <span className="history-track">{h.title}</span>
                    <span className="history-artist">{h.artist}</span>
                  </span>
                  <span className="history-time">{timeAgo(h.at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

// ── App shell – handles auth routing ─────────────────────────────────────────

function App() {
  /**
   * Outer shell: checks session state and routes between
   * LoginPage (unauthenticated / Last.fm not connected) and MainApp.
   */
  const { user, loading, refreshUser } = useAuth();

  // Handle redirect-back params from Last.fm OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lastfm') === 'connected' || params.get('error')) {
      refreshUser();
      window.history.replaceState({}, '', '/');
    }
  }, [refreshUser]);

  if (loading) {
    return (
      <div className="App">
        <div className="login-page">
          <div className="login-loading-screen">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user || !user.lastfmConnected) {
    return (
      <div className="App">
        <LoginPage />
      </div>
    );
  }

  return <MainApp />;
}

export default App;
