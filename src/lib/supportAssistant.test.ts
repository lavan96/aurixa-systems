import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_ASSISTANT_MESSAGE,
  MAX_HISTORY_CONTENT,
  MAX_HISTORY_TURNS,
  MAX_SECTION_SNIPPET,
  PREFILL_FALLBACK_SUBJECT,
  PREFILL_HEADER,
  buildAskPayload,
  buildTicketPrefill,
  normaliseDashboardUrl,
  parseAssistantMode,
  parseGuideSections,
  renderAssistantText,
  type AssistantContext,
  type AssistantTurn,
} from "./supportAssistant";
import {
  MAX_DESCRIPTION,
  MAX_SUBJECT,
  MIN_DESCRIPTION,
  validateSupportTicket,
  type SupportTicketValues,
} from "./supportTicket";

const CONTEXT: AssistantContext = {
  workspace_id: "ws_01HZX4T9",
  user_id: "usr_42",
  source: "npc-dashboard",
  dashboard_url: "https://dashboard.npcservices.com.au/reports",
};

const turn = (role: AssistantTurn["role"], content: string): AssistantTurn => ({ role, content });

// ── buildAskPayload ──────────────────────────────────────────────────────────

test("message is trimmed and clamped to the contract's 1000 characters", () => {
  const payload = buildAskPayload("  how do I export a report?  ", [], CONTEXT);
  assert.equal(payload.action, "ask");
  assert.equal(payload.message, "how do I export a report?");

  const long = buildAskPayload("q".repeat(MAX_ASSISTANT_MESSAGE + 500), [], CONTEXT);
  assert.equal(long.message.length, MAX_ASSISTANT_MESSAGE);
});

test("history keeps only the last 6 non-empty turns, each clamped to 1200", () => {
  const history: AssistantTurn[] = [];
  for (let i = 0; i < 10; i += 1) {
    history.push(turn(i % 2 === 0 ? "user" : "assistant", `turn ${i} ${"x".repeat(1500)}`));
  }
  const payload = buildAskPayload("next question", history, CONTEXT);
  assert.ok(payload.history);
  assert.equal(payload.history.length, MAX_HISTORY_TURNS);
  assert.equal(payload.history[0].content.startsWith("turn 4"), true);
  for (const kept of payload.history) {
    assert.ok(kept.content.length <= MAX_HISTORY_CONTENT);
    assert.ok(kept.role === "user" || kept.role === "assistant");
  }
});

test("history is omitted when empty, and empty turns are dropped", () => {
  assert.equal(buildAskPayload("hello there", [], CONTEXT).history, undefined);
  assert.equal(
    buildAskPayload("hello there", [turn("user", "   "), turn("assistant", "")], CONTEXT).history,
    undefined,
  );
  const mixed = buildAskPayload(
    "hello there",
    [turn("user", "  real question  "), turn("assistant", " \n ")],
    CONTEXT,
  );
  assert.deepEqual(mixed.history, [{ role: "user", content: "real question" }]);
});

test("context drops empty keys and clamps identifiers to 120", () => {
  const payload = buildAskPayload("hello there", [], {
    workspace_id: "  ",
    user_id: "u".repeat(200),
    source: "direct",
  });
  assert.equal(payload.context.workspace_id, undefined);
  assert.equal(payload.context.user_id, "u".repeat(120));
  assert.equal(payload.context.source, "direct");
  assert.equal(payload.context.dashboard_url, undefined);
});

test("an unrecognised source is sent as direct, never invented", () => {
  const payload = buildAskPayload("hello there", [], {
    source: "npc-dashboard",
  });
  assert.equal(payload.context.source, "npc-dashboard");
  const sneaky = buildAskPayload("hello there", [], {
    source: "elsewhere" as AssistantContext["source"],
  });
  assert.equal(sneaky.context.source, "direct");
});

test("dashboard_url must be a credential-free https URL, else omitted", () => {
  // A valid https URL is normalised to its origin (the contract wants an origin).
  assert.equal(
    normaliseDashboardUrl("https://dashboard.npcservices.com.au/reports?tab=1"),
    "https://dashboard.npcservices.com.au",
  );
  assert.equal(normaliseDashboardUrl("http://dashboard.npcservices.com.au"), undefined);
  assert.equal(normaliseDashboardUrl("javascript:alert(1)"), undefined);
  assert.equal(normaliseDashboardUrl("https://user:pw@dashboard.npcservices.com.au"), undefined);
  assert.equal(normaliseDashboardUrl("https://user@dashboard.npcservices.com.au"), undefined);
  assert.equal(normaliseDashboardUrl("not a url at all"), undefined);
  assert.equal(normaliseDashboardUrl(""), undefined);
  assert.equal(normaliseDashboardUrl(undefined), undefined);

  const payload = buildAskPayload("hello there", [], {
    ...CONTEXT,
    dashboard_url: "javascript:alert(1)",
  });
  assert.equal(payload.context.dashboard_url, undefined);

  const good = buildAskPayload("hello there", [], CONTEXT);
  assert.equal(good.context.dashboard_url, "https://dashboard.npcservices.com.au");
});

// ── renderAssistantText ──────────────────────────────────────────────────────

test("plain lines become paragraphs and blank lines are skipped", () => {
  assert.deepEqual(renderAssistantText("First line.\n\nSecond line.\r\n"), [
    { kind: "p", parts: [{ bold: false, text: "First line." }] },
    { kind: "p", parts: [{ bold: false, text: "Second line." }] },
  ]);
  assert.deepEqual(renderAssistantText(""), []);
  assert.deepEqual(renderAssistantText("   \n  "), []);
});

test("dash-prefixed lines become list items", () => {
  assert.deepEqual(renderAssistantText("Steps:\n- Open Reports\n- Pick a client"), [
    { kind: "p", parts: [{ bold: false, text: "Steps:" }] },
    { kind: "li", parts: [{ bold: false, text: "Open Reports" }] },
    { kind: "li", parts: [{ bold: false, text: "Pick a client" }] },
  ]);
});

test("**bold** spans are parsed into bold parts", () => {
  assert.deepEqual(renderAssistantText("Open the **Reports** tab"), [
    {
      kind: "p",
      parts: [
        { bold: false, text: "Open the " },
        { bold: true, text: "Reports" },
        { bold: false, text: " tab" },
      ],
    },
  ]);
  assert.deepEqual(renderAssistantText("- Use **Save** to finish"), [
    {
      kind: "li",
      parts: [
        { bold: false, text: "Use " },
        { bold: true, text: "Save" },
        { bold: false, text: " to finish" },
      ],
    },
  ]);
});

test("an unclosed bold marker is rendered literally, not guessed at", () => {
  assert.deepEqual(renderAssistantText("this is **not closed"), [
    { kind: "p", parts: [{ bold: false, text: "this is **not closed" }] },
  ]);
});

test("HTML never passes through — a literal <script> stays literal text", () => {
  const blocks = renderAssistantText('<script>alert("x")</script> & <b>markup</b>');
  assert.deepEqual(blocks, [
    {
      kind: "p",
      parts: [{ bold: false, text: '<script>alert("x")</script> & <b>markup</b>' }],
    },
  ]);
});

// ── parseGuideSections ───────────────────────────────────────────────────────

test("sections without a safe http(s) url are dropped", () => {
  const sections = parseGuideSections([
    { id: "a", title: "Reports", section_title: "Exporting", anchor: "#exp", url: "https://guide.npc.com.au/reports#exp", snippet: "How to export." },
    { id: "b", title: "Bad", url: "javascript:alert(1)" },
    { id: "c", title: "Creds", url: "https://user:pw@guide.npc.com.au" },
    { id: "d", title: "No url" },
    "not an object",
    null,
  ]);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].id, "a");
  assert.equal(sections[0].url, "https://guide.npc.com.au/reports#exp");
});

test("section snippets are clamped to the contract's 200 characters", () => {
  const sections = parseGuideSections([
    { id: "a", url: "https://guide.npc.com.au", snippet: "s".repeat(400) },
  ]);
  assert.equal(sections[0].snippet.length, MAX_SECTION_SNIPPET);
  assert.equal(sections[0].title, "");
});

test("a non-array sections field parses to an empty list", () => {
  assert.deepEqual(parseGuideSections(undefined), []);
  assert.deepEqual(parseGuideSections("nope"), []);
  assert.deepEqual(parseGuideSections({}), []);
});

// ── parseAssistantMode ───────────────────────────────────────────────────────

test("known modes pass through and anything else falls back to model", () => {
  assert.equal(parseAssistantMode("retrieval"), "retrieval");
  assert.equal(parseAssistantMode("no_match"), "no_match");
  assert.equal(parseAssistantMode("escalate"), "escalate");
  assert.equal(parseAssistantMode("model"), "model");
  assert.equal(parseAssistantMode("something_new"), "model");
  assert.equal(parseAssistantMode(undefined), "model");
});

// ── buildTicketPrefill ───────────────────────────────────────────────────────

/** A valid ticket to graft prefill output onto for bound checks. */
const TICKET_BASE: SupportTicketValues = {
  workspaceId: "ws_01HZX4T9",
  userId: "usr_42",
  reporterName: "Priya Naidu",
  reporterEmail: "priya@npcservices.com.au",
  category: "question",
  breakageVector: "none",
  subject: "placeholder subject",
  description: "placeholder description long enough to pass",
  impact: "",
  website: "",
};

const prefillValidates = (prefill: { subject: string; description: string }) => {
  const errors = validateSupportTicket({
    ...TICKET_BASE,
    subject: prefill.subject,
    description: prefill.description,
  });
  assert.equal(errors.subject, undefined);
  assert.equal(errors.description, undefined);
};

test("an empty conversation still produces a valid prefill", () => {
  const prefill = buildTicketPrefill([]);
  assert.equal(prefill.subject, PREFILL_FALLBACK_SUBJECT);
  assert.equal(prefill.description, PREFILL_HEADER);
  assert.ok(prefill.description.trim().length >= MIN_DESCRIPTION);
  prefillValidates(prefill);
});

test("subject comes from the first user message, whitespace collapsed", () => {
  const prefill = buildTicketPrefill([
    turn("user", "  How do I\n change my  email?  "),
    turn("assistant", "You can't — raise a ticket."),
  ]);
  assert.equal(prefill.subject, "How do I change my email?");
  assert.ok(prefill.description.startsWith(PREFILL_HEADER));
  // The transcript keeps what was actually said (trimmed), newlines intact.
  assert.ok(prefill.description.includes("You: How do I\n change my  email?"));
  assert.ok(prefill.description.includes("Assistant: You can't — raise a ticket."));
  prefillValidates(prefill);
});

test("a too-short first message falls back to the default subject", () => {
  const prefill = buildTicketPrefill([turn("user", "hi"), turn("assistant", "Hello!")]);
  assert.equal(prefill.subject, PREFILL_FALLBACK_SUBJECT);
  prefillValidates(prefill);
});

test("an overlong first message is clamped to the ticket subject bound", () => {
  const prefill = buildTicketPrefill([turn("user", "w".repeat(500))]);
  assert.equal(prefill.subject.length, MAX_SUBJECT);
  prefillValidates(prefill);
});

test("a huge conversation clamps the description to the ticket bound", () => {
  const conversation: AssistantTurn[] = [];
  for (let i = 0; i < 40; i += 1) {
    conversation.push(turn("user", `question ${i} ${"q".repeat(300)}`));
    conversation.push(turn("assistant", `answer ${i} ${"a".repeat(300)}`));
  }
  const prefill = buildTicketPrefill(conversation);
  assert.equal(prefill.description.length, MAX_DESCRIPTION);
  assert.ok(prefill.description.startsWith(PREFILL_HEADER));
  assert.ok(prefill.description.includes("You: question 0"));
  assert.ok(prefill.description.includes("Assistant: answer 0"));
  prefillValidates(prefill);
});

test("assistant-only turns never become the subject", () => {
  const prefill = buildTicketPrefill([turn("assistant", "An orphaned answer somehow")]);
  assert.equal(prefill.subject, PREFILL_FALLBACK_SUBJECT);
  assert.ok(prefill.description.includes("Assistant: An orphaned answer somehow"));
  prefillValidates(prefill);
});
