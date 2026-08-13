import { strict as assert } from "node:assert";
import test from "node:test";
import {
  COMPONENT_STATUSES,
  OVERALL_LABELS,
  STATUS_COMPONENT_ROSTER,
  STATUS_LABELS,
  computeOverall,
  isComponentStatus,
  rollupDaily,
  severityRank,
} from "./statusPage";

test("severity ordering puts confirmed outages above everything else", () => {
  assert.ok(severityRank("major_outage") > severityRank("partial_outage"));
  assert.ok(severityRank("partial_outage") > severityRank("degraded"));
  assert.ok(severityRank("degraded") > severityRank("maintenance"));
  // A provider we cannot read is not evidence of an outage.
  assert.ok(severityRank("unknown") < severityRank("maintenance"));
  assert.ok(severityRank("operational") < severityRank("unknown"));
});

test("overall is the worst confirmed state", () => {
  assert.equal(computeOverall(["operational", "operational"]), "operational");
  assert.equal(computeOverall(["operational", "degraded"]), "degraded");
  assert.equal(computeOverall(["degraded", "major_outage", "operational"]), "major_outage");
  assert.equal(computeOverall(["operational", "maintenance"]), "maintenance");
});

test("unknown never drives the banner while anything is readable", () => {
  assert.equal(computeOverall(["unknown", "operational"]), "operational");
  assert.equal(computeOverall(["unknown", "degraded"]), "degraded");
  assert.equal(computeOverall(["unknown", "unknown"]), "unknown");
  assert.equal(computeOverall([]), "unknown");
});

test("status guard accepts the vocabulary and nothing else", () => {
  for (const s of COMPONENT_STATUSES) assert.ok(isComponentStatus(s));
  assert.ok(!isComponentStatus("down"));
  assert.ok(!isComponentStatus(""));
  assert.ok(!isComponentStatus(null));
});

test("daily rollup keeps the worst status per day, oldest first, capped", () => {
  const rows = [
    { date: "2026-08-02", status: "operational" as const },
    { date: "2026-08-01", status: "operational" as const },
    { date: "2026-08-02", status: "degraded" as const },
    { date: "2026-08-02", status: "operational" as const },
    { date: "2026-08-03", status: "major_outage" as const },
    { date: "2026-08-03", status: "operational" as const },
  ];
  const rolled = rollupDaily(rows, 30);
  assert.deepEqual(rolled, [
    { date: "2026-08-01", status: "operational" },
    { date: "2026-08-02", status: "degraded" },
    { date: "2026-08-03", status: "major_outage" },
  ]);
  assert.equal(rollupDaily(rows, 2).length, 2);
  assert.equal(rollupDaily(rows, 2)[0].date, "2026-08-02");
});

test("no vendor is ever named in public-facing status copy", () => {
  // The entire point of the roster: roles, not vendors. If a vendor name
  // sneaks into a label, description, key, or shared status copy, the
  // anonymity requirement is broken and this must go red.
  const vendorNames =
    /supabase|cloudflare|vercel|github|openai|anthropic|gemini|google|stripe|resend|twilio|aws|amazon|azure|statuspage|instatus/i;
  const publicStrings = [
    ...STATUS_COMPONENT_ROSTER.flatMap((c) => [c.key, c.label, c.description]),
    ...Object.values(STATUS_LABELS),
    ...Object.values(OVERALL_LABELS),
  ];
  for (const s of publicStrings) {
    assert.ok(!vendorNames.test(s), `vendor name leaked into public copy: "${s}"`);
  }
});

test("roster keys are unique and stable-format", () => {
  const keys = STATUS_COMPONENT_ROSTER.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^[a-z][a-z_]+$/);
});
