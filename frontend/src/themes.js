/**
 * Theme and font definitions for Scrozam personalization.
 * Each theme maps to CSS custom property values applied to :root.
 *
 * Written by DJ Leamen 2024-2026
 */

export const THEMES = {
  midnight: {
    label: 'Midnight',
    swatch: '#0B0C14',
    bgStart: '#0B0C14',
    bgEnd: '#141827',
    accent: '#E80922',
    accentLight: '#FF3B52',
    accentRgb: '232, 9, 34',
  },
  crimson: {
    label: 'Crimson',
    swatch: '#2d0f0f',
    bgStart: '#1a0808',
    bgEnd: '#2d1010',
    accent: '#E80922',
    accentLight: '#FF3B52',
    accentRgb: '232, 9, 34',
  },
  ocean: {
    label: 'Ocean',
    swatch: '#0a1e35',
    bgStart: '#051525',
    bgEnd: '#0a1e35',
    accent: '#3da8ff',
    accentLight: '#7ec8ff',
    accentRgb: '61, 168, 255',
  },
  forest: {
    label: 'Forest',
    swatch: '#152b18',
    bgStart: '#0a1a0c',
    bgEnd: '#152b18',
    accent: '#3dcc6a',
    accentLight: '#72e895',
    accentRgb: '61, 204, 106',
  },
  sunset: {
    label: 'Sunset',
    swatch: '#2b1a08',
    bgStart: '#1a0f05',
    bgEnd: '#2b1a08',
    accent: '#ff8c42',
    accentLight: '#ffb07c',
    accentRgb: '255, 140, 66',
  },
  aurora: {
    label: 'Aurora',
    swatch: '#110e2a',
    bgStart: '#0a0a1f',
    bgEnd: '#110e2a',
    accent: '#a78bfa',
    accentLight: '#c4b5fd',
    accentRgb: '167, 139, 250',
  },
};

export const FONTS = {
  segoe: {
    label: 'Segoe UI',
    preview: 'Aa',
    value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  inter: {
    label: 'Inter',
    preview: 'Aa',
    value: "'Inter', system-ui, -apple-system, sans-serif",
  },
  mono: {
    label: 'Mono',
    preview: 'Aa',
    value: "'Roboto Mono', 'Courier New', monospace",
  },
  georgia: {
    label: 'Georgia',
    preview: 'Aa',
    value: "Georgia, 'Times New Roman', serif",
  },
  playfair: {
    label: 'Playfair',
    preview: 'Aa',
    value: "'Playfair Display', Georgia, serif",
  },
};

/**
 * Applies a theme + font to :root CSS custom properties.
 * @param {string} themeKey - key from THEMES
 * @param {string} fontKey  - key from FONTS
 */
export function applyCSSVars(themeKey, fontKey) {
  const theme = THEMES[themeKey] || THEMES.midnight;
  const font  = FONTS[fontKey]   || FONTS.inter;
  const root  = document.documentElement;

  root.style.setProperty('--bg-start',      theme.bgStart);
  root.style.setProperty('--bg-end',        theme.bgEnd);
  root.style.setProperty('--accent',        theme.accent);
  root.style.setProperty('--accent-light',  theme.accentLight);
  root.style.setProperty('--accent-rgb',    theme.accentRgb);
  root.style.setProperty('--font-family',   font.value);
}
