/**
 * Main frontend application file for Scrozam.
 * Handles audio recording, song detection, displaying track info, and scrobbling to Last.fm.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import logo from './logo.png';
import { useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import SettingsDropdown from './components/SettingsDropdown';

// ── Main app (only rendered when fully authenticated) ─────────────────────────

function MainApp() {
  /**
   * Core Scrozam experience: microphone listening, song detection,
   * album art, and Last.fm scrobbling. Only shown when the user has
   * both a Google session and a connected Last.fm account.
   */
  const { user, logout } = useAuth();

  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [albumArt, setAlbumArt] = useState(null);
  const [albumArtLoading, setAlbumArtLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const lastScrobbledTrack = useRef('');
  const lastAlbumArtTrack = useRef('');
  const lastPolledTrack = useRef(''); // tracks what the poll loop has already handled

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
    setAlbumArtLoading(true);

    try {
      const response = await fetch('http://localhost:3000/album-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
  }, []);

  const handleNewTrack = useCallback(async (artist, title) => {
    /**
     * Scrobbles a new track to Last.fm.
     * Guards against duplicate scrobbles of the same track.
     */
    if (`${artist}-${title}` === lastScrobbledTrack.current) return;
    lastScrobbledTrack.current = `${artist}-${title}`;

    try {
      const response = await fetch('http://localhost:3000/scrobble-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ artist, title }),
      });
      if (response.ok) {
        console.log(`✅ Scrobbled: ${title} by ${artist}`);
      } else {
        console.error('Failed to scrobble song');
      }
    } catch (error) {
      console.error('Error scrobbling to Last.fm:', error);
    }
  }, []);

  // Poll for detected songs every 3 seconds
  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const response = await fetch('http://localhost:3000/detected-song', { credentials: 'include' });
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
        console.error('Error fetching detected song:', error);
      }
    };

    const interval = setInterval(fetchTrack, 3000);
    return () => clearInterval(interval);
  }, [fetchAlbumArt, handleNewTrack]);

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
            const response = await fetch('http://localhost:3000/detect-song', {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (response.status === 204) {
              console.warn('No result detected. Retrying…');
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
    <div className="App">
      {/* ── User header ─────────────────────────────────────────────────── */}
      <div className="user-header">
        <img src={user.picture} alt={user.name} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <span className="lastfm-badge">🎵 Last.fm connected</span>
        <SettingsDropdown />
        <button className="logout-btn" onClick={logout}>Sign out</button>
      </div>

      <header className={`App-header ${trackInfo ? 'has-track' : ''}`}>
        <div className="toggle-container">
          <label>
            <input
              type="checkbox"
              checked={continuousListening}
              onChange={(e) => setContinuousListening(e.target.checked)}
            />
            Continuous Listening Mode
          </label>
        </div>

        <div className="left-section">
          <img
            src={logo}
            className={`App-logo ${isListening ? 'listening' : ''}`}
            alt="Scrozam Logo"
          />
          <h1 className="main-title">Welcome to Scrozam!</h1>
          <p className="subtitle">Listen to music and scrobble tracks to Last.fm</p>

          <div className="controls-section">
            <div className="status-indicator">
              <div className={`status-dot ${isListening ? 'listening' : 'idle'}`}></div>
              <span>{isListening ? 'Listening for music...' : 'Ready to listen'}</span>
            </div>

            <div className="button-group">
              <button onClick={handleStartListening} disabled={isListening}>
                {isListening ? '🎧 Listening...' : '🎵 Start Listening'}
              </button>
              {continuousListening && isListening && (
                <button onClick={handleStopListening} className="stop-button">
                  ⏹️ Stop Listening
                </button>
              )}
            </div>
          </div>
        </div>

        {trackInfo && (
          <div className={`right-section ${trackInfo ? 'visible' : ''}`}>
            <div className="album-art-container">
              {albumArtLoading && (
                <div className="album-art-placeholder">Loading album art...</div>
              )}
              {!albumArtLoading && albumArt && (
                <img src={albumArt} alt="Album Art" className="album-art" />
              )}
              {!albumArtLoading && !albumArt && (
                <div className="album-art-placeholder">No album art available</div>
              )}
            </div>

            <div className="track-info side-layout">
              <h2>Detected Track</h2>
              <div className="track-detail">
                <strong>Title</strong>
                <span>{trackInfo.title}</span>
              </div>
              <div className="track-detail">
                <strong>Artist</strong>
                <span>{trackInfo.artist}</span>
              </div>
            </div>
          </div>
        )}
      </header>
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
