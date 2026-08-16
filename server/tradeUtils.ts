import type { Trade } from "../drizzle/schema";

export type ExtractedTrade = {
  pair: string;
  session: string;
  direction: string;
  entry: string;
  exit: string;
  pips: number | null;
  profit: number | null;
  currency: string;
  result: string;
  notes: string;
  confidence: number;
};

export type WeeklyMetrics = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPips: number;
  totalProfit: number;
};

const resultSet = new Set(["win", "loss", "breakeven", "cancelled", "unknown"]);
const directionSet = new Set(["buy", "sell", "unknown"]);

export function cleanResult(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[ _-]/g, "");
  if (normalized === "break even" || normalized === "be") return "breakeven";
  return resultSet.has(normalized) ? normalized : "unknown";
}

export function cleanDirection(value: string) {
  const normalized = value.trim().toLowerCase();
  return directionSet.has(normalized) ? normalized : "unknown";
}

export function normalizeExtractedTrade(value: ExtractedTrade): ExtractedTrade {
  return {
    pair: value.pair.trim().toUpperCase().slice(0, 24) || "UNKNOWN",
    session: value.session.trim().slice(0, 64),
    direction: cleanDirection(value.direction),
    entry: value.entry.trim().slice(0, 32),
    exit: value.exit.trim().slice(0, 32),
    pips: Number.isFinite(value.pips) ? value.pips : null,
    profit: Number.isFinite(value.profit) ? value.profit : null,
    currency: value.currency.trim().toUpperCase().slice(0, 12),
    result: cleanResult(value.result),
    notes: value.notes.trim().slice(0, 1000),
    confidence: Math.max(0, Math.min(100, Math.round(value.confidence || 0))),
  };
}

export function calculateWeeklyMetrics(items: Array<Pick<Trade, "pips" | "profit" | "result">>): WeeklyMetrics {
  const wins = items.filter(item => cleanResult(item.result) === "win").length;
  const losses = items.filter(item => cleanResult(item.result) === "loss").length;
  const breakeven = items.filter(item => cleanResult(item.result) === "breakeven").length;
  const decisive = wins + losses;
  return {
    totalTrades: items.length,
    wins,
    losses,
    breakeven,
    winRate: decisive ? Math.round((wins / decisive) * 1000) / 10 : 0,
    totalPips: Math.round(items.reduce((sum, item) => sum + (item.pips ?? 0), 0) * 100) / 100,
    totalProfit: Math.round(items.reduce((sum, item) => sum + (item.profit ?? 0), 0) * 100) / 100,
  };
}

export function getCurrentWeekWindow(reference = new Date()) {
  const local = new Date(reference);
  local.setHours(0, 0, 0, 0);
  const mondayOffset = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - mondayOffset);
  const end = new Date(local);
  end.setDate(end.getDate() + 7);
  return { weekStart: local, weekEnd: end };
}

export function formatTradeRowsForPrompt(items: Trade[]) {
  return items.map((trade, index) => `${index + 1}. ${new Date(trade.tradingDay).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} | XAUUSD | ${trade.session || "Session n/a"} | ${trade.direction.toUpperCase()} | ${trade.pips === null ? "Pips n/a" : `${trade.pips > 0 ? "+" : ""}${trade.pips} PIPS`} | ${trade.result.toUpperCase()}`).join("\n");
}
