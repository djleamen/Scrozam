/**
 * LoginPage.js
 * Shown when the user is not authenticated.
 * Supports Google SSO and (step 2) Last.fm account connection.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
    const { user, loginWithGoogle, connectLastFm } = useAuth();
    const logoSrc = `${process.env.PUBLIC_URL}/branding/signal-vinyl/primary/signal-vinyl-primary-128.png`;
    const [error, setError] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    async function handleGoogleSuccess(response) {
        setGoogleLoading(true);
        setError('');
        try {
            await loginWithGoogle(response.credential);
        } catch (err) {
            setError('Google sign-in failed. Please try again.');
        }
        setGoogleLoading(false);
    }

    function handleGoogleError() {
        setError('Google sign-in was cancelled or failed.');
    }

    // ── Step 2: Signed in with Google but Last.fm not connected ──────────────
    if (user && !user.lastfmConnected) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <img src={logoSrc} className="login-logo" alt="Scrozam" />
                    <h1 className="login-title">One more step</h1>
                    <p className="login-subtitle">
                        Connect your <strong>Last.fm</strong> account to turn live
                        detections into instant scrobbles.
                    </p>

                    <div className="login-user-info">
                        <img
                            src={user.picture}
                            alt={user.name}
                            className="login-avatar"
                        />
                        <span>Signed in as <strong>{user.name}</strong></span>
                    </div>

                    <button className="login-lastfm-btn" onClick={connectLastFm}>
                        <span className="lastfm-icon">🎵</span>
                        Connect Last.fm
                    </button>

                    <p className="login-footer">
                        You&apos;ll be redirected to Last.fm to authorize Scrozam.
                    </p>
                </div>
            </div>
        );
    }

    // ── Step 1: Not signed in ─────────────────────────────────────────────────
    return (
        <div className="login-page">
            <div className="login-card">
                <img src={logoSrc} className="login-logo" alt="Scrozam" />
                <h1 className="login-title">Welcome to Scrozam!</h1>
                <p className="login-subtitle">
                    Hear it. Catch it. Scrobble it.
                </p>

                {error && <p className="login-error">{error}</p>}

                <div className="login-google-wrapper">
                    {googleLoading ? (
                        <p className="login-loading">Signing in…</p>
                    ) : (
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="filled_black"
                            shape="pill"
                            size="large"
                            text="signin_with"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
