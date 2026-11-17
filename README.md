# My Lists

A personal viewer for movies, series, anime, games, books, and a couple of free-form lists. The Google Sheet is the source of truth. There is no database.

## Scripts

- `npm run dev` starts the Vite app and the local API together.
- `npm run typecheck`, `npm run lint`, and `npm run test` check the project.
- `npm run hash -- "password"` prints a bcrypt hash for `AUTH_PASSWORD_HASH`.
- `npm run check-sheet` prints row counts, missing columns, and warnings.

See `docs/SETUP.md` for Google, TMDB, OMDb, RAWG, and Vercel setup. Never commit `.env`.

Phase 2 (adding rows with Gemini) is planned only. The Add button stays disabled.
