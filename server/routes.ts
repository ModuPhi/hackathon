import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { promises as fs } from "fs";
import path from "path";
import { journeyRunsRepo } from "./journeys";
import { z } from "zod";
import {
  ensureChainAddresses,
  bootstrapUserVault,
  getUserVaultInfo,
  getJourneyOutputsForUser,
  getNonprofitRegistry,
} from "./aptos";
import { registerVerifyRoute } from "./routes/verify";
import { preferencesStore } from "./preferences";
import { donationMetadataStore } from "./donation-metadata";

const manifestPath = path.resolve(process.cwd(), "server", "data", "journeys.json");
const nonprofitsPath = path.resolve(process.cwd(), "server", "data", "nonprofits.json");

async function readJourneysManifest() {
  const raw = await fs.readFile(manifestPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error("Invalid journeys manifest"), { status: 500 });
  }
  return parsed;
}

async function readNonprofitsMetadata() {
  const raw = await fs.readFile(nonprofitsPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error("Invalid nonprofits metadata"), { status: 500 });
  }
  return parsed as Array<{
    slug: string;
    name: string;
    description: string;
    location: string;
    imageUrl: string;
    category: string;
  }>;
}

function requireSession(req: Request) {
  const userId = req.header("x-user-id");
  const tenantId = req.header("x-tenant-id");

  if (!userId || !tenantId) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return { userId, tenantId };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const journeySlugSchema = z.object({ slug: z.string().min(1) });

  app.get("/api/chain/addresses", async (_req, res) => {
    try {
      const addresses = await ensureChainAddresses();
      res.json(addresses);
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to load chain addresses" });
    }
  });

  app.post("/api/chain/bootstrap-vault", async (req, res) => {
    const schema = z.object({ address: z.string().min(1) });
    try {
      const { address } = schema.parse(req.body);
      const result = await bootstrapUserVault(address);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to bootstrap vault" });
    }
  });

  app.get("/api/journeys", async (_req, res) => {
    try {
      const manifest = await readJourneysManifest();
      res.setHeader("Cache-Control", "no-store");
      res.json(manifest);
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: "Failed to load journeys" });
    }
  });

  app.get("/api/journey-runs", async (req, res) => {
    try {
      const session = requireSession(req);
      const runs = journeyRunsRepo.getRuns(session.userId, session.tenantId).map((run) => ({
        id: run.id,
        slug: run.slug,
        started_at: run.started_at.toISOString(),
        completed_at: run.completed_at ? run.completed_at.toISOString() : null,
      }));

      res.json(runs);
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to load journey runs" });
    }
  });

  app.post("/api/journey-runs/start", async (req, res) => {
    try {
      const session = requireSession(req);
      const { slug } = journeySlugSchema.parse(req.body);

      const run = journeyRunsRepo.startRun({
        slug,
        userId: session.userId,
        tenantId: session.tenantId,
      });

      res.json({
        id: run.id,
        slug: run.slug,
        started_at: run.started_at.toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to start journey" });
    }
  });

  app.post("/api/journey-runs/complete", async (req, res) => {
    try {
      const session = requireSession(req);
      const { slug } = journeySlugSchema.parse(req.body);

      const run = journeyRunsRepo.completeRun({
        slug,
        userId: session.userId,
        tenantId: session.tenantId,
      });

      res.json({
        id: run.id,
        slug: run.slug,
        completed_at: run.completed_at?.toISOString() ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to complete journey" });
    }
  });

  app.post("/api/demo/reset", async (_req, res) => {
    try {
      preferencesStore.reset();
      donationMetadataStore.reset();
      journeyRunsRepo.clearAll();
      res.json({ status: "ok" });
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to reset demo state" });
    }
  });

  app.get("/api/portfolio", async (req, res) => {
    const schema = z.object({ aptosAddress: z.string().min(1) });
    try {
      const { aptosAddress } = schema.parse(req.query);
      const normalized = aptosAddress.toLowerCase();

      const [vaultInfo, events] = await Promise.all([
        getUserVaultInfo(normalized),
        getJourneyOutputsForUser(normalized, 100),
      ]);

      const preferences = preferencesStore.get(normalized);

      const donationEntries = events.flatMap((event) =>
        event.entries.filter((entry) => entry.kind === "donation" && entry.amount != null),
      );
      const donatedMicro = donationEntries.reduce((sum, entry) => sum + BigInt(entry.amount ?? "0"), BigInt(0));

      const microToDecimal = (value: bigint) => Number(value) / 1_000_000;

      res.json({
        aptosAddress: normalized,
        credits: microToDecimal(vaultInfo.balance),
        usdc: microToDecimal(vaultInfo.balance),
        apt: 0,
        debt: 0,
        healthFactor: null,
        selectedNonprofit: preferences.selectedNonprofit,
        completedEffects: preferences.completedEffects,
        effectsCompleted: preferences.effectsCompleted,
        donatedTotal: microToDecimal(donatedMicro),
        vaultBalanceMicro: vaultInfo.balance.toString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to load portfolio" });
    }
  });

  app.patch("/api/preferences", async (req, res) => {
    const schema = z.object({
      aptosAddress: z.string().min(1),
      selectedNonprofit: z.string().nullable().optional(),
      completedEffects: z.array(z.string()).optional(),
      effectsCompleted: z.number().optional(),
    });
    try {
      const { aptosAddress, ...updates } = schema.parse(req.body);
      const preferences = preferencesStore.update(aptosAddress, updates);
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preferences", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to update preferences" });
    }
  });

  app.get("/api/receipts", async (req, res) => {
    const schema = z.object({
      aptosAddress: z.string().min(1),
      limit: z.coerce.number().min(1).max(200).optional(),
    });
    try {
      const { aptosAddress, limit } = schema.parse(req.query);
      const events = await getJourneyOutputsForUser(aptosAddress, limit ?? 100);

      const microToDecimal = (value: string | undefined) => {
        if (!value) return 0;
        return Number(BigInt(value)) / 1_000_000;
      };

      const receipts = events.map((event) => {
        const donationEntry = event.entries.find((entry) => entry.kind === "donation");
        const metadata = event.hash ? donationMetadataStore.get(event.hash) : undefined;
        return {
          hash: event.hash,
          journeyId: event.journey_id,
          amount: microToDecimal(donationEntry?.amount),
          assetMetadata: donationEntry?.asset_metadata ?? null,
          causeSlug: metadata?.causeSlug ?? null,
          causeName: metadata?.causeName ?? null,
          timestamp: event.timestamp ?? null,
          blockHeight: event.blockHeight ?? null,
          sequenceNumber: event.sequenceNumber,
        };
      });

      res.json(receipts);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to load receipts" });
    }
  });

  app.post("/api/receipts", async (req, res) => {
    const schema = z.object({
      hash: z.string().min(1),
      aptosAddress: z.string().min(1),
      causeName: z.string().nullable().optional(),
      causeSlug: z.string().nullable().optional(),
    });
    try {
      const { hash, aptosAddress, causeName, causeSlug } = schema.parse(req.body);
      donationMetadataStore.set(hash, { aptosAddress, causeName, causeSlug });
      res.json({ status: "ok" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid receipt metadata", errors: error.errors });
      }
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to record receipt metadata" });
    }
  });

  app.get("/api/nonprofits", async (_req, res) => {
    try {
      const metadata = await readNonprofitsMetadata();
      const registry = await getNonprofitRegistry();

      const nonprofits = metadata.map((item) => ({
        ...item,
        payoutAddress: registry[item.slug] ?? null,
        verified: registry[item.slug] ? 1 : 0,
      }));

      const extraSlugs = Object.keys(registry).filter(
        (slug) => !metadata.some((item) => item.slug === slug),
      );
      extraSlugs.forEach((slug) => {
        nonprofits.push({
          slug,
          name: slug,
          description: "On-chain nonprofit",
          location: "",
          imageUrl: "",
          category: "",
          payoutAddress: registry[slug],
          verified: 1,
        });
      });

      res.json(nonprofits);
    } catch (error) {
      res.status(500).json({ message: "Failed to get nonprofits" });
    }
  });

  registerVerifyRoute(app);

  const httpServer = createServer(app);
  return httpServer;
}
