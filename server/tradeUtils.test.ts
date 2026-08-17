import { describe, expect, it } from "vitest";
import { calculateWeeklyMetrics, formatTradeRowsForPrompt, getCurrentWeekWindow, normalizeExtractedTrade } from "./tradeUtils";

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

  it("deducts losses from net pips even if a loss was entered as a positive number", () => {
    const metrics = calculateWeeklyMetrics([
      { result: "win", pips: 120, profit: null },
      { result: "loss", pips: 60, profit: null },
      { result: "win", pips: 450, profit: null },
    ]);
    expect(metrics.totalPips).toBe(510);
  });

  it("marks news trades and loss signs correctly in image-summary rows", () => {
    const rows = formatTradeRowsForPrompt([{
      id: 1, userId: 1, documentId: null, tradingDay: new Date("2026-08-19T12:00:00Z"), pair: "XAUUSD", session: "New York", direction: "buy", timeframe: "M5", tradeType: "news trade", setup: "", entryConfirmation: "", higherTimeframeAlignment: "", entry: "", exit: "", pips: 450, profit: null, currency: "USD", riskAmount: null, riskUnit: "", plannedRr: null, stopManagement: "", partialProfit: "", result: "win", exitReason: "", planAdherence: "", discipline: "", emotion: "", wouldTakeAgain: "", tags: null, notes: null, improvement: null, confidence: 100, createdAt: new Date(), updatedAt: new Date(),
    }, {
      id: 2, userId: 1, documentId: null, tradingDay: new Date("2026-08-20T12:00:00Z"), pair: "XAUUSD", session: "London", direction: "buy", timeframe: "M5", tradeType: "intraday", setup: "", entryConfirmation: "", higherTimeframeAlignment: "", entry: "", exit: "", pips: 60, profit: null, currency: "USD", riskAmount: null, riskUnit: "", plannedRr: null, stopManagement: "", partialProfit: "", result: "loss", exitReason: "", planAdherence: "", discipline: "", emotion: "", wouldTakeAgain: "", tags: null, notes: null, improvement: null, confidence: 100, createdAt: new Date(), updatedAt: new Date(),
    }]);
    expect(rows).toContain("New York • NEWS TRADE");
    expect(rows).toContain("-60 PIPS");
  });

  it("uses Monday as the beginning of the weekly journal window", () => {
    const window = getCurrentWeekWindow(new Date("2026-08-16T12:00:00Z"));
    expect(window.weekStart.toISOString().slice(0, 10)).toBe("2026-08-10");
    expect(window.weekEnd.toISOString().slice(0, 10)).toBe("2026-08-17");
  });
});
