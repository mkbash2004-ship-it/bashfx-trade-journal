import { createMonthlySummary, getMonthlySummaryForUserAndMonth, getTradesForRange, getTraderProfile } from "./db";
import { generateImage } from "./_core/imageGeneration";
import { storageGetSignedUrl } from "./storage";
import { calculateWeeklyMetrics, formatTradeRowsForPrompt, getMonthWindow } from "./tradeUtils";

const referenceImageKey = "bashfx-weekly-summary-reference_6edfb5c3.jpg";

function imageKeyFromUrl(url: string) {
  const prefix = "/manus-storage/";
  if (!url.startsWith(prefix)) throw new Error("Generated image was not stored correctly");
  return url.slice(prefix.length);
}

export async function generateMonthlySummaryForUser(userId: number, referenceDate = new Date()) {
  const { monthStart, monthEnd, monthKey } = getMonthWindow(referenceDate);
  const existing = await getMonthlySummaryForUserAndMonth(userId, monthKey);
  if (existing) return { summary: existing, monthStart, monthEnd, monthKey, reused: true };
  const tradeList = await getTradesForRange(userId, monthStart, monthEnd);
  if (!tradeList.length) return null;
  const [profile, referenceUrl] = await Promise.all([getTraderProfile(userId), storageGetSignedUrl(referenceImageKey)]);
  const metrics = calculateWeeklyMetrics(tradeList);
  const traderName = profile?.traderDisplayName?.trim() || profile?.name?.trim() || "Bashfx Trader";
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const prompt = `Create a premium vertical 2:3 monthly multi-market trading performance graphic for Bashfx VIP GOLD ROOM. Use the provided reference image as the layout and brand-style reference. Match its luxury black background, brushed metallic gold borders, white condensed headings, gold accents, green wins, red losses, crown motif, and boxed sections. Do not copy figures from the reference.

Exact content to render:
Brand: BASHFX
Subtitle: VIP GOLD ROOM
Trader: ${traderName}
Main headline: MONTHLY SUMMARY
Banner: MULTI-MARKET M5 JOURNAL RESULTS
Month: ${monthLabel}
Trade table columns: DATE | PAIR | SESSION | DIRECTION | PIPS | RESULT
Trade rows:
${formatTradeRowsForPrompt(tradeList)}
For every SESSION value that includes "NEWS TRADE", preserve the normal session and add a compact, readable gold NEWS TRADE badge within that same session cell. Do not add a News Trade badge to other rows.
Performance title: MONTHLY PERFORMANCE
Total trades: ${metrics.totalTrades}
Wins: ${metrics.wins}
Losses: ${metrics.losses}
Breakeven: ${metrics.breakeven}
Win rate: ${metrics.winRate}%
Net pips: ${metrics.totalPips >= 0 ? "+" : ""}${metrics.totalPips} PIPS
The performance panel must show ONLY this one NET PIPS total after Wins, Losses, Breakeven, and Win rate. Calculate it as winning pips minus losing pips. Do not render a Total Profit row or a second pip-total row.
Footer: DISCIPLINE • CONSISTENCY • RESULTS

Keep every specified date, pair, and value accurate. Use a clean editorial grid with a readable trade table. Avoid invented trades, spelling mistakes, watermarks, extra logos, people, or unreadable tiny text.`;
  const image = await generateImage({ prompt, originalImages: [{ url: referenceUrl, mimeType: "image/jpeg" }], model: "MODEL_GPT_IMAGE_2", quality: "high" });
  if (!image.url) throw new Error("Image generation returned no image");
  const summary = await createMonthlySummary(userId, monthKey, imageKeyFromUrl(image.url));
  return { summary, metrics, monthStart, monthEnd, monthKey, reused: false };
}
