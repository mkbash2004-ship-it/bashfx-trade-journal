import { double, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  traderDisplayName: varchar("traderDisplayName", { length: 80 }),
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
  documentId: int("documentId"),
  tradingDay: timestamp("tradingDay").notNull(),
  pair: varchar("pair", { length: 24 }).notNull(),
  session: varchar("session", { length: 64 }).notNull().default(""),
  direction: varchar("direction", { length: 16 }).notNull().default("unknown"),
  timeframe: varchar("timeframe", { length: 12 }).notNull().default("M5"),
  tradeType: varchar("tradeType", { length: 32 }).notNull().default("intraday"),
  setup: varchar("setup", { length: 120 }).notNull().default(""),
  entryConfirmation: varchar("entryConfirmation", { length: 160 }).notNull().default(""),
  higherTimeframeAlignment: varchar("higherTimeframeAlignment", { length: 48 }).notNull().default(""),
  entry: varchar("entry", { length: 32 }).notNull().default(""),
  exit: varchar("exit", { length: 32 }).notNull().default(""),
  pips: double("pips"),
  profit: double("profit"),
  currency: varchar("currency", { length: 12 }).notNull().default(""),
  riskAmount: double("riskAmount"),
  riskUnit: varchar("riskUnit", { length: 16 }).notNull().default(""),
  plannedRr: double("plannedRr"),
  stopManagement: varchar("stopManagement", { length: 40 }).notNull().default(""),
  partialProfit: varchar("partialProfit", { length: 48 }).notNull().default(""),
  result: varchar("result", { length: 16 }).notNull().default("unknown"),
  exitReason: varchar("exitReason", { length: 48 }).notNull().default(""),
  planAdherence: varchar("planAdherence", { length: 24 }).notNull().default(""),
  discipline: varchar("discipline", { length: 24 }).notNull().default(""),
  emotion: varchar("emotion", { length: 48 }).notNull().default(""),
  wouldTakeAgain: varchar("wouldTakeAgain", { length: 32 }).notNull().default(""),
  tags: text("tags"),
  notes: text("notes"),
  improvement: text("improvement"),
  confidence: int("confidence").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dailyJournals = mysqlTable("dailyJournals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  journalDate: timestamp("journalDate").notNull(),
  plannedSessions: varchar("plannedSessions", { length: 80 }).notNull().default(""),
  marketBias: varchar("marketBias", { length: 32 }).notNull().default("neutral"),
  marketContext: varchar("marketContext", { length: 64 }).notNull().default(""),
  scheduledEvents: varchar("scheduledEvents", { length: 255 }).notNull().default(""),
  newsTiming: varchar("newsTiming", { length: 32 }).notNull().default(""),
  dailyRiskLimit: double("dailyRiskLimit"),
  dailyRiskUnit: varchar("dailyRiskUnit", { length: 16 }).notNull().default(""),
  maxTrades: int("maxTrades"),
  preMarketMood: varchar("preMarketMood", { length: 48 }).notNull().default(""),
  riskLimitFollowed: varchar("riskLimitFollowed", { length: 24 }).notNull().default(""),
  tradeLimitFollowed: varchar("tradeLimitFollowed", { length: 24 }).notNull().default(""),
  newsImpact: varchar("newsImpact", { length: 80 }).notNull().default(""),
  dailyStrength: text("dailyStrength"),
  dailyLesson: text("dailyLesson"),
  dailyGrade: varchar("dailyGrade", { length: 4 }).notNull().default(""),
  tomorrowRule: text("tomorrowRule"),
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

export const monthlySummaries = mysqlTable("monthlySummaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  monthKey: varchar("monthKey", { length: 7 }).notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("monthlySummaries_userId_monthKey_unique").on(table.userId, table.monthKey)]);

export const monthlySummaryAutomation = mysqlTable("monthlySummaryAutomation", {
  id: int("id").autoincrement().primaryKey(),
  scheduleTaskUid: varchar("scheduleTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const journalReminderSettings = mysqlTable("journalReminderSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  enabled: int("enabled").notNull().default(0),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC+1"),
  dailyReminderTime: varchar("dailyReminderTime", { length: 5 }).notNull().default("20:00"),
  fridayReminderTime: varchar("fridayReminderTime", { length: 5 }).notNull().default("18:00"),
  saturdayReminderTime: varchar("saturdayReminderTime", { length: 5 }).notNull().default("09:00"),
  dailyNotificationTitle: varchar("dailyNotificationTitle", { length: 120 }).notNull().default("Bashfx VIP GOLD ROOM: complete today's journal"),
  dailyNotificationContent: text("dailyNotificationContent"),
  fridayNotificationTitle: varchar("fridayNotificationTitle", { length: 120 }).notNull().default("Bashfx VIP GOLD ROOM: Friday weekly summary"),
  fridayNotificationContent: text("fridayNotificationContent"),
  saturdayNotificationTitle: varchar("saturdayNotificationTitle", { length: 120 }).notNull().default("Bashfx VIP GOLD ROOM: Saturday follow-up"),
  saturdayNotificationContent: text("saturdayNotificationContent"),
  dailyReminderTaskUid: varchar("dailyReminderTaskUid", { length: 65 }),
  fridayReminderTaskUid: varchar("fridayReminderTaskUid", { length: 65 }),
  saturdayReminderTaskUid: varchar("saturdayReminderTaskUid", { length: 65 }),
  lastDailyReminderSentAt: timestamp("lastDailyReminderSentAt"),
  lastFridayReminderSentAt: timestamp("lastFridayReminderSentAt"),
  lastSaturdayReminderSentAt: timestamp("lastSaturdayReminderSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const feedbackEntries = mysqlTable("feedbackEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  moderatedAt: timestamp("moderatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradeDocument = typeof tradeDocuments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type DailyJournal = typeof dailyJournals.$inferSelect;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type MonthlySummary = typeof monthlySummaries.$inferSelect;
export type MonthlySummaryAutomation = typeof monthlySummaryAutomation.$inferSelect;
export type JournalReminderSettings = typeof journalReminderSettings.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
