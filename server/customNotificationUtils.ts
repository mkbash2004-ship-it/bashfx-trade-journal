export type NotificationKind = "daily" | "friday" | "saturday";

export const defaultNotificationTemplates: Record<NotificationKind, { title: string; content: string }> = {
  daily: {
    title: "Bashfx VIP GOLD ROOM: complete today's journal",
    content: "It is time to record every dated XAUUSD M5 London or New York trade and complete your end-of-day review.",
  },
  friday: {
    title: "Bashfx VIP GOLD ROOM: Friday weekly summary",
    content: "Review this week's dated XAUUSD M5 trade log and generate your Friday evening weekly summary.",
  },
  saturday: {
    title: "Bashfx VIP GOLD ROOM: Saturday follow-up",
    content: "Check that every XAUUSD trade has the correct date, then generate or download your weekly summary.",
  },
};

export function normalizeNotificationTemplate(title: string, content: string, fallback: { title: string; content: string }) {
  return {
    title: (title.trim() || fallback.title).slice(0, 120),
    content: (content.trim() || fallback.content).slice(0, 500),
  };
}

export function buildCustomNotificationSettings(input: {
  enabled: boolean;
  dailyNotificationTitle: string;
  dailyNotificationContent: string;
  fridayNotificationTitle: string;
  fridayNotificationContent: string;
  saturdayNotificationTitle: string;
  saturdayNotificationContent: string;
}) {
  const daily = normalizeNotificationTemplate(input.dailyNotificationTitle, input.dailyNotificationContent, defaultNotificationTemplates.daily);
  const friday = normalizeNotificationTemplate(input.fridayNotificationTitle, input.fridayNotificationContent, defaultNotificationTemplates.friday);
  const saturday = normalizeNotificationTemplate(input.saturdayNotificationTitle, input.saturdayNotificationContent, defaultNotificationTemplates.saturday);
  return {
    enabled: input.enabled,
    dailyNotificationTitle: daily.title,
    dailyNotificationContent: daily.content,
    fridayNotificationTitle: friday.title,
    fridayNotificationContent: friday.content,
    saturdayNotificationTitle: saturday.title,
    saturdayNotificationContent: saturday.content,
  };
}
