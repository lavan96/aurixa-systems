/**
 * Time-zone primitives shared by the Stage 3 scheduler.
 *
 * Everything here is derived from `Intl` rather than a table of offsets, so
 * daylight saving is always correct for the instant in question, and every
 * function degrades to something usable when a runtime cannot answer.
 */

export type ZonedParts = {
  year: number;
  /** 1-12. */
  month: number;
  /** 1-31. */
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

const partsFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = partsFormatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  partsFormatterCache.set(timeZone, formatter);
  return formatter;
};

/** Resolves the environment's IANA zone id, or "" when it cannot be read. */
export function readTimeZoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** True when the runtime accepts `timeZone` as an IANA zone id. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

const parseGmtOffset = (formatted: string): number | null => {
  const match = /GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?/.exec(formatted);
  if (!match) return null;
  if (!match[1]) return 0;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
};

/** Minutes east of UTC for `timeZone` at `date`, falling back to the runtime's own offset. */
export function getUtcOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  try {
    let formatter = offsetFormatterCache.get(timeZone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-US", {
        ...(timeZone ? { timeZone } : {}),
        timeZoneName: "longOffset",
      });
      offsetFormatterCache.set(timeZone, formatter);
    }
    const parsed = parseGmtOffset(formatter.format(date));
    if (parsed !== null) return parsed;
  } catch {
    // Fall through to the runtime's own offset.
  }
  const local = -date.getTimezoneOffset();
  return Number.isFinite(local) ? local : 0;
}

/** Formats a minutes-from-UTC offset the way the page states it: `UTC+10:00`. */
export function formatUtcOffset(offsetMinutes: number): string {
  if (!Number.isFinite(offsetMinutes)) return "UTC";
  const rounded = Math.round(offsetMinutes);
  const sign = rounded < 0 ? "-" : "+";
  const absolute = Math.abs(rounded);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

/** Breaks an instant into wall-clock fields for `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  try {
    const parts = partsFormatter(timeZone).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
    const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "";
    const hour = read("hour");
    return {
      year: read("year"),
      month: read("month"),
      day: read("day"),
      // Some runtimes render midnight as hour 24 under h23.
      hour: hour === 24 ? 0 : hour,
      minute: read("minute"),
      weekday: WEEKDAY_INDEX[weekdayName] ?? date.getUTCDay(),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      weekday: date.getUTCDay(),
    };
  }
}

/**
 * Converts a wall-clock time in `timeZone` to the instant it names.
 *
 * The offset is sampled twice because the first sample is taken at the wrong
 * instant whenever the guess lands on the other side of a daylight-saving
 * transition; the second sample is taken at the corrected instant.
 */
export function zonedWallTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = getUtcOffsetMinutes(timeZone, new Date(wallClock));
  const firstGuess = wallClock - firstOffset * 60_000;
  const secondOffset = getUtcOffsetMinutes(timeZone, new Date(firstGuess));
  if (secondOffset === firstOffset) return new Date(firstGuess);
  return new Date(wallClock - secondOffset * 60_000);
}

/** `YYYY-MM-DD` for the calendar day `date` falls on in `timeZone`. */
export function toDayKey(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` from plain calendar fields. */
export function dayKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type TimeZoneDescriptor = {
  /** IANA zone id when the environment reports one, otherwise "". */
  timeZone: string;
  /** Display label, e.g. "Australia/Sydney" or "Your device time zone". */
  label: string;
  /** Short label, e.g. "Sydney". */
  shortLabel: string;
  /** Offset from UTC, e.g. "UTC+10:00". */
  offsetLabel: string;
  /** Zone abbreviation for the instant, e.g. "AEST". Empty when unavailable. */
  abbreviation: string;
};

const readAbbreviation = (timeZone: string, date: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      ...(timeZone ? { timeZone } : {}),
      timeZoneName: "short",
    }).formatToParts(date);
    const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    // Runtimes fall back to "GMT+10"-style names, which the offset already says.
    return /^GMT|^UTC/.test(name) ? "" : name;
  } catch {
    return "";
  }
};

/** Describes the zone the applicant is booking in, for display. */
export function describeTimeZone(date: Date = new Date(), timeZone: string = readTimeZoneId()): TimeZoneDescriptor {
  const segment = timeZone ? timeZone.split("/").pop() ?? timeZone : "";
  return {
    timeZone,
    label: timeZone ? timeZone.replace(/_/g, " ") : "Your device time zone",
    shortLabel: segment ? segment.replace(/_/g, " ") : "Local",
    offsetLabel: formatUtcOffset(getUtcOffsetMinutes(timeZone, date)),
    abbreviation: readAbbreviation(timeZone, date),
  };
}

/** 24-hour local time, e.g. "14:32". Returns "" if the runtime cannot format it. */
export function formatLocalTime(date: Date = new Date(), timeZone: string = readTimeZoneId()): string {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      ...(timeZone ? { timeZone } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "";
  }
}
