#!/usr/bin/env node

/**
 * Fix invalid spotify_ids by searching the Spotify API
 *
 * Usage: node scripts/fix-spotify-ids.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const SONGS_DIR = path.join(__dirname, '../content/songs');
const DATA_FILE = path.join(__dirname, '../data/spotify.json');

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

async function searchTrack(title, artist, accessToken) {
  const query = encodeURIComponent(`track:${title} artist:${artist}`);
  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await response.json();
  return data.tracks?.items || [];
}

async function getTrack(trackId, accessToken) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) return null;
  return response.json();
}

function extractFromFrontmatter(content, field) {
  const patterns = {
    title: /title:\s*["'](.+?)["']/,
    spotify_id: /spotify_id:\s*["']?([a-zA-Z0-9]+)["']?/,
    artists: /artists:\s*\[["'](.+?)["']/
  };

  const match = content.match(patterns[field]);
  return match ? match[1] : null;
}

async function main() {
  // Load current data to see which IDs are valid
  const existingData = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    : {};

  const validIds = new Set(Object.keys(existingData));

  console.log(`Found ${validIds.size} valid Spotify IDs\n`);

  // Get access token
  const accessToken = await getAccessToken();

  // Find songs with invalid IDs
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.md') && f !== '_index.md');

  let fixed = 0;
  let failed = [];

  for (const file of files) {
    const filePath = path.join(SONGS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    const currentId = extractFromFrontmatter(content, 'spotify_id');
    if (!currentId) continue; // No ID to fix

    if (validIds.has(currentId)) continue; // Already valid

    const title = extractFromFrontmatter(content, 'title');
    const artist = extractFromFrontmatter(content, 'artists');

    if (!title || !artist) continue;

    console.log(`Searching for: "${title}" by ${artist}...`);

    try {
      // First try to verify the current ID
      const currentTrack = await getTrack(currentId, accessToken);
      if (currentTrack) {
        console.log(`  ID ${currentId} is valid, adding to data`);
        validIds.add(currentId);
        continue;
      }

      // Search for the track
      const results = await searchTrack(title, artist, accessToken);

      if (results.length > 0) {
        const bestMatch = results[0];
        const newId = bestMatch.id;

        console.log(`  Found: ${bestMatch.name} by ${bestMatch.artists.map(a => a.name).join(', ')} -> ${newId}`);

        // Update the file
        content = content.replace(
          /spotify_id:\s*["']?[a-zA-Z0-9]+["']?/,
          `spotify_id: "${newId}"`
        );
        fs.writeFileSync(filePath, content);
        fixed++;
      } else {
        console.log(`  Not found`);
        failed.push({ file, title, artist });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      failed.push({ file, title, artist });
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\nCouldn't find:`);
    failed.forEach(({ title, artist }) => console.log(`  - "${title}" by ${artist}`));
  }

  console.log(`\nRun 'node scripts/fetch-album-art.js' to update album art data.`);
}

main().catch(console.error);
