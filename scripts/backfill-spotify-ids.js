#!/usr/bin/env node

/**
 * Backfill spotify_id in song files from the exported playlist CSV
 *
 * Usage: node scripts/backfill-spotify-ids.js /path/to/playlist.csv
 */

const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, '../content/songs');

function parseCSV(content) {
  const lines = content.split('\n');
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  const tracks = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV properly handling quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const track = {};
    header.forEach((h, idx) => {
      track[h] = values[idx] || '';
    });

    tracks.push(track);
  }

  return tracks;
}

function extractSpotifyIdFromUri(uri) {
  // Format: spotify:track:XXXX
  const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s*-\s*(remaster|live|remix|version|edit|deluxe|radio|acoustic|original|2\d{3}).*/i, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/['']/g, "'")
    .trim();
}

function main() {
  const csvPath = process.argv[2] || '/Users/ryanmckinnon/Downloads/DailySpin.fm.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}\n`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const tracks = parseCSV(csvContent);

  console.log(`Found ${tracks.length} tracks in CSV\n`);

  // Build lookup map by normalized title
  const trackMap = new Map();
  for (const track of tracks) {
    const uri = track['Track URI'];
    const name = track['Track Name'];
    const artist = track['Artist Name(s)'];

    if (!uri || !name) continue;

    const spotifyId = extractSpotifyIdFromUri(uri);
    if (!spotifyId) continue;

    const normalizedName = normalizeTitle(name);
    const key = normalizedName;

    // Store first match (most likely the correct one)
    if (!trackMap.has(key)) {
      trackMap.set(key, { spotifyId, name, artist });
    }

    // Also store with artist for more precise matching
    const keyWithArtist = `${normalizedName}|${artist?.toLowerCase()}`;
    if (!trackMap.has(keyWithArtist)) {
      trackMap.set(keyWithArtist, { spotifyId, name, artist });
    }
  }

  console.log(`Built lookup map with ${trackMap.size} entries\n`);

  // Process song files
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.md') && f !== '_index.md');

  let updated = 0;
  let skipped = 0;
  let notFound = [];

  for (const file of files) {
    const filePath = path.join(SONGS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Check if already has spotify_id
    if (content.includes('spotify_id:')) {
      skipped++;
      continue;
    }

    // Extract title
    const titleMatch = content.match(/title:\s*["'](.+?)["']/);
    if (!titleMatch) continue;

    const title = titleMatch[1];
    const normalizedTitle = normalizeTitle(title);

    // Extract artist for more precise matching
    const artistMatch = content.match(/artists:\s*\[["'](.+?)["']/);
    const artist = artistMatch ? artistMatch[1].toLowerCase() : '';

    // Try to find match
    let match = trackMap.get(`${normalizedTitle}|${artist}`);
    if (!match) {
      match = trackMap.get(normalizedTitle);
    }

    if (match) {
      // Insert spotify_id after release_year line
      const insertPoint = content.indexOf('release_year:');
      if (insertPoint !== -1) {
        const lineEnd = content.indexOf('\n', insertPoint);
        const before = content.substring(0, lineEnd + 1);
        const after = content.substring(lineEnd + 1);

        // Check if spotify_id already exists on next line
        if (!after.startsWith('spotify_id:')) {
          // Find release_year line and insert before it
          content = content.replace(
            /(release_year:\s*["']?\d+["']?\n)/,
            `spotify_id: "${match.spotifyId}"\n$1`
          );

          fs.writeFileSync(filePath, content);
          console.log(`Updated: ${file} -> ${match.spotifyId}`);
          updated++;
        }
      }
    } else {
      notFound.push({ file, title });
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already had ID: ${skipped}`);
  console.log(`  Not found: ${notFound.length}`);

  if (notFound.length > 0 && notFound.length <= 20) {
    console.log(`\nNot found in playlist:`);
    notFound.forEach(({ file, title }) => console.log(`  - ${title} (${file})`));
  }
}

main();
