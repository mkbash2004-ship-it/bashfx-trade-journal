import type { Request, Response } from "express";
import { clearJournalReminderSent, getJournalReminderSettingsByTaskUid, markJournalReminderSent } from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

const messages = {
  daily: {
    title: "Bashfx VIP Gold Room: complete today’s journal",
    content: "It is 20:00 UTC+1. Record every dated XAUUSD M5 London or New York trade, then complete your end-of-day review.",
  },
  friday: {
    title: "Bashfx VIP Gold Room: Friday weekly summary",
    content: "It is time to review this week’s dated XAUUSD M5 trade log and generate your Friday evening weekly summary.",
  },
  saturday: {
    title: "Bashfx VIP Gold Room: Saturday summary follow-up",
    content: "Your Saturday morning follow-up is ready. Check that every XAUUSD trade has its correct date, then generate or download the weekly summary.",
  },
} as const;

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
    const delivered = await notifyOwner(messages[kind]);
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
