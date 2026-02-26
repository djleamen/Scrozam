# Scrozam!

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/backend-Node.js-339933?logo=node.js)
![ACRCloud API](https://img.shields.io/badge/API-ACRCloud-orange)
![Last.fm](https://img.shields.io/badge/Integration-Last.fm-red)
![Last Commit](https://img.shields.io/github/last-commit/djleamen/scrozam)
![Issues](https://img.shields.io/github/issues/djleamen/scrozam)

*Scrozam!* is a web application that detects songs using the ACRCloud API and scrobbles the identified tracks to a user's Last.fm account.

<img width="1512" height="817" alt=" " src="https://github.com/user-attachments/assets/3e04829a-a964-4f1b-9a44-6fd72eddd24e" />

## Features
- **Google SSO** — sign in with your Google account; no password required.
- **Last.fm OAuth** — connect your Last.fm account in-app; no manual session key steps.
- Detects songs from audio input using ACRCloud.
- Scrobbles detected tracks to Last.fm automatically.
- Displays detected track information and album art.
- Continuous listening mode for uninterrupted scrobbling.

## Setup Instructions

### Prerequisites
- Node.js and npm installed on your machine.
- ACRCloud and Last.fm API accounts.
- A Google Cloud project with an OAuth 2.0 Web Client ID ([create one here](https://console.cloud.google.com/)).

### Steps

1. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Add `http://localhost:3001` to **Authorised JavaScript origins**.
   - Copy the client ID for use in the frontend `.env`.

2. **Add environment variables**

   Create a `.env` file in the `backend` directory (see `backend/.env.example`):
   ```env
   ACR_URL="your_acrcloud_url"
   ACR_ACCESS_KEY="your_acr_access_key"
   ACR_SHARED="your_acr_shared_secret"

   LAST_API_KEY="your_lastfm_api_key"
   LAST_SHARED_SECRET="your_lastfm_shared_secret"

   SESSION_SECRET="any_random_string"
   FRONTEND_URL="http://localhost:3001"
   BACKEND_URL="http://localhost:3000"
   ```

   Create a `.env` file in the `frontend` directory (see `frontend/.env.example`):
   ```env
   REACT_APP_GOOGLE_CLIENT_ID="your_google_oauth_client_id.apps.googleusercontent.com"
   ```

3. **Configure your Last.fm app callback**
   - In your [Last.fm API account settings](https://www.last.fm/api/accounts), set the callback URL to:
     ```
     http://localhost:3000/auth/lastfm/callback
     ```

4. **Start the backend server**
   ```bash
   cd backend
   npm install
   node app.js
   ```

5. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Type `y` if prompted to use port 3001.

6. **Sign in**
   - Open http://localhost:3001.
   - Click **Sign in with Google**.
   - After Google authentication, click **Connect Last.fm** and authorise Scrozam.
   - You're now fully signed in and ready to scrobble.

7. **Detect songs**
   - Click **Start Listening** and play some music.
   - The application will detect the song, display the track info and album art, and scrobble it to Last.fm.
   - Enable **Continuous Listening Mode** to auto-detect song changes without stopping.

Sample backend output:
```
ACRCloud Response: { ... }
Full music data from ACRCloud: { ... }
Detected Song -> Title: Killah, Artist: Lady Gaga
📀 Stored detected song in songStore: { title: 'Killah', artist: 'Lady Gaga' }
🎨 Album art found for Lady Gaga - Killah
🎧 Sending detected song to frontend: Killah - Lady Gaga
🎵 Scrobbled successfully -> Lady Gaga - Killah @ ...
```

To avoid duplication, if the same song is detected you will see:
```
📭 No new song detected, returning null.
```

<details>
<summary>It is normal to see the following when a song first switches:</summary>
<br>

```
ACRCloud Response: { status: { code: 1001, version: '1.0', msg: 'No result' } }
No result detected. Retrying...
📭 No new song detected, returning null.
```

The song **will** update eventually, usually well before the midpoint of the current song. If it gets stuck in a `No result` loop, please open an issue.

</details>

---

## Future Improvements

- Add more detailed song information display (release year, genre, etc.).
- Implement more robust error handling.
- Information / history tab showing recent scrobbles.
- Production deployment with HTTPS and persistent session storage.

---

## Additional Information

### Project Structure

```
backend/
  app.js              — Express server, session & auth middleware
  userStore.js        — In-memory user profiles & Last.fm session keys
  songStore.js        — In-memory detected song state
  routes/
    auth.js           — Google SSO + Last.fm OAuth endpoints
    detectSong.js     — ACRCloud song identification
    detectedSong.js   — Detected song polling endpoint
    scrobbleSong.js   — Last.fm scrobbling
    albumArt.js       — Album art lookup + image proxy
frontend/
  src/
    App.js            — App shell (auth routing) + MainApp component
    AuthContext.js    — React context for auth state
    components/
      LoginPage.js    — Google sign-in + Last.fm connect flow
testing/
  send_post.py        — Manual testing scripts
```

### Authentication Flow

1. User signs in with Google (ID token verified server-side via Google's tokeninfo endpoint).
2. A server-side session is created (cookie-based, 7-day expiry).
3. User connects their Last.fm account via OAuth — the session key is stored per-user in memory.
4. All song detection, polling, and scrobbling routes require an active session. Scrobbling additionally requires a connected Last.fm account.

### Development and Contribution

Feel free to contribute by opening issues and submitting pull requests. Ensure you follow the project's coding guidelines and standards.

Replace all placeholder values in your `.env` files with your actual API keys and secrets before running the application.