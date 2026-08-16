import { describe, expect, it } from "vitest";
import { buildReminderJobs, utcPlusOneCron } from "./reminderSchedule";

describe("reminder schedule", () => {
  it("converts the approved UTC+1 reminder defaults to UTC cron expressions", () => {
    expect(utcPlusOneCron("20:00")).toBe("0 0 19 * * *");
    expect(utcPlusOneCron("18:00", 5)).toBe("0 0 17 * * 5");
    expect(utcPlusOneCron("09:00", 6)).toBe("0 0 8 * * 6");
  });

  it("preserves the logical local day when a UTC+1 time crosses midnight", () => {
    expect(utcPlusOneCron("00:30", 6)).toBe("0 30 23 * * 5");
  });

  it("builds three distinct journal reminder jobs", () => {
    expect(buildReminderJobs({ daily: "20:00", friday: "18:00", saturday: "09:00" }).map(job => job.kind)).toEqual(["daily", "friday", "saturday"]);
  });
});
