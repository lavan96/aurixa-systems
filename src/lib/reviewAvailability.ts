/**
 * Availability for the Stage 3 strategic review.
 *
 * Aurixa publishes a fixed weekly review window rather than a live calendar
 * feed, so the bookable set is derived here from the operating hours below and
 * then rendered in whatever zone the applicant is reading in. Everything is a
 * pure function of `now`, which keeps the rules testable and keeps daylight
 * saving out of the component.
 */

import { dayKeyOf, getZonedParts, toDayKey, zonedWallTimeToUtc } from "./timeZone";

/** Aurixa's operating zone. Review windows are published in this zone. */
export const HOST_TIME_ZONE = "Australia/Sydney";

/** Length of a strategic review, in minutes. */
export const SESSION_MINUTES = 30;

/** First and last session start, as minutes past midnight in the host zone. */
export const FIRST_SESSION_MINUTE = 9 * 60;
export const LAST_SESSION_MINUTE = 16 * 60 + 30;

/** Minutes between consecutive session starts. */
export const SESSION_INTERVAL_MINUTES = 30;

/** Days of the week Aurixa runs reviews (0 = Sunday). */
export const REVIEW_WEEKDAYS = [1, 2, 3, 4, 5] as const;

/** How far ahead the applicant may book. */
export const BOOKING_HORIZON_DAYS = 45;

/** How much notice the team needs before a session starts. */
export const MINIMUM_NOTICE_MS = 24 * 60 * 60 * 1_000;

/**
 * Dates Aurixa does not run reviews, as `YYYY-MM-DD` in the host zone.
 * Keep this list short and current — a stale entry silently removes capacity.
 */
export const REVIEW_BLACKOUT_DAYS: readonly string[] = [];

const DAY_MS = 24 * 60 * 60 * 1_000;

export type SlotGroup = {
  /** `YYYY-MM-DD` in the viewer's zone. */
  dayKey: string;
  /** Session start instants, in epoch milliseconds, ascending. */
  slots: number[];
};

/**
 * Every session start between `now + notice` and the booking horizon.
 * Returned as epoch milliseconds so the caller can render them in any zone.
 */
export function generateReviewSlots(now: Date = new Date(), horizonDays: number = BOOKING_HORIZON_DAYS): number[] {
  const earliest = now.getTime() + MINIMUM_NOTICE_MS;
  const slots: number[] = [];
  const cursor = getZonedParts(now, HOST_TIME_ZONE);
  let day = zonedWallTimeToUtc(HOST_TIME_ZONE, cursor.year, cursor.month, cursor.day, 12, 0);

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const parts = getZonedParts(day, HOST_TIME_ZONE);
    day = new Date(day.getTime() + DAY_MS);

    if (!REVIEW_WEEKDAYS.includes(parts.weekday as (typeof REVIEW_WEEKDAYS)[number])) continue;
    if (REVIEW_BLACKOUT_DAYS.includes(dayKeyOf(parts.year, parts.month, parts.day))) continue;

    for (let minute = FIRST_SESSION_MINUTE; minute <= LAST_SESSION_MINUTE; minute += SESSION_INTERVAL_MINUTES) {
      const start = zonedWallTimeToUtc(
        HOST_TIME_ZONE,
        parts.year,
        parts.month,
        parts.day,
        Math.floor(minute / 60),
        minute % 60,
      ).getTime();
      if (start >= earliest) slots.push(start);
    }
  }

  return slots.sort((a, b) => a - b);
}

/** Groups session starts by the calendar day they fall on in `timeZone`. */
export function groupSlotsByDay(slots: readonly number[], timeZone: string): Map<string, number[]> {
  const grouped = new Map<string, number[]>();
  for (const slot of slots) {
    const key = toDayKey(new Date(slot), timeZone);
    const existing = grouped.get(key);
    if (existing) existing.push(slot);
    else grouped.set(key, [slot]);
  }
  for (const list of grouped.values()) list.sort((a, b) => a - b);
  return grouped;
}

export type MonthCell = {
  /** `YYYY-MM-DD`. */
  key: string;
  year: number;
  month: number;
  day: number;
  /** False for the leading/trailing days that pad the grid. */
  inMonth: boolean;
};

/**
 * A six-row, Monday-first month grid. Padding days belong to the neighbouring
 * months so the grid never reflows between months.
 */
export function buildMonthMatrix(year: number, month: number): MonthCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // Monday-first: shift Sunday (0) to the end of the week.
  const leading = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = new Date(firstOfMonth.getTime() - leading * DAY_MS);

  const weeks: MonthCell[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const row: MonthCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(start.getTime() + (week * 7 + index) * DAY_MS);
      const cellYear = date.getUTCFullYear();
      const cellMonth = date.getUTCMonth() + 1;
      const cellDay = date.getUTCDate();
      row.push({
        key: dayKeyOf(cellYear, cellMonth, cellDay),
        year: cellYear,
        month: cellMonth,
        day: cellDay,
        inMonth: cellMonth === month && cellYear === year,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/** Splits `YYYY-MM-DD` into its parts, or null when it is not a day key. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Moves a `YYYY-MM-DD` key by whole days. */
export function shiftDayKey(key: string, days: number): string {
  const parsed = parseDayKey(key);
  if (!parsed) return key;
  const moved = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * DAY_MS);
  return dayKeyOf(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

/** The first day at or after `fromKey` that has capacity, or "" when none does. */
export function firstAvailableDay(grouped: Map<string, number[]>, fromKey = ""): string {
  const days = [...grouped.keys()].filter((key) => (grouped.get(key)?.length ?? 0) > 0).sort();
  if (!fromKey) return days[0] ?? "";
  return days.find((key) => key >= fromKey) ?? days[0] ?? "";
}

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

const timeFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = timeFormatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-AU", {
    ...(timeZone ? { timeZone } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  timeFormatterCache.set(timeZone, formatter);
  return formatter;
};

/** e.g. `9:00 am`. Runtimes vary on the separator and case; this settles both. */
export function formatSlotTime(instant: number, timeZone: string): string {
  try {
    return timeFormatter(timeZone)
      .format(new Date(instant))
      .replace(/[\u202f\u00a0]/g, " ")
      .replace(/\s*(AM|PM)\s*$/i, (_match, meridiem: string) => ` ${meridiem.toLowerCase()}`);
  } catch {
    return "";
  }
}

/** e.g. `9:00 am – 9:30 am`. */
export function formatSlotRange(instant: number, timeZone: string, minutes = SESSION_MINUTES): string {
  const start = formatSlotTime(instant, timeZone);
  const end = formatSlotTime(instant + minutes * 60_000, timeZone);
  return start && end ? `${start} – ${end}` : start;
}

/** e.g. `Thursday 6 August 2026`. */
export function formatDayLabel(dayKey: string, options: Intl.DateTimeFormatOptions = {}): string {
  const parsed = parseDayKey(dayKey);
  if (!parsed) return "";
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      ...options,
    }).format(date);
  } catch {
    return dayKey;
  }
}

/** e.g. `August 2026`. */
export function formatMonthLabel(year: number, month: number): string {
  try {
    return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "long", year: "numeric" })
      .format(new Date(Date.UTC(year, month - 1, 1, 12)));
  } catch {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
}

/** Whether the applicant's zone renders this slot on a different date than Aurixa's. */
export function crossesDateBoundary(instant: number, viewerZone: string): boolean {
  return toDayKey(new Date(instant), viewerZone) !== toDayKey(new Date(instant), HOST_TIME_ZONE);
}

export type TimeZoneOption = { id: string; label: string };

/** Offered in the zone picker, alongside whatever the device reports. */
export const SUGGESTED_TIME_ZONES: readonly TimeZoneOption[] = [
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Australia/Melbourne", label: "Melbourne" },
  { id: "Australia/Brisbane", label: "Brisbane" },
  { id: "Australia/Adelaide", label: "Adelaide" },
  { id: "Australia/Perth", label: "Perth" },
  { id: "Australia/Darwin", label: "Darwin" },
  { id: "Australia/Hobart", label: "Hobart" },
  { id: "Pacific/Auckland", label: "Auckland" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Kuala_Lumpur", label: "Kuala Lumpur" },
  { id: "Asia/Hong_Kong", label: "Hong Kong" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Europe/London", label: "London" },
  { id: "America/New_York", label: "New York" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
];
