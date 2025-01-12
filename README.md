# Scrozam
WIP web app that detects audio using ACRCloud and scrobbles the identified songs to a user’s Last.fm account.

## Technologies:
### Backend
ACRCloud API, Express

### Frontend
React

## Features: 
Detects song when provided an MP3 file.

## Setup Instructions: 
Find YOUR_ACCESS, YOUR_SECRET, and YOUR_URL in send_post.py and detectsong.js and replace with your own ACRCloud API tokens.
Find YOUR_FILE_AUDIO_PATH.mp3 in send_post.py and replace with your audio file path.

Feel free to try it out with test mp3!

## Future Improvements: 
Detect audio from microphone (similar to Shazam functionality) and scrobble detected track to Last.fm.


