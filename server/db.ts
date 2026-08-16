import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, tradeDocuments, trades, users, weeklySummaries } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function getInsertedId(result: unknown): number {
  const first = Array.isArray(result) ? result[0] : result;
  const id = (first as { insertId?: number | string } | undefined)?.insertId;
  if (id === undefined) throw new Error("Database insert did not return an id");
  return Number(id);
}

export async function createTradeDocument(input: {
  userId: number;
  fileName: string;
  mimeType: string;
  storageKey: string;
  tradingDay: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(tradeDocuments).values({ ...input, extractionStatus: "pending" });
  return getInsertedId(result);
}

export async function setDocumentExtractionStatus(documentId: number, userId: number, status: "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(tradeDocuments).set({ extractionStatus: status }).where(and(eq(tradeDocuments.id, documentId), eq(tradeDocuments.userId, userId)));
}

export async function createTrades(input: Array<{
  userId: number;
  documentId: number;
  tradingDay: Date;
  pair: string;
  session: string;
  direction: string;
  entry: string;
  exit: string;
  pips: number | null;
  profit: number | null;
  currency: string;
  result: string;
  notes: string;
  confidence: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.length === 0) return [];
  await db.insert(trades).values(input);
  return getTradesForDocument(input[0].documentId, input[0].userId);
}

export async function getTradesForDocument(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(trades).where(and(eq(trades.documentId, documentId), eq(trades.userId, userId))).orderBy(desc(trades.id));
}

export async function getTradesForWeek(userId: number, weekStart: Date, weekEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(trades).where(and(eq(trades.userId, userId), gte(trades.tradingDay, weekStart), lt(trades.tradingDay, weekEnd))).orderBy(desc(trades.tradingDay), desc(trades.id));
}

export async function updateTradeForUser(userId: number, tradeId: number, values: {
  pair: string;
  session: string;
  direction: string;
  entry: string;
  exit: string;
  pips: number | null;
  profit: number | null;
  currency: string;
  result: string;
  notes: string;
}) {
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
  const result = await db.insert(weeklySummaries).values({ userId, weekStart, imageKey });
  return getInsertedId(result);
}

export async function getWeeklySummaries(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(weeklySummaries).where(eq(weeklySummaries.userId, userId)).orderBy(desc(weeklySummaries.createdAt));
}

export async function getWeeklySummaryForUser(userId: number, summaryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(weeklySummaries).where(and(eq(weeklySummaries.id, summaryId), eq(weeklySummaries.userId, userId))).limit(1);
  return rows[0];
}
