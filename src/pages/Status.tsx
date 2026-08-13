import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { useRouteMetadata } from "../lib/pageMetadata";
import {
  STATUS_COMPONENT_ROSTER,
  STATUS_LABELS,
  type ComponentStatus,
  type StatusComponent,
  type StatusSummary,
} from "../lib/statusPage";
import { fetchStatusSummary, type StatusResult } from "../lib/statusPageClient";

/**
 * /status — live health of the upstream services this product is built on.
 *
 * Every provider is ANONYMIZED to its role: the only strings this page ever
 * renders about a provider come from the shared roster, the response payload
 * and the shared status labels. No vendor is named anywhere in this file —
 * not in copy, not in comments — and `statusPage.test.ts` pins the same rule
 * on the shared vocabulary.
 *
 * The page is prerendered as static markup (header, banner frame, one
 * skeleton row per roster entry); the data arrives client-side on mount and
 * then again every 60 seconds.
 */

const HISTORY_DAYS = 30;
const REFRESH_MS = 60_000;

type StatusStyle = {
  /** The state dot. */
  dot: string;
  /** Soft glow behind the dot, matching its colour. */
  glow: string;
  /** Label text inside the status pill. */
  text: string;
  /** Pill border + wash. */
  pill: string;
  /** History bar fill. */
  bar: string;
  /** Overall banner border tint. */
  banner: string;
};

/**
 * One colour story per status, written out as full literal class strings so
 * Tailwind's scanner sees every one of them. The site has no green/amber
 * tokens, so these are raw hex arbitrary values like the rest of the site.
 */
const STATUS_STYLES: Record<ComponentStatus, StatusStyle> = {
  operational: {
    dot: "bg-[#4ADE80]",
    glow: "shadow-[0_0_14px_rgba(74,222,128,0.55)]",
    text: "text-[#4ADE80]",
    pill: "border-[#4ADE80]/30 bg-[#4ADE80]/[0.08]",
    bar: "bg-[#4ADE80]/90",
    banner: "border-[#4ADE80]/25",
  },
  maintenance: {
    dot: "bg-[#60A5FA]",
    glow: "shadow-[0_0_14px_rgba(96,165,250,0.55)]",
    text: "text-[#60A5FA]",
    pill: "border-[#60A5FA]/30 bg-[#60A5FA]/[0.08]",
    bar: "bg-[#60A5FA]/90",
    banner: "border-[#60A5FA]/25",
  },
  degraded: {
    dot: "bg-[#FBBF24]",
    glow: "shadow-[0_0_14px_rgba(251,191,36,0.55)]",
    text: "text-[#FBBF24]",
    pill: "border-[#FBBF24]/30 bg-[#FBBF24]/[0.08]",
    bar: "bg-[#FBBF24]/90",
    banner: "border-[#FBBF24]/25",
  },
  partial_outage: {
    dot: "bg-[#FB923C]",
    glow: "shadow-[0_0_14px_rgba(251,146,60,0.55)]",
    text: "text-[#FB923C]",
    pill: "border-[#FB923C]/30 bg-[#FB923C]/[0.08]",
    bar: "bg-[#FB923C]/90",
    banner: "border-[#FB923C]/25",
  },
  major_outage: {
    dot: "bg-[#F87171]",
    glow: "shadow-[0_0_14px_rgba(248,113,113,0.55)]",
    text: "text-[#F87171]",
    pill: "border-[#F87171]/30 bg-[#F87171]/[0.08]",
    bar: "bg-[#F87171]/90",
    banner: "border-[#F87171]/25",
  },
  unknown: {
    dot: "bg-[#94A3B8]",
    glow: "shadow-[0_0_14px_rgba(148,163,184,0.4)]",
    text: "text-[#94A3B8]",
    pill: "border-white/15 bg-white/[0.04]",
    bar: "bg-[#94A3B8]/60",
    banner: "border-white/10",
  },
};

/** "42 seconds ago" — for the "Last checked" line under the banner. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatusPill({ status, label }: { status: ComponentStatus; label: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 ${style.pill}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot} ${style.glow}`} />
      <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${style.text}`}>
        {label}
      </span>
    </span>
  );
}

/**
 * The 30-day strip. Oldest on the left, today on the right; days the ledger
 * has not seen yet are left-padded as neutral placeholder cells so every
 * strip is the same width and "Today" always sits under the last real day.
 */
function HistoryBars({
  label,
  history,
}: {
  label: string;
  history: Array<{ date: string; status: ComponentStatus }>;
}) {
  const entries = history.slice(-HISTORY_DAYS);
  const padding = Math.max(0, HISTORY_DAYS - entries.length);
  return (
    <div className="w-fit max-w-full">
      <div className="flex flex-nowrap items-center gap-1" aria-label={`${label} 30 day history`}>
        {Array.from({ length: padding }, (_, index) => (
          <span
            key={`pad-${index}`}
            title="No data"
            className="h-8 w-1.5 rounded-sm bg-white/[0.06]"
          />
        ))}
        {entries.map((entry) => (
          <span
            key={entry.date}
            title={`${entry.date} — ${STATUS_LABELS[entry.status]}`}
            className={`h-8 w-1.5 rounded-sm ${STATUS_STYLES[entry.status].bar}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
        <span>30 days</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function ComponentRow({ component }: { component: StatusComponent }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{component.label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{component.description}</p>
        </div>
        <StatusPill status={component.status} label={component.status_label} />
      </div>
      <div className="mt-6">
        <HistoryBars label={component.label} history={component.history} />
      </div>
    </li>
  );
}

/**
 * First-load placeholders. The roster's own labels and descriptions render
 * statically — this is the markup the prerender pass ships — with pulsing
 * stand-ins where live state will land.
 */
function SkeletonRows() {
  return (
    <ul className="space-y-4">
      {STATUS_COMPONENT_ROSTER.map((component) => (
        <li
          key={component.key}
          className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">{component.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{component.description}</p>
            </div>
            <span className="h-7 w-32 shrink-0 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="mt-6 flex flex-nowrap items-center gap-1">
            {Array.from({ length: HISTORY_DAYS }, (_, index) => (
              <span
                key={index}
                className="h-8 w-1.5 animate-pulse rounded-sm bg-white/[0.06]"
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function OverallBanner({ summary }: { summary: StatusSummary }) {
  const style = STATUS_STYLES[summary.overall];
  return (
    <section
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-8 backdrop-blur-xl ${style.banner}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 rounded-full ${style.dot} ${style.glow}`} />
          <p className="text-xl font-semibold tracking-[-0.015em] text-white md:text-2xl">
            {summary.overall_label}
          </p>
        </div>
        <div className="sm:text-right">
          {summary.checked_at && (
            <p className="text-sm text-[#94A3B8]">
              Last checked{" "}
              <time dateTime={summary.checked_at}>{relativeTime(summary.checked_at)}</time>
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
            Auto-refreshes every 60s
          </p>
          {summary.stale && (
            <p className="mt-1 animate-pulse text-xs text-[#94A3B8]/80">
              checking for fresh data&hellip;
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Calm fallback when the summary endpoint itself cannot be read. */
function UnavailablePanel() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-8 text-center backdrop-blur-xl"
    >
      <p className="text-xl font-semibold text-white">Status temporarily unavailable</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8]">
        If you&rsquo;re seeing an issue, raise a ticket on the Support Portal and the team will
        pick it up.
      </p>
      <Link
        to="/support"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:text-white"
      >
        Raise a support ticket &rarr;
      </Link>
    </section>
  );
}

export default function Status() {
  useRouteMetadata("/status");

  // null = first load still pending (the prerendered state). A poll that
  // fails AFTER a successful read keeps the last good summary on screen —
  // a transient fetch hiccup should not blank a page of real history.
  const [result, setResult] = useState<StatusResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchStatusSummary();
      if (cancelled) return;
      setResult((prev) => (next.ok || !prev || !prev.ok ? next : prev));
    };
    void load();
    const interval = setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Split the union once, so the JSX below stays simple: `summary` is the
  // last good payload (or null while the first load is pending) and
  // `unavailable` is true only when the endpoint itself could not be read.
  const summary: StatusSummary | null = result !== null && result.ok ? result : null;
  const unavailable = result !== null && !result.ok;

  return (
    <div className="w-full relative pt-32 pb-20 bg-[#040B16] min-h-dvh overflow-hidden">
      <HeroBackground variant="about" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
            Aurixa System Status
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
            System <span className="font-display italic text-[#C89B3C]">status</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
            Live health of the upstream services Aurixa Systems is built on. Providers are shown
            by role; incidents on their side can affect features on ours.
          </p>
        </div>

        <div className="mx-auto mt-14 w-full max-w-4xl">
          {unavailable ? (
            <UnavailablePanel />
          ) : (
            <>
              {summary === null ? (
                <section
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-8 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-white/20" />
                      <p className="text-xl font-semibold tracking-[-0.015em] text-white md:text-2xl">
                        Checking upstream services&hellip;
                      </p>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60 sm:text-right">
                      Auto-refreshes every 60s
                    </p>
                  </div>
                </section>
              ) : (
                <OverallBanner summary={summary} />
              )}

              <h2 className="mt-12 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
                Upstream services
              </h2>
              <div className="mt-4">
                {summary === null ? (
                  <SkeletonRows />
                ) : (
                  <ul className="space-y-4">
                    {summary.components.map((component) => (
                      <ComponentRow key={component.key} component={component} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* Page footer */}
          <div className="mt-14 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center">
            <Link
              to="/support"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:text-white"
            >
              Something broken for you specifically? &rarr; Raise a support ticket
            </Link>
            <p className="text-xs leading-relaxed text-[#94A3B8]/70">
              Statuses are polled server-side every few minutes from our providers&rsquo; official
              status feeds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
