export const REQUIRED_TRADE_FIELDS = [
  "tradingDay",
  "pips",
] as const;

export type RequiredTradeField = (typeof REQUIRED_TRADE_FIELDS)[number];

export type RequiredTradeValues = Record<RequiredTradeField, string>;

export const REQUIRED_TRADE_FIELD_LABELS: Record<RequiredTradeField, string> = {
  tradingDay: "trade date",
  pips: "signed pip result",
};

export const REQUIRED_TRADE_FIELD_SUGGESTIONS: Record<RequiredTradeField, string> = {
  tradingDay: "Select the actual date you placed this trade.",
  pips: "Enter +75 for a win, -25 for a loss, or 0 for breakeven.",
};

export function getMissingRequiredTradeFields(
  trade: RequiredTradeValues,
): RequiredTradeField[] {
  return REQUIRED_TRADE_FIELDS.filter((field) => !trade[field].trim());
}
