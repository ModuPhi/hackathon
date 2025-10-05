# Feature Assessment 4.0.0 — Standardized Lesson I/O + JourneyOutput Verification

## Summary
- Added `journey_audit.move` implementing canonical `Entry`, `JourneyOutput`, event store, and helper APIs for friends/tests. The donation flow now emits a normalized JourneyOutput with schema versioning and empty metadata placeholder.
- Updated `user_vault::donate` to construct a donation entry and call `journey_audit::emit_output_internal` after a successful FA transfer. Move tests confirm the event captures tenant, user, journey ID, and entry fields.
- Extended the Move deployment script to initialize the new event handle and documented the extra step in `MOVE_DEPLOY.md`.
- Introduced an in-memory cached `/api/verify/:txHash` route that enforces matching `{ user, journey_id }`, fetches the on-chain event, and returns explorer links.
- Standardized Journey runtime props (journeyId, keyless, auth, Aptos client, capabilities) and added receipt verification polling + badge display on the client, wired through the portfolio context.
- `EffectAOverlay` now submits real `user_vault::donate` transactions when `VITE_DONATION_LIVE=true`, logging `[aptos] <function_id> → <tx_hash>` to the browser console on success and persisting the hash in receipts for verification polling.

## SPEC Alignment
- **journey_audit module:** All required structs and emit function available; helper entry function accepts primitive vectors to stay transaction-safe while internal friend API handles module calls.
- **Donation event emission:** `user_vault::donate` emits `JourneyOutput` with `kind="donation"`, USDC metadata, amount, and `direction=false` for `lend-and-donate@v1`.
- **Server verifier:** `/api/verify/:txHash` implements tenant-type matching, caches results 5 minutes, and includes `explorerUrl` for UI fallbacks.
- **Journey loader inputs:** Components now receive `journeyId`, keyless tools, auth, liquidity, and standardized capabilities.
- **Client receipts UI:** Polling (default 5s, 30s window) updates receipt state and surfaces “Verified on-chain” badge or fallback message with explorer link.
- **Docs/Env:** Added verifier config placeholders to `ENV.sample` and deployment guidance for `journey_audit`.

## Tests & Validation
- `aptos move test --skip-fetch-latest-git-deps --named-addresses dg_tenant=<tenant>` — validates donation emits expected JourneyOutput structure.
- `npm run test -- --run` — vitest smoke (keyless context) succeeded.
- `npm run check` — TypeScript compilation after wiring the live donation flow.
- Manual API verification (via new endpoint) still pending once on-chain tx available.

## Repo Notes
- No AGENTS.md updates required.
- `aptos/build` artifacts regenerated transiently during tests; restored to tracked state afterwards.

## Follow-ups / Risks
- Entry function accepts parallel primitive vectors; future tooling should wrap this to avoid manual byte copies if public exposure required.
- Verification currently relies on client mapping from receipt reference → journeyId (defaults to `lend-and-donate@v1`). Persisting journey metadata alongside receipts would harden cross-session behavior.
- Additional UI states (e.g., spinner while polling, explicit failure banner) could enhance clarity beyond the fallback copy.
