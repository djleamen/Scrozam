/**
 * Route to fetch album art from Last.fm API based on artist and track title.
 * If album art is not found, it falls back to artist image.
 * 
 * Written by DJ Leamen 2024-2026
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = process.env.LAST_API_KEY;

const extractLargestImage = (images) => {
  /**
   * Helper function to extract the largest image URL from Last.fm image array.
   * Last.fm image sizes (from smallest to largest):
   * small, medium, large, extralarge, mega
   * 
   * @param {Array} images - Array of image objects from Last.fm
   * @returns {string|null} - URL of the largest image or null if none found
   */
  if (!images || images.length === 0) return null;
  
  const largestImage = images.find(img => img.size === 'extralarge') || 
                       images.find(img => img.size === 'large') || 
                       images[images.length - 1];
  
  return largestImage?.['#text'] || null;
};

const fetchAlbumInfo = async (artist, albumName) => {
  /**
   * Fetches album information from Last.fm API.
   * 
   * @param {string} artist - Artist name
   * @param {string} albumName - Album name
   * @returns {string|null}
   */
  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'album.getInfo',
        api_key: API_KEY,
        artist: artist,
        album: albumName,
        format: 'json'
      }
    });

    if (response.data.album?.image) {
      return extractLargestImage(response.data.album.image);
    }
  } catch (error) {
    console.error('Error fetching album info:', error.message);
  }
  return null;
};

const fetchArtistInfo = async (artist) => {
  /**
 * Fetches artist information from Last.fm API.
 * 
 * @param {string} artist - Artist name
 * @returns {string|null}
 */
  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'artist.getInfo',
        api_key: API_KEY,
        artist: artist,
        format: 'json'
      }
    });

    if (response.data.artist?.image) {
      return extractLargestImage(response.data.artist.image);
    }
  } catch (error) {
    console.error('Error fetching artist info:', error.message);
  }
  return null;
};

/**
 * Strips common remaster/edition suffixes from a track title for fallback lookups.
 * e.g. "Song Title (2006 Remaster)" → "Song Title"
 * @param {string} title
 * @returns {string}
 */
const stripTitle = (title) =>
  title
    .replace(/\s*\(\d{4}\s+remaster.*?\)/gi, '')
    .replace(/\s*-\s*\d{4}\s+remaster.*/gi, '')
    .replace(/\s*\(remaster.*?\)/gi, '')
    .replace(/\s*\(deluxe.*?\)/gi, '')
    .replace(/\s*\(bonus.*?\)/gi, '')
    .trim();

router.post('/', async (req, res) => {
  /**
   * POST /albumArt
   * Request body: { artist: string, title: string }
   * Response: { albumArt: string } or { error: string }
   */
  const { artist, title } = req.body;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title are required' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'Last.fm API key not configured' });
  }

  try {
    let imageUrl = null;

    // ── Attempt 1: track.getInfo with original title ──────────────────────────
    const tryTrackInfo = async (trackTitle) => {
      try {
        const trackResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
          params: { method: 'track.getInfo', api_key: API_KEY, artist, track: trackTitle, format: 'json' }
        });
        const track = trackResponse.data.track;
        if (!track) return null;

        // Check if Last.fm returned album images directly on the track response
        if (track.album?.image) {
          const direct = extractLargestImage(track.album.image);
          if (direct) return direct;
        }

        // If we have an album name, do a dedicated album.getInfo call
        const albumName = track.album?.title;
        if (albumName) {
          const url = await fetchAlbumInfo(artist, albumName);
          if (url) return url;
        }
      } catch { /* ignore */ }
      return null;
    };

    imageUrl = await tryTrackInfo(title);

    // ── Attempt 2: strip remaster/edition suffix and retry ───────────────────
    if (!imageUrl) {
      const stripped = stripTitle(title);
      if (stripped && stripped !== title) {
        console.log(`🎨 Retrying album art with stripped title: "${stripped}"`);
        imageUrl = await tryTrackInfo(stripped);
      }
    }

    // ── Fallback: artist image ────────────────────────────────────────────────
    if (!imageUrl) {
      console.log(`🎨 Falling back to artist image for: ${artist}`);
      imageUrl = await fetchArtistInfo(artist);
    }

    if (imageUrl) {
      console.log(`🎨 Album art found for ${artist} - ${title}`);
      // Return a proxied URL so the browser never hits Last.fm CDN directly
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
      const proxied = `${BACKEND_URL}/album-art/proxy?url=${encodeURIComponent(imageUrl)}`;
      res.json({ albumArt: proxied });
    } else {
      console.warn(`🎨 No album art found for ${artist} - ${title}`);
      res.status(404).json({ error: 'No album art found' });
    }

  } catch (error) {
    console.error('Error fetching album art:', error.message);
    res.status(500).json({ error: 'Failed to fetch album art' });
  }
});

/**
 * GET /album-art/proxy?url=<encoded Last.fm image URL>
 * Fetches the image server-side and streams it to the browser,
 * bypassing Last.fm CDN hotlink protection.
 */
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');

  // Only allow proxying images from a restricted set of Last.fm/CDN hosts
  const ALLOWED_IMAGE_HOSTS = new Set([
    'lastfm.freetls.fastly.net',
    'lastfm-img2.akamaized.net',
    'userserve-ak.last.fm',
    'www.last.fm',
  ]);

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return res.status(400).send('Invalid url parameter');
  }

  const protocol = parsedUrl.protocol;
  const hostname = parsedUrl.hostname.toLowerCase();

  if ((protocol !== 'http:' && protocol !== 'https:') || !ALLOWED_IMAGE_HOSTS.has(hostname)) {
    return res.status(400).send('URL not allowed');
  }

  try {
    const imageRes = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'Referer': 'https://www.last.fm/',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 10000,
    });

    res.setHeader('Content-Type', imageRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h in browser
    imageRes.data.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(502).send('Failed to fetch image');
  }
});

module.exports = router;
