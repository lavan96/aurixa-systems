/**
 * Render the entire documentation corpus to a single self-contained HTML file.
 *
 * This is a REVIEW artefact, not a shipping surface: it renders every section
 * unlocked so the content can be read end to end, and annotates each one with
 * the plan that would actually unlock it in production. It reads the same
 * corpus the edge function serves, so what you review is what customers get.
 *
 *   npx tsx scripts/render-docs-preview.ts > /tmp/docs-preview.html
 */

import { DOCS_SECTIONS } from "../supabase/functions/_shared/docsCorpus.ts";
import { DOCS_GROUPS } from "../supabase/functions/_shared/docsTypes.ts";
import type { DocsBlock, DocsSection } from "../supabase/functions/_shared/docsTypes.ts";

const MODULE_TIERS: Record<string, readonly string[]> = {
  "market-updates": ["growth", "scale"],
  "commercial-industrial": ["scale"],
  "opportunity-marketplace": ["scale"],
  "intelligence-hub": [],
  "report-comparisons": ["growth", "scale"],
  "cashflow-comparisons": ["growth", "scale"],
  "email-copilot": [],
  "call-logs": [],
  "portfolio-analysis": ["scale"],
  "send-portfolio": ["scale"],
  "client-forms": ["launch", "growth", "scale"],
  "borrowing-capacity": ["scale"],
  lenders: [],
  "client-ai": ["scale"],
  agreements: ["scale"],
  marketing: ["scale"],
  "deal-pipeline": ["growth", "scale"],
  "aml-ctf": ["launch", "growth", "scale"],
  "model-hub": ["scale"],
  "finance-portal": ["scale"],
  integrations: [],
  "api-usage": ["scale"],
  "aurixa-agent": [],
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function availability(moduleSlug: string | null): { label: string; tone: "base" | "tier" | "addon" } {
  if (!moduleSlug) return { label: "All plans", tone: "base" };
  const tiers = MODULE_TIERS[moduleSlug];
  if (!tiers) return { label: "All plans", tone: "base" };
  if (tiers.length === 0) return { label: "Add-on purchase", tone: "addon" };
  if (tiers.length === 3) return { label: "All plans", tone: "base" };
  if (tiers.includes("growth")) return { label: "Growth and above", tone: "tier" };
  return { label: "Scale only", tone: "tier" };
}

function renderBlock(block: DocsBlock): string {
  switch (block.kind) {
    case "prose":
      return `<p>${esc(block.text)}</p>`;
    case "steps":
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<ol class="steps">${block.items
        .map((i) => `<li>${esc(i)}</li>`)
        .join("")}</ol>`;
    case "list":
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<ul class="ticks">${block.items
        .map((i) => `<li>${esc(i)}</li>`)
        .join("")}</ul>`;
    case "fields":
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<div class="fields">${block.rows
        .map(
          (r) =>
            `<div class="row"><div class="k">${esc(r.name)}</div><div class="v">${esc(r.detail)}</div></div>`,
        )
        .join("")}</div>`;
    case "note": {
      const label =
        block.tone === "tip" ? "Tip" : block.tone === "warning" ? "Take care" : "Compliance";
      return `<aside class="note ${block.tone}"><span class="note-label">${label}</span><p>${esc(
        block.text,
      )}</p></aside>`;
    }
    case "subsection":
      return `<section class="sub"><h3>${esc(block.title)}</h3>${block.blocks
        .map(renderBlock)
        .join("")}</section>`;
    default:
      return "";
  }
}

function renderSection(s: DocsSection): string {
  const a = availability(s.moduleSlug);
  return `
  <article id="${s.slug}" class="doc">
    <header class="doc-head">
      <h2>${esc(s.title)}</h2>
      <div class="meta">
        <span class="badge ${a.tone}">${a.label}</span>
        <span class="read">${s.readMinutes} min</span>
        ${s.moduleSlug ? `<code class="slug">${esc(s.moduleSlug)}</code>` : ""}
      </div>
    </header>
    <p class="summary">${esc(s.summary)}</p>
    <div class="body">${s.blocks.map(renderBlock).join("")}</div>
  </article>`;
}

const totalWords = DOCS_SECTIONS.reduce((n, s) => n + JSON.stringify(s.blocks).split(/\s+/).length, 0);
const gated = DOCS_SECTIONS.filter((s) => s.moduleSlug).length;

const nav = DOCS_GROUPS.map((g) => {
  const items = DOCS_SECTIONS.filter((s) => s.group === g.heading);
  if (!items.length) return "";
  return `<div class="nav-group"><p class="nav-head">${esc(g.heading)}</p><ul>${items
    .map((s) => {
      const a = availability(s.moduleSlug);
      return `<li><a href="#${s.slug}">${esc(s.title)}${
        a.tone !== "base" ? `<span class="dot ${a.tone}"></span>` : ""
      }</a></li>`;
    })
    .join("")}</ul></div>`;
}).join("");

const body = DOCS_GROUPS.map((g) => {
  const items = DOCS_SECTIONS.filter((s) => s.group === g.heading);
  if (!items.length) return "";
  return `<section class="group"><header class="group-head"><h1>${esc(g.heading)}</h1><p>${esc(
    g.blurb,
  )}</p></header>${items.map(renderSection).join("")}</section>`;
}).join("");

process.stdout.write(`<div class="page">
<header class="masthead">
  <p class="eyebrow">Aurixa Systems — internal review copy</p>
  <h1 class="title">Command Center<br><em>Documentation.</em></h1>
  <p class="lede">Every section of the documentation corpus, rendered unlocked. In production each section is gated by plan and add-on entitlement; the badge on each one shows what would unlock it.</p>
  <div class="stats">
    <div><strong>${DOCS_SECTIONS.length}</strong><span>sections</span></div>
    <div><strong>${DOCS_GROUPS.length}</strong><span>groups</span></div>
    <div><strong>${gated}</strong><span>entitlement-gated</span></div>
    <div><strong>~${Math.round(totalWords / 100) / 10}k</strong><span>words</span></div>
  </div>
  <div class="legend">
    <span><i class="dot base"></i>All plans — always readable</span>
    <span><i class="dot tier"></i>Tier-gated — Growth or Scale</span>
    <span><i class="dot addon"></i>Add-on — bought separately</span>
  </div>
</header>
<div class="shell">
  <nav class="contents" aria-label="Contents"><p class="nav-title">Contents</p>${nav}</nav>
  <main>${body}</main>
</div>
</div>

<style>
  :root {
    --ground: #040B16;
    --ink: #FFFFFF;
    --body: #9CA3AF;
    --muted: #7A879B;
    --teal: #00A8B5;
    --gold: #C89B3C;
    --line: rgba(0,168,181,0.18);
    --panel: rgba(0,168,181,0.03);
    --display: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  .page {
    background: var(--ground);
    color: var(--body);
    font-family: var(--display);
    font-weight: 300;
    line-height: 1.7;
    margin: 0;
    padding: 0 24px 120px;
  }
  .masthead { max-width: 760px; margin: 0 auto; padding: 72px 0 56px; text-align: center; }
  .eyebrow {
    font-family: var(--mono); font-size: 10px; letter-spacing: .3em;
    text-transform: uppercase; color: rgba(0,168,181,.7); margin: 0 0 24px;
  }
  .title {
    font-size: clamp(2.6rem, 6vw, 4.4rem); font-weight: 200; line-height: 1.05;
    color: var(--ink); margin: 0 0 24px; letter-spacing: -.02em; text-wrap: balance;
  }
  .title em { font-style: italic; color: var(--teal); }
  .lede { font-size: 1.05rem; margin: 0 auto 40px; max-width: 62ch; }
  .stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px; margin-bottom: 36px; }
  .stats div { display: flex; flex-direction: column; }
  .stats strong {
    font-size: 1.9rem; font-weight: 200; color: var(--ink);
    font-variant-numeric: tabular-nums; line-height: 1.1;
  }
  .stats span {
    font-family: var(--mono); font-size: 10px; letter-spacing: .18em;
    text-transform: uppercase; color: var(--muted); margin-top: 6px;
  }
  .legend {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 22px;
    font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 24px;
  }
  .legend span { display: inline-flex; align-items: center; gap: 8px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex: none; }
  .dot.base { background: var(--teal); }
  .dot.tier { background: var(--gold); }
  .dot.addon { background: transparent; border: 1px solid var(--gold); }

  .shell { display: grid; grid-template-columns: 232px minmax(0,1fr); gap: 56px; max-width: 1140px; margin: 0 auto; }
  @media (max-width: 900px) { .shell { grid-template-columns: 1fr; gap: 24px; } .contents { position: static !important; max-height: none !important; } }

  .contents { position: sticky; top: 24px; align-self: start; max-height: calc(100vh - 48px); overflow-y: auto; padding-right: 8px; }
  .nav-title, .nav-head {
    font-family: var(--mono); font-size: 10px; letter-spacing: .25em;
    text-transform: uppercase; color: rgba(0,168,181,.65); margin: 0 0 10px;
  }
  .nav-head { color: var(--ink); opacity: .85; letter-spacing: .16em; margin-top: 22px; }
  .contents ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .contents a {
    color: #94A3B8; text-decoration: none; font-size: 13px; line-height: 1.5;
    display: flex; align-items: center; gap: 7px; padding: 3px 0;
  }
  .contents a:hover, .contents a:focus-visible { color: var(--teal); }
  .contents a:focus-visible { outline: 1px solid var(--teal); outline-offset: 3px; }

  .group { margin-bottom: 88px; }
  .group-head { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 44px; }
  .group-head h1 { font-size: 2rem; font-weight: 200; color: var(--ink); margin: 0 0 8px; letter-spacing: -.01em; }
  .group-head p { margin: 0; max-width: 62ch; }

  .doc { margin-bottom: 64px; scroll-margin-top: 24px; }
  .doc-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 14px; margin-bottom: 10px; }
  .doc-head h2 { font-size: 1.5rem; font-weight: 300; color: var(--ink); margin: 0; letter-spacing: -.01em; }
  .meta { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge {
    font-family: var(--mono); font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase;
    padding: 3px 8px; border: 1px solid; border-radius: 2px;
  }
  .badge.base { color: var(--teal); border-color: rgba(0,168,181,.35); }
  .badge.tier, .badge.addon { color: var(--gold); border-color: rgba(200,155,60,.4); }
  .read, .slug { font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .1em; }
  .slug { opacity: .7; }
  .summary { color: #B6C0CE; margin: 0 0 22px; max-width: 66ch; }

  .body { max-width: 68ch; }
  .body p { margin: 0 0 18px; }
  .body h4 {
    font-size: 12px; font-weight: 400; letter-spacing: .18em; text-transform: uppercase;
    color: var(--ink); margin: 26px 0 12px;
  }
  .sub { border-left: 1px solid var(--line); padding-left: 22px; margin: 28px 0; }
  .sub h3 { font-size: 1.1rem; font-weight: 300; color: var(--ink); margin: 0 0 14px; }

  ol.steps { counter-reset: s; list-style: none; margin: 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 11px; }
  ol.steps li { counter-increment: s; position: relative; padding-left: 38px; }
  ol.steps li::before {
    content: counter(s, decimal-leading-zero); position: absolute; left: 0; top: 1px;
    font-family: var(--mono); font-size: 11px; color: rgba(200,155,60,.8); font-variant-numeric: tabular-nums;
  }
  ul.ticks { list-style: none; margin: 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  ul.ticks li { position: relative; padding-left: 22px; }
  ul.ticks li::before {
    content: ""; position: absolute; left: 2px; top: .72em; width: 5px; height: 5px;
    border-radius: 50%; background: rgba(0,168,181,.55);
  }

  .fields { border: 1px solid var(--line); border-radius: 3px; margin: 0 0 22px; overflow-x: auto; }
  .fields .row { display: grid; grid-template-columns: minmax(0,13rem) minmax(0,1fr); gap: 24px; padding: 13px 18px; }
  .fields .row:nth-child(odd) { background: var(--panel); }
  @media (max-width: 620px) { .fields .row { grid-template-columns: 1fr; gap: 4px; } }
  .fields .k { color: var(--ink); font-size: .92rem; }
  .fields .v { font-size: .92rem; }

  .note { border: 1px solid; border-radius: 3px; padding: 15px 18px; margin: 0 0 22px; }
  .note p { margin: 0; font-size: .93rem; }
  .note-label {
    display: block; font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em;
    text-transform: uppercase; margin-bottom: 7px;
  }
  .note.tip { border-color: rgba(0,168,181,.28); background: rgba(0,168,181,.04); }
  .note.tip .note-label { color: var(--teal); }
  .note.warning { border-color: rgba(200,155,60,.32); background: rgba(200,155,60,.045); }
  .note.warning .note-label { color: var(--gold); }
  .note.compliance { border-color: rgba(0,168,181,.28); background: rgba(4,11,22,.6); }
  .note.compliance .note-label { color: var(--teal); }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>`);
