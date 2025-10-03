# DeFiGiving

Phase 1 integrates Google Identity with an Aptos keyless wallet so the app can expose a signer, Aptos client, and authenticated session across the UI. Portfolio math and mock data remain unchanged.

## Prerequisites
- Node.js 20+
- Google OAuth Web client (create via [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample environment file and update the values:
   ```bash
   cp ENV.sample .env
   ```
3. In the Google Cloud Console, create a **Web** OAuth client:
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173`
4. Update `.env`:
   - `VITE_GOOGLE_CLIENT_ID` → OAuth client id (`*.apps.googleusercontent.com`)
   - `VITE_APP_BASE_URL` → base URL for local dev (default `http://localhost:5173`)
   - Adjust `VITE_APTOS_NETWORK` / `VITE_APTOS_REST_URL` if you want a different network or REST endpoint.

## Running the app
```bash
npm run dev
```
This launches the Express API (with Vite middleware) on `http://localhost:5174` and serves the client on `http://localhost:5173`.

Click **Sign in with Google**. After consent, the app derives an Aptos keyless account, stores the signer locally, and shows the short address in the header. Use **Sign out** to clear the local state.

## Tests
Minimal Vitest coverage verifies keyless helpers:
```bash
npm run test
```
