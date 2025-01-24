// structure of the frontend application

import React, { useState } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const handleStartListening = async () => {
    setIsListening(true);
    try {
      // Simulating audio detection (placeholder for actual audio processing logic)
      const detectedTrack = await mockAudioDetection(); // Replace with actual detection logic

      // Simulating scrobbling to Last.fm
      await scrobbleToLastFM(detectedTrack);

      setTrackInfo(detectedTrack);
    } catch (error) {
      console.error("Error detecting or scrobbling track:", error);
    } finally {
      setIsListening(false);
    }
  };

  const mockAudioDetection = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          title: 'Song Title',
          artist: 'Artist Name',
        });
      }, 3000); // Simulate a 3-second delay for detection
    });
  };

  const scrobbleToLastFM = async (track) => {
    try {
      // Placeholder for Last.fm API integration
      console.log(`Scrobbling to Last.fm: ${track.title} by ${track.artist}`);
      // Example: Call your backend or direct Last.fm API with the detected track info
    } catch (error) {
      console.error("Failed to scrobble to Last.fm", error);
      throw error;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" /> {/* Add this line */}
        <h1>Welcome to Scrozam!</h1>
        <p>Listen to music and scrobble tracks to Last.fm</p>
        <button 
          onClick={handleStartListening} 
          disabled={isListening}
        >
          {isListening ? 'Listening...' : 'Start Listening'}
        </button>
  
        {trackInfo && (
          <div className="track-info">
            <h2>Detected Track</h2>
            <p><strong>Title:</strong> {trackInfo.title}</p>
            <p><strong>Artist:</strong> {trackInfo.artist}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;