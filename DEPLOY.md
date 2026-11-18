# Deploy on Vercel

Import this repo as a Vercel project. The framework preset is Vite. `vercel.json` already rewrites non-API routes to `index.html` and runs `api/**/*.ts`.

## Environment variables

Set these in Project Settings → Environment Variables. Copy the names from `.env.example`. Leave the values out of git.

| Name | Where it is used |
| --- | --- |
| `AUTH_USERNAME` | Server |
| `AUTH_PASSWORD_HASH` | Server |
| `JWT_SECRET` | Server |
| `JWT_EXPIRES_IN` | Server. Default `30d` |
| `GOOGLE_SHEET_ID` | Server |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server |
| `GOOGLE_PRIVATE_KEY` | Server |
| `TMDB_READ_TOKEN` | Server |
| `OMDB_API_KEY` | Server. May be empty |
| `RAWG_API_KEY` | Server |
| `OPEN_LIBRARY_CONTACT` | Server |
| `JIKAN_BASE_URL` | Server |
| `IGDB_CLIENT_ID` | Server. May be empty |
| `IGDB_CLIENT_SECRET` | Server. May be empty |
| `FEATURE_PICKS` | Server |
| `FEATURE_ADD` | Server |
| `GEMINI_API_KEY` | Server. May be empty |
| `GEMINI_MODEL` | Server. May be empty |
| `VITE_FEATURE_PICKS` | Client bundle. `true` or `false` only |
| `API_DEV_PORT` | Local API only. Not required on Vercel |

`VITE_FEATURE_PICKS` is the only variable that Vite inlines into the browser bundle. Everything else stays on the server.

## Google private key

`GOOGLE_PRIVATE_KEY` is the `private_key` field from the service-account JSON. Paste it with real line breaks, or as one line with the two-character sequence `\n` where the line breaks were. The server turns `\n` sequences into newlines. Do not wrap it in extra quotes inside the Vercel field.

Share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an editor. Do not set the sheet to "Anyone with the link".

On Vercel, the picks toggles are stored in a hidden `Settings` tab in that spreadsheet. The service account needs to be an editor so it can add that tab. Locally they stay in `data/settings.json`.

## After the first deploy

Sign in once and confirm a rating change writes back to the sheet. The site sends `X-Robots-Tag: noindex, nofollow` and a matching robots meta tag.
