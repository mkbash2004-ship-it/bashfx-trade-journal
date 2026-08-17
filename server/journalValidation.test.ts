import { describe, expect, it } from "vitest";
import {
  getMissingRequiredTradeFields,
  REQUIRED_TRADE_FIELD_SUGGESTIONS,
} from "../shared/journalValidation";

describe("daily journal required trade validation", () => {
  it("identifies the exact empty required fields", () => {
    expect(
      getMissingRequiredTradeFields({
        tradingDay: "",
        pips: "",
      }),
    ).toEqual(["tradingDay", "pips"]);
  });

  it("accepts a complete trade including a zero-pip breakeven result", () => {
    expect(
      getMissingRequiredTradeFields({
        tradingDay: "2026-08-17",
        pips: "0",
      }),
    ).toEqual([]);
  });

  it("provides a concrete entry suggestion for every required field", () => {
    expect(Object.values(REQUIRED_TRADE_FIELD_SUGGESTIONS)).toHaveLength(2);
    expect(REQUIRED_TRADE_FIELD_SUGGESTIONS.pips).toContain("+75");
    expect(REQUIRED_TRADE_FIELD_SUGGESTIONS.tradingDay).toContain("actual date");
  });
});
