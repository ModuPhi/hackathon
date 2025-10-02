import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  credits: real("credits").notNull().default(1000.00),
  usdc: real("usdc").notNull().default(0.00),
  apt: real("apt").notNull().default(0.00),
  debt: real("debt").notNull().default(0.00),
  healthFactor: real("health_factor"),
  selectedCause: text("selected_cause"),
  selectedNonprofits: json("selected_nonprofits").$type<string[]>().default(sql`'[]'::json`),
  effectsCompleted: integer("effects_completed").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  portfolioId: varchar("portfolio_id").notNull(),
  type: text("type").notNull(), // "Donation", "Swap", etc.
  amount: real("amount").notNull(),
  cause: text("cause"),
  reference: text("reference").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nonprofits = pgTable("nonprofits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  verified: integer("verified").notNull().default(1), // boolean as integer
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  updatedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
});

export const insertNonprofitSchema = createInsertSchema(nonprofits).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type InsertNonprofit = z.infer<typeof insertNonprofitSchema>;
export type Nonprofit = typeof nonprofits.$inferSelect;

// Effect A data structure for step calculations
export const effectADataSchema = z.object({
  allocatedAmount: z.number(),
  step1: z.object({
    fee: z.number(),
    usdcReceived: z.number(),
  }),
  step2: z.object({
    slippage: z.number(),
    aptReceived: z.number(),
  }),
  step3: z.object({
    borrowPercent: z.number(),
    borrowed: z.number(),
    healthFactor: z.number(),
  }),
  step4: z.object({
    donationAmount: z.number(),
    reference: z.string(),
  }),
});

export type EffectAData = z.infer<typeof effectADataSchema>;
