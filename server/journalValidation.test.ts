import { describe, expect, it } from "vitest";
import {
  getMissingRequiredTradeFields,
  REQUIRED_TRADE_FIELD_SUGGESTIONS,
} from "../shared/journalValidation";

describe("daily journal required trade validation", () => {
  it("identifies the exact empty required fields", () => {
    expect(
      getMissingRequiredTradeFields({
        tradingDay: "2026-08-17",
        setup: "  ",
        entryConfirmation: "M5 break and retest",
        pips: "",
      }),
    ).toEqual(["setup", "pips"]);
  });

  it("accepts a complete trade including a zero-pip breakeven result", () => {
    expect(
      getMissingRequiredTradeFields({
        tradingDay: "2026-08-17",
        setup: "Liquidity sweep",
        entryConfirmation: "M5 displacement",
        pips: "0",
      }),
    ).toEqual([]);
  });

  it("provides a concrete entry suggestion for every required field", () => {
    expect(Object.values(REQUIRED_TRADE_FIELD_SUGGESTIONS)).toHaveLength(4);
    expect(REQUIRED_TRADE_FIELD_SUGGESTIONS.pips).toContain("+75");
    expect(REQUIRED_TRADE_FIELD_SUGGESTIONS.entryConfirmation).toContain("M5");
  });
});
