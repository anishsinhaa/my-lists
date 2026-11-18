# Setup

Copy `.env.example` to `.env` and fill in the values below. Never commit `.env`.

## 1. Google Cloud (Sheets)

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project named `my-lists`.
2. APIs & Services > Library > enable **Google Sheets API**.
3. IAM & Admin > Service Accounts > Create (`my-lists-reader`) > Keys > Add key > JSON > download.
4. Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` to `GOOGLE_PRIVATE_KEY` (keep the `\n` sequences, wrap the value in double quotes).
5. Open the Sheet > Share > add the service account email as **Editor**.
6. The sheet id is the long string in the sheet URL between `/d/` and `/edit`. Put it in `GOOGLE_SHEET_ID`.
7. Add the new header cells yourself. The app never edits headers. The service account is a normal Editor; there are no protected ranges.

## 2. TMDB

themoviedb.org > Settings > API > create (personal use) > copy "API Read Access Token (v4)" to `TMDB_READ_TOKEN`.

## 2b. OMDb

omdbapi.com/apikey.aspx > FREE tier > confirm the emailed activation link > `OMDB_API_KEY`. The free tier is about 1,000 requests/day. The fetch-once rule keeps usage tiny.

## 3. RAWG

rawg.io/apidocs > get an API key > `RAWG_API_KEY`. The free tier is limited and requires attribution (footer link "Data: RAWG").

## 4. IGDB (optional)

dev.twitch.tv > Applications > Register > Client ID and Secret into `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`. The server uses the client-credentials token and `POST https://api.igdb.com/v4/games`. RAWG is the default games provider.

## 5. Jikan and Open Library

No key. Set `OPEN_LIBRARY_CONTACT` (used in the User-Agent). Jikan supplies MyAnimeList scores. Open Library supplies book covers and ratings when available.

## 6. Gemini (Phase 2)

aistudio.google.com > Get API key > `GEMINI_API_KEY`. Confirm the current free-tier model id in AI Studio before setting `GEMINI_MODEL`.

## 7. Vercel (later)

Import the repo. Copy every variable from `.env` (including `VITE_*`) into Project Settings > Environment Variables. Paste `GOOGLE_PRIVATE_KEY` with real newlines or with `\n` sequences.

## Local run

```
npm install
npm run dev
```

`npm run dev:web` is the Vite app. `npm run dev:api` is the local API (added in Step 4). `npm run hash` prints a bcrypt password hash (added in Step 5). `npm run check-sheet` prints a tab diagnostic (added in Step 8).
