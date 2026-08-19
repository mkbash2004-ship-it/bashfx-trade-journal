import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { backupReminderSettings, dailyJournals, encryptedBackupArchives, feedbackEntries, InsertUser, journalReminderSettings, monthlySummaries, monthlySummaryAutomation, tradeDocuments, trades, users, weeklySummaries } from "../drizzle/schema";
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
  pair: string;
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

export async function getTradesForRange(userId: number, rangeStart: Date, rangeEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(trades).where(and(eq(trades.userId, userId), gte(trades.tradingDay, rangeStart), lt(trades.tradingDay, rangeEnd))).orderBy(desc(trades.tradingDay), desc(trades.id));
}

export async function getJournalBackupForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile, dailyJournalEntries, tradeRecords, generatedWeeklySummaries, generatedMonthlySummaries, sourceDocuments, reminderSettings] = await Promise.all([
    db.select({ traderDisplayName: users.traderDisplayName, name: users.name }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(dailyJournals).where(eq(dailyJournals.userId, userId)).orderBy(desc(dailyJournals.journalDate), desc(dailyJournals.id)),
    db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.tradingDay), desc(trades.id)),
    db.select().from(weeklySummaries).where(eq(weeklySummaries.userId, userId)).orderBy(desc(weeklySummaries.createdAt)),
    db.select().from(monthlySummaries).where(eq(monthlySummaries.userId, userId)).orderBy(desc(monthlySummaries.monthKey)),
    db.select().from(tradeDocuments).where(eq(tradeDocuments.userId, userId)).orderBy(desc(tradeDocuments.createdAt)),
    db.select().from(journalReminderSettings).where(eq(journalReminderSettings.userId, userId)).limit(1),
  ]);

  return {
    profile: profile[0] ?? null,
    dailyJournalEntries,
    tradeRecords,
    generatedWeeklySummaries,
    generatedMonthlySummaries,
    sourceDocuments,
    reminderSettings: reminderSettings[0] ?? null,
  };
}

export async function getUsersWithTradesForRange(rangeStart: Date, rangeEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ userId: trades.userId }).from(trades).where(and(gte(trades.tradingDay, rangeStart), lt(trades.tradingDay, rangeEnd)));
  return Array.from(new Set(rows.map(row => row.userId)));
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

export async function createMonthlySummary(userId: number, monthKey: string, imageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(monthlySummaries).values({ userId, monthKey, imageKey }).onDuplicateKeyUpdate({ set: { imageKey } });
  return getMonthlySummaryForUserAndMonth(userId, monthKey);
}

export async function getMonthlySummaries(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(monthlySummaries).where(eq(monthlySummaries.userId, userId)).orderBy(desc(monthlySummaries.monthKey));
}

export async function getMonthlySummaryForUser(userId: number, summaryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(monthlySummaries).where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.id, summaryId))).limit(1))[0];
}

export async function getMonthlySummaryForUserAndMonth(userId: number, monthKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(monthlySummaries).where(and(eq(monthlySummaries.userId, userId), eq(monthlySummaries.monthKey, monthKey))).limit(1))[0];
}

export async function getTraderProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select({ traderDisplayName: users.traderDisplayName, name: users.name }).from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function updateTraderDisplayName(userId: number, traderDisplayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ traderDisplayName }).where(eq(users.id, userId));
  return getTraderProfile(userId);
}

export async function createFeedbackEntry(userId: number, rating: number, comment: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(feedbackEntries).values({ userId, rating, comment, status: "pending" });
}

export async function getApprovedFeedback() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: feedbackEntries.id, rating: feedbackEntries.rating, comment: feedbackEntries.comment, createdAt: feedbackEntries.createdAt, traderDisplayName: users.traderDisplayName, accountName: users.name }).from(feedbackEntries).leftJoin(users, eq(feedbackEntries.userId, users.id)).where(eq(feedbackEntries.status, "approved")).orderBy(desc(feedbackEntries.createdAt));
}

export async function getAllFeedbackForModeration() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: feedbackEntries.id, rating: feedbackEntries.rating, comment: feedbackEntries.comment, status: feedbackEntries.status, createdAt: feedbackEntries.createdAt, traderDisplayName: users.traderDisplayName, accountName: users.name }).from(feedbackEntries).leftJoin(users, eq(feedbackEntries.userId, users.id)).orderBy(desc(feedbackEntries.createdAt));
}

export async function moderateFeedbackEntry(feedbackId: number, status: "approved" | "hidden") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(feedbackEntries).set({ status, moderatedAt: new Date() }).where(eq(feedbackEntries.id, feedbackId));
}

export async function getMonthlySummaryAutomation() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(monthlySummaryAutomation).limit(1))[0];
}

export async function saveMonthlySummaryAutomation(scheduleTaskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getMonthlySummaryAutomation();
  if (existing) {
    await db.update(monthlySummaryAutomation).set({ scheduleTaskUid }).where(eq(monthlySummaryAutomation.id, existing.id));
    return getMonthlySummaryAutomation();
  }
  await db.insert(monthlySummaryAutomation).values({ scheduleTaskUid });
  return getMonthlySummaryAutomation();
}

export async function deleteWeeklySummaryForUser(userId: number, summaryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const summary = await getWeeklySummaryForUser(userId, summaryId);
  if (!summary) throw new Error("Weekly summary not found");
  await db.delete(weeklySummaries).where(and(eq(weeklySummaries.id, summaryId), eq(weeklySummaries.userId, userId)));
  return { deletedSummaryId: summary.id };
}

export async function deleteJournalDayForUser(userId: number, tradingDay: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const start = new Date(tradingDay);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [dayTrades, dayJournals] = await Promise.all([
    db.select({ id: trades.id }).from(trades).where(and(eq(trades.userId, userId), gte(trades.tradingDay, start), lt(trades.tradingDay, end))),
    db.select({ id: dailyJournals.id }).from(dailyJournals).where(and(eq(dailyJournals.userId, userId), gte(dailyJournals.journalDate, start), lt(dailyJournals.journalDate, end))),
  ]);
  if (!dayTrades.length && !dayJournals.length) throw new Error("Daily journal not found");
  await db.delete(trades).where(and(eq(trades.userId, userId), gte(trades.tradingDay, start), lt(trades.tradingDay, end)));
  await db.delete(dailyJournals).where(and(eq(dailyJournals.userId, userId), gte(dailyJournals.journalDate, start), lt(dailyJournals.journalDate, end)));
  return { deletedTrades: dayTrades.length, deletedJournals: dayJournals.length };
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
  dailyNotificationTitle: string;
  dailyNotificationContent: string;
  fridayNotificationTitle: string;
  fridayNotificationContent: string;
  saturdayNotificationTitle: string;
  saturdayNotificationContent: string;
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
      dailyNotificationTitle: input.dailyNotificationTitle,
      dailyNotificationContent: input.dailyNotificationContent,
      fridayNotificationTitle: input.fridayNotificationTitle,
      fridayNotificationContent: input.fridayNotificationContent,
      saturdayNotificationTitle: input.saturdayNotificationTitle,
      saturdayNotificationContent: input.saturdayNotificationContent,
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

export async function getBackupReminderSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(backupReminderSettings).where(eq(backupReminderSettings.userId, userId)).limit(1))[0];
}

export async function saveBackupReminderSettings(input: {
  userId: number;
  enabled: number;
  timezone: string;
  reminderTime: string;
  reminderTaskUid?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(backupReminderSettings).values(input).onDuplicateKeyUpdate({
    set: {
      enabled: input.enabled,
      timezone: input.timezone,
      reminderTime: input.reminderTime,
      reminderTaskUid: input.reminderTaskUid ?? null,
    },
  });
  return getBackupReminderSettings(input.userId);
}

export async function getBackupReminderSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(backupReminderSettings).where(eq(backupReminderSettings.reminderTaskUid, taskUid)).limit(1))[0];
}

export async function markBackupReminderSent(taskUid: string) {
  const settings = await getBackupReminderSettingsByTaskUid(taskUid);
  if (!settings) return { sent: false, reason: "orphan" as const };
  if (settings.lastReminderSentAt && Date.now() - settings.lastReminderSentAt.getTime() < 5 * 60 * 1000) return { sent: false, reason: "recently-sent" as const };
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(backupReminderSettings).set({ lastReminderSentAt: new Date() }).where(eq(backupReminderSettings.id, settings.id));
  return { sent: true, reason: "sent" as const, settings };
}

export async function clearBackupReminderSent(taskUid: string) {
  const settings = await getBackupReminderSettingsByTaskUid(taskUid);
  if (!settings) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(backupReminderSettings).set({ lastReminderSentAt: null }).where(eq(backupReminderSettings.id, settings.id));
}

export async function recordEncryptedBackupArchive(userId: number, fileName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(encryptedBackupArchives).values({ userId, fileName });
  return getEncryptedBackupArchives(userId);
}

export async function getEncryptedBackupArchives(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: encryptedBackupArchives.id, fileName: encryptedBackupArchives.fileName, createdAt: encryptedBackupArchives.createdAt })
    .from(encryptedBackupArchives)
    .where(eq(encryptedBackupArchives.userId, userId))
    .orderBy(desc(encryptedBackupArchives.createdAt), desc(encryptedBackupArchives.id))
    .limit(8);
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
