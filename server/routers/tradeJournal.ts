import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import {
  createDailyJournalEntry,
  clearBackupReminderSent,
  createFeedbackEntry,
  createWeeklySummary,
  deleteJournalDayForUser,
  deleteWeeklySummaryForUser,
  getJournalReminderSettings,
  getBackupReminderSettings,
  getEncryptedBackupArchives,
  getAllFeedbackForModeration,
  getJournalBackupForUser,
  getApprovedFeedback,
  getMonthlySummaries,
  getMonthlySummaryAutomation,
  getMonthlySummaryForUser,
  getTraderProfile,
  getTradesForWeek,
  getWeeklySummaries,
  getWeeklySummaryForUser,
  moderateFeedbackEntry,
  saveMonthlySummaryAutomation,
  saveBackupReminderSettings,
  saveJournalReminderSettings,
  recordEncryptedBackupArchive,
  updateTraderDisplayName,
  updateTradeForUser,
} from "../db";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { generateImage } from "../_core/imageGeneration";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl } from "../storage";
import { calculateWeeklyMetrics, formatTradeRowsForPrompt, getCurrentWeekWindow } from "../tradeUtils";
import { COOKIE_NAME } from "../../shared/const";
import { buildBackupReminderSchedule, buildReminderJobs, defaultBackupReminderTime, defaultReminderTimes } from "../reminderSchedule";
import { buildCustomNotificationSettings } from "../customNotificationUtils";
import { ENV } from "../_core/env";
import { generateMonthlySummaryForUser } from "../monthlySummaryService";
import { MONTH_END_WAT_CRON, MONTH_END_WAT_DESCRIPTION, MONTH_END_WAT_LABEL } from "../monthlySchedule";

const optionalNumber = z.number().nullable();
const directTradeInput = z.object({
  pair: z.string().trim().toUpperCase().min(3).max(24).regex(/^[A-Z0-9._/-]+$/, "Use a valid market symbol such as XAUUSD or EURUSD."),
  tradingDay: z.coerce.date(),
  session: z.enum(["London", "New York"]),
  direction: z.enum(["buy", "sell"]),
  tradeType: z.enum(["scalp", "intraday", "news trade", "swing"]),
  setup: z.string().max(120).optional().default(""),
  entryConfirmation: z.string().max(160).optional().default(""),
  higherTimeframeAlignment: z.enum(["aligned", "counter-trend", "range trade", "not applicable"]),
  entry: z.string().max(32),
  exit: z.string().max(32),
  pips: z.number(),
  profit: optionalNumber,
  currency: z.string().max(12),
  riskAmount: optionalNumber,
  riskUnit: z.enum(["%", "currency", ""]).default(""),
  plannedRr: optionalNumber,
  stopManagement: z.enum(["no change", "break-even", "trailed", "widened", "closed early"]),
  partialProfit: z.enum(["no", "one partial", "multiple partials"]),
  result: z.enum(["win", "loss", "breakeven", "cancelled"]),
  exitReason: z.enum(["take profit", "stop loss", "manual close", "break-even", "news", "end of session", "other"]),
  planAdherence: z.enum(["yes", "partly", "no"]),
  discipline: z.enum(["yes", "mostly", "no"]),
  emotion: z.enum(["calm", "patient", "anxious", "fearful", "greedy", "revenge-driven", "overconfident", "other"]),
  wouldTakeAgain: z.enum(["yes", "with adjustments", "no"]),
  tags: z.string().max(500),
  notes: z.string().max(1000),
  improvement: z.string().max(1000),
});

const directJournalInput = z.object({
  journalDate: z.coerce.date(),
  plannedSessions: z.string().max(80),
  marketBias: z.enum(["bullish", "bearish", "range", "neutral / no bias"]),
  marketContext: z.enum(["trend continuation", "pullback", "reversal area", "range", "breakout", "unclear"]),
  scheduledEvents: z.string().max(255),
  newsTiming: z.enum(["before", "after", "during", "did not trade news", "no high-impact news"]),
  dailyRiskLimit: optionalNumber,
  dailyRiskUnit: z.enum(["%", "currency", ""]).default(""),
  maxTrades: z.number().int().positive().nullable(),
  preMarketMood: z.enum(["calm", "focused", "neutral", "tired", "stressed", "frustrated", "overconfident"]),
  riskLimitFollowed: z.enum(["yes", "partly", "no"]),
  tradeLimitFollowed: z.enum(["yes", "no", "not set"]),
  newsImpact: z.enum(["none", "positive influence", "negative influence", "traded intentionally", "should have avoided"]),
  dailyStrength: z.string().max(1000),
  dailyLesson: z.string().max(1000),
  dailyGrade: z.enum(["A", "B", "C", "D", "F"]),
  tomorrowRule: z.string().max(1000),
  trades: z.array(directTradeInput).min(1),
});

const editableTradeInput = directTradeInput.extend({ id: z.number().int().positive() });
const referenceImageKey = "bashfx-weekly-summary-reference_6edfb5c3.jpg";

function imageKeyFromUrl(url: string) {
  const prefix = "/manus-storage/";
  if (!url.startsWith(prefix)) throw new Error("Generated image was not stored correctly");
  return url.slice(prefix.length);
}

export const tradeJournalRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const items = await getTradesForWeek(ctx.user.id, weekStart, weekEnd);
    return { weekStart, weekEnd, metrics: calculateWeeklyMetrics(items) };
  }),

  traderProfile: protectedProcedure.query(async ({ ctx }) => getTraderProfile(ctx.user.id)),

  saveTraderDisplayName: protectedProcedure.input(z.object({ traderDisplayName: z.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => updateTraderDisplayName(ctx.user.id, input.traderDisplayName)),

  publicFeedback: protectedProcedure.query(async () => getApprovedFeedback()),

  submitFeedback: protectedProcedure.input(z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(8).max(1000) })).mutation(async ({ ctx, input }) => {
    await createFeedbackEntry(ctx.user.id, input.rating, input.comment);
    return { submitted: true };
  }),

  moderationFeedback: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN" });
    return getAllFeedbackForModeration();
  }),

  moderateFeedback: protectedProcedure.input(z.object({ feedbackId: z.number().int().positive(), status: z.enum(["approved", "hidden"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN" });
    await moderateFeedbackEntry(input.feedbackId, input.status);
    return { updated: true };
  }),

  currentWeek: protectedProcedure.query(async ({ ctx }) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const items = await getTradesForWeek(ctx.user.id, weekStart, weekEnd);
    return { weekStart, weekEnd, metrics: calculateWeeklyMetrics(items), trades: items };
  }),

  monthlySummaries: protectedProcedure.query(async ({ ctx }) => getMonthlySummaries(ctx.user.id)),

  monthlySummaryAsset: protectedProcedure.input(z.object({ summaryId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const summary = await getMonthlySummaryForUser(ctx.user.id, input.summaryId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "Monthly summary not found" });
    return { url: await storageGetSignedUrl(summary.imageKey), createdAt: summary.createdAt, monthKey: summary.monthKey };
  }),

  generateMonthlySummary: protectedProcedure.mutation(async ({ ctx }) => {
    const generated = await generateMonthlySummaryForUser(ctx.user.id);
    if (!generated) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one dated trade this month before generating the monthly summary." });
    return { summaryId: generated.summary!.id, monthKey: generated.monthKey };
  }),

  monthlyAutomationStatus: protectedProcedure.query(async ({ ctx }) => ({
    enabled: Boolean((await getMonthlySummaryAutomation())?.scheduleTaskUid),
    canManage: ctx.user.openId === ENV.ownerOpenId,
    schedule: MONTH_END_WAT_LABEL,
  })),

  backupExport: protectedProcedure.query(async ({ ctx }) => {
    const backup = await getJournalBackupForUser(ctx.user.id);
    const weeklySummaries = await Promise.all(backup.generatedWeeklySummaries.map(async ({ userId: _userId, imageKey, ...summary }) => ({
      ...summary,
      downloadUrl: await storageGetSignedUrl(imageKey),
    })));
    const monthlySummaries = await Promise.all(backup.generatedMonthlySummaries.map(async ({ userId: _userId, imageKey, ...summary }) => ({
      ...summary,
      downloadUrl: await storageGetSignedUrl(imageKey),
    })));
    const sourceDocuments = await Promise.all(backup.sourceDocuments.map(async ({ userId: _userId, storageKey, ...document }) => ({
      ...document,
      downloadUrl: await storageGetSignedUrl(storageKey),
    })));
    const reminderPreferences = backup.reminderSettings ? (() => {
      const { id: _id, userId: _userId, dailyReminderTaskUid: _dailyTask, fridayReminderTaskUid: _fridayTask, saturdayReminderTaskUid: _saturdayTask, lastDailyReminderSentAt: _lastDaily, lastFridayReminderSentAt: _lastFriday, lastSaturdayReminderSentAt: _lastSaturday, ...preferences } = backup.reminderSettings;
      return preferences;
    })() : null;

    return {
      backupVersion: 1,
      exportedAt: new Date(),
      trader: {
        displayName: backup.profile?.traderDisplayName?.trim() || backup.profile?.name?.trim() || "Bashfx Trader",
      },
      counts: {
        dailyJournalEntries: backup.dailyJournalEntries.length,
        trades: backup.tradeRecords.length,
        weeklySummaries: weeklySummaries.length,
        monthlySummaries: monthlySummaries.length,
        sourceDocuments: sourceDocuments.length,
      },
      data: {
        dailyJournalEntries: backup.dailyJournalEntries.map(({ userId: _userId, ...entry }) => entry),
        trades: backup.tradeRecords.map(({ userId: _userId, ...trade }) => trade),
        reminderPreferences,
        weeklySummaries,
        monthlySummaries,
        sourceDocuments,
      },
    };
  }),

  backupSupportStatus: protectedProcedure.query(async ({ ctx }) => ({
    settings: await getBackupReminderSettings(ctx.user.id),
    archiveHistory: await getEncryptedBackupArchives(ctx.user.id),
    canActivate: process.env.NODE_ENV === "production",
    timezone: "WAT",
    defaultReminderTime: defaultBackupReminderTime,
  })),

  recordEncryptedBackupArchive: protectedProcedure.input(z.object({
    fileName: z.string().trim().max(255).regex(/^bashfx-vip-gold-room-encrypted-backup-[A-Za-z0-9._-]+\.bashfx-backup\.json$/, "Use the encrypted archive generated by Bashfx."),
  })).mutation(async ({ ctx, input }) => {
    return recordEncryptedBackupArchive(ctx.user.id, input.fileName);
  }),

  configureBackupReminder: protectedProcedure.input(z.object({
    enabled: z.boolean(),
    reminderTime: z.string().regex(/^(0[1-9]|1\d|2[0-3]):[0-5]\d$/, "Choose a time from 01:00 to 23:59 WAT"),
  })).mutation(async ({ ctx, input }) => {
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in again before changing backup reminder settings." });
    if (input.enabled && process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the app before enabling automatic backup reminders." });
    const existing = await getBackupReminderSettings(ctx.user.id);
    const schedule = buildBackupReminderSchedule(input.reminderTime);
    let reminderTaskUid = existing?.reminderTaskUid ?? null;
    if (reminderTaskUid) {
      await updateHeartbeatJob(reminderTaskUid, { cron: schedule.cron, path: "/api/scheduled/backup-reminder", description: schedule.label, enable: input.enabled }, sessionToken);
    } else if (input.enabled) {
      const created = await createHeartbeatJob({ name: `bashfx-vip-gold-room-${ctx.user.id}-monthly-backup`, cron: schedule.cron, path: "/api/scheduled/backup-reminder", description: schedule.label }, sessionToken);
      reminderTaskUid = created.taskUid;
    }
    return saveBackupReminderSettings({ userId: ctx.user.id, enabled: input.enabled ? 1 : 0, timezone: "WAT", reminderTime: input.reminderTime, reminderTaskUid });
  }),

  enableMonthlyAutomation: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can enable monthly automation." });
    if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the app before enabling monthly automation." });
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in again before enabling monthly automation." });
    const existing = await getMonthlySummaryAutomation();
    if (existing?.scheduleTaskUid) {
      await updateHeartbeatJob(existing.scheduleTaskUid, { cron: MONTH_END_WAT_CRON, path: "/api/scheduled/monthly-summary", description: MONTH_END_WAT_DESCRIPTION, enable: true }, sessionToken);
      return { enabled: true };
    }
    const created = await createHeartbeatJob({ name: "bashfx-vip-gold-room-monthly-summary", cron: MONTH_END_WAT_CRON, path: "/api/scheduled/monthly-summary", description: MONTH_END_WAT_DESCRIPTION }, sessionToken);
    await saveMonthlySummaryAutomation(created.taskUid);
    return { enabled: true };
  }),

  createDailyJournal: protectedProcedure.input(directJournalInput).mutation(async ({ ctx, input }) => {
    return createDailyJournalEntry({
      userId: ctx.user.id,
      journal: {
        journalDate: input.journalDate,
        plannedSessions: input.plannedSessions,
        marketBias: input.marketBias,
        marketContext: input.marketContext,
        scheduledEvents: input.scheduledEvents,
        newsTiming: input.newsTiming,
        dailyRiskLimit: input.dailyRiskLimit,
        dailyRiskUnit: input.dailyRiskUnit,
        maxTrades: input.maxTrades,
        preMarketMood: input.preMarketMood,
        riskLimitFollowed: input.riskLimitFollowed,
        tradeLimitFollowed: input.tradeLimitFollowed,
        newsImpact: input.newsImpact,
        dailyStrength: input.dailyStrength,
        dailyLesson: input.dailyLesson,
        dailyGrade: input.dailyGrade,
        tomorrowRule: input.tomorrowRule,
      },
      tradeRecords: input.trades,
    });
  }),

  saveTrade: protectedProcedure.input(editableTradeInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;
    return updateTradeForUser(ctx.user.id, id, values);
  }),

  reminderStatus: protectedProcedure.query(async ({ ctx }) => ({
    settings: await getJournalReminderSettings(ctx.user.id),
    canActivate: process.env.NODE_ENV === "production",
    timezone: "WAT",
    schedule: buildReminderJobs(defaultReminderTimes),
  })),

  configureReminders: protectedProcedure.input(z.object({
    enabled: z.boolean(),
    dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
    fridayReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
    saturdayReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
    dailyNotificationTitle: z.string().max(120),
    dailyNotificationContent: z.string().max(500),
    fridayNotificationTitle: z.string().max(120),
    fridayNotificationContent: z.string().max(500),
    saturdayNotificationTitle: z.string().max(120),
    saturdayNotificationContent: z.string().max(500),
  })).mutation(async ({ ctx, input }) => {
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in again before changing reminder settings." });
    const existing = await getJournalReminderSettings(ctx.user.id);
    const taskUids: Record<"daily" | "friday" | "saturday", string | null> = {
      daily: existing?.dailyReminderTaskUid ?? null,
      friday: existing?.fridayReminderTaskUid ?? null,
      saturday: existing?.saturdayReminderTaskUid ?? null,
    };
    const reminderJobs = buildReminderJobs({ daily: input.dailyReminderTime, friday: input.fridayReminderTime, saturday: input.saturdayReminderTime });
    if (input.enabled && process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publish the app before enabling automatic reminders." });
    for (const job of reminderJobs) {
      if (taskUids[job.kind]) {
        await updateHeartbeatJob(taskUids[job.kind]!, { cron: job.cron, path: "/api/scheduled/journal-reminder", description: job.label, enable: input.enabled }, sessionToken);
      } else if (input.enabled) {
        const created = await createHeartbeatJob({ name: `bashfx-vip-gold-room-${ctx.user.id}-${job.kind}`, cron: job.cron, path: "/api/scheduled/journal-reminder", description: job.label }, sessionToken);
        taskUids[job.kind] = created.taskUid;
      }
    }
    const templates = buildCustomNotificationSettings({ enabled: input.enabled, dailyNotificationTitle: input.dailyNotificationTitle, dailyNotificationContent: input.dailyNotificationContent, fridayNotificationTitle: input.fridayNotificationTitle, fridayNotificationContent: input.fridayNotificationContent, saturdayNotificationTitle: input.saturdayNotificationTitle, saturdayNotificationContent: input.saturdayNotificationContent });
    return saveJournalReminderSettings({ userId: ctx.user.id, enabled: templates.enabled ? 1 : 0, timezone: "WAT", dailyReminderTime: input.dailyReminderTime, fridayReminderTime: input.fridayReminderTime, saturdayReminderTime: input.saturdayReminderTime, dailyNotificationTitle: templates.dailyNotificationTitle, dailyNotificationContent: templates.dailyNotificationContent, fridayNotificationTitle: templates.fridayNotificationTitle, fridayNotificationContent: templates.fridayNotificationContent, saturdayNotificationTitle: templates.saturdayNotificationTitle, saturdayNotificationContent: templates.saturdayNotificationContent, dailyReminderTaskUid: taskUids.daily, fridayReminderTaskUid: taskUids.friday, saturdayReminderTaskUid: taskUids.saturday });
  }),

  summaries: protectedProcedure.query(async ({ ctx }) => getWeeklySummaries(ctx.user.id)),

  summaryAsset: protectedProcedure.input(z.object({ summaryId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const summary = await getWeeklySummaryForUser(ctx.user.id, input.summaryId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "Summary not found" });
    return { url: await storageGetSignedUrl(summary.imageKey), createdAt: summary.createdAt };
  }),

  deleteWeeklySummary: protectedProcedure.input(z.object({ summaryId: z.number().int().positive() })).mutation(async ({ ctx, input }) => deleteWeeklySummaryForUser(ctx.user.id, input.summaryId)),

  deleteJournalDay: protectedProcedure.input(z.object({ tradingDay: z.coerce.date() })).mutation(async ({ ctx, input }) => deleteJournalDayForUser(ctx.user.id, input.tradingDay)),

  generateWeeklySummary: protectedProcedure.mutation(async ({ ctx }) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const tradeList = await getTradesForWeek(ctx.user.id, weekStart, weekEnd);
    if (tradeList.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one dated trade before generating the weekly summary." });
    const [metrics, referenceUrl, profile] = [calculateWeeklyMetrics(tradeList), await storageGetSignedUrl(referenceImageKey), await getTraderProfile(ctx.user.id)];
    const traderName = profile?.traderDisplayName?.trim() || profile?.name?.trim() || "Bashfx Trader";
    const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    const prompt = `Create a premium vertical 2:3 weekly multi-market performance graphic for Bashfx VIP GOLD ROOM. Use the provided reference image as the layout and brand-style reference. Match its luxury black background, brushed metallic gold borders, white condensed headings, gold accents, green wins, red losses, crown motif, and boxed sections. Do not copy dates or trade figures from the reference.

Exact content to render:
Brand: BASHFX
Subtitle: VIP GOLD ROOM
Trader: ${traderName}
Main headline: WEEKLY SUMMARY
Banner: MULTI-MARKET M5 JOURNAL RESULTS
Week: ${weekLabel}
Trade table columns: DATE | PAIR | SESSION | DIRECTION | PIPS | RESULT
Trade rows:
${formatTradeRowsForPrompt(tradeList)}
For every SESSION value that includes "NEWS TRADE", preserve the normal session and add a compact, readable gold NEWS TRADE badge within that same session cell. Do not add a News Trade badge to other rows.
Performance title: WEEKLY PERFORMANCE
Total trades: ${metrics.totalTrades}
Wins: ${metrics.wins}
Losses: ${metrics.losses}
Breakeven: ${metrics.breakeven}
Win rate: ${metrics.winRate}%
Net pips: ${metrics.totalPips >= 0 ? "+" : ""}${metrics.totalPips} PIPS
The performance panel must show ONLY this one NET PIPS total after Wins, Losses, Breakeven, and Win rate. Calculate it as winning pips minus losing pips. Do not render a Total Profit row or a second pip-total row.
Footer: DISCIPLINE • CONSISTENCY • RESULTS

Keep every specified trade date and value accurate. Use a clean editorial grid with a large readable trade table. Avoid invented trades, spelling mistakes, watermarks, extra logos, people, or unreadable tiny text.`;
    const image = await generateImage({ prompt, originalImages: [{ url: referenceUrl, mimeType: "image/jpeg" }], model: "MODEL_GPT_IMAGE_2", quality: "high" });
    if (!image.url) throw new Error("Image generation returned no image");
    return { summaryId: await createWeeklySummary(ctx.user.id, weekStart, imageKeyFromUrl(image.url)) };
  }),
});
