/**
 * Main frontend application file for Scrozam.
 * Handles audio recording, song detection, displaying track info, and scrobbling to Last.fm.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  /**
   * Main App component for Scrozam frontend.
   * Manages audio recording, song detection, album art fetching, and scrobbling.
   * 
   * @returns {JSX.Element}
   */
  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [albumArt, setAlbumArt] = useState(null);
  const [albumArtLoading, setAlbumArtLoading] = useState(false);

  // Refs to store the stream and recorder so we can stop them
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const lastScrobbledTrack = useRef('');
  const lastAlbumArtTrack = useRef('');

  const fetchAlbumArt = useCallback(async (artist, title) => {
    /**
     * Fetches album art from the backend for the given artist and title.
     * Caches the last fetched track to avoid redundant requests.
     * 
     * @param {string} artist - Artist name
     * @param {string} title - Track title
     */
    const trackKey = `${artist}-${title}`;
    
    // Only fetch if this is a different track than the last one we fetched album art for
    if (trackKey === lastAlbumArtTrack.current) {
      console.log(`🎨 Album art already cached for: ${artist} - ${title}`);
      return;
    }
    
    console.log(`🎨 Fetching album art for: ${artist} - ${title}`);
    setAlbumArtLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/album-art', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artist, title }),
      });

      console.log('Album art response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Album art response data:', data);
        if (data.albumArt) {
          console.log('✅ Setting album art:', data.albumArt);
          setAlbumArt(data.albumArt);
          lastAlbumArtTrack.current = trackKey; // Cache this track
        } else {
          console.log('❌ No album art in response');
        }
      } else {
        console.error('Failed to fetch album art:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching album art:', error);
    }
    
    setAlbumArtLoading(false);
  }, []);

  useEffect(() => {
    /**
     * Polls the backend for the last detected song every 3 seconds.
     * Updates the track info and fetches album art if a new song is detected.
     */
    const fetchTrack = async () => {
      try {
        const response = await fetch('http://localhost:3000/detected-song');
        const data = await response.json();
        console.log('Received track data in frontend:', data);

        // Ensure the data has valid song info
        if (data?.title && data?.artist) {
          console.log(`🎵 Polling detected track: ${data.title} - ${data.artist}`);
          setTrackInfo(prevTrack => {
            console.log(`🔍 Comparing tracks - Previous: ${prevTrack?.title} - ${prevTrack?.artist}, New: ${data.title} - ${data.artist}`);
            if (!prevTrack || prevTrack.title !== data.title || prevTrack.artist !== data.artist) {
              console.log(`🎵 Updating UI with new track: ${data.title} - ${data.artist}`);
              // Fetch album art for the new track
              console.log(`🎨 About to fetch album art for: ${data.artist} - ${data.title}`);
              fetchAlbumArt(data.artist, data.title);
              return data;  // Update with the new detected song
            }
            console.log(`⏭️ Track unchanged, skipping album art fetch`);
            return prevTrack;
          });

          handleNewTrack(data.artist, data.title);  // Scrobble the song
        }
      } catch (error) {
        console.error('Error fetching detected song:', error);
      }
    };

    // Poll for a new song every 3 seconds
    const interval = setInterval(fetchTrack, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchAlbumArt]);

  const stopStream = useCallback(() => {
    /**
     * Stops the audio stream and recording.
     */
    setIsListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const handleStartListening = async () => {
    /**
     * Starts listening to the microphone and recording audio.
     * Sends the recorded audio to the backend for song detection.
     */
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Store the stream in a ref

      const startRecording = () => {
        const mediaRecorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = mediaRecorder; // Store the recorder

        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          console.log('Audio Blob Size:', audioBlob.size);

          const formData = new FormData();
          formData.append('sample', audioBlob, 'audio.wav');

          try {
            const response = await fetch('http://localhost:3000/detect-song', {
              method: 'POST',
              body: formData,
            });

            if (response.status === 204) {
              console.warn('No result detected. Retrying...');
              if (continuousListening) {
                setTimeout(startRecording, 500);
              } else {
                stopStream();
              }
              return;
            }

            if (!response.ok) {
              throw new Error('Song detection failed');
            }

            const songData = await response.json();
            setTrackInfo(songData);
            console.log(`🎧 Detected: ${songData.title} - ${songData.artist}`);
            
            // Fetch album art for the detected song
            console.log(`🎨 About to fetch album art via direct detection: ${songData.artist} - ${songData.title}`);
            fetchAlbumArt(songData.artist, songData.title);

            if (continuousListening) {
              setTimeout(startRecording, 500);
            } else {
              stopStream();
            }

          } catch (error) {
            console.error('Error detecting song:', error);
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 10000); // Record for 10s, then stop
      };

      startRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsListening(false);
    }
  };

  // NEW function to stop listening
  const handleStopListening = () => {
    /**
     * Stops listening to the microphone and recording audio.
     */
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

  const handleNewTrack = async (artist, title) => {
    /**
     * Handles scrobbling a new track to Last.fm.
     * Ensures the same track is not scrobbled multiple times.
     * 
     * @param {string} artist - Artist name
     * @param {string} title - Track title
     */
    console.log(`handleNewTrack triggered with: ${artist} - ${title}`);
    if (`${artist}-${title}` !== lastScrobbledTrack.current) {
      lastScrobbledTrack.current = `${artist}-${title}`;
      try {
        const response = await fetch('http://localhost:3000/scrobble-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist, title }),
        });

        if (response.ok) {
          console.log(`Successfully scrobbled: ${title} by ${artist}`);
        } else {
          console.error('Failed to scrobble song');
        }
      } catch (error) {
        console.error('Error scrobbling to Last.fm:', error);
      }
    }
  };

  return (
    <div className="App">
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
                <div className="album-art-placeholder">
                  Loading album art...
                </div>
              )}
              {!albumArtLoading && albumArt && (
                <img src={albumArt} alt="Album Art" className="album-art" />
              )}
              {!albumArtLoading && !albumArt && (
                <div className="album-art-placeholder">
                  No album art available
                </div>
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

export default App;
