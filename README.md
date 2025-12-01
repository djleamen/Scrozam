# Scrozam!

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/backend-Node.js-339933?logo=node.js)
![ACRCloud API](https://img.shields.io/badge/API-ACRCloud-orange)
![Last.fm](https://img.shields.io/badge/Integration-Last.fm-red)
![Last Commit](https://img.shields.io/github/last-commit/djleamen/scrozam)
![Issues](https://img.shields.io/github/issues/djleamen/scrozam)

*Scrozam!* is a web application that detects songs using the ACRCloud API and scrobbles the identified tracks to a user's Last.fm account.

<img width="1512" height="817" alt="Screenshot 2025-12-01 at 11 01 02 AM" src="https://github.com/user-attachments/assets/5db90f71-266b-411a-960a-0d9860e1ae4d" />

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
    - Type "y" to allow the frontend to start on 3001. 

6. **Detect Songs**
    - Open your browser and go to http://localhost:3001.
    - Click the "Start Listening" button and play some music.
       - The application will detect the song and display the track information.
   - Alternatively, select the "Continuous listening" toggle and play music endlessly
      - Scrozam will automatically detect changes to the current song.
      - No song duplication, no missing tracks, just smooth listening!

Sample response in backend:
```
ACRCloud Response: {
...
}
Full music data from ACRCloud: {
...
}
Detected Song -> Title: Killah, Artist: Lady Gaga
Stored detected song: { title: 'Killah', artist: 'Lady Gaga' }
Posted detected song to backend: Killah by Lady Gaga
🎧 Sending detected song to frontend: Killah - Lady Gaga
```

To avoid duplication, if the same song is detected, you will see:
```📭 No new song detected, returning null.```

*Note*: In continuous listening mode, please allow for some time to pass before the detected song self-updates.

<details>
<summary>It is normal to see the following when a song first switches:</summary>
<br>

```
ACRCloud Response: { status: { code: 1001, version: '1.0', msg: 'No result' } }
No result detected. Retrying...
📭 No new song detected, returning null.
📭 No new song detected, returning null.
📭 No new song detected, returning null.
📭 No new song detected, returning null.
```

The song **WILL** update eventually, usually before the midpoint of the current song. If for whatever reason it gets caught in a `No result` loop, please contact me.

</details>

---

## Future Improvements

- Login button for smoother login without manually visiting /auth.
- Add more detailed song information display.
    - Show album art on page for better user experience.
- Implement more robust error handling.
- Information tab.

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
