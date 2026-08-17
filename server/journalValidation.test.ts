import { describe, expect, it } from "vitest";
import { getMissingRequiredTradeFields } from "../shared/journalValidation";

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
});
