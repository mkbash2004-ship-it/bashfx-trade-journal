import type { Request, Response } from "express";
import { clearBackupReminderSent, getBackupReminderSettingsByTaskUid, markBackupReminderSent } from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

export async function sendBackupReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const settings = await getBackupReminderSettingsByTaskUid(user.taskUid);
    if (!settings || !settings.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });

    const result = await markBackupReminderSent(user.taskUid);
    if (!result.sent) return res.json({ ok: true, skipped: result.reason });

    const delivered = await notifyOwner({
      title: "Monthly encrypted backup due",
      content: "Create a fresh encrypted Bashfx journal archive, then upload it to your private GitHub archive repository.",
    });
    if (!delivered) {
      await clearBackupReminderSent(user.taskUid);
      throw new Error("Notification service did not accept the backup reminder");
    }
    return res.json({ ok: true, timezone: settings.timezone, reminderTime: settings.reminderTime });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
  }
}
