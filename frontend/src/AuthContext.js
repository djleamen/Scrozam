/**
 * AuthContext.js
 * Provides authentication state (Google + Last.fm) throughout the app.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BACKEND = 'http://localhost:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined);   // undefined = loading, null = not logged in
    const [loading, setLoading] = useState(true);

    /**
     * Fetches the current session from the backend.
     * Sets user to null when not authenticated.
     */
    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND}/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
        setLoading(false);
    }, []);

    // Check session on mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    /**
     * Sends the Google credential to the backend, creates a session.
     * @param {string} credential - Google ID token from @react-oauth/google
     */
    const loginWithGoogle = useCallback(async (credential) => {
        const res = await fetch(`${BACKEND}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential }),
        });

        if (!res.ok) throw new Error('Google authentication failed');
        const data = await res.json();
        setUser(data.user);
        return data.user;
    }, []);

    /**
     * Redirects the user to Last.fm OAuth.
     * Must be called while Google session is active.
     */
    const connectLastFm = useCallback(() => {
        window.location.href = `${BACKEND}/auth/lastfm`;
    }, []);

    /**
     * Logs the user out.
     */
    const logout = useCallback(async () => {
        await fetch(`${BACKEND}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, loginWithGoogle, connectLastFm, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
