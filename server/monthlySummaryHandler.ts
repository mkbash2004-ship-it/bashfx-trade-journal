import type { Request, Response } from "express";
import { getMonthlySummaryAutomation, getUsersWithTradesForRange } from "./db";
import { generateMonthlySummaryForUser } from "./monthlySummaryService";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { getMonthWindow } from "./tradeUtils";

export async function generateScheduledMonthlySummaries(req: Request, res: Response) {
  try {
    const caller = await sdk.authenticateRequest(req);
    if (!caller.isCron || !caller.taskUid) return res.status(403).json({ error: "cron-only" });
    const automation = await getMonthlySummaryAutomation();
    if (!automation || automation.scheduleTaskUid !== caller.taskUid) return res.json({ ok: true, skipped: "orphan-or-disabled" });

    const closedMonth = new Date();
    closedMonth.setMonth(closedMonth.getMonth() - 1);
    const { monthStart, monthEnd, monthKey } = getMonthWindow(closedMonth);
    const userIds = await getUsersWithTradesForRange(monthStart, monthEnd);
    let completed = 0;
    let reused = 0;
    for (const userId of userIds) {
      const result = await generateMonthlySummaryForUser(userId, closedMonth);
      if (result?.reused) reused += 1;
      else if (result) completed += 1;
    }
    await notifyOwner({
      title: "Bashfx monthly summaries are ready",
      content: `${completed} new monthly ${completed === 1 ? "summary was" : "summaries were"} created for ${monthKey}${reused ? `; ${reused} existing ${reused === 1 ? "summary was" : "summaries were"} safely reused.` : ""}.`,
    });
    return res.json({ ok: true, monthKey, completed, reused });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
  }
}
