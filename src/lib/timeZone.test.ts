import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describeTimeZone,
  formatLocalTime,
  formatUtcOffset,
  getUtcOffsetMinutes,
  getZonedParts,
  isValidTimeZone,
  toDayKey,
  zonedWallTimeToUtc,
} from "./timeZone";

test("formatUtcOffset renders signed, padded offsets", () => {
  assert.equal(formatUtcOffset(600), "UTC+10:00");
  assert.equal(formatUtcOffset(0), "UTC+00:00");
  assert.equal(formatUtcOffset(330), "UTC+05:30");
  assert.equal(formatUtcOffset(-210), "UTC-03:30");
  assert.equal(formatUtcOffset(Number.NaN), "UTC");
});

test("getUtcOffsetMinutes follows daylight saving", () => {
  assert.equal(getUtcOffsetMinutes("Australia/Sydney", new Date("2026-01-15T00:00:00Z")), 660);
  assert.equal(getUtcOffsetMinutes("Australia/Sydney", new Date("2026-07-15T00:00:00Z")), 600);
  assert.equal(getUtcOffsetMinutes("Australia/Brisbane", new Date("2026-01-15T00:00:00Z")), 600);
  assert.equal(getUtcOffsetMinutes("Australia/Adelaide", new Date("2026-07-15T00:00:00Z")), 570);
  assert.equal(getUtcOffsetMinutes("UTC", new Date("2026-07-15T00:00:00Z")), 0);
});

test("isValidTimeZone accepts real zones only", () => {
  assert.equal(isValidTimeZone("Australia/Sydney"), true);
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("Not/AZone"), false);
  assert.equal(isValidTimeZone(""), false);
});

test("getZonedParts reads wall-clock fields in the target zone", () => {
  const parts = getZonedParts(new Date("2026-08-05T23:30:00Z"), "Australia/Sydney");
  assert.deepEqual(parts, { year: 2026, month: 8, day: 6, hour: 9, minute: 30, weekday: 4 });

  const midnight = getZonedParts(new Date("2026-08-05T14:00:00Z"), "Australia/Sydney");
  assert.equal(midnight.hour, 0, "midnight reads as hour 0, never 24");
  assert.equal(midnight.day, 6);
});

test("zonedWallTimeToUtc resolves a wall time to the instant it names", () => {
  assert.equal(
    zonedWallTimeToUtc("Australia/Sydney", 2026, 8, 6, 9, 0).toISOString(),
    "2026-08-05T23:00:00.000Z",
    "9am AEST is 23:00 UTC the day before",
  );
  assert.equal(
    zonedWallTimeToUtc("Australia/Sydney", 2026, 1, 15, 9, 0).toISOString(),
    "2026-01-14T22:00:00.000Z",
    "9am AEDT is 22:00 UTC the day before",
  );
  assert.equal(zonedWallTimeToUtc("UTC", 2026, 8, 6, 9, 0).toISOString(), "2026-08-06T09:00:00.000Z");
});

test("zonedWallTimeToUtc survives daylight-saving transitions", () => {
  // Sydney springs forward at 2am on 4 October 2026: 09:00 that day is AEDT.
  const springForward = zonedWallTimeToUtc("Australia/Sydney", 2026, 10, 4, 9, 0);
  assert.equal(springForward.toISOString(), "2026-10-03T22:00:00.000Z");
  assert.equal(getZonedParts(springForward, "Australia/Sydney").hour, 9);

  // ...and falls back at 3am on 5 April 2026.
  const fallBack = zonedWallTimeToUtc("Australia/Sydney", 2026, 4, 5, 9, 0);
  assert.equal(getZonedParts(fallBack, "Australia/Sydney").hour, 9);

  // A round trip holds for every hour across both transition days.
  for (const day of [[2026, 10, 4], [2026, 4, 5]] as const) {
    for (let hour = 5; hour < 22; hour += 1) {
      const instant = zonedWallTimeToUtc("Australia/Sydney", day[0], day[1], day[2], hour, 0);
      assert.equal(getZonedParts(instant, "Australia/Sydney").hour, hour, `${day.join("-")} ${hour}:00`);
    }
  }
});

test("toDayKey reports the calendar day in the target zone", () => {
  const instant = new Date("2026-08-05T23:30:00Z");
  assert.equal(toDayKey(instant, "Australia/Sydney"), "2026-08-06");
  assert.equal(toDayKey(instant, "UTC"), "2026-08-05");
  assert.equal(toDayKey(instant, "America/Los_Angeles"), "2026-08-05");
});

test("describeTimeZone reports labels, offset and abbreviation", () => {
  const described = describeTimeZone(new Date("2026-07-01T00:00:00Z"), "Australia/Brisbane");
  assert.equal(described.timeZone, "Australia/Brisbane");
  assert.equal(described.label, "Australia/Brisbane");
  assert.equal(described.shortLabel, "Brisbane");
  assert.equal(described.offsetLabel, "UTC+10:00");
  assert.equal(described.abbreviation, "AEST");

  const underscored = describeTimeZone(new Date("2026-07-01T00:00:00Z"), "Asia/Kuala_Lumpur");
  assert.equal(underscored.label, "Asia/Kuala Lumpur");
  assert.equal(underscored.shortLabel, "Kuala Lumpur");
  assert.equal(underscored.offsetLabel, "UTC+08:00");
});

test("describeTimeZone degrades without a zone id and tolerates a bad one", () => {
  const none = describeTimeZone(new Date("2026-07-01T00:00:00Z"), "");
  assert.equal(none.label, "Your device time zone");
  assert.equal(none.shortLabel, "Local");
  assert.match(none.offsetLabel, /^UTC[+-]\d{2}:\d{2}$/);

  const bogus = describeTimeZone(new Date("2026-07-01T00:00:00Z"), "Not/AZone");
  assert.equal(bogus.shortLabel, "AZone");
  assert.match(bogus.offsetLabel, /^UTC[+-]\d{2}:\d{2}$/);
});

test("formatLocalTime renders 24-hour time in the given zone", () => {
  assert.equal(formatLocalTime(new Date("2026-07-01T04:32:00Z"), "Australia/Brisbane"), "14:32");
  assert.equal(formatLocalTime(new Date("2026-07-01T04:32:00Z"), "UTC"), "04:32");
  assert.equal(formatLocalTime(new Date("2026-07-01T04:32:00Z"), "Not/AZone"), "");
});
