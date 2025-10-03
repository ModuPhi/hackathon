# Feature Assessment — Phase 1 (Google + Aptos Keyless)

## Work Completed
- Replaced the Auth0 stack with a Google Identity implicit flow: the login button redirects to Google, returns an ID token, and derives the Aptos keyless account entirely in the browser (`client/src/contexts/keyless-context.tsx`).
- Simplified the server by removing Auth0-specific routes, configs, and session middleware; only portfolio/nonprofit demo endpoints remain (`server/index.ts`, `server/routes.ts`).
- Persisted the serialized keyless account + ephemeral key pair in local storage so refreshes keep the signer alive until the pair expires; exposed `signMessage`/`signTransaction` plus the Aptos client via the provider.
- Updated the header UX to use Google login/logout while continuing to display the short Aptos address and “Journeys” vocabulary (`client/src/components/shared/header.tsx` and supporting components).
- Refreshed documentation and environment scaffolding for the Google flow (`ENV.sample`, `README.md`, `KEYLESS_NOTES.md`).

## SPEC Objectives
- **✅ Google login + Aptos keyless**: OAuth implicit flow generates an ID token, derives the keyless account, and keeps the signer available app-wide.
- **✅ Provider contract**: `KeylessProvider` exposes `{ user, tenant, aptosAddress, signMessage, signTransaction, aptosClient, login, logout }` with signer stored in memory (and mirrored to local storage).
- **✅ Header display**: Shows short-form Aptos address when authenticated; “Sign in” button otherwise; logout clears persisted state.
- **✅ Vocabulary**: UI continues to use “Journeys”; portfolio math/data untouched.
- **✅ Docs & ENV**: Google setup instructions and env vars shipped.

## Testing
- `npm run test` (Vitest) — smoke coverage confirming the helper that generates the ephemeral key pair returns a non-expired pair.

## Repo / AGENTS.md
- No AGENTS.md updates required.

## Open Questions & Follow-ups
- Add UI feedback for proof fetching and handle expired key pairs more gracefully (e.g., proactive refresh).
- Integrate deeper transaction flows once on-chain features are enabled.
