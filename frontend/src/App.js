import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  const [trackInfo, setTrackInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const lastScrobbledTrack = useRef('');

  useEffect(() => {
    let isMounted = true;

    const fetchTrack = async () => {
        try {
            const response = await fetch('http://localhost:3000/detected-song');
            const data = await response.json();
            console.log('Received track data in frontend:', data);

            // Ensure the data has valid song info
            if (data?.title && data?.artist) {
                // **FORCE UPDATE even if the same song is detected again**
                setTrackInfo(prevTrack => {
                    if (!prevTrack || prevTrack.title !== data.title || prevTrack.artist !== data.artist) {
                        console.log(`🎵 Updating UI with new track: ${data.title} - ${data.artist}`);
                        return data;  // Update with the new detected song
                    }
                    return prevTrack;  // Keep previous track if it's the same
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
        isMounted = false;
        clearInterval(interval);
    };
}, []);

const [continuousListening, setContinuousListening] = useState(false);  // New state toggle

const handleStartListening = async () => {
    setIsListening(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const startRecording = () => {
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

                    if (response.status === 204) {
                        console.warn('No result detected. Retrying...');
                        if (continuousListening) {
                            setTimeout(startRecording, 500);  // Retry after a short delay
                        } else {
                            setIsListening(false);
                            stream.getTracks().forEach(track => track.stop());
                        }
                        return;
                    }

                    if (!response.ok) {
                        throw new Error('Song detection failed');
                    }

                    const songData = await response.json();
                    setTrackInfo(songData);

                    console.log(`🎧 Detected: ${songData.title} - ${songData.artist}`);

                    if (continuousListening) {
                        setTimeout(startRecording, 500);  // Small delay before re-recording
                    } else {
                        setIsListening(false);
                        stream.getTracks().forEach(track => track.stop());
                    }

                } catch (error) {
                    console.error('Error detecting song:', error);
                }
            };

            mediaRecorder.start();
            setTimeout(() => {
                mediaRecorder.stop();
            }, 10000);  // Records for 10s, then stops
        };

        startRecording();  // Start the first recording

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
        <div className="toggle-container">
          <label>
            <input type="checkbox" checked={continuousListening} onChange={() => setContinuousListening(!continuousListening)}/>Continuous Listening Mode
          </label>
        </div>
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