import { beforeEach, describe, expect, it, vi } from "vitest";

const { getJournalBackupForUser, storageGetSignedUrl } = vi.hoisted(() => ({
  getJournalBackupForUser: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

vi.mock("./db", () => ({ getJournalBackupForUser }));
vi.mock("./storage", () => ({ storageGetSignedUrl }));
vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn() }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));

import { appRouter } from "./routers";

describe("journal.backupExport", () => {
  const makeCaller = (userId = 42) => appRouter.createCaller({
    user: { id: userId, openId: `member-${userId}`, name: "Arc MK Bash", email: "trader@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {} } as never,
    res: {} as never,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getJournalBackupForUser.mockResolvedValue({
      profile: { traderDisplayName: "Arc MK Bash", name: "Arc MK Bash" },
      dailyJournalEntries: [{ id: 10, userId: 42, journalDate: new Date("2026-08-19T00:00:00.000Z"), marketBias: "bullish" }],
      tradeRecords: [{ id: 18, userId: 42, tradingDay: new Date("2026-08-19T00:00:00.000Z"), pair: "XAUUSD", pips: 45, result: "win" }],
      generatedWeeklySummaries: [{ id: 3, userId: 42, weekStart: new Date("2026-08-17T00:00:00.000Z"), imageKey: "weekly-gold.png", createdAt: new Date("2026-08-22T00:00:00.000Z") }],
      generatedMonthlySummaries: [{ id: 4, userId: 42, monthKey: "2026-08", imageKey: "monthly-gold.png", createdAt: new Date("2026-09-01T00:05:00.000Z") }],
      sourceDocuments: [{ id: 5, userId: 42, fileName: "trades.pdf", storageKey: "trade-source.pdf", createdAt: new Date("2026-08-19T00:00:00.000Z") }],
      reminderSettings: { id: 8, userId: 42, enabled: 1, timezone: "WAT", dailyReminderTime: "20:00", fridayReminderTime: "18:00", saturdayReminderTime: "09:00", dailyReminderTaskUid: "private-task" },
    });
    storageGetSignedUrl.mockImplementation(async (key: string) => `https://storage.example/${key}`);
  });

  it("exports only the signed-in trader's journal and strips internal storage and task identifiers", async () => {
    const result = await makeCaller().journal.backupExport();

    expect(getJournalBackupForUser).toHaveBeenCalledWith(42);
    expect(result.trader.displayName).toBe("Arc MK Bash");
    expect(result.counts).toMatchObject({ trades: 1, weeklySummaries: 1, monthlySummaries: 1, sourceDocuments: 1 });
    expect(result.data.trades[0]).toMatchObject({ id: 18, pair: "XAUUSD", pips: 45 });
    expect(result.data.trades[0]).not.toHaveProperty("userId");
    expect(result.data.weeklySummaries[0]).toEqual(expect.objectContaining({ downloadUrl: "https://storage.example/weekly-gold.png" }));
    expect(result.data.weeklySummaries[0]).not.toHaveProperty("imageKey");
    expect(result.data.sourceDocuments[0]).not.toHaveProperty("storageKey");
    expect(result.data.reminderPreferences).not.toHaveProperty("dailyReminderTaskUid");
  });

  it("scopes the export helper to the active account rather than accepting a caller-supplied user id", async () => {
    await makeCaller(77).journal.backupExport();
    expect(getJournalBackupForUser).toHaveBeenCalledWith(77);
  });
});
