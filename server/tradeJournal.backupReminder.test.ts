import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBackupReminderSettings, saveBackupReminderSettings, recordEncryptedBackupArchive, getEncryptedBackupArchives, createHeartbeatJob, updateHeartbeatJob } = vi.hoisted(() => ({
  getBackupReminderSettings: vi.fn(),
  saveBackupReminderSettings: vi.fn(),
  recordEncryptedBackupArchive: vi.fn(),
  getEncryptedBackupArchives: vi.fn(),
  createHeartbeatJob: vi.fn(),
  updateHeartbeatJob: vi.fn(),
}));

vi.mock("./db", () => ({
  getBackupReminderSettings,
  saveBackupReminderSettings,
  recordEncryptedBackupArchive,
  getEncryptedBackupArchives,
  getJournalBackupForUser: vi.fn(),
  getTradesForWeek: vi.fn(),
  getMonthlySummaries: vi.fn(),
  getMonthlySummaryForUser: vi.fn(),
  getMonthlySummaryAutomation: vi.fn(),
  getTraderProfile: vi.fn(),
  getWeeklySummaries: vi.fn(),
  getWeeklySummaryForUser: vi.fn(),
  getApprovedFeedback: vi.fn(),
  getJournalReminderSettings: vi.fn(),
  createDailyJournalEntry: vi.fn(),
  createFeedbackEntry: vi.fn(),
  createWeeklySummary: vi.fn(),
  deleteJournalDayForUser: vi.fn(),
  deleteWeeklySummaryForUser: vi.fn(),
  getAllFeedbackForModeration: vi.fn(),
  moderateFeedbackEntry: vi.fn(),
  saveMonthlySummaryAutomation: vi.fn(),
  saveJournalReminderSettings: vi.fn(),
  updateTraderDisplayName: vi.fn(),
  updateTradeForUser: vi.fn(),
}));
vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob, updateHeartbeatJob }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn() }));

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";

const makeCaller = (id = 42) => appRouter.createCaller({
  user: { id, openId: `trader-${id}`, name: "Gold Trader", email: "gold@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: { cookie: `${COOKIE_NAME}=session-token` }, protocol: "https" } as never,
  res: {} as never,
});

describe("journal monthly encrypted backup support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    getBackupReminderSettings.mockResolvedValue(null);
    saveBackupReminderSettings.mockImplementation(async (value: unknown) => value);
    getEncryptedBackupArchives.mockResolvedValue([]);
  });

  it("creates a private 09:00 WAT first-of-month reminder for the signed-in trader", async () => {
    createHeartbeatJob.mockResolvedValue({ taskUid: "backup-task-42" });

    const result = await makeCaller(42).journal.configureBackupReminder({ enabled: true, reminderTime: "09:00" });

    expect(createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({
      name: "bashfx-vip-gold-room-42-monthly-backup",
      cron: "0 0 8 1 * *",
      path: "/api/scheduled/backup-reminder",
      description: "Monthly 09:00 WAT encrypted-backup reminder on the first day of each month",
    }), "session-token");
    expect(result).toMatchObject({ userId: 42, enabled: 1, timezone: "WAT", reminderTime: "09:00", reminderTaskUid: "backup-task-42" });
  });

  it("records only the signed-in trader's generated archive metadata", async () => {
    recordEncryptedBackupArchive.mockResolvedValue({ id: 7, userId: 42, fileName: "bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-05-00-000Z.bashfx-backup.json" });

    await expect(makeCaller(42).journal.recordEncryptedBackupArchive({ fileName: "bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-05-00-000Z.bashfx-backup.json" })).resolves.toMatchObject({ userId: 42 });
    expect(recordEncryptedBackupArchive).toHaveBeenCalledWith(42, "bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-05-00-000Z.bashfx-backup.json");
    expect(recordEncryptedBackupArchive).not.toHaveBeenCalledWith(43, expect.anything());
  });

  it("returns the signed-in trader's reminder state and archive history for the Backup & Export support cards", async () => {
    const settings = {
      id: 3,
      userId: 42,
      enabled: 1,
      timezone: "WAT",
      reminderTime: "09:00",
      reminderTaskUid: "backup-task-42",
      lastReminderSentAt: null,
      createdAt: new Date("2026-08-19T01:09:51.000Z"),
      updatedAt: new Date("2026-08-19T01:09:51.000Z"),
    };
    const archiveHistory = [{
      id: 7,
      userId: 42,
      fileName: "bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-05-00-000Z.bashfx-backup.json",
      createdAt: new Date("2026-08-19T01:05:00.000Z"),
    }];
    getBackupReminderSettings.mockResolvedValue(settings);
    getEncryptedBackupArchives.mockResolvedValue(archiveHistory);

    const result = await makeCaller(42).journal.backupSupportStatus();

    expect(getBackupReminderSettings).toHaveBeenCalledWith(42);
    expect(getEncryptedBackupArchives).toHaveBeenCalledWith(42);
    expect(result).toMatchObject({
      settings: { userId: 42, enabled: 1, timezone: "WAT", reminderTime: "09:00", reminderTaskUid: "backup-task-42" },
      archiveHistory: [{ userId: 42, fileName: "bashfx-vip-gold-room-encrypted-backup-2026-08-19T01-05-00-000Z.bashfx-backup.json" }],
      canActivate: true,
      timezone: "WAT",
      defaultReminderTime: "09:00",
    });
  });
});
