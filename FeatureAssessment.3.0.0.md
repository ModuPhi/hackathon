# Feature Assessment – Current State vs SPEC 3.0.0

## Context & Pivot Rationale
- **Initial design issues**: The SPEC 3.0.0 approach centered on a tenant-owned `Coin<USDC>` omnibus vault. In practice this coupled every donation to `coin::Coin`, which is deprecated on current Aptos SDKs, and forced us to shuttle large Coin resources between entry functions. The model also froze cause metadata inside a resource account table and required multi-step manual setup (publish → run init → hand-edit slug mappings → manually fund users).
- **Operational friction**: Deployment documentation depended on ad hoc CLI invocations (`aptos move publish`, repeated `set_cause` calls, manual tenant funding). During localnet runs this broke frequently: ABI restrictions (`&String` parameters), outdated framework tags, and CLI flag drift made the script brittle and hard to replay.
- **Strategic change**: We shifted to the recommended fungible-asset object pattern. Each user owns a named object (deterministic address) holding a `FungibleStore`, the tenant mints demo USDC via a faucet, and donations move fungible assets rather than raw coins. This aligns with Aptos’ current standards, keeps user attribution events lightweight, and lets us automate provisioning end-to-end.

## What Exists Now
- **Move modules** (`aptos/sources`)
  - `usdc_demo.move`: publishes dev metadata, exposes faucet mint, and provides `metadata_object()` for store init.
  - `user_vault.move`: ensures an idempotent user object + fungible store, supports tenant-funded top-ups, and submits on-chain donations that emit receipts.
  - `nonprofit_registry.move`: stores slug → payout `SimpleMap<String, address>`, exposes a public view for clients, and offers friend-only lookup for Move callers.
  - `receipts.move`: emits `DonationReceipt` events consumed by the UI timeline.
  - Unit coverage in `aptos/tests/donation_tests.move` exercises happy path and abort cases.
- **Server / client integration**
  - `/api/chain/addresses` now returns `tenantAddress`, `usdcMetadataAddress`, local explorer base, and rest URL.
  - `server/routes.ts` exposes `/api/chain/bootstrap-vault`; it signs with the tenant to ensure each login gets topped up to 1000 dUSDC.
  - Front-end donation flow (`EffectAOverlay`, `KeylessContext`, `use-chain-addresses`, receipts timeline) creates vaults, normalizes amounts to base units, submits on-chain transactions with the keyless signer, and links to the explorer.
- **Deployment tooling**
  - `scripts/deploy.ts` consolidates the entire setup: loads `.aptos/config.yaml`, funds the tenant via local faucet, runs Move tests, publishes modules with skip-fetch flags, initializes `usdc_demo`, `nonprofit_registry`, `receipts`, seeds all nonprofits found in the config (slug → address), updates `.env` and `server/data/addresses.json`, and (optionally) flips `DONATION_LIVE` / `VITE_DONATION_LIVE`. A single command now reprovisions localnet without manual JSON edits.

## Divergence from SPEC 3.0.0
- The on-chain donation objective is satisfied, but the architecture uses per-user fungible stores rather than a single tenant omnibus `TenantVault<Coin<USDC>>` resource.
- SPEC expected manual cause provisioning and hard-coded USDC coin types; we replaced these with config-driven slug seeding and a dev-only `usdc_demo` metadata address exposed via API.
- Client/server deliverables remain intact (live donation flow, explorer links, feature flag guard), but the implementation relies on the new bootstrap endpoint instead of a lane inside the tenant vault module.

## Validation & Runs
- `aptos move test --skip-fetch-latest-git-deps --named-addresses dg_tenant=<tenant>` (auto-run inside `npm run deploy`).
- `npm run deploy -- --set-live-flags` against localnet: funds tenant, publishes modules, initializes registries, seeds six nonprofits from `.aptos/config.yaml`, writes `.env` and `server/data/addresses.json`.
- Manual curl `GET /v1/-/healthy` to confirm node availability prior to deployment.

## Operational State
- `.env` now carries `TENANT_ADDRESS`, `USDC_METADATA_ADDRESS`, and donation feature flags; `server/data/addresses.json` mirrors these values.
- All nonprofits defined in `.aptos/config.yaml` (clean-water-initiative, community-health-partners, education-for-all, global-education-fund, rural-medical-access, tester2) are on-chain under the single tenant account `0x78f6…(default profile)`.
- Tenant balance is auto-topped through the deploy script (1B Octas via local faucet) before publishing to avoid gas failures.

## Risks & Follow-Ups
- **Dev-only faucet**: `usdc_demo::faucet_mint` is unrestricted. Before any public testnet rollout, gate it behind admin checks or strip it entirely.
- **Localnet assumptions**: The deploy script defaults to `http://127.0.0.1:8080`. For remote environments, update `deploy.config.json` or pass `--rest-url/--faucet-url`.
- **User vault bootstrap**: The current server endpoint still signs as tenant. Long term we may want on-chain automation or a Move script that tenants trigger off-chain.
- **SPEC documentation**: MOVE_DEPLOY.md and ENV.sample call out the new flow, but SPEC 3.0.0 itself still references the obsolete Coin-based tenant vault. Update SPEC or issue an addendum so future contributors follow the fungible asset path.

## Summary for PM
We abandoned the deprecated Coin-based omnibus vault because it fought the modern Aptos toolchain and was operationally brittle. The project now uses the recommended fungible asset + object model: every user has a deterministic vault, the tenant demo-mints USDC, and donations move fungible assets directly to nonprofit payout accounts. The deployment experience is scripted, repeatable, and seeds nonprofits from `.aptos/config.yaml`. Client and server flows are live-ready (behind `DONATION_LIVE`) with explorer-linked receipts. Remaining work primarily involves production hardening (faucet gating, SPEC rewrite) rather than core functionality.
