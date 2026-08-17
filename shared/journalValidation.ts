export const REQUIRED_TRADE_FIELDS = [
  "tradingDay",
  "setup",
  "entryConfirmation",
  "pips",
] as const;

export type RequiredTradeField = (typeof REQUIRED_TRADE_FIELDS)[number];

export type RequiredTradeValues = Record<RequiredTradeField, string>;

export const REQUIRED_TRADE_FIELD_LABELS: Record<RequiredTradeField, string> = {
  tradingDay: "trade date",
  setup: "setup",
  entryConfirmation: "entry confirmation",
  pips: "signed pip result",
};

export function getMissingRequiredTradeFields(
  trade: RequiredTradeValues,
): RequiredTradeField[] {
  return REQUIRED_TRADE_FIELDS.filter((field) => !trade[field].trim());
}
