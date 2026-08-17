import { describe, expect, it } from "vitest";
import { buildCustomNotificationSettings, defaultNotificationTemplates } from "./customNotificationUtils";

describe("custom notification defaults", () => {
  it("provides private Bashfx VIP GOLD ROOM templates for all three reminders", () => {
    expect(defaultNotificationTemplates.daily.title).toContain("Bashfx VIP GOLD ROOM");
    expect(defaultNotificationTemplates.friday.content).toContain("weekly summary");
    expect(defaultNotificationTemplates.saturday.title).toContain("Saturday");
  });

  it("preserves enabled state when an active user edits custom messages", () => {
    const settings = buildCustomNotificationSettings({
      enabled: true,
      dailyNotificationTitle: "My daily prompt",
      dailyNotificationContent: "Log every dated gold trade.",
      fridayNotificationTitle: "Friday review",
      fridayNotificationContent: "Build the weekly graphic.",
      saturdayNotificationTitle: "Saturday check",
      saturdayNotificationContent: "Confirm the dates.",
    });
    expect(settings.enabled).toBe(true);
    expect(settings.dailyNotificationTitle).toBe("My daily prompt");
    expect(settings.saturdayNotificationContent).toBe("Confirm the dates.");
  });
});

// This feature intentionally uses the existing authenticated notification service;
// no additional API secret is required.
