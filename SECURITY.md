# Security

My Lists is a single-user app. The sheet stays private to the Google service account. The deployed site sends `noindex`.

## Secrets

- Passwords are checked against a bcrypt hash in `AUTH_PASSWORD_HASH`. The password is not stored.
- The session is a JWT in the `ml.session` cookie. The cookie is `HttpOnly` and `SameSite=Lax`. `Secure` is set in production. The token is not returned in JSON and is not stored in `localStorage`.
- `JWT_SECRET`, the Google private key, and the API keys for TMDB, OMDb, RAWG, IGDB, and Gemini are server environment variables. The only `VITE_` variable is the public picks flag.
- `.env` is gitignored. Do not commit `.env`, key files, `*.pem`, or `credentials*.json`.
- Share the Google Sheet with the service account email only. Do not publish the sheet to the web.

## Reporting

Do not open a GitHub issue that contains a password, token, private key, sheet id, or service-account email. Describe the behavior and the route. Rotate any secret that may have leaked before you report it.
