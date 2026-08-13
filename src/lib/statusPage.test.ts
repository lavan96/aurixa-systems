import { strict as assert } from "node:assert";
import test from "node:test";
import {
  COMPONENT_STATUSES,
  FALLBACK_COMPONENT_LABEL,
  OVERALL_LABELS,
  STATUS_COMPONENT_ROSTER,
  STATUS_LABELS,
  computeOverall,
  historyBarTitle,
  isComponentStatus,
  normalizeSummaryPayload,
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

test("a day is unknown only when nothing that day was readable", () => {
  // One failed read among healthy polls must not grey out the whole day…
  assert.deepEqual(
    rollupDaily([
      { date: "2026-08-13", status: "operational" },
      { date: "2026-08-13", status: "unknown" },
      { date: "2026-08-13", status: "operational" },
    ]),
    [{ date: "2026-08-13", status: "operational" }],
  );
  // …a confirmed problem still beats everything…
  assert.deepEqual(
    rollupDaily([
      { date: "2026-08-13", status: "unknown" },
      { date: "2026-08-13", status: "degraded" },
      { date: "2026-08-13", status: "operational" },
    ]),
    [{ date: "2026-08-13", status: "degraded" }],
  );
  // …and a fully unreadable day is honestly unknown.
  assert.deepEqual(
    rollupDaily([{ date: "2026-08-13", status: "unknown" }]),
    [{ date: "2026-08-13", status: "unknown" }],
  );
});

test("no vendor is ever named in public-facing status copy", () => {
  // The entire point of the roster: roles, not vendors. If a vendor name
  // sneaks into a label, description, key, or shared status copy, the
  // anonymity requirement is broken and this must go red.
  const vendorNames =
    /supabase|cloudflare|vercel|github|openai|anthropic|gemini|google|stripe|resend|twilio|aws|amazon|azure|statuspage|instatus/i;
  const publicStrings = [
    ...STATUS_COMPONENT_ROSTER.flatMap((c) => [c.key, c.label, c.description, ...c.affects]),
    ...Object.values(STATUS_LABELS),
    ...Object.values(OVERALL_LABELS),
    FALLBACK_COMPONENT_LABEL,
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

test("roster labels are distinct roles, not one repeated template", () => {
  // The first cut suffixed every label with "Provider" and the page read as
  // the same row seven times. Labels must be unique and must not all share
  // a trailing word.
  const labels = STATUS_COMPONENT_ROSTER.map((c) => c.label);
  assert.equal(new Set(labels).size, labels.length);
  const lastWords = new Set(labels.map((l) => l.split(" ").pop()?.toLowerCase()));
  assert.ok(lastWords.size > 1, "every roster label ends in the same word");
  for (const entry of STATUS_COMPONENT_ROSTER) {
    assert.ok(entry.description.length >= 40, `description too thin for ${entry.key}`);
    assert.ok(entry.affects.length >= 1, `no affected features listed for ${entry.key}`);
  }
});

test("normalizeSummaryPayload joins roster copy by key", () => {
  // Regression: the server sends keys and statuses, never labels. The first
  // deploy forgot the join, so every LIVE row rendered as the generic
  // fallback while only the prerendered skeleton showed real labels.
  const result = normalizeSummaryPayload({
    ok: true,
    overall: "degraded",
    checked_at: "2026-08-13T12:25:01Z",
    stale: false,
    components: [
      {
        key: "backend",
        status: "operational",
        checked_at: "2026-08-13T12:25:01Z",
        uptime: 100,
        since: "2026-08-13T12:11:05Z",
        history: [{ date: "2026-08-13", status: "operational" }],
      },
      { key: "security_delivery", status: "degraded", checked_at: null, history: [] },
    ],
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.overall_label, OVERALL_LABELS.degraded);
  const backend = result.components[0];
  assert.equal(backend.label, "Backend platform");
  assert.notEqual(backend.label, FALLBACK_COMPONENT_LABEL);
  assert.ok(backend.description.length > 0);
  assert.ok(backend.affects.length > 0);
  assert.equal(backend.uptime, 100);
  assert.equal(backend.since, "2026-08-13T12:11:05Z");
  const edge = result.components[1];
  assert.equal(edge.label, "Edge security & delivery");
  assert.equal(edge.status_label, STATUS_LABELS.degraded);
  assert.equal(edge.uptime, null);
});

test("history bar tooltips distinguish reconstructed days from observed ones", () => {
  const observedSince = "2026-08-13T12:11:05Z";
  // A day before our first poll came from the provider's published record.
  const reconstructed = historyBarTitle("2026-08-01", "degraded", observedSince);
  assert.ok(reconstructed.includes("published history"), reconstructed);
  // Days we polled ourselves carry no qualifier — and neither does anything
  // when we do not know where observation began.
  assert.equal(historyBarTitle("2026-08-13", "operational", observedSince), "2026-08-13 — Operational");
  assert.equal(historyBarTitle("2026-08-20", "degraded", observedSince), "2026-08-20 — Degraded performance");
  assert.equal(historyBarTitle("2026-08-01", "degraded", null), "2026-08-01 — Degraded performance");
  // The qualifier is public copy: it must never name a vendor.
  assert.ok(!/supabase|cloudflare|vercel|github|openai|stripe/i.test(reconstructed));
});

test("normalizeSummaryPayload degrades malformed input without breaking", () => {
  assert.deepEqual(normalizeSummaryPayload(null), { ok: false });
  assert.deepEqual(normalizeSummaryPayload("nope"), { ok: false });
  assert.deepEqual(normalizeSummaryPayload({ ok: false }), { ok: false });
  assert.deepEqual(normalizeSummaryPayload({ ok: true, components: "x" }), { ok: false });

  const result = normalizeSummaryPayload({
    ok: true,
    overall: "made_up",
    components: [
      { key: "mystery_component", status: "down", uptime: "97", history: [{ nope: 1 }, { date: "2026-08-12", status: "weird" }] },
      42,
    ],
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.overall, "unknown");
  assert.equal(result.components.length, 1);
  const mystery = result.components[0];
  assert.equal(mystery.label, FALLBACK_COMPONENT_LABEL);
  assert.equal(mystery.status, "unknown");
  assert.equal(mystery.uptime, null);
  assert.deepEqual(mystery.history, [{ date: "2026-08-12", status: "unknown" }]);
});
