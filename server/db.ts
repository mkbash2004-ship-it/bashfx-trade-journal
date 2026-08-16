import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { dailyJournals, InsertUser, journalReminderSettings, tradeDocuments, trades, users, weeklySummaries } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = values[field];
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

function getInsertedId(result: unknown): number {
  const first = Array.isArray(result) ? result[0] : result;
  const id = (first as { insertId?: number | string } | undefined)?.insertId;
  if (id === undefined) throw new Error("Database insert did not return an id");
  return Number(id);
}

export type JournalTradeRecord = {
  tradingDay: Date;
  session: string;
  direction: string;
  tradeType: string;
  setup: string;
  entryConfirmation: string;
  higherTimeframeAlignment: string;
  entry: string;
  exit: string;
  pips: number;
  profit: number | null;
  currency: string;
  riskAmount: number | null;
  riskUnit: string;
  plannedRr: number | null;
  stopManagement: string;
  partialProfit: string;
  result: string;
  exitReason: string;
  planAdherence: string;
  discipline: string;
  emotion: string;
  wouldTakeAgain: string;
  tags: string;
  notes: string;
  improvement: string;
};

export async function createDailyJournalEntry(input: {
  userId: number;
  journal: Omit<typeof dailyJournals.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">;
  tradeRecords: JournalTradeRecord[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const journalResult = await db.insert(dailyJournals).values({ ...input.journal, userId: input.userId });
  const journalId = getInsertedId(journalResult);
  await db.insert(trades).values(input.tradeRecords.map(trade => ({
    ...trade,
    userId: input.userId,
    documentId: null,
    pair: "XAUUSD",
    timeframe: "M5",
    confidence: 100,
  })));
  return { journalId, savedTrades: input.tradeRecords.length };
}

export async function getTradesForWeek(userId: number, weekStart: Date, weekEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(trades).where(and(eq(trades.userId, userId), gte(trades.tradingDay, weekStart), lt(trades.tradingDay, weekEnd))).orderBy(desc(trades.tradingDay), desc(trades.id));
}

export async function updateTradeForUser(userId: number, tradeId: number, values: Partial<JournalTradeRecord> & { tradingDay?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(trades).set(values).where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));
  const rows = await db.select().from(trades).where(and(eq(trades.id, tradeId), eq(trades.userId, userId))).limit(1);
  if (!rows[0]) throw new Error("Trade not found");
  return rows[0];
}

export async function createWeeklySummary(userId: number, weekStart: Date, imageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return getInsertedId(await db.insert(weeklySummaries).values({ userId, weekStart, imageKey }));
}

export async function getWeeklySummaries(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(weeklySummaries).where(eq(weeklySummaries.userId, userId)).orderBy(desc(weeklySummaries.createdAt));
}

export async function getWeeklySummaryForUser(userId: number, summaryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(weeklySummaries).where(and(eq(weeklySummaries.id, summaryId), eq(weeklySummaries.userId, userId))).limit(1))[0];
}

export async function getJournalReminderSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(journalReminderSettings).where(eq(journalReminderSettings.userId, userId)).limit(1))[0];
}

export async function saveJournalReminderSettings(input: {
  userId: number;
  enabled: number;
  timezone: string;
  dailyReminderTime: string;
  fridayReminderTime: string;
  saturdayReminderTime: string;
  dailyReminderTaskUid?: string | null;
  fridayReminderTaskUid?: string | null;
  saturdayReminderTaskUid?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(journalReminderSettings).values(input).onDuplicateKeyUpdate({
    set: {
      enabled: input.enabled,
      timezone: input.timezone,
      dailyReminderTime: input.dailyReminderTime,
      fridayReminderTime: input.fridayReminderTime,
      saturdayReminderTime: input.saturdayReminderTime,
      dailyReminderTaskUid: input.dailyReminderTaskUid ?? null,
      fridayReminderTaskUid: input.fridayReminderTaskUid ?? null,
      saturdayReminderTaskUid: input.saturdayReminderTaskUid ?? null,
    },
  });
  return getJournalReminderSettings(input.userId);
}

export async function getJournalReminderSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const settings = await db.select().from(journalReminderSettings);
  return settings.find(setting => setting.dailyReminderTaskUid === taskUid || setting.fridayReminderTaskUid === taskUid || setting.saturdayReminderTaskUid === taskUid);
}

export async function markJournalReminderSent(taskUid: string, kind: "daily" | "friday" | "saturday") {
  const settings = await getJournalReminderSettingsByTaskUid(taskUid);
  if (!settings) return { sent: false, reason: "orphan" as const };
  const prior = kind === "daily" ? settings.lastDailyReminderSentAt : kind === "friday" ? settings.lastFridayReminderSentAt : settings.lastSaturdayReminderSentAt;
  if (prior && Date.now() - prior.getTime() < 5 * 60 * 1000) return { sent: false, reason: "recently-sent" as const };
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const values = kind === "daily" ? { lastDailyReminderSentAt: now } : kind === "friday" ? { lastFridayReminderSentAt: now } : { lastSaturdayReminderSentAt: now };
  await db.update(journalReminderSettings).set(values).where(eq(journalReminderSettings.id, settings.id));
  return { sent: true, reason: "sent" as const, settings };
}

export async function clearJournalReminderSent(taskUid: string, kind: "daily" | "friday" | "saturday") {
  const settings = await getJournalReminderSettingsByTaskUid(taskUid);
  if (!settings) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = kind === "daily" ? { lastDailyReminderSentAt: null } : kind === "friday" ? { lastFridayReminderSentAt: null } : { lastSaturdayReminderSentAt: null };
  await db.update(journalReminderSettings).set(values).where(eq(journalReminderSettings.id, settings.id));
}

// Kept for source-document history created before the questionnaire revision.
export async function getTradesForDocument(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(trades).where(and(eq(trades.documentId, documentId), eq(trades.userId, userId))).orderBy(desc(trades.id));
}

export async function getTradeDocumentForUser(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(tradeDocuments).where(and(eq(tradeDocuments.id, documentId), eq(tradeDocuments.userId, userId))).limit(1))[0];
}
