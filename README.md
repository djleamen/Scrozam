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
- Reiterates detected track to user.

## Setup Instructions

1. Add your API tokens to .env files.
2. Optionally, set `STOP_AFTER_DETECT=False` for continuous listening.

## Future Improvements

- Implement scrobbling of detected tracks to Last.fm.
- Add more detailed song information display.
- Implement more robust error handling.

## Additional Information

### Project Structure
- **backend/**: Contains server-side code and dependencies.
    - **node_modules/**: Contains project dependencies.
    - **routes/**: Contains song detection, scrobbling logic.
- **frontend/**: Contains React components and frontend logic.
    - **node_modules/**: Contains project dependencies.
    - **public/**: Contains static assets and configuration files.
    - **src/**: Contains the main React components and related files.
- **testing/**: Contains scripts and configuration files for testing.

### Development and Contribution
Feel free to contribute to the project by opening issues and submitting pull requests. Ensure that you follow the project's coding guidelines and standards.
