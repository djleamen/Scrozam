# Scrozam!

*Scrozam!* is a web application that detects songs using the ACRCloud API and scrobbles the identified tracks to a user's Last.fm account.

## Technologies

### Backend
- ACRCloud API
- Last.fm API
- Express

### Frontend
- React

## Features
- Detects songs from audio input.

## Setup Instructions

1. Replace `YOUR_ACCESS`, `YOUR_SECRET`, and `YOUR_URL` in `send_post.py` and `detectsong.js` with your own ACRCloud API tokens.
2. Optionally, set `stop_after_detect` in `send_post.py` to `False` for continuous listening.

## Future Improvements

- Implement scrobbling of detected tracks to Last.fm.

## Additional Information

### Project Structure
- **backend/**: Contains server-side code and dependencies.
    - **node_modules/**: Contains project dependencies.
- **frontend/**: Contains React components and frontend logic.

### Development and Contribution
Feel free to contribute to the project by opening issues and submitting pull requests. Ensure that you follow the project's coding guidelines and standards.
