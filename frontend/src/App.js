import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('http://localhost:3000/detected-song');
      const data = await response.json();
      if (data) {
        setTrackInfo(data);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleStartListening = async () => {
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
          
          if (!response.ok) {
            throw new Error('Song detection failed');
          }
      
          const songData = await response.json();
          setTrackInfo(songData);
        } catch (error) {
          console.error('Error detecting song:', error);
        }
      };
  
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        setIsListening(false);
      }, 10000); // Record for 10 seconds
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsListening(false);
    }
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