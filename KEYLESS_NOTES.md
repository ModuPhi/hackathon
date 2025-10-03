# Keyless Flow Notes

## Overview
Phase 1 uses Google Identity to obtain an ID token in the browser, derives an Aptos keyless account with the Aptos TS SDK, and keeps the signer available through a React provider. No server-side validation or storage is required for authentication.

## Login Sequence
1. The user clicks **Sign in with Google**. A new `EphemeralKeyPair` is generated and saved to local storage together with an OAuth `state` value.
2. The browser redirects to `https://accounts.google.com/o/oauth2/v2/auth` (implicit flow) with `response_type=id_token`, the ephemeral nonce, and the registered redirect URI.
3. After Google redirects back with `#id_token=…`, the app:
   - Loads the persisted `EphemeralKeyPair`.
   - Derives a `KeylessAccount` via `aptos.keyless.deriveKeylessAccount({ jwt, ephemeralKeyPair })`.
   - Calls `checkKeylessAccountValidity` to wait for the proof and ensure the account is ready.
   - Stores the serialized account, ephemeral key pair, and basic user profile in local storage.
4. The header shows the short Aptos address (`0x123456…abcd`) and exposes `signMessage` / `signTransaction` via context.

## Runtime Handling
- **Client:**
  - Session state lives in memory and is synchronised to local storage so a refresh restores the signer (unless the ephemeral key pair expires).
  - `KeylessProvider` exposes `{ user, tenant, aptosAddress, aptosClient, signMessage, signTransaction, login, logout }`.
  - Before signing, the provider re-checks `checkKeylessAccountValidity` to ensure the proof is still valid.
- **Server:**
  - Unchanged for Phase 1 — it only serves portfolio, receipts, and nonprofits endpoints. No auth endpoints or sessions are required.

## Persistence & Security
- Stored payload: serialized `KeylessAccount`, serialized `EphemeralKeyPair`, optional user profile, and pending `oauthState` during the login redirect.
- If the ephemeral key pair expires (two-week window by default) or the proof check fails, the provider clears storage and requires a new login.
- `state` and `nonce` values ensure the returned ID token matches the locally generated ephemeral key pair.

## Follow-ups
- Add UI feedback (toasts/spinners) while the proof fetch is in-flight.
- Rotate or refresh the ephemeral key pair proactively when it nears expiry.
- Extend signing helpers to build actual Aptos transactions once on-chain operations are enabled.
