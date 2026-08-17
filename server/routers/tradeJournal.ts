import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import {
  createDailyJournalEntry,
  createWeeklySummary,
  getJournalReminderSettings,
  getTradesForWeek,
  getWeeklySummaries,
  getWeeklySummaryForUser,
  saveJournalReminderSettings,
  updateTradeForUser,
} from "../db";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { generateImage } from "../_core/imageGeneration";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl } from "../storage";
import { calculateWeeklyMetrics, formatTradeRowsForPrompt, getCurrentWeekWindow } from "../tradeUtils";
import { COOKIE_NAME } from "../../shared/const";
import { buildReminderJobs, defaultReminderTimes } from "../reminderSchedule";
import { buildCustomNotificationSettings } from "../customNotificationUtils";

const optionalNumber = z.number().nullable();
const directTradeInput = z.object({
  tradingDay: z.coerce.date(),
  session: z.enum(["London", "New York"]),
  direction: z.enum(["buy", "sell"]),
  tradeType: z.enum(["scalp", "intraday", "news trade", "swing"]),
  setup: z.string().min(1).max(120),
  entryConfirmation: z.string().min(1).max(160),
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

  currentWeek: protectedProcedure.query(async ({ ctx }) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const items = await getTradesForWeek(ctx.user.id, weekStart, weekEnd);
    return { weekStart, weekEnd, metrics: calculateWeeklyMetrics(items), trades: items };
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
    timezone: "UTC+1",
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
    return saveJournalReminderSettings({ userId: ctx.user.id, enabled: templates.enabled ? 1 : 0, timezone: "UTC+1", dailyReminderTime: input.dailyReminderTime, fridayReminderTime: input.fridayReminderTime, saturdayReminderTime: input.saturdayReminderTime, dailyNotificationTitle: templates.dailyNotificationTitle, dailyNotificationContent: templates.dailyNotificationContent, fridayNotificationTitle: templates.fridayNotificationTitle, fridayNotificationContent: templates.fridayNotificationContent, saturdayNotificationTitle: templates.saturdayNotificationTitle, saturdayNotificationContent: templates.saturdayNotificationContent, dailyReminderTaskUid: taskUids.daily, fridayReminderTaskUid: taskUids.friday, saturdayReminderTaskUid: taskUids.saturday });
  }),

  summaries: protectedProcedure.query(async ({ ctx }) => getWeeklySummaries(ctx.user.id)),

  summaryAsset: protectedProcedure.input(z.object({ summaryId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const summary = await getWeeklySummaryForUser(ctx.user.id, input.summaryId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "Summary not found" });
    return { url: await storageGetSignedUrl(summary.imageKey), createdAt: summary.createdAt };
  }),

  generateWeeklySummary: protectedProcedure.mutation(async ({ ctx }) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const tradeList = await getTradesForWeek(ctx.user.id, weekStart, weekEnd);
    if (tradeList.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one dated trade before generating the weekly summary." });
    const metrics = calculateWeeklyMetrics(tradeList);
    const referenceUrl = await storageGetSignedUrl(referenceImageKey);
    const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    const prompt = `Create a premium vertical 2:3 weekly XAUUSD performance graphic for Bashfx VIP GOLD ROOM. Use the provided reference image as the layout and brand-style reference. Match its luxury black background, brushed metallic gold borders, white condensed headings, gold accents, green wins, red losses, crown motif, and boxed sections. Do not copy dates or trade figures from the reference.

Exact content to render:
Brand: BASHFX
Subtitle: VIP GOLD ROOM
Main headline: WEEKLY SUMMARY
Banner: XAUUSD M5 JOURNAL RESULTS
Week: ${weekLabel}
Trade table columns: DATE | PAIR | SESSION | DIRECTION | PIPS | RESULT
Trade rows:
${formatTradeRowsForPrompt(tradeList)}
Performance title: WEEKLY PERFORMANCE
Total trades: ${metrics.totalTrades}
Wins: ${metrics.wins}
Losses: ${metrics.losses}
Breakeven: ${metrics.breakeven}
Win rate: ${metrics.winRate}%
Total pips: ${metrics.totalPips >= 0 ? "+" : ""}${metrics.totalPips} PIPS
Total profit: ${metrics.totalProfit >= 0 ? "+" : ""}${metrics.totalProfit}
Footer: DISCIPLINE • CONSISTENCY • RESULTS

Keep every specified trade date and value accurate. Use a clean editorial grid with a large readable trade table. Avoid invented trades, spelling mistakes, watermarks, extra logos, people, or unreadable tiny text.`;
    const image = await generateImage({ prompt, originalImages: [{ url: referenceUrl, mimeType: "image/jpeg" }], model: "MODEL_GPT_IMAGE_2", quality: "high" });
    if (!image.url) throw new Error("Image generation returned no image");
    return { summaryId: await createWeeklySummary(ctx.user.id, weekStart, imageKeyFromUrl(image.url)) };
  }),
});
