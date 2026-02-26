/**
 * AuthContext.js
 * Provides authentication state (Google + Last.fm) throughout the app.
 * 
 * Written by DJ Leamen 2024-2026
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { applyCSSVars } from './themes';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined);   // undefined = loading, null = not logged in
    const [loading, setLoading] = useState(true);
    const [csrfToken, setCsrfToken] = useState('');

    const ensureCsrfToken = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && csrfToken) return csrfToken;
        const res = await fetch(`${BACKEND}/csrf-token`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to initialize CSRF token');
        const data = await res.json();
        setCsrfToken(data.csrfToken);
        return data.csrfToken;
    }, [csrfToken]);

    const authFetch = useCallback(async (url, options = {}) => {
        const method = (options.method || 'GET').toUpperCase();
        const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

        const executeFetch = async (token) => {
            const headers = new Headers(options.headers || {});
            if (token) {
                headers.set('X-CSRF-Token', token);
            }

            return fetch(url, {
                ...options,
                headers,
                credentials: 'include',
            });
        };

        if (!isMutating) {
            return executeFetch(null);
        }

        let token = await ensureCsrfToken();
        let response = await executeFetch(token);

        if (response.status === 403) {
            token = await ensureCsrfToken(true);
            response = await executeFetch(token);
        }

        return response;
    }, [ensureCsrfToken]);

    /**
     * Fetches the current session from the backend.
     * Sets user to null when not authenticated.
     */
    const refreshUser = useCallback(async () => {
        try {
            const res = await authFetch(`${BACKEND}/auth/me`);
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
    }, [authFetch]);

    // Check session on mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    /**
     * Sends the Google credential to the backend, creates a session.
     * @param {string} credential - Google ID token from @react-oauth/google
     */
    const loginWithGoogle = useCallback(async (credential) => {
        const res = await authFetch(`${BACKEND}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
        });

        if (!res.ok) throw new Error('Google authentication failed');
        const data = await res.json();
        setUser(data.user);
        return data.user;
    }, [authFetch]);

    /**
     * Redirects the user to Last.fm OAuth.
     * Must be called while Google session is active.
     */
    const connectLastFm = useCallback(() => {
        window.location.href = `${BACKEND}/auth/lastfm`;
    }, []);

    // Apply CSS vars whenever user preferences change; reset to defaults on logout
    useEffect(() => {
        if (user?.preferences) {
            applyCSSVars(user.preferences.theme, user.preferences.font);
        } else if (user === null) {
            // Logged out — restore default theme so login page looks correct
            applyCSSVars('midnight', 'segoe');
        }
    }, [user, user?.preferences?.theme, user?.preferences?.font]);

    /**
     * Saves personalization preferences to the backend and updates session.
     * @param {string} theme
     * @param {string} font
     */
    const savePreferences = useCallback(async (theme, font) => {
        const res = await authFetch(`${BACKEND}/auth/preferences`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, font }),
        });
        if (!res.ok) throw new Error('Failed to save preferences');
        const data = await res.json();
        setUser(data.user);
    }, [authFetch]);

    const logout = useCallback(async () => {
        await authFetch(`${BACKEND}/auth/logout`, {
            method: 'POST',
        });
        setCsrfToken('');
        setUser(null);
    }, [authFetch]);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, loginWithGoogle, connectLastFm, logout, savePreferences, authFetch, backendUrl: BACKEND }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
