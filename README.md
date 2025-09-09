# DailySpin.fm Starter

A Hugo + GitHub Pages starter for a "one perfect song per day" blog using the VnG Blue theme.

## Quickstart
```bash
mkdir dailyspin && cd dailyspin
# brew install hugo git gh   # if needed
make setup
git add -A && git commit -m "init"
make theme

make new TITLE="Rocket Man – Elton John"
# schedule example:
# make schedule FILE="content/songs/$(date +%Y)/$(date +%m)/rocket-man-elton-john/index.md" DATE="$(date +%Y-%m-%d)"

make serve
```

## Deploy
- GitHub Actions workflow included at `.github/workflows/publish.yml`.
- In GitHub Settings → Pages: set branch to `gh-pages` after first deploy.
- Add custom domain `dailyspin.fm` and point DNS to GitHub Pages.

## Helpers
- `./ds` small CLI (new/schedule/serve/publish).
- Taxonomies: artist, genres, moods, era, year.
