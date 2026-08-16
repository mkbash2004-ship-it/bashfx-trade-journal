import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTradeDocument,
  createTrades,
  createWeeklySummary,
  getTradesForDocument,
  getTradesForWeek,
  getWeeklySummaries,
  getWeeklySummaryForUser,
  setDocumentExtractionStatus,
  updateTradeForUser,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl, storagePut } from "../storage";
import { calculateWeeklyMetrics, formatTradeRowsForPrompt, getCurrentWeekWindow, normalizeExtractedTrade, type ExtractedTrade } from "../tradeUtils";

const acceptedMimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
const tradeInput = z.object({
  id: z.number().int().positive(),
  pair: z.string().min(1).max(24),
  session: z.string().max(64),
  direction: z.enum(["buy", "sell", "unknown"]),
  entry: z.string().max(32),
  exit: z.string().max(32),
  pips: z.number().nullable(),
  profit: z.number().nullable(),
  currency: z.string().max(12),
  result: z.enum(["win", "loss", "breakeven", "unknown"]),
  notes: z.string().max(1000),
});

const extractedTradesSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "forex_trade_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pair: { type: "string" },
              session: { type: "string" },
              direction: { type: "string" },
              entry: { type: "string" },
              exit: { type: "string" },
              pips: { type: ["number", "null"] },
              profit: { type: ["number", "null"] },
              currency: { type: "string" },
              result: { type: "string" },
              notes: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["pair", "session", "direction", "entry", "exit", "pips", "profit", "currency", "result", "notes", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["trades"],
      additionalProperties: false,
    },
  },
};

function toBuffer(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Buffer.from(payload, "base64");
}

function imageKeyFromUrl(url: string) {
  const prefix = "/manus-storage/";
  if (!url.startsWith(prefix)) throw new Error("Generated image was not stored correctly");
  return url.slice(prefix.length);
}

const referenceImageKey = "bashfx-weekly-summary-reference_6edfb5c3.jpg";

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

  uploadAndExtract: protectedProcedure.input(z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.enum(acceptedMimeTypes),
    contentBase64: z.string().min(32).max(48_000_000),
    tradingDay: z.coerce.date(),
  })).mutation(async ({ ctx, input }) => {
    const buffer = toBuffer(input.contentBase64);
    if (buffer.byteLength > 20 * 1024 * 1024) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Choose a file smaller than 20 MB." });
    }

    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const stored = await storagePut(`users/${ctx.user.id}/trade-uploads/${Date.now()}-${safeName}`, buffer, input.mimeType);
    const documentId = await createTradeDocument({
      userId: ctx.user.id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageKey: stored.key,
      tradingDay: input.tradingDay,
    });

    try {
      const fileUrl = await storageGetSignedUrl(stored.key);
      const models = await listLLMModels();
      const model = models.data.some(item => item.id === "gemini-3-flash-preview") ? "gemini-3-flash-preview" : undefined;
      const content = input.mimeType === "application/pdf"
        ? [{ type: "text" as const, text: "Read this Forex trade document and extract every individual completed trade. Do not invent values. Use unknown or null when information is absent." }, { type: "file_url" as const, file_url: { url: fileUrl, mime_type: "application/pdf" as const } }]
        : [{ type: "text" as const, text: "Read this Forex trade-result image and extract every individual completed trade. Do not invent values. Use unknown or null when information is absent." }, { type: "image_url" as const, image_url: { url: fileUrl, detail: "high" as const } }];
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "You are a precise Forex trade journal extraction assistant. Return only the required JSON. A trade outcome of BE or break-even is breakeven. Pips must be a signed number when visible. Confidence is an integer from 0 to 100." },
          { role: "user", content },
        ],
        response_format: extractedTradesSchema,
        maxTokens: 4000,
      });
      const modelContent = response.choices[0]?.message.content;
      if (typeof modelContent !== "string") throw new Error("The extraction model returned an invalid response");
      const parsed = JSON.parse(modelContent || "{}") as { trades?: ExtractedTrade[] };
      const normalized = (parsed.trades ?? []).map(normalizeExtractedTrade);
      const savedTrades = await createTrades(normalized.map(trade => ({ ...trade, userId: ctx.user.id, documentId, tradingDay: input.tradingDay })));
      await setDocumentExtractionStatus(documentId, ctx.user.id, "completed");
      return { documentId, trades: savedTrades };
    } catch (error) {
      await setDocumentExtractionStatus(documentId, ctx.user.id, "failed");
      const message = error instanceof Error ? error.message : "Unable to extract trades";
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `The file was stored securely, but extraction failed: ${message}` });
    }
  }),

  documentTrades: protectedProcedure.input(z.object({ documentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    return getTradesForDocument(input.documentId, ctx.user.id);
  }),

  saveTrade: protectedProcedure.input(tradeInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;
    return updateTradeForUser(ctx.user.id, id, values);
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
    if (tradeList.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one verified trade before generating the weekly summary." });
    }
    const metrics = calculateWeeklyMetrics(tradeList);
    const referenceUrl = await storageGetSignedUrl(referenceImageKey);
    const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    const prompt = `Create a premium vertical 2:3 Forex performance graphic for the BashFX VIP Gold Room. Use the provided reference image as the visual composition and brand-style reference. Match its luxury black background, brushed metallic gold borders, white condensed headings, gold accents, green wins, red losses, crown motif, bullish gold sculpture area, and boxed sections. Do not copy any unrelated dates or trade figures from the reference.

Exact content to render:
Brand: BASHFX
Subtitle: VIP GOLD ROOM
Main headline: WEEKLY SUMMARY
Banner: VIP SIGNAL RESULTS
Week: ${weekLabel}
Trade table columns: PAIR | SESSION | DIRECTION | PIPS | RESULT
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

Use a clean editorial grid with a large readable trade table and the performance blocks arranged like the reference. Keep all specified trade values accurate. Avoid invented trades, spelling mistakes, charts that obscure the table, watermarks, extra logos, people, or unreadable tiny text.`;
    const image = await generateImage({
      prompt,
      originalImages: [{ url: referenceUrl, mimeType: "image/jpeg" }],
      model: "MODEL_GPT_IMAGE_2",
      quality: "high",
    });
    if (!image.url) throw new Error("Image generation returned no image");
    const summaryId = await createWeeklySummary(ctx.user.id, weekStart, imageKeyFromUrl(image.url));
    return { summaryId };
  }),
});
