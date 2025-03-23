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
- Scrobbles detected tracks to Last.fm.
- Displays detected track information to the user.

## Setup Instructions

### Prerequisites
- Node.js and npm installed on your machine.
- ACRCloud and Last.fm accounts

### Steps

1. **Add API Tokens to .env Files**
   - Create a `.env` file in both the `backend` and `frontend` directories.
   - Add your ACRCloud and Last.fm API tokens to these files.

   Example `.env` file content:
   ```env
   ACR_URL="your_url"
   ACR_ACCESS_KEY="your_acr_access_key"
   ACR_SHARED="your_acr_shared_secret"

   LAST_API_KEY="your_lastfm_api_key"
   LAST_SHARED_SECRET="your_lastfm_shared_secret"
   ```

2. **Start the Backend Server**
    - Navigate to the `backend` directory.
    - Run the following command to start the backend server:
    ```bash
    node app.js
    ```

3. **Authenticate with Last.fm**
    - Open your browser and go to http://localhost:3000/auth.
    - Sign in with your Last.fm account and authorize the application.
    - You will be redirected back to the application with a session key.

4. **Confirm Session Key**
    - Check the backend server logs to confirm that the session key has been successfully retrieved and stored.

5. **Start the Frontend Application**
    - Navigate to the `frontend` directory.
    - Run the following command to start the frontend application:
    ```bash
    npm start
    ```

6. **Detect Songs**
    - Open your browser and go to http://localhost:3000.
    - Click the "Start Listening" button and play some music.
    - The application will detect the song and display the track information.

---

## Future Improvements

- Add more detailed song information display.
    - Show album art on page for better user experience.
- Implement more robust error handling.
- Information tab

---

## Additional Information

### Project Structure

- backend/: Contains server-side code and dependencies.
    - routes/: Contains song detection and scrobbling logic.
- frontend/: Contains React components and frontend logic.
    - public/: Contains static assets and configuration files.
    - src/: Contains the main React components and related files.
- testing/: Contains scripts and configuration files for testing.

### Development and Contribution

Feel free to contribute to the project by opening issues and submitting pull requests. Ensure that you follow the project's coding guidelines and standards.

Make sure to replace the placeholder values in the .env file with your actual API keys and secrets.
