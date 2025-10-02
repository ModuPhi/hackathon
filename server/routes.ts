import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPortfolioSchema, insertReceiptSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
