import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const lastScrobbledTrack = useRef('');

  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmounting
    
    const fetchTrack = async () => {
      try {
        const response = await fetch('http://localhost:3000/detected-song');
        const data = await response.json();
        console.log('Received track data in frontend:', data);
    
        if (data && isMounted) {
          if (!trackInfo || `${trackInfo.artist}-${trackInfo.title}` !== `${data.artist}-${data.title}`) {
            setTrackInfo(data);  // Update the track
            handleNewTrack(data.artist, data.title);  // Trigger scrobble logic
          }
        }
      } catch (error) {
        console.error('Error fetching detected song:', error);
      }
    };
  
    fetchTrack(); // Start initial fetch
  
    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [trackInfo]);  // Watch for changes in trackInfo

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

  const handleNewTrack = async (artist, title) => {
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
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
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