import type { Request, Response } from "express";
import { clearJournalReminderSent, getJournalReminderSettingsByTaskUid, markJournalReminderSent } from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { defaultNotificationTemplates } from "./customNotificationUtils";


export async function sendJournalReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const settings = await getJournalReminderSettingsByTaskUid(user.taskUid);
    if (!settings || !settings.enabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });
    const kind = settings.dailyReminderTaskUid === user.taskUid ? "daily" : settings.fridayReminderTaskUid === user.taskUid ? "friday" : settings.saturdayReminderTaskUid === user.taskUid ? "saturday" : null;
    if (!kind) return res.json({ ok: true, skipped: "unknown-task" });
    const result = await markJournalReminderSent(user.taskUid, kind);
    if (!result.sent) return res.json({ ok: true, skipped: result.reason });
    const fallback = defaultNotificationTemplates[kind];
    const template = kind === "daily"
      ? { title: settings.dailyNotificationTitle, content: settings.dailyNotificationContent }
      : kind === "friday"
        ? { title: settings.fridayNotificationTitle, content: settings.fridayNotificationContent }
        : { title: settings.saturdayNotificationTitle, content: settings.saturdayNotificationContent };
    const delivered = await notifyOwner({
      title: template.title?.trim() || fallback.title,
      content: template.content?.trim() || fallback.content,
    });
    if (!delivered) {
      await clearJournalReminderSent(user.taskUid, kind);
      throw new Error("Notification service did not accept the reminder");
    }
    return res.json({ ok: true, kind, timezone: settings.timezone });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
  }
}
