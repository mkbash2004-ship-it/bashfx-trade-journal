import { describe, expect, it } from "vitest";
import { defaultNotificationTemplates } from "./customNotificationUtils";

describe("custom notification defaults", () => {
  it("provides private Bashfx VIP GOLD ROOM templates for all three reminders", () => {
    expect(defaultNotificationTemplates.daily.title).toContain("Bashfx VIP GOLD ROOM");
    expect(defaultNotificationTemplates.friday.content).toContain("weekly summary");
    expect(defaultNotificationTemplates.saturday.content).toContain("Saturday");
  });
});

// This feature intentionally uses the existing authenticated notification service;
// no additional API secret is required.
.describe;
