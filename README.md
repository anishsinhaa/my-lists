# My Lists

Personal media tracker for series, movies, anime, games, and books. A Google Sheet is the source of truth. There is no database.

The live app is private: one login, and search engines are asked not to index it.

## Features

- Home archive with search that opens the detail modal on the current page
- Category pages for movies, series, anime, games, and books, plus two free-form lists
- Status filters on the bar; sort and grouping inside the filters panel
- Half-star ratings and notes, written back to the sheet
- Posters and external ratings from TMDB, RAWG, Open Library, Jikan, and OMDb
- Pick for tonight

Textures live in the repo. Personal screenshots do not.

## Stack

React 19, Vite, Tailwind CSS 4, React Router, Motion. The API is a set of Vercel functions. Auth is a bcrypt password check and an httpOnly session cookie. Google Sheets is accessed with a service account.

## Local setup

```bash
npm install
cp .env.example .env
npm run hash -- "your-password"
npm run dev
```

Fill `.env` from `.env.example`. Every name is listed there. Do not commit `.env`.

`npm run dev` starts the Vite app and the local API. The app is at `http://localhost:5173` and proxies `/api` to the API port in `.env` (`API_DEV_PORT`, default 3001).

`npm run typecheck`, `npm run lint`, and `npm run test` check the project.

Google, TMDB, OMDb, and RAWG setup steps are in `docs/SETUP.md`. Deploy steps are in `DEPLOY.md`.

## Deploy

The host is Vercel. `vercel.json` rewrites the SPA, runs `api/**/*.ts`, and sets the security headers. Copy the variable names from `.env.example` into the Vercel project. See `DEPLOY.md`.
