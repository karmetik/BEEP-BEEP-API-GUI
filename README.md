# BEEP-BEEP-API-GUI

Web console for BeepBeep API with:

- Google OAuth sign-in (Google Identity Services)
- ID token exchange to BeepBeep session JWT (`POST /v1/auth/google`)
- POI create, update, delete, list, and search tools
- Generic API tester for any BeepBeep endpoint
- Response viewer for request/response debugging

## Files

- `index.html` - UI layout
- `styles.css` - visual styling and responsive layout
- `app.js` - auth flow, API client, POI tooling, and API tester

## Quick Start

1. Open `index.html` in a browser (or serve this folder with any static server).
2. In Auth Setup:
   - Set `API Base URL` (defaults to production URL)
   - Set `API Prefix` (`/v1`)
   - Paste your `Google Client ID`
   - Choose Cloud Run mode:
     - `Public Cloud Run`: uses `Authorization: Bearer <APP_TOKEN>`
     - `Private Cloud Run (IAM)`: uses:
       - `Authorization: Bearer <PLATFORM_TOKEN>`
       - `X-Serverless-Authorization: Bearer <APP_TOKEN>`
3. Click `Initialize Google Sign-In`, complete sign-in, then click `Exchange Google ID Token -> Session JWT`.
4. Use the POI panel to create/update/delete/list/search records.
5. Use API Tester for custom endpoint checks.

## Deploy to GitHub Pages

This repo is configured to auto-deploy to GitHub Pages from `main` using GitHub Actions.

Expected site URL for this repository:

- `https://karmetik.github.io/BEEP-BEEP-API-GUI/`

### One-time GitHub setup

1. Push this repository to GitHub on branch `main`.
2. In repository settings, open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Ensure workflow permissions allow GitHub Actions to deploy Pages (default is usually enough).
5. Push any commit to `main` (or run the workflow manually) to publish.

The deployment workflow is in `.github/workflows/pages.yml`.

## Google OAuth Setup

Configure your Google OAuth client in Google Cloud Console:

- OAuth type: Web application
- Authorized JavaScript origins: include the exact site origin where this UI is hosted
- If running locally, include local origin (for example `http://localhost:5500`)

For GitHub Pages hosting in this repo, add:

- `https://karmetik.github.io`

The Google sign-in returns an ID token, which this UI exchanges with BeepBeep:

`POST /v1/auth/google` with body:

```json
{
  "idToken": "<google_id_token>"
}
```

On success, UI stores the returned session JWT as your app token.

## Notes

- Config is stored in browser `localStorage` under `beepbeep.console.config`.
- This project is intentionally dependency-free (plain HTML/CSS/JS) for easy hosting.
