import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tradeDocuments = mysqlTable("tradeDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 96 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  tradingDay: timestamp("tradingDay").notNull(),
  extractionStatus: varchar("extractionStatus", { length: 24 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  tradingDay: timestamp("tradingDay").notNull(),
  pair: varchar("pair", { length: 24 }).notNull(),
  session: varchar("session", { length: 64 }).notNull().default(""),
  direction: varchar("direction", { length: 16 }).notNull().default("unknown"),
  entry: varchar("entry", { length: 32 }).notNull().default(""),
  exit: varchar("exit", { length: 32 }).notNull().default(""),
  pips: double("pips"),
  profit: double("profit"),
  currency: varchar("currency", { length: 12 }).notNull().default(""),
  result: varchar("result", { length: 16 }).notNull().default("unknown"),
  notes: text("notes"),
  confidence: int("confidence").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const weeklySummaries = mysqlTable("weeklySummaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: timestamp("weekStart").notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TradeDocument = typeof tradeDocuments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;
