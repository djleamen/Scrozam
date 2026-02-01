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
    // First, get track info to find the album name
    const trackResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'track.getInfo',
        api_key: API_KEY,
        artist: artist,
        track: title,
        format: 'json'
      }
    });

    let imageUrl = null;

    if (trackResponse.data.track?.album) {
      const albumName = trackResponse.data.track.album.title;
      
      if (albumName) {
        imageUrl = await fetchAlbumInfo(artist, albumName);
      }
    }

    // Fallback to artist image if no album art found
    if (!imageUrl) {
      imageUrl = await fetchArtistInfo(artist);
    }

    if (imageUrl) {
      res.json({ albumArt: imageUrl });
    } else {
      res.status(404).json({ error: 'No album art found' });
    }

  } catch (error) {
    console.error('Error fetching album art:', error.message);
    res.status(500).json({ error: 'Failed to fetch album art' });
  }
});

module.exports = router;
