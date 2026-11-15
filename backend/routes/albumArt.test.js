/**
 * Tests for the album art route: Last.fm image selection and the image proxy.
 * Run with: node --test
 */

const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const { Readable } = require('node:stream');
const express = require('express');
const axios = require('axios');

process.env.LAST_API_KEY = 'test-key';
const albumArtRoute = require('./albumArt');

const PLACEHOLDER = 'https://lastfm-img.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
const realAxiosGet = axios.get;
let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/album-art', albumArtRoute);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://localhost:${server.address().port}`;
  process.env.BACKEND_URL = baseUrl;
});

after(() => server.close());

afterEach(() => { axios.get = realAxiosGet; });

const lookupArt = (artist, title) =>
  fetch(`${baseUrl}/album-art`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artist, title }),
  });

test('proxies album art served from the lastfm-img CDN host', async () => {
  const artUrl = 'https://lastfm-img.freetls.fastly.net/i/u/300x300/62d26c6cb4ac4bdccb8f3a2a0fd55421.png';
  axios.get = async (url, opts) => {
    if (opts?.params?.method === 'track.getInfo') {
      return { data: { track: { album: { title: 'OK Computer', image: [
        { '#text': artUrl.replace('300x300', '174s'), size: 'large' },
        { '#text': artUrl, size: 'extralarge' },
      ] } } } };
    }
    if (url === artUrl) {
      return { headers: { 'content-type': 'image/png' }, data: Readable.from([Buffer.from('png-bytes')]) };
    }
    throw new Error(`unexpected request: ${url}`);
  };

  const res = await lookupArt('Radiohead', 'Karma Police');
  assert.strictEqual(res.status, 200);
  const { albumArt } = await res.json();
  assert.strictEqual(new URL(albumArt).searchParams.get('url'), artUrl);

  const img = await fetch(albumArt);
  assert.strictEqual(img.status, 200);
  assert.strictEqual(img.headers.get('content-type'), 'image/png');
  assert.strictEqual(await img.text(), 'png-bytes');
});

test('ignores Last.fm placeholder images and empty URLs', async () => {
  axios.get = async (url, opts) => {
    const method = opts?.params?.method;
    if (method === 'track.getInfo') {
      return { data: { track: { album: { title: 'Some Album', image: [
        { '#text': '', size: 'extralarge' },
        { '#text': PLACEHOLDER, size: 'large' },
      ] } } } };
    }
    if (method === 'album.getInfo') {
      return { data: { album: { image: [{ '#text': PLACEHOLDER, size: 'mega' }] } } };
    }
    if (method === 'artist.getInfo') {
      return { data: { artist: { image: [{ '#text': PLACEHOLDER, size: 'mega' }] } } };
    }
    throw new Error(`unexpected request: ${url}`);
  };

  const res = await lookupArt('Some Artist', 'Some Song');
  assert.strictEqual(res.status, 404);
});
