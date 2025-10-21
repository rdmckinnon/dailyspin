---
title: "{{ replace .Name "-" " " | title }}"
description: "Today's featured song"
summary: ""
date: {{ .Date }}
lastmod: {{ .Date }}
draft: true
weight: 50
toc: true
seo:
  title: "" # custom title (optional)
  description: "" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  noindex: false # false (default) or true

# Music metadata
artists: [""]
albums: [""]
genres: [""]
moods: [""]
years: [""]
popularity: [""] # underground, cult-classic, mainstream, viral, classic

# Song details
spotify_id: "" # Spotify track ID for embed
release_year: ""
featured_date: {{ .Date | dateFormat "2006-01-02" }}
---

## Background

[Add background information about the song, artist, or context]

## Why It's Good

[Explain what makes this song worth featuring]

## Standout Lyrics

> [Quote the most impactful lyrics here]

{{< spotify "SPOTIFY_ID_HERE" >}}

---

**Featured on:** {{ .Date | dateFormat "January 2, 2006" }}  
**Artist:** [Artist Name]  
**Album:** [Album Name]  
**Genre:** [Genre]  
**Mood:** [Mood]  
**Popularity:** [Popularity Level]