# Journeys Manifest

The journeys manifest powers the Phase 2 dynamic journeys experience. It lives at `server/data/journeys.json` and is served verbatim from `GET /api/journeys`. Update this file when you want to add, remove, or reorder journeys.

## File location

- Path: `server/data/journeys.json`
- API: `GET /api/journeys`
- Cache: `Cache-Control: no-store` to guarantee fresh data in demos

## Manifest shape

Each entry must match the following structure:

```json
{
  "slug": "unique-slug",
  "title": "Card title shown on the dashboard",
  "level": "beginner | intermediate | advanced",
  "enabled": true,
  "importPath": "@/journeys/MyJourneyModule"
}
```

- `slug`: Stable identifier, reused for telemetry and journey runs.
- `title`: Heading displayed on the dashboard card.
- `level`: Free-form label; used for badges.
- `enabled`: Toggle to hide a journey without removing it from the manifest.
- `importPath`: Vite-compatible import specifier. **Must** be same-origin (`@/`, `./`, `../`). Remote URLs and protocol-relative paths are rejected by the loader.

## Adding a journey

1. **Create a journey module** under `client/src/journeys/`. Modules must default-export a React component that accepts the loader contract:

   ```ts
   type JourneyComponentProps = {
     isOpen: boolean;
     onClose: () => void;
     auth: { userId: string; tenantId: string };
     keyless: {
       address: string;
       signMessage: (message: string | Uint8Array) => Promise<string>;
       signTransaction: (...args: any[]) => Promise<string>;
     };
     aptos: { client: Aptos };
     capabilities: {
       portfolio: { merge: (updates: Partial<Portfolio>) => Promise<void> };
       receipts: { create: (receipt: { type: string; amount: number; cause?: string; reference: string }) => Promise<void> };
     };
     telemetry: {
       onStart: (slug: string) => Promise<void>;
       onComplete: (slug: string) => Promise<void>;
       onAbort: (slug: string, reason?: string) => Promise<void>;
     };
   }
   ```

   - Use the injected `capabilities` instead of importing portfolio or receipt helpers directly.
   - Call `telemetry.onStart` when the journey begins, `telemetry.onComplete` on successful completion, and `telemetry.onAbort` for cancellations or errors.

2. **Avoid forbidden imports.** The `npm run lint:journeys` script ensures journey modules do not import `@aptos-labs/ts-sdk` or `@/contexts/keyless-context`. Stick to the injected signer and client.

3. **Update `journeys.json`.** Add an entry with the new slug, title, level, enabled flag, and import path pointing at your module.

4. **Restart if needed.** `GET /api/journeys` returns the manifest directly, so no build step is required—just refresh the dashboard.

## Telemetry and journey runs

- `POST /api/journey-runs/start` records the beginning of a journey for the current user/tenant.
- `POST /api/journey-runs/complete` marks the last open run as finished.
- `GET /api/journey-runs` powers the header counter and card completion state.

The loader automatically supplies the telemetry functions to every journey. Modules should simply call them at the right moments.

## Capabilities contract

- `capabilities.portfolio.merge` &rarr; `PATCH /api/portfolio`
- `capabilities.receipts.create` &rarr; `POST /api/receipts`

Both functions return promises and mirror the existing portfolio context behaviour.

## Error handling

- Bad `importPath` values (remote URLs, protocol-relative paths) trigger a user-friendly fallback and log an abort.
- Journey component rendering errors are captured by an error boundary; the loader calls `telemetry.onAbort` before returning the user to the dashboard.

Keep the manifest minimal—Phase 2 does not support per-tenant filtering or nested journey groups.
