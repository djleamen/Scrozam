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

  // Empty-state copy for the album canvas. When a track is already detected
  // but has no artwork, say so — don't tell the user to press Start again.
  let emptyArtMessage = 'Press Start to detect what’s playing';
  if (trackInfo) {
    emptyArtMessage = 'No artwork for this track';
  } else if (isListening) {
    emptyArtMessage = 'Listening for music…';
  }

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
  }, [authFetch, backendUrl, fetchAlbumArt, handleNewTrack, flashOrbitState]);

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

      <main className="music-layout">
        <section className="now-playing-panel" aria-live="polite">
          <div className="panel-head">
            <p className="panel-label">Now Playing</p>
            <div className="status-indicator">
              <OrbitDot state={orbitState} size="xs" />
              <span>{isListening ? 'Listening…' : 'Ready to listen'}</span>
            </div>
          </div>

          <div className="album-art-container">
            {albumArtLoading && (
              <div className="album-art-placeholder">Loading album art…</div>
            )}
            {!albumArtLoading && albumArt && (
              <img src={albumArt} alt={trackInfo ? `${trackInfo.title} album art` : 'Album art'} className="album-art" />
            )}
            {!albumArtLoading && !albumArt && (
              <div className="album-art-placeholder album-art-empty">
                <img src={recordMarkSrc} alt="" className="album-art-mark" aria-hidden="true" />
                <span>{emptyArtMessage}</span>
              </div>
            )}
          </div>

          {trackInfo && (
            <div className="track-info">
              <p className="track-title">{trackInfo.title}</p>
              <p className="track-artist">{trackInfo.artist}</p>
            </div>
          )}
        </section>

        <section className="control-panel">
          <h1 className="control-title">Detect what&apos;s playing</h1>

          <div className="toggle-container">
            <label className="mode-switch" htmlFor="continuousModeToggle">
              <input
                id="continuousModeToggle"
                type="checkbox"
                checked={continuousListening}
                onChange={(e) => setContinuousListening(e.target.checked)}
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
              <span className="mode-copy">
                <span className="mode-title">Continuous Mode</span>
                <span className="mode-subtitle">Keep listening between detections</span>
              </span>
            </label>
          </div>

          <div className="button-group">
            <button onClick={handleStartListening} disabled={isListening}>
              {isListening ? 'Listening…' : 'Start Listening'}
            </button>
            {isListening && (
              <button onClick={handleStopListening} className="stop-button">
                Stop
              </button>
            )}
          </div>
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
