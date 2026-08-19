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

/** Converts a user-facing WAT time to Manus's six-field UTC cron format. */
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
    { kind: "daily" as const, cron: utcPlusOneCron(times.daily), label: `Daily ${times.daily} WAT journal reminder` },
    { kind: "friday" as const, cron: utcPlusOneCron(times.friday, 5), label: `Friday ${times.friday} WAT weekly-summary reminder` },
    { kind: "saturday" as const, cron: utcPlusOneCron(times.saturday, 6), label: `Saturday ${times.saturday} WAT weekly-summary follow-up` },
  ];
}

/** Builds a first-of-month WAT schedule. Times before 01:00 WAT are rejected because they fall in the prior UTC month. */
export function utcPlusOneMonthlyCron(time: string, dayOfMonth = 1) {
  const { hours, minutes } = parseTime(time);
  if (hours === 0) throw new Error("Monthly reminder times must be 01:00 WAT or later");
  return `0 ${minutes} ${hours - 1} ${dayOfMonth} * *`;
}

export const defaultBackupReminderTime = "09:00";

export function buildBackupReminderSchedule(time = defaultBackupReminderTime) {
  return {
    cron: utcPlusOneMonthlyCron(time),
    label: `Monthly ${time} WAT encrypted-backup reminder on the first day of each month`,
  };
}
