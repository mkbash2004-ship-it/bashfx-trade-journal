import { describe, expect, it } from "vitest";
import {
  MONTH_END_WAT_CRON,
  MONTH_END_WAT_LABEL,
} from "./monthlySchedule";

describe("monthly summary WAT schedule", () => {
  it("runs shortly after midnight on the first day in West Africa Time", () => {
    expect(MONTH_END_WAT_CRON).toBe("0 5 0 1 * *");
    expect(MONTH_END_WAT_LABEL).toContain("01:05 WAT");
    expect(MONTH_END_WAT_LABEL).toContain("month that just closed");
  });
});
