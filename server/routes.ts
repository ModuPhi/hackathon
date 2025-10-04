import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { promises as fs } from "fs";
import path from "path";
import { storage } from "./storage";
import { journeyRunsRepo } from "./journeys";
import { insertPortfolioSchema, insertReceiptSchema } from "@shared/schema";
import { z } from "zod";

const manifestPath = path.resolve(process.cwd(), "server", "data", "journeys.json");

async function readJourneysManifest() {
  const raw = await fs.readFile(manifestPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error("Invalid journeys manifest"), { status: 500 });
  }
  return parsed;
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
      storage.resetDemoData();
      journeyRunsRepo.clearAll();
      res.json({ status: "ok" });
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      res.status(status).json({ message: (error as any)?.message ?? "Failed to reset demo state" });
    }
  });

  // Get or create demo user and portfolio
  app.get("/api/portfolio", async (req, res) => {
    try {
      // For demo purposes, we'll use a fixed demo user
      let user = await storage.getUserByUsername("demo-user");
      if (!user) {
        user = await storage.createUser({
          username: "demo-user",
          password: "demo-password"
        });
      }
      
      const portfolio = await storage.getPortfolio(user.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio" });
    }
  });

  // Update portfolio
  app.patch("/api/portfolio", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo-user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updates = req.body;
      const updatedPortfolio = await storage.updatePortfolio(user.id, updates);
      
      res.json(updatedPortfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to update portfolio" });
    }
  });

  // Get receipts
  app.get("/api/receipts", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo-user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const receipts = await storage.getReceipts(user.id);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get receipts" });
    }
  });

  // Create receipt
  app.post("/api/receipts", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo-user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const portfolio = await storage.getPortfolio(user.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      const receiptData = insertReceiptSchema.parse({
        ...req.body,
        userId: user.id,
        portfolioId: portfolio.id,
      });
      
      const receipt = await storage.createReceipt(receiptData);
      res.json(receipt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid receipt data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create receipt" });
    }
  });

  // Get nonprofits
  app.get("/api/nonprofits", async (req, res) => {
    try {
      const nonprofits = await storage.getNonprofits();
      res.json(nonprofits);
    } catch (error) {
      res.status(500).json({ message: "Failed to get nonprofits" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
