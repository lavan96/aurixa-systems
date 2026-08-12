/**
 * Support assistant — pure rules for the /support screening gateway.
 *
 * The chat panel in front of the ticket form talks to the `support-assistant`
 * edge function (Mission Control's User Guide assistant). This module owns the
 * contract-shaped payload, the only formatter the panel is allowed to render
 * an answer through, and the ticket prefill built from a conversation.
 *
 * Two rules the shapes here enforce:
 *  - the assistant's `answer_markdown` is plain text with `**bold**` and
 *    "- " lists only. `renderAssistantText` turns it into a structure the
 *    component renders literally — nothing here (or downstream) ever
 *    interprets it as HTML, so a `<script>` in an answer stays six literal
 *    characters and an angle bracket on a client's screen.
 *  - links come ONLY from `sections[].url`. `parseGuideSections` drops any
 *    section whose url is not a credential-free http(s) URL, so the anchor
 *    the component renders can never carry a `javascript:` payload.
 *
 * Pure module — no `import.meta.env`, no browser globals — so the Node test
 * runner can exercise every rule directly.
 */

import { MAX_DESCRIPTION, MAX_SUBJECT, MIN_SUBJECT } from "./supportTicket";

// ── Contract bounds (support-assistant edge function, action "ask") ─────────

export const MIN_ASSISTANT_MESSAGE = 2;
export const MAX_ASSISTANT_MESSAGE = 1000;
export const MAX_HISTORY_TURNS = 6;
export const MAX_HISTORY_CONTENT = 1200;
export const MAX_CONTEXT_ID = 120;
export const MAX_SECTION_SNIPPET = 200;

// ── Shapes ───────────────────────────────────────────────────────────────────

export type AssistantRole = "user" | "assistant";

export type AssistantTurn = { role: AssistantRole; content: string };

/** What the page knows about the visitor (from the dashboard's URL params). */
export type AssistantContext = {
  workspace_id?: string;
  user_id?: string;
  source: "npc-dashboard" | "direct";
  dashboard_url?: string;
};

export type SupportAssistantAskPayload = {
  action: "ask";
  message: string;
  history?: AssistantTurn[];
  context: AssistantContext;
};

/** How the assistant produced an answer. Only fed back into the feedback ping. */
export const ASSISTANT_MODES = ["model", "retrieval", "no_match", "escalate"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

/** A User Guide section cited under an answer. `url` is the only link source. */
export type GuideSection = {
  id: string;
  title: string;
  section_title: string;
  anchor: string;
  url: string;
  snippet: string;
};

export type TicketPrefill = { subject: string; description: string };

// ── Outbound payload ─────────────────────────────────────────────────────────

/**
 * The dashboard link may carry a `dashboard_url`; the contract wants an https
 * origin. Anything that does not parse, is not https, or smuggles credentials
 * is omitted rather than sent — a rejected context must never be the reason a
 * question goes unanswered.
 */
export function normaliseDashboardUrl(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:") return undefined;
  if (parsed.username || parsed.password) return undefined;
  return parsed.origin;
}

/**
 * Builds the exact JSON the ask endpoint expects: trimmed message clamped to
 * the contract's 1000 characters, the last six non-empty history turns each
 * clamped to 1200, and a context carrying only keys that hold a value.
 */
export function buildAskPayload(
  message: string,
  history: AssistantTurn[],
  context: AssistantContext,
): SupportAssistantAskPayload {
  const payload: SupportAssistantAskPayload = {
    action: "ask",
    message: message.trim().slice(0, MAX_ASSISTANT_MESSAGE),
    context: { source: context.source === "npc-dashboard" ? "npc-dashboard" : "direct" },
  };

  const turns = history
    .filter((turn) => turn.role === "user" || turn.role === "assistant")
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, MAX_HISTORY_CONTENT),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-MAX_HISTORY_TURNS);
  if (turns.length > 0) payload.history = turns;

  const workspaceId = (context.workspace_id ?? "").trim().slice(0, MAX_CONTEXT_ID);
  if (workspaceId) payload.context.workspace_id = workspaceId;

  const userId = (context.user_id ?? "").trim().slice(0, MAX_CONTEXT_ID);
  if (userId) payload.context.user_id = userId;

  const dashboardUrl = normaliseDashboardUrl(context.dashboard_url);
  if (dashboardUrl) payload.context.dashboard_url = dashboardUrl;

  return payload;
}

// ── Inbound: answer text formatter ───────────────────────────────────────────

export type AssistantTextPart = { bold: boolean; text: string };
export type AssistantTextBlock = { kind: "p" | "li"; parts: AssistantTextPart[] };

/**
 * `**bold**` spans within one line. Split on the marker: even segments are
 * plain, odd segments are bold — unless the final marker was never closed, in
 * which case it is restored and rendered literally rather than guessed at.
 */
function parseInlineParts(text: string): AssistantTextPart[] {
  const segments = text.split("**");
  const balanced = segments.length % 2 === 1;
  const parts: AssistantTextPart[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    let segment = segments[i];
    let bold = i % 2 === 1;
    if (bold && !balanced && i === segments.length - 1) {
      segment = `**${segment}`;
      bold = false;
    }
    if (!segment) continue;
    const previous = parts[parts.length - 1];
    if (previous && previous.bold === bold) previous.text += segment;
    else parts.push({ bold, text: segment });
  }
  return parts;
}

/**
 * The only rendering path for `answer_markdown`. Lines become paragraphs,
 * "- " lines become list items, `**bold**` becomes a bold part — and every
 * other character survives as literal text. There is deliberately no HTML
 * handling here: the component renders exclusively from this structure, which
 * is what makes an answer containing markup inert.
 */
export function renderAssistantText(markdown: string): AssistantTextBlock[] {
  const blocks: AssistantTextBlock[] = [];
  for (const rawLine of (markdown ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      if (item) blocks.push({ kind: "li", parts: parseInlineParts(item) });
      continue;
    }
    blocks.push({ kind: "p", parts: parseInlineParts(line) });
  }
  return blocks;
}

// ── Inbound: sections and mode ───────────────────────────────────────────────

/** Anchor-safe: parses, is http(s), and carries no username or password. */
export function isSafeSectionUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.username || parsed.password) return false;
  return true;
}

const cleanString = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Defensive parse of `sections` from the response body. A section without a
 * safe url is dropped entirely — it exists to be linked, and a link we will
 * not render is a citation we cannot honour.
 */
export function parseGuideSections(raw: unknown): GuideSection[] {
  if (!Array.isArray(raw)) return [];
  const sections: GuideSection[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    if (!isSafeSectionUrl(candidate.url)) continue;
    sections.push({
      id: cleanString(candidate.id, 120),
      title: cleanString(candidate.title, 200),
      section_title: cleanString(candidate.section_title, 200),
      anchor: cleanString(candidate.anchor, 200),
      url: candidate.url,
      snippet: cleanString(candidate.snippet, MAX_SECTION_SNIPPET),
    });
  }
  return sections;
}

/** An unknown mode is not an error — it only labels the feedback ping. */
export function parseAssistantMode(value: unknown): AssistantMode {
  return ASSISTANT_MODES.includes(value as AssistantMode) ? (value as AssistantMode) : "model";
}

// ── Ticket prefill ───────────────────────────────────────────────────────────

export const PREFILL_FALLBACK_SUBJECT = "Support request";
export const PREFILL_HEADER = "Raised after consulting the support assistant.";

/**
 * Turns the conversation into a ticket the form can submit unedited: the
 * first user message becomes the subject (fallback when too short to satisfy
 * the ticket contract's minimum), and the transcript becomes the description
 * under a header line. The header alone clears `supportTicket.ts`'s
 * MIN_DESCRIPTION, so an empty conversation still prefill-validates.
 */
export function buildTicketPrefill(conversation: AssistantTurn[]): TicketPrefill {
  const firstUser = conversation.find(
    (turn) => turn.role === "user" && turn.content.trim().length > 0,
  );
  const flattened = (firstUser?.content ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SUBJECT)
    .trim();
  const subject = flattened.length >= MIN_SUBJECT ? flattened : PREFILL_FALLBACK_SUBJECT;

  const lines = conversation
    .filter((turn) => turn.content.trim().length > 0)
    .map((turn) => `${turn.role === "user" ? "You" : "Assistant"}: ${turn.content.trim()}`);
  const description = [PREFILL_HEADER, ...(lines.length > 0 ? ["", ...lines] : [])]
    .join("\n")
    .slice(0, MAX_DESCRIPTION);

  return { subject, description };
}
