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
      { 
        id: randomUUID(), 
        name: "Education for All", 
        description: "Providing quality education and school supplies to underserved communities. Supporting teachers and students with resources to build a brighter future.",
        location: "Kenya",
        imageUrl: "/attached_assets/stock_images/diverse_community_vo_d2a5c659.jpg",
        category: "Education",
        verified: 1 
      },
      { 
        id: randomUUID(), 
        name: "Clean Water Initiative", 
        description: "Building wells and water systems to bring clean, safe drinking water to rural villages. Improving health and quality of life through sustainable water solutions.",
        location: "Uganda",
        imageUrl: "/attached_assets/stock_images/water_well_clean_dri_a4e26fb9.jpg",
        category: "Water & Sanitation",
        verified: 1 
      },
      { 
        id: randomUUID(), 
        name: "Community Health Partners", 
        description: "Delivering essential healthcare services and medical supplies to remote areas. Training local health workers to serve their communities effectively.",
        location: "Philippines",
        imageUrl: "/attached_assets/stock_images/medical_clinic_healt_ede4183d.jpg",
        category: "Healthcare",
        verified: 1 
      },
      { 
        id: randomUUID(), 
        name: "Global Education Fund", 
        description: "Building schools and training teachers in developing regions. Providing scholarships and learning materials to children who lack access to education.",
        location: "Guatemala",
        imageUrl: "/attached_assets/stock_images/diverse_community_vo_c5b136df.jpg",
        category: "Education",
        verified: 1 
      },
      { 
        id: randomUUID(), 
        name: "Rural Medical Access", 
        description: "Operating mobile clinics and health centers in underserved regions. Providing free medical care, vaccinations, and health education to families in need.",
        location: "India",
        imageUrl: "/attached_assets/stock_images/medical_clinic_healt_14798f04.jpg",
        category: "Healthcare",
        verified: 1 
      },
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
      selectedNonprofits: [],
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
      selectedNonprofits: insertPortfolio.selectedNonprofits ?? [],
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
