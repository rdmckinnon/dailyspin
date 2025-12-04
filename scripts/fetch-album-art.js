#!/usr/bin/env node

/**
 * Fetch album art from Spotify API for all songs with spotify_id
 *
 * Usage: node scripts/fetch-album-art.js
 *
 * This script:
 * 1. Reads all song markdown files
 * 2. Extracts spotify_id from frontmatter
 * 3. Fetches track data from Spotify API (including album art)
 * 4. Generates a JSON data file that Hugo can use
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const SONGS_DIR = path.join(__dirname, '../content/songs');
const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'spotify.json');

// Rate limiting
const BATCH_SIZE = 50; // Spotify allows up to 50 tracks per request
const DELAY_MS = 100;

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getTracksBatch(trackIds, accessToken) {
  const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tracks: ${response.status}`);
  }

  const data = await response.json();
  return data.tracks;
}

function extractSpotifyId(content) {
  const match = content.match(/spotify_id:\s*["']?([a-zA-Z0-9]+)["']?/);
  return match ? match[1] : null;
}

function extractTitle(content) {
  const match = content.match(/title:\s*["'](.+?)["']/);
  return match ? match[1] : null;
}

async function main() {
  console.log('Fetching album art from Spotify...\n');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Read all song files
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.md') && f !== '_index.md');

  // Extract spotify IDs
  const songs = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(SONGS_DIR, file), 'utf-8');
    const spotifyId = extractSpotifyId(content);
    const title = extractTitle(content);

    if (spotifyId) {
      songs.push({ file, spotifyId, title });
    }
  }

  console.log(`Found ${songs.length} songs with Spotify IDs\n`);

  if (songs.length === 0) {
    console.log('No songs with spotify_id found.');
    return;
  }

  // Get access token
  console.log('Getting Spotify access token...');
  const accessToken = await getAccessToken();
  console.log('Got access token.\n');

  // Fetch tracks in batches
  const spotifyData = {};

  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    const trackIds = batch.map(s => s.spotifyId);

    console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(songs.length / BATCH_SIZE)} (${trackIds.length} tracks)...`);

    try {
      const tracks = await getTracksBatch(trackIds, accessToken);

      for (const track of tracks) {
        if (track) {
          const albumImages = track.album?.images || [];
          const largeImage = albumImages.find(img => img.width === 640) || albumImages[0];
          const mediumImage = albumImages.find(img => img.width === 300) || albumImages[1] || largeImage;
          const smallImage = albumImages.find(img => img.width === 64) || albumImages[2] || mediumImage;

          spotifyData[track.id] = {
            name: track.name,
            artists: track.artists.map(a => a.name),
            album: track.album.name,
            albumArt: {
              large: largeImage?.url || null,
              medium: mediumImage?.url || null,
              small: smallImage?.url || null
            },
            previewUrl: track.preview_url,
            externalUrl: track.external_urls.spotify,
            duration: track.duration_ms,
            popularity: track.popularity
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching batch: ${error.message}`);
    }

    // Rate limiting delay
    if (i + BATCH_SIZE < songs.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Write data file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(spotifyData, null, 2));
  console.log(`\nWrote ${Object.keys(spotifyData).length} tracks to ${OUTPUT_FILE}`);

  // Summary
  const missing = songs.filter(s => !spotifyData[s.spotifyId]);
  if (missing.length > 0) {
    console.log(`\nWarning: ${missing.length} tracks not found on Spotify:`);
    missing.forEach(s => console.log(`  - ${s.title} (${s.spotifyId})`));
  }
}

main().catch(console.error);
