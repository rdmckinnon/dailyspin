---
title: "{{ replace .Name "-" " " | title }}"
artist: ""
album: ""
release_date: 1970-01-01
featured_date: {{ now.Format "2006-01-02" }}
genres: []
moods: []
era: ""
year: {{ now.Format "2006" }}
spotify_id: ""
apple_music_url: ""
draft: false
---

{{< spotify "YOUR_SPOTIFY_ID" >}}

## Background
<!-- AI-assisted summary goes here -->

## Why it’s good
<!-- your voice here, ~150 words -->

## If you like this…
- Song – Artist (Year)
- Song – Artist (Year)
