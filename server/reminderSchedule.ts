export type ReminderKind = "daily" | "friday" | "saturday";

export type ReminderTimes = {
  daily: string;
  friday: string;
  saturday: string;
};

export const defaultReminderTimes: ReminderTimes = { daily: "20:00", friday: "18:00", saturday: "09:00" };

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Reminder time must use HH:MM format");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("Reminder time is invalid");
  return { hours, minutes };
}

/** Converts a user-facing UTC+1 time to Manus's six-field UTC cron format. */
export function utcPlusOneCron(time: string, localDayOfWeek?: number) {
  const { hours, minutes } = parseTime(time);
  let utcMinutes = hours * 60 + minutes - 60;
  let day = localDayOfWeek;
  if (utcMinutes < 0) {
    utcMinutes += 24 * 60;
    if (day !== undefined) day = (day + 6) % 7;
  }
  const utcHours = Math.floor(utcMinutes / 60);
  const utcMinute = utcMinutes % 60;
  return `0 ${utcMinute} ${utcHours} * * ${day ?? "*"}`;
}

export function buildReminderJobs(times: ReminderTimes) {
  return [
    { kind: "daily" as const, cron: utcPlusOneCron(times.daily), label: `Daily ${times.daily} UTC+1 journal reminder` },
    { kind: "friday" as const, cron: utcPlusOneCron(times.friday, 5), label: `Friday ${times.friday} UTC+1 weekly-summary reminder` },
    { kind: "saturday" as const, cron: utcPlusOneCron(times.saturday, 6), label: `Saturday ${times.saturday} UTC+1 weekly-summary follow-up` },
  ];
}
