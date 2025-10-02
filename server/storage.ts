import { type User, type InsertUser, type Portfolio, type InsertPortfolio, type Receipt, type InsertReceipt, type Nonprofit, type InsertNonprofit } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPortfolio(userId: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(userId: string, updates: Partial<Portfolio>): Promise<Portfolio>;
  
  getReceipts(userId: string): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  
  getNonprofits(): Promise<Nonprofit[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private portfolios: Map<string, Portfolio>;
  private receipts: Map<string, Receipt>;
  private nonprofits: Map<string, Nonprofit>;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.receipts = new Map();
    this.nonprofits = new Map();
    
    // Initialize default nonprofits
    this.initializeNonprofits();
  }

  private initializeNonprofits() {
    const defaultNonprofits: Nonprofit[] = [
      { id: randomUUID(), name: "Red Cross (test)", verified: 1 },
      { id: randomUUID(), name: "UNICEF (test)", verified: 1 },
      { id: randomUUID(), name: "Doctors Without Borders (test)", verified: 1 },
    ];
    
    defaultNonprofits.forEach(nonprofit => {
      this.nonprofits.set(nonprofit.id, nonprofit);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    
    // Create default portfolio for new user
    await this.createPortfolio({
      userId: id,
      credits: 1000.00,
      usdc: 0.00,
      apt: 0.00,
      debt: 0.00,
      healthFactor: null,
      selectedCause: null,
      effectsCompleted: 0,
    });
    
    return user;
  }

  async getPortfolio(userId: string): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(
      (portfolio) => portfolio.userId === userId
    );
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = {
      id,
      userId: insertPortfolio.userId,
      credits: insertPortfolio.credits ?? 1000.00,
      usdc: insertPortfolio.usdc ?? 0.00,
      apt: insertPortfolio.apt ?? 0.00,
      debt: insertPortfolio.debt ?? 0.00,
      healthFactor: insertPortfolio.healthFactor ?? null,
      selectedCause: insertPortfolio.selectedCause ?? null,
      effectsCompleted: insertPortfolio.effectsCompleted ?? 0,
      updatedAt: new Date(),
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async updatePortfolio(userId: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const existing = await this.getPortfolio(userId);
    if (!existing) {
      throw new Error("Portfolio not found");
    }
    
    const updated: Portfolio = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.portfolios.set(existing.id, updated);
    return updated;
  }

  async getReceipts(userId: string): Promise<Receipt[]> {
    return Array.from(this.receipts.values()).filter(
      (receipt) => receipt.userId === userId
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const id = randomUUID();
    const receipt: Receipt = {
      id,
      userId: insertReceipt.userId,
      portfolioId: insertReceipt.portfolioId,
      type: insertReceipt.type,
      amount: insertReceipt.amount,
      cause: insertReceipt.cause ?? null,
      reference: insertReceipt.reference,
      createdAt: new Date(),
    };
    this.receipts.set(id, receipt);
    return receipt;
  }

  async getNonprofits(): Promise<Nonprofit[]> {
    return Array.from(this.nonprofits.values());
  }
}

export const storage = new MemStorage();
