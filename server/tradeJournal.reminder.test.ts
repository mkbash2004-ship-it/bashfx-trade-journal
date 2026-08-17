import { beforeEach, describe, expect, it, vi } from "vitest";

const { getJournalReminderSettings, saveJournalReminderSettings, updateHeartbeatJob, createHeartbeatJob } = vi.hoisted(() => ({
  getJournalReminderSettings: vi.fn(),
  saveJournalReminderSettings: vi.fn(),
  updateHeartbeatJob: vi.fn(),
  createHeartbeatJob: vi.fn(),
}));

vi.mock("./db", () => ({
  createDailyJournalEntry: vi.fn(),
  createWeeklySummary: vi.fn(),
  getJournalReminderSettings,
  getTradesForWeek: vi.fn(),
  getWeeklySummaries: vi.fn(),
  getWeeklySummaryForUser: vi.fn(),
  saveJournalReminderSettings,
  updateTradeForUser: vi.fn(),
}));
vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob, updateHeartbeatJob }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn() }));

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";

describe("journal.configureReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    getJournalReminderSettings.mockResolvedValue({
      enabled: 1,
      dailyReminderTime: "20:00",
      fridayReminderTime: "18:00",
      saturdayReminderTime: "09:00",
      dailyReminderTaskUid: "daily-task",
      fridayReminderTaskUid: "friday-task",
      saturdayReminderTaskUid: "saturday-task",
      dailyNotificationTitle: "Old daily title",
      dailyNotificationContent: "Old daily content",
      fridayNotificationTitle: "Old Friday title",
      fridayNotificationContent: "Old Friday content",
      saturdayNotificationTitle: "Old Saturday title",
      saturdayNotificationContent: "Old Saturday content",
    });
    saveJournalReminderSettings.mockImplementation(async (settings: unknown) => settings);
  });

  const makeCaller = () => appRouter.createCaller({
    user: { id: 42, openId: "user-42", name: "Gold Trader", email: "gold@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: { cookie: `${COOKIE_NAME}=session-token` }, protocol: "https" } as never,
    res: {} as never,
  });

  it("preserves active reminders and task ids while custom text changes", async () => {
    const caller = makeCaller();

    const result = await caller.journal.configureReminders({
      enabled: true,
      dailyReminderTime: "20:00",
      fridayReminderTime: "18:00",
      saturdayReminderTime: "09:00",
      dailyNotificationTitle: "My daily Gold Room prompt",
      dailyNotificationContent: "Record every dated XAUUSD trade.",
      fridayNotificationTitle: "Friday Gold Room review",
      fridayNotificationContent: "Generate the weekly summary.",
      saturdayNotificationTitle: "Saturday follow-up",
      saturdayNotificationContent: "Check every date before publishing.",
    });

    expect(result.enabled).toBe(1);
    expect(result.dailyNotificationTitle).toBe("My daily Gold Room prompt");
    expect(result.saturdayNotificationContent).toBe("Check every date before publishing.");
    expect(result.dailyReminderTaskUid).toBe("daily-task");
    expect(result.fridayReminderTaskUid).toBe("friday-task");
    expect(result.saturdayReminderTaskUid).toBe("saturday-task");
    expect(updateHeartbeatJob).toHaveBeenCalledTimes(3);
    expect(createHeartbeatJob).not.toHaveBeenCalled();
  });

  it("creates all three jobs when an inactive user explicitly enables reminders", async () => {
    getJournalReminderSettings.mockResolvedValue({ enabled: 0, dailyReminderTaskUid: null, fridayReminderTaskUid: null, saturdayReminderTaskUid: null });
    createHeartbeatJob.mockImplementation(async ({ name }: { name: string }) => ({ taskUid: `${name}-task` }));
    const result = await makeCaller().journal.configureReminders({
      enabled: true, dailyReminderTime: "20:00", fridayReminderTime: "18:00", saturdayReminderTime: "09:00",
      dailyNotificationTitle: "Daily", dailyNotificationContent: "Log it.", fridayNotificationTitle: "Friday", fridayNotificationContent: "Review it.", saturdayNotificationTitle: "Saturday", saturdayNotificationContent: "Check it.",
    });
    expect(result.enabled).toBe(1);
    expect(createHeartbeatJob).toHaveBeenCalledTimes(3);
    expect(updateHeartbeatJob).not.toHaveBeenCalled();
  });

  it("disables all existing jobs when an active user explicitly pauses reminders", async () => {
    const result = await makeCaller().journal.configureReminders({
      enabled: false, dailyReminderTime: "20:00", fridayReminderTime: "18:00", saturdayReminderTime: "09:00",
      dailyNotificationTitle: "Daily", dailyNotificationContent: "Log it.", fridayNotificationTitle: "Friday", fridayNotificationContent: "Review it.", saturdayNotificationTitle: "Saturday", saturdayNotificationContent: "Check it.",
    });
    expect(result.enabled).toBe(0);
    expect(updateHeartbeatJob).toHaveBeenCalledTimes(3);
    expect(updateHeartbeatJob).toHaveBeenCalledWith("daily-task", expect.objectContaining({ enable: false }), "session-token");
  });
});
