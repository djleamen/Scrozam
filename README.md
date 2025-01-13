# Scrozam
WIP web app that detects audio using ACRCloud and scrobbles the identified songs to a user’s Last.fm account.

## Technologies:
### Backend
ACRCloud API, Express

### Frontend
React

## Features: 
Detects song from audio input.

## Setup Instructions: 
Find YOUR_ACCESS, YOUR_SECRET, and YOUR_URL in send_post.py and detectsong.js and replace with your own ACRCloud API tokens.

Feel free to change stop_after_detect in send_post.py to False if you want continuous listening!

## Future Improvements: 
Scrobble detected track to Last.fm.


