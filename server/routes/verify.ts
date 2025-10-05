import type { Express, Request, Response } from "express";
import { ensureChainAddresses } from "../aptos";

const VERIFY_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  payload: VerifyPayload;
};

type VerifyPayload = {
  verified: boolean;
  journey_id?: string;
  entries?: unknown;
  block_height?: number;
  event_seq?: string;
  explorerUrl?: string;
};

const cache = new Map<string, CacheEntry>();

function normalizeHex(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("0x")) {
    return trimmed;
  }
  return `0x${trimmed}`;
}

function isTxHash(value: string): boolean {
  return /^0x[0-9a-f]+$/i.test(value);
}

async function fetchTransaction(restUrl: string, txHash: string) {
  const url = `${restUrl.replace(/\/+$/, "")}/transactions/by_hash/${txHash}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as any;
}

function buildExplorerUrl(base: string | undefined, network: string | undefined, hash: string): string | undefined {
  if (!base) return undefined;
  const normalizedBase = base.replace(/\/+$/, "");
  const url = `${normalizedBase}/txn/${hash}`;
  return network ? `${url}?network=${network}` : url;
}

export function registerVerifyRoute(app: Express) {
  app.get("/api/verify/:txHash", async (req: Request, res: Response) => {
    try {
      const txHashRaw = req.params.txHash;
      const user = req.query.user;
      const journeyIdRaw = req.query.journey_id;

      if (typeof user !== "string" || typeof journeyIdRaw !== "string") {
        return res.status(400).json({ message: "Missing required query params 'user' and 'journey_id'" });
      }

      const txHash = normalizeHex(txHashRaw);
      if (!isTxHash(txHash)) {
        return res.status(400).json({ message: "Invalid transaction hash" });
      }

      const cacheKey = `${txHash}:${normalizeHex(user)}:${journeyIdRaw}`;
      const cached = cache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        return res.json(cached.payload);
      }

      const addresses = await ensureChainAddresses();
      const tenantAddress = normalizeHex(addresses.tenantAddress);
      const explorerBase = process.env.APTOS_EXPLORER_API ?? addresses.explorerBase;
      const explorerUrl = buildExplorerUrl(explorerBase, addresses.network, txHash);

      const transaction = await fetchTransaction(addresses.restUrl ?? "", txHash);

      if (!transaction || !Array.isArray(transaction.events)) {
        const payload: VerifyPayload = { verified: false, explorerUrl };
        cache.set(cacheKey, { payload, expiresAt: now + VERIFY_TTL_MS });
        return res.json(payload);
      }

      const targetEventType = `${tenantAddress}::journey_audit::JourneyOutput`.toLowerCase();
      const requestedUser = normalizeHex(user);
      const requestedJourneyId = journeyIdRaw;

      const matchingEvent = transaction.events.find((event: any) => {
        if (!event?.type || typeof event.type !== "string") return false;
        if (event.type.toLowerCase() !== targetEventType) return false;
        const data = event.data;
        if (!data) return false;
        const eventUser = typeof data.user === "string" ? normalizeHex(data.user) : "";
        const eventJourneyId = typeof data.journey_id === "string" ? data.journey_id : "";
        return eventUser === requestedUser && eventJourneyId === requestedJourneyId;
      });

      if (!matchingEvent) {
        const payload: VerifyPayload = { verified: false, explorerUrl };
        cache.set(cacheKey, { payload, expiresAt: now + VERIFY_TTL_MS });
        return res.json(payload);
      }

      const payload: VerifyPayload = {
        verified: true,
        journey_id: requestedJourneyId,
        entries: matchingEvent.data?.entries,
        block_height: typeof matchingEvent.block_height === "number" ? matchingEvent.block_height : undefined,
        event_seq: typeof matchingEvent.sequence_number === "string" ? matchingEvent.sequence_number : undefined,
        explorerUrl,
      };
      cache.set(cacheKey, { payload, expiresAt: now + VERIFY_TTL_MS });
      return res.json(payload);
    } catch (error) {
      res.status(500).json({ message: (error as Error)?.message ?? "Failed to verify transaction" });
    }
  });
}
