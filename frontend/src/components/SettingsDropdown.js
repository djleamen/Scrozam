/**
 * SettingsDropdown.js
 * Mini settings panel for per-user UI personalization (theme + font).
 * Rendered as a gear icon button inside the user header bar.
 *
 * Written by DJ Leamen 2024-2026
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { THEMES, FONTS } from '../themes';

export default function SettingsDropdown() {
  const { user, savePreferences } = useAuth();
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const panelRef                = useRef(null);

  const currentTheme = user?.preferences?.theme || 'midnight';
  const currentFont  = user?.preferences?.font  || 'segoe';

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleTheme = useCallback(async (key) => {
    if (key === currentTheme) return;
    setSaving(true);
    setError(null);
    try {
      await savePreferences(key, currentFont);
    } catch {
      setError('Could not save theme.');
    } finally {
      setSaving(false);
    }
  }, [currentTheme, currentFont, savePreferences]);

  const handleFont = useCallback(async (key) => {
    if (key === currentFont) return;
    setSaving(true);
    setError(null);
    try {
      await savePreferences(currentTheme, key);
    } catch {
      setError('Could not save font.');
    } finally {
      setSaving(false);
    }
  }, [currentTheme, currentFont, savePreferences]);

  return (
    <div className="settings-wrapper" ref={panelRef}>
      <button
        className={`settings-gear-btn ${open ? 'active' : ''}`}
        onClick={() => { setOpen(v => !v); setError(null); }}
        title="Personalization settings"
        aria-label="Open personalization settings"
      >
        ⚙️
      </button>

      {open && (
        <div className="settings-panel" role="dialog" aria-label="Personalization settings">
          <p className="settings-heading">🎨 Theme</p>
          <div className="settings-swatches">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                className={`swatch-btn ${key === currentTheme ? 'selected' : ''}`}
                style={{ '--swatch-color': theme.swatch }}
                onClick={() => handleTheme(key)}
                title={theme.label}
                aria-label={`${theme.label} theme${key === currentTheme ? ' (current)' : ''}`}
              >
                <span className="swatch-circle" />
                <span className="swatch-label">{theme.label}</span>
              </button>
            ))}
          </div>

          <p className="settings-heading">✏️ Font</p>
          <div className="settings-fonts">
            {Object.entries(FONTS).map(([key, font]) => (
              <button
                key={key}
                className={`font-btn ${key === currentFont ? 'selected' : ''}`}
                style={{ fontFamily: font.value }}
                onClick={() => handleFont(key)}
                aria-label={`${font.label} font${key === currentFont ? ' (current)' : ''}`}
              >
                {font.preview} {font.label}
              </button>
            ))}
          </div>

          {saving && <p className="settings-status">Saving…</p>}
          {error  && <p className="settings-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
