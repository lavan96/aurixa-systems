import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOOKING_HORIZON_DAYS,
  FIRST_SESSION_MINUTE,
  HOST_TIME_ZONE,
  LAST_SESSION_MINUTE,
  MINIMUM_NOTICE_MS,
  SESSION_INTERVAL_MINUTES,
  buildMonthMatrix,
  crossesDateBoundary,
  firstAvailableDay,
  formatDayLabel,
  formatMonthLabel,
  formatSlotRange,
  formatSlotTime,
  generateReviewSlots,
  groupSlotsByDay,
  parseDayKey,
  shiftDayKey,
} from "./reviewAvailability";
import { getZonedParts, toDayKey, zonedWallTimeToUtc } from "./timeZone";

/** Thursday 6 August 2026, 08:00 in Sydney (AEST). */
const NOW = new Date("2026-08-05T22:00:00Z");

/** Wednesday 5 August 2026, 12:00 in Sydney — notice lands mid-Thursday. */
const MIDDAY = new Date("2026-08-05T02:00:00Z");

const SLOTS_PER_DAY = (LAST_SESSION_MINUTE - FIRST_SESSION_MINUTE) / SESSION_INTERVAL_MINUTES + 1;

test("every generated slot is a weekday session inside the published window", () => {
  const slots = generateReviewSlots(NOW);
  assert.ok(slots.length > 0);

  for (const slot of slots) {
    const parts = getZonedParts(new Date(slot), HOST_TIME_ZONE);
    const minuteOfDay = parts.hour * 60 + parts.minute;
    assert.ok(parts.weekday >= 1 && parts.weekday <= 5, `weekend slot at ${new Date(slot).toISOString()}`);
    assert.ok(minuteOfDay >= FIRST_SESSION_MINUTE && minuteOfDay <= LAST_SESSION_MINUTE, `out of hours: ${minuteOfDay}`);
    assert.equal(minuteOfDay % SESSION_INTERVAL_MINUTES, 0);
  }
});

test("slots respect the minimum notice and the booking horizon", () => {
  const slots = generateReviewSlots(NOW);
  const earliest = NOW.getTime() + MINIMUM_NOTICE_MS;
  const latest = NOW.getTime() + (BOOKING_HORIZON_DAYS + 1) * 86_400_000;

  assert.ok(slots[0] >= earliest, "first slot is at least the notice period away");
  assert.ok(slots[0] < earliest + 3 * 86_400_000, "and not needlessly far away");
  assert.ok(slots[slots.length - 1] <= latest);
  assert.deepEqual([...slots].sort((a, b) => a - b), slots, "slots are ascending");
});

test("a full weekday offers the whole window", () => {
  const grouped = groupSlotsByDay(generateReviewSlots(NOW), HOST_TIME_ZONE);
  // Friday 7 August 2026 is clear of the 24-hour notice from Wednesday evening.
  const friday = grouped.get("2026-08-07") ?? [];
  assert.equal(friday.length, SLOTS_PER_DAY);
  assert.equal(formatSlotTime(friday[0], HOST_TIME_ZONE), "9:00 am");
  assert.equal(formatSlotTime(friday[friday.length - 1], HOST_TIME_ZONE), "4:30 pm");
  assert.equal(grouped.has("2026-08-08"), false, "Saturday is not offered");
  assert.equal(grouped.has("2026-08-09"), false, "Sunday is not offered");
});

test("the notice period trims a partial day rather than dropping the week", () => {
  const grouped = groupSlotsByDay(generateReviewSlots(MIDDAY), HOST_TIME_ZONE);
  const thursday = grouped.get("2026-08-06") ?? [];
  // Midday Wednesday + 24 hours' notice lands midday Thursday.
  assert.ok(thursday.length > 0 && thursday.length < SLOTS_PER_DAY, `partial day, got ${thursday.length}`);
  assert.ok(thursday[0] >= MIDDAY.getTime() + MINIMUM_NOTICE_MS);
  assert.equal(formatSlotTime(thursday[0], HOST_TIME_ZONE), "12:00 pm");
  assert.equal((grouped.get("2026-08-07") ?? []).length, SLOTS_PER_DAY, "the next day is untouched");
});

test("slots stay at 9am local across a daylight-saving change", () => {
  // Sydney moves to AEDT on 4 October 2026; the window must not drift.
  const slots = generateReviewSlots(new Date("2026-09-28T00:00:00Z"), 20);
  const grouped = groupSlotsByDay(slots, HOST_TIME_ZONE);
  const before = grouped.get("2026-10-02") ?? [];
  const after = grouped.get("2026-10-05") ?? [];

  assert.equal(formatSlotTime(before[0], HOST_TIME_ZONE), "9:00 am");
  assert.equal(formatSlotTime(after[0], HOST_TIME_ZONE), "9:00 am");
  assert.equal(
    after[0] - zonedWallTimeToUtc(HOST_TIME_ZONE, 2026, 10, 5, 9, 0).getTime(),
    0,
    "the instant matches the wall time in the new offset",
  );
});

test("grouping re-dates slots for a viewer west of Aurixa", () => {
  const slots = generateReviewSlots(NOW);
  const perth = groupSlotsByDay(slots, "Australia/Perth");
  const sydney = groupSlotsByDay(slots, HOST_TIME_ZONE);
  assert.deepEqual([...perth.keys()].sort(), [...sydney.keys()].sort(), "Perth sees the same dates");

  const losAngeles = groupSlotsByDay(slots, "America/Los_Angeles");
  const friday = sydney.get("2026-08-07") ?? [];
  // 9am Friday in Sydney is Thursday afternoon in Los Angeles.
  assert.equal(toDayKey(new Date(friday[0]), "America/Los_Angeles"), "2026-08-06");
  assert.ok((losAngeles.get("2026-08-06") ?? []).includes(friday[0]));
});

test("crossesDateBoundary flags slots that land on another date for the viewer", () => {
  const friday9am = zonedWallTimeToUtc(HOST_TIME_ZONE, 2026, 8, 7, 9, 0).getTime();
  assert.equal(crossesDateBoundary(friday9am, HOST_TIME_ZONE), false);
  assert.equal(crossesDateBoundary(friday9am, "America/Los_Angeles"), true);
  assert.equal(crossesDateBoundary(friday9am, "Asia/Singapore"), false);
});

test("buildMonthMatrix is a six-week, Monday-first grid", () => {
  const weeks = buildMonthMatrix(2026, 8);
  assert.equal(weeks.length, 6);
  assert.ok(weeks.every((week) => week.length === 7));

  // 1 August 2026 is a Saturday, so the grid opens on Monday 27 July.
  assert.equal(weeks[0][0].key, "2026-07-27");
  assert.equal(weeks[0][0].inMonth, false);
  assert.equal(weeks[0][5].key, "2026-08-01");
  assert.equal(weeks[0][5].inMonth, true);
  assert.equal(weeks[5][6].key, "2026-09-06");

  const inMonth = weeks.flat().filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 31);
  assert.equal(inMonth[0].day, 1);
  assert.equal(inMonth[30].day, 31);
});

test("buildMonthMatrix handles a month that starts on Monday and a leap February", () => {
  const june = buildMonthMatrix(2026, 6);
  assert.equal(june[0][0].key, "2026-06-01", "no leading padding needed");

  const february = buildMonthMatrix(2028, 2);
  assert.equal(february.flat().filter((cell) => cell.inMonth).length, 29);
});

test("parseDayKey rejects anything that is not a calendar day", () => {
  assert.deepEqual(parseDayKey("2026-08-06"), { year: 2026, month: 8, day: 6 });
  assert.equal(parseDayKey("2026-8-6"), null);
  assert.equal(parseDayKey("2026-13-01"), null);
  assert.equal(parseDayKey("2026-08-32"), null);
  assert.equal(parseDayKey("tomorrow"), null);
});

test("shiftDayKey moves across month and year boundaries", () => {
  assert.equal(shiftDayKey("2026-08-06", 1), "2026-08-07");
  assert.equal(shiftDayKey("2026-08-06", -7), "2026-07-30");
  assert.equal(shiftDayKey("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDayKey("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDayKey("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDayKey("not-a-day", 1), "not-a-day");
});

test("firstAvailableDay finds the next day with capacity", () => {
  const grouped = new Map<string, number[]>([
    ["2026-08-07", [1]],
    ["2026-08-10", [1, 2]],
    ["2026-08-11", []],
  ]);
  assert.equal(firstAvailableDay(grouped), "2026-08-07");
  assert.equal(firstAvailableDay(grouped, "2026-08-08"), "2026-08-10");
  assert.equal(firstAvailableDay(grouped, "2026-08-11"), "2026-08-07", "wraps to the earliest when nothing is later");
  assert.equal(firstAvailableDay(new Map()), "");
});

test("labels read the way the page shows them", () => {
  const nineAm = zonedWallTimeToUtc(HOST_TIME_ZONE, 2026, 8, 7, 9, 0).getTime();
  assert.equal(formatSlotTime(nineAm, HOST_TIME_ZONE), "9:00 am");
  assert.equal(formatSlotRange(nineAm, HOST_TIME_ZONE), "9:00 am – 9:30 am");
  assert.equal(formatSlotTime(nineAm, "Asia/Kuala_Lumpur"), "7:00 am");
  assert.equal(formatDayLabel("2026-08-07"), "Friday 7 August 2026");
  assert.equal(formatDayLabel("2026-08-07", { year: undefined }), "Friday 7 August");
  assert.equal(formatDayLabel("nope"), "");
  assert.equal(formatMonthLabel(2026, 8), "August 2026");
});
