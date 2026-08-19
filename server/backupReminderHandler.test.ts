import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateRequest, getBackupReminderSettingsByTaskUid, markBackupReminderSent, clearBackupReminderSent, notifyOwner } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getBackupReminderSettingsByTaskUid: vi.fn(),
  markBackupReminderSent: vi.fn(),
  clearBackupReminderSent: vi.fn(),
  notifyOwner: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./db", () => ({ getBackupReminderSettingsByTaskUid, markBackupReminderSent, clearBackupReminderSent }));
vi.mock("./_core/notification", () => ({ notifyOwner }));

import { sendBackupReminder } from "./backupReminderHandler";

function response() {
  const res = { statusCode: 200, body: undefined as unknown, status: vi.fn(), json: vi.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe("sendBackupReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects browser requests and never sends a reminder", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    const res = response();

    await sendBackupReminder({ originalUrl: "/api/scheduled/backup-reminder" } as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "cron-only" });
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("delivers one enabled monthly reminder and returns WAT settings", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "backup-task-42" });
    getBackupReminderSettingsByTaskUid.mockResolvedValue({ enabled: 1, timezone: "WAT", reminderTime: "09:00" });
    markBackupReminderSent.mockResolvedValue({ sent: true });
    notifyOwner.mockResolvedValue(true);
    const res = response();

    await sendBackupReminder({ originalUrl: "/api/scheduled/backup-reminder" } as never, res as never);

    expect(notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Monthly encrypted backup due" }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, timezone: "WAT", reminderTime: "09:00" });
  });

  it("skips duplicate monthly deliveries without notifying again", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "backup-task-42" });
    getBackupReminderSettingsByTaskUid.mockResolvedValue({ enabled: 1, timezone: "WAT", reminderTime: "09:00" });
    markBackupReminderSent.mockResolvedValue({ sent: false, reason: "already-sent-this-month" });
    const res = response();

    await sendBackupReminder({ originalUrl: "/api/scheduled/backup-reminder" } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, skipped: "already-sent-this-month" });
    expect(notifyOwner).not.toHaveBeenCalled();
    expect(clearBackupReminderSent).not.toHaveBeenCalled();
  });
});
