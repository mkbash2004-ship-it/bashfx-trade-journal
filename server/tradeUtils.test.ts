import { describe, expect, it } from "vitest";
import { calculateWeeklyMetrics, getCurrentWeekWindow, normalizeExtractedTrade } from "./tradeUtils";

describe("trade journal calculations", () => {
  it("normalizes the trade details returned by extraction", () => {
    expect(normalizeExtractedTrade({ pair: " xauusd ", session: " London ", direction: "BUY", entry: " 2410.30 ", exit: "2420.10", pips: 98, profit: 120, currency: "usd", result: "WIN", notes: " clear setup ", confidence: 108 })).toMatchObject({ pair: "XAUUSD", direction: "buy", result: "win", confidence: 100, currency: "USD" });
  });

  it("calculates weekly win rate, pips, and profit from verified trades", () => {
    const metrics = calculateWeeklyMetrics([
      { result: "win", pips: 95, profit: 120 },
      { result: "loss", pips: -40, profit: -50 },
      { result: "breakeven", pips: 0, profit: 0 },
    ]);
    expect(metrics).toMatchObject({ totalTrades: 3, wins: 1, losses: 1, breakeven: 1, winRate: 50, totalPips: 55, totalProfit: 70 });
  });

  it("uses Monday as the beginning of the weekly journal window", () => {
    const window = getCurrentWeekWindow(new Date("2026-08-16T12:00:00Z"));
    expect(window.weekStart.toISOString().slice(0, 10)).toBe("2026-08-10");
    expect(window.weekEnd.toISOString().slice(0, 10)).toBe("2026-08-17");
  });
});
