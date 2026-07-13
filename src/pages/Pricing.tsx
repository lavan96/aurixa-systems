import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  Infinity as InfinityIcon,
  Loader2,
  Minus,
  Plus,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import {
  fetchCatalog,
  resolveHandoff,
  startCheckout,
  type Catalog,
  type CheckoutMode,
  type ResolvedHandoff,
} from "../lib/billing";

/**
 * /pricing — THE customer-facing pricing page, migrated wholesale from
 * Mission Control's /pricing route (which no longer exists). All monetisation
 * from the prime repo and every clone lands here; Mission Control is only the
 * headless billing engine behind the storefront API.
 *
 * This page is intentionally NOT linked from the site's public navigation.
 * It is reached via handoff deep links (`?h=` tokens minted server-to-server
 * by a command center), Stripe receipt redirects, or direct URL.
 *
 * With a `?h=` handoff token purchases are live and attributed to the
 * initiating user — checkout goes straight to Stripe with no login. Without
 * one, this is a browse-only page whose CTAs route to the contact funnel.
 */

const aud = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const range = (min: number | null | undefined, max: number | null | undefined) => {
  if (min == null) return "—";
  if (max == null || max === min) return aud(min);
  return `${aud(min)} – ${aud(max)}`;
};

const MARQUEE_WORDS = [
  "Pricing",
  "Seats",
  "Credits",
  "Modules",
  "Onboarding",
  "Reports",
  "Cascades",
  "Fleet",
  "Branding",
  "Aurixa",
];

export default function Pricing() {
  const [params] = useSearchParams();
  const h = params.get("h");

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<ResolvedHandoff | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const autoLaunchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog()
      .then((c) => !cancelled && setCatalog(c))
      .catch(() => !cancelled && setCatalogError("Pricing is temporarily unavailable."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!h) return;
    let cancelled = false;
    resolveHandoff(h).then((r) => !cancelled && setHandoff(r));
    return () => {
      cancelled = true;
    };
  }, [h]);

  const canBuy = !!handoff;

  const buy = useCallback(
    async (mode: CheckoutMode, itemId: string) => {
      if (!handoff) return;
      setBusyId(itemId);
      setCheckoutError(null);
      try {
        const { url } = await startCheckout({ h: handoff.handoffId, mode, itemId });
        window.location.href = url;
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : "Checkout failed");
        setBusyId(null);
      }
    },
    [handoff],
  );

  // Auto-launch a baked-in '<mode>:<item_id>' intent straight into checkout.
  useEffect(() => {
    if (autoLaunchedRef.current || !handoff?.intent || !catalog) return;
    const [mode, itemId] = handoff.intent.split(":");
    if (!itemId) return;
    if (mode !== "topup" && mode !== "seat_plan" && mode !== "setup_package") return;
    autoLaunchedRef.current = true;
    void buy(mode, itemId);
  }, [handoff, catalog, buy]);

  const plans = useMemo(() => catalog?.plans ?? [], [catalog]);
  const packs = catalog?.packs ?? [];
  const setups = catalog?.setups ?? [];
  const addons = catalog?.addons ?? [];
  const reports = catalog?.reports ?? [];
  const isLoading = !catalog && !catalogError;

  return (
    <div className="relative w-full min-h-dvh overflow-hidden bg-[#040B16] text-white">
      <BackgroundFX />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-16 md:pt-16 md:pb-24">
        {/* tiny meta strip */}
        <div className="pricing-reveal-up mb-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-[#C89B3C]" />
            Index · 001 / Pricing
          </span>
          <span className="hidden md:inline">v.2026 · AUD · ex GST</span>
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <span className="pricing-reveal-up mb-8 inline-flex items-center gap-1.5 rounded-full border border-[#00A8B5]/40 bg-[#00A8B5]/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.35em] text-[#00A8B5]">
            <Sparkles className="h-3 w-3" /> Plans &amp; Pricing
          </span>
          <h1
            className="pricing-reveal-up text-balance text-[44px] font-semibold leading-[0.95] tracking-[-0.03em] md:text-[96px]"
            style={{ animationDelay: "120ms" }}
          >
            <span className="pricing-shimmer-text">Pricing built</span>
            <br />
            <span className="text-white/90">for firms </span>
            <span className="font-display italic text-[#5EDDE8]">in&nbsp;motion</span>
            <span className="text-white/90">.</span>
          </h1>
          <p
            className="pricing-reveal-up mx-auto mt-8 max-w-2xl text-balance text-[15px] leading-relaxed text-[#94A3B8] md:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            Pick a plan. Scale seats. Top up credits as you grow. Every tier, module and add-on —
            laid bare below, with{" "}
            <span className="font-display italic text-white">no surprises</span>.
          </p>

          {/* Billing toggle */}
          <div
            className="pricing-reveal-up mt-12 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B162C]/60 p-1 backdrop-blur-xl"
            style={{ animationDelay: "360ms" }}
          >
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`relative rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-all ${
                  billing === b
                    ? "bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] text-[#040B16] shadow-[0_0_40px_-6px] shadow-[#00A8B5]/70"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                {b}
                {b === "annual" && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                      billing === "annual"
                        ? "bg-[#040B16]/20 text-[#040B16]"
                        : "bg-[#C89B3C]/20 text-[#C89B3C]"
                    }`}
                  >
                    -15%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Attributed handoff — purchase scope is pinned to the clone user
              who initiated this visit from their command center. */}
          {handoff && (
            <div
              className="pricing-reveal-up mx-auto mt-8 flex max-w-xl flex-col items-center gap-2"
              style={{ animationDelay: "440ms" }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
                Purchasing for
              </span>
              <div className="inline-flex h-11 items-center rounded-full border border-[#00A8B5]/40 bg-[#0B162C]/60 px-6 font-mono text-[12px] uppercase tracking-[0.18em] backdrop-blur-xl">
                {handoff.cloneName ?? "your workspace"}
                {handoff.originUsername && (
                  <span className="ml-3 normal-case tracking-normal text-[#94A3B8]">
                    as {handoff.originUsername}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#94A3B8]/70">
                {handoff.cloneName
                  ? `Charges, seats & credits will apply to ${handoff.cloneName}.`
                  : "Charges will apply to your workspace."}
              </p>
            </div>
          )}
          {h && handoff === null && (
            <div className="pricing-reveal-up mx-auto mt-8 max-w-xl rounded-md border border-[#C89B3C]/40 bg-[#0B162C] px-6 py-3 text-sm text-[#94A3B8]">
              This purchase link has expired. Head back to your dashboard and start the purchase
              again to get a fresh one.
            </div>
          )}
          {checkoutError && (
            <div className="mx-auto mt-6 max-w-xl rounded-md border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-300">
              Checkout unavailable: {checkoutError}
            </div>
          )}
        </div>

        {/* Marquee */}
        <div
          className="pricing-reveal-up relative mt-20 overflow-hidden border-y border-white/10 py-5"
          style={{ animationDelay: "480ms" }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#040B16] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#040B16] to-transparent" />
          <div className="pricing-marquee-track flex w-max gap-12 whitespace-nowrap">
            {[...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
              <span
                key={i}
                className="flex items-center gap-12 font-display text-3xl italic text-[#94A3B8]/40 md:text-5xl"
              >
                {w}
                <span className="h-1.5 w-1.5 rounded-full bg-[#00A8B5]/40" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {catalogError && (
        <p className="relative z-10 pb-24 text-center text-sm text-[#94A3B8]">{catalogError}</p>
      )}

      {/* Plans */}
      <section id="plans" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="02"
          eyebrow="Plans"
          title={
            <>
              The <span className="font-display italic text-[#5EDDE8]">tiers</span>.
            </>
          }
          description="Four shapes. One philosophy. Pay only for what your firm actually uses."
        />

        {isLoading && (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[500px] animate-pulse rounded-2xl bg-[#0B162C]/40" />
            ))}
          </div>
        )}

        {!isLoading && plans.length > 0 && (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, idx) => {
              const meta = p.metadata ?? {};
              const minP = meta.price_min_cents ?? p.price_cents;
              const maxP = meta.price_max_cents ?? p.price_cents;
              const annual = Math.round(minP * 0.85);
              const display = billing === "annual" ? annual : minP;
              const isFeatured = idx === plans.length - 2 || meta.tier === 3;
              const highlights: string[] = meta.highlights ?? [];
              const tierName =
                meta.tier === 4
                  ? "Enterprise"
                  : meta.tier === 3
                    ? "Most popular"
                    : meta.tier === 2
                      ? "Recommended"
                      : "Starter";

              const isEnterprise = p.seat_limit >= 999;
              const buyable = canBuy && !isEnterprise;
              return (
                <PlanCard
                  key={p.id}
                  index={String(idx + 1).padStart(2, "0")}
                  featured={isFeatured}
                  name={p.name}
                  tagline={meta.best_for ?? p.description ?? ""}
                  price={display}
                  priceMax={maxP ?? minP}
                  showRange={maxP !== minP && billing === "monthly"}
                  ribbon={tierName}
                  seats={isEnterprise ? "Custom seats" : `${p.seat_limit} seats included`}
                  highlights={highlights}
                  cta={isEnterprise ? "Talk to sales" : "Get started"}
                  busy={busyId === p.id}
                  buyable={buyable}
                  onBuy={() => void buy("seat_plan", p.id)}
                />
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
          All prices in AUD · excl. GST · Annual saves 15%
        </p>
      </section>

      {/* Credit packs */}
      <section id="credits" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="03"
          eyebrow="Credits"
          title={
            <>
              Top up <span className="font-display italic text-[#C89B3C]">on demand</span>.
            </>
          }
          description="Generate more reports, scenarios and AI insights with credit packs. Never expires for active accounts."
          icon={<Zap className="h-4 w-4" />}
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {packs.slice(0, 8).map((pack, i) => {
            const meta = pack.metadata ?? {};
            const popular = !!meta.popular;
            const isBusy = busyId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                disabled={isBusy || !canBuy}
                onClick={() => canBuy && void buy("topup", pack.id)}
                className={`group relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-6 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-[#00A8B5]/50 hover:bg-[#0B162C]/70 hover:shadow-[0_30px_80px_-30px] hover:shadow-[#00A8B5]/40 disabled:cursor-default ${
                  popular ? "border-[#C89B3C]/60" : "border-white/10"
                } ${isBusy ? "cursor-wait opacity-70" : ""}`}
              >
                <CornerTicks />
                {popular && (
                  <span className="absolute right-4 top-4 rounded-sm bg-[#C89B3C] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-[#040B16]">
                    Popular
                  </span>
                )}
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
                  <span>{pack.name}</span>
                  <span className="text-white/30">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="bg-gradient-to-br from-white via-white to-[#5EDDE8] bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
                    {pack.tokens.toLocaleString()}
                  </span>
                  <span className="font-display text-base italic text-[#94A3B8]">credits</span>
                </div>
                <div className="mt-1.5 font-mono text-xs text-[#94A3B8]">
                  {aud(pack.price_cents)} AUD
                </div>
                {meta.best_for && (
                  <p className="mt-5 text-xs leading-relaxed text-[#94A3B8]">{meta.best_for}</p>
                )}
                <div className="mt-6 flex items-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#00A8B5] opacity-0 transition-opacity group-hover:opacity-100">
                  {isBusy ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Starting…
                    </>
                  ) : canBuy ? (
                    <>
                      Purchase <ArrowRight className="ml-1.5 h-3 w-3" />
                    </>
                  ) : (
                    <>Purchase from your dashboard</>
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,168,181,0.12),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Modules / setup / reports */}
      <section id="addons" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="04"
          eyebrow="Build your stack"
          title={
            <>
              Modules, onboarding &{" "}
              <span className="font-display italic text-[#5EDDE8]">report economics</span>.
            </>
          }
          description="Mix and match what your firm actually uses. All optional, all transparent."
          icon={<Puzzle className="h-4 w-4" />}
        />

        <StackTabs
          addons={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {addons.map((a) => (
                <div
                  key={a.id}
                  className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[#00A8B5]/40 hover:bg-[#0B162C]/60"
                >
                  <CornerTicks />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans text-base font-semibold tracking-tight text-white">
                      {a.name}
                    </h3>
                    {a.category && (
                      <span className="rounded-sm border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]">
                        {a.category}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">{a.description}</p>
                  )}
                  <div className="mt-4 text-lg font-semibold tracking-tight text-white">
                    {range(a.price_min_cents, a.price_max_cents)}
                    {a.billing_period && (
                      <span className="ml-1.5 font-display text-sm font-normal italic text-[#94A3B8]">
                        / {a.billing_period}
                      </span>
                    )}
                  </div>
                  {(a.included_in_plans?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.included_in_plans!.map((pl) => (
                        <span
                          key={pl}
                          className="rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]"
                        >
                          included · {pl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
          setup={
            <div className="grid gap-4 md:grid-cols-2">
              {setups.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl transition-all hover:border-[#00A8B5]/40"
                >
                  <CornerTicks />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00A8B5]/10 text-[#00A8B5] ring-1 ring-[#00A8B5]/30">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <h3 className="font-sans text-base font-semibold tracking-tight text-white">
                        {s.name}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-sm bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#C89B3C]">
                      {range(s.price_min_cents, s.price_max_cents)}
                    </span>
                  </div>
                  {s.description && (
                    <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{s.description}</p>
                  )}
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {(s.deliverables ?? []).map((d, i) => (
                      <li key={i} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00A8B5]" />
                        <span className="text-[#94A3B8]">{d}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 max-w-[220px]">
                    {canBuy ? (
                      <BuyButton
                        busy={busyId === s.id}
                        label="Purchase package"
                        onClick={() => void buy("setup_package", s.id)}
                      />
                    ) : (
                      <Link
                        to="/contact"
                        className="block rounded-sm border border-[#00A8B5]/40 py-2 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
                      >
                        Enquire
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          }
          reports={
            <>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 backdrop-blur-xl">
                <CornerTicks />
                <div className="divide-y divide-white/10">
                  <div className="grid grid-cols-12 gap-2 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
                    <div className="col-span-6">Report</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-3 text-right">Credits</div>
                  </div>
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 items-center gap-2 px-6 py-4 text-sm transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="col-span-6 font-medium tracking-tight text-white">
                        {r.name}
                      </div>
                      <div className="col-span-3 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                        {r.category ?? "—"}
                      </div>
                      <div className="col-span-3 text-right font-mono text-[#00A8B5]">
                        {r.credit_cost}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
                Credits consumed only on successful generation.
              </p>
            </>
          }
        />
      </section>

      {/* Trust strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative grid gap-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B162C]/70 via-[#0B162C]/30 to-[#0B162C]/70 p-10 backdrop-blur-xl md:grid-cols-3">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_50%,rgba(0,168,181,0.08),transparent_60%),radial-gradient(circle_at_80%_50%,rgba(200,155,60,0.08),transparent_60%)]" />
          <Trust
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Enterprise security"
            body="SSO, audit logs, role-based access and isolated tenancy by default."
          />
          <Trust
            icon={<InfinityIcon className="h-5 w-5" />}
            title="Scales with you"
            body="Add seats, devices and credits the moment the team needs them."
          />
          <Trust
            icon={<Users className="h-5 w-5" />}
            title="Hands-on onboarding"
            body="A real human walks your team through setup and rollout."
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-6 pb-32">
        <SectionHeader
          index="05"
          eyebrow="FAQ"
          title={
            <>
              Questions, <span className="font-display italic text-[#5EDDE8]">answered</span>.
            </>
          }
          icon={<FileText className="h-4 w-4" />}
        />
        <div className="mt-10">
          <FaqItem
            q="How do credits work?"
            a="Every AI-generated report or scenario consumes credits based on its complexity. Each plan includes a monthly allowance; you can top up anytime with credit packs that never expire while your account is active."
          />
          <FaqItem
            q="Can I change plans later?"
            a="Absolutely. Upgrade, downgrade or change seat counts whenever your firm changes shape. Pro-rated billing applies on the next cycle."
          />
          <FaqItem
            q="What does onboarding include?"
            a="A dedicated specialist walks your team through configuration, brand setup, workflows and training. Larger packages include migration, integrations and white-label theming."
          />
          <FaqItem
            q="Do you offer annual billing?"
            a="Yes — flip the toggle at the top of the page for a 15% discount on annual prepayment. We also offer multi-year terms for Enterprise customers."
          />
          <FaqItem
            q="Is there a free trial?"
            a="Reach out through the contact page. We'll set up a sandbox environment so your team can road-test the platform with sample data."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-[#00A8B5]/30 bg-gradient-to-br from-[#00A8B5]/10 via-[#0B162C] to-[#C89B3C]/10 p-10 text-center md:p-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,168,181,0.2),transparent_60%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.04] pricing-noise" />
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00A8B5]/80">
            06 / Next move
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.02em] md:text-6xl">
            Ready <span className="font-display italic text-[#5EDDE8]">when</span> you are.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[#94A3B8] md:text-lg">
            {canBuy
              ? "Pick a plan above, or book a walkthrough with our team to see it on your data."
              : "Already a client? Start any purchase from inside your command center — it carries your workspace and account straight into checkout. New here? Talk to us."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-sm bg-[#00A8B5] px-8 py-3 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-[0_0_50px_-10px] shadow-[#00A8B5]/70 transition-transform hover:scale-105"
            >
              Talk to us <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#00A8B5]/40" />
    </>
  );
}

function PlanCard({
  index,
  name,
  tagline,
  price,
  priceMax,
  showRange,
  ribbon,
  seats,
  highlights,
  cta,
  busy,
  featured,
  buyable,
  onBuy,
}: {
  // No @types/react in this repo, so JSX doesn't strip `key` from props.
  key?: string;
  index: string;
  name: string;
  tagline: string;
  price: number;
  priceMax: number;
  showRange: boolean;
  ribbon: string;
  seats: string;
  highlights: string[];
  cta: string;
  busy?: boolean;
  featured?: boolean;
  buyable: boolean;
  onBuy: () => void;
}) {
  const ctaClasses = `flex w-full items-center justify-center rounded-sm py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-all ${
    featured
      ? "bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] font-black text-[#040B16] shadow-[0_0_40px_-8px] shadow-[#00A8B5]/70 hover:scale-[1.02]"
      : "border border-[#00A8B5]/40 font-bold text-white hover:border-[#00A8B5]"
  }`;
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-7 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 ${
        featured
          ? "border-[#00A8B5]/60 bg-gradient-to-br from-[#00A8B5]/15 via-[#0B162C]/80 to-[#0B162C]/40 shadow-[0_40px_100px_-30px] shadow-[#00A8B5]/50"
          : "border-white/10 bg-[#0B162C]/40 hover:border-[#00A8B5]/40 hover:shadow-[0_30px_80px_-30px] hover:shadow-[#00A8B5]/30"
      }`}
    >
      <CornerTicks />
      {featured && (
        <>
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent" />
          <span className="absolute right-5 top-5 rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#C89B3C] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#040B16]">
            {ribbon}
          </span>
        </>
      )}

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
        <span>{name}</span>
        <span className="text-white/30">{index}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#94A3B8]">{tagline}</p>

      <div className="mt-7">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`bg-gradient-to-br ${featured ? "from-white via-white to-[#5EDDE8]" : "from-white to-white/50"} bg-clip-text text-5xl font-semibold tracking-[-0.03em] text-transparent`}
          >
            {aud(price)}
          </span>
          {showRange && priceMax > price && (
            <span className="font-display text-base italic text-[#94A3B8]">– {aud(priceMax)}</span>
          )}
        </div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
          AUD / month · ex GST
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-[#040B16]/40 px-3 py-2 font-mono text-[11px] tracking-wider text-white/80">
        {seats}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {highlights.map((hl, i) => (
          <li key={i} className="flex gap-2.5">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#C89B3C]" : "text-[#00A8B5]"}`}
            />
            <span className="text-[#94A3B8]">{hl}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {buyable ? (
          <button type="button" onClick={onBuy} disabled={busy} className={ctaClasses}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…
              </>
            ) : (
              <>
                {cta}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        ) : (
          <Link to="/contact" className={ctaClasses}>
            {cta}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function StackTabs({
  addons,
  setup,
  reports,
}: {
  addons: ReactNode;
  setup: ReactNode;
  reports: ReactNode;
}) {
  const [tab, setTab] = useState<"addons" | "setup" | "reports">("addons");
  const tabs = [
    { id: "addons" as const, label: "Add-ons" },
    { id: "setup" as const, label: "Onboarding" },
    { id: "reports" as const, label: "Reports" },
  ];
  return (
    <div className="mt-14">
      <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-1 rounded-lg border border-white/10 bg-[#0B162C]/60 p-1 backdrop-blur-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-md py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
              tab === t.id ? "bg-[#00A8B5] text-[#040B16] font-bold" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-10">
        {tab === "addons" && addons}
        {tab === "setup" && setup}
        {tab === "reports" && reports}
      </div>
    </div>
  );
}

function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  icon,
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
        {index && <span className="text-white/40">{index}</span>}
        {index && <span className="h-px w-8 bg-white/20" />}
        {icon}
        <span>{eyebrow}</span>
      </div>
      <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function Trust({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00A8B5]/10 text-[#00A8B5] ring-1 ring-[#00A8B5]/30">
        {icon}
      </div>
      <div>
        <h4 className="font-sans font-semibold tracking-tight text-white">{title}</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">{body}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left font-sans text-base font-medium tracking-tight text-white transition-colors hover:text-[#00A8B5]"
      >
        {q}
        {open ? (
          <Minus className="h-4 w-4 shrink-0 text-[#94A3B8]" />
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-[#94A3B8]" />
        )}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-[#94A3B8]">{a}</p>}
    </div>
  );
}

function BuyButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-sm bg-[#00A8B5] py-2.5 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function BackgroundFX() {
  return (
    <>
      {/* animated aurora */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]">
        <div className="pricing-aurora absolute inset-0" />
      </div>
      {/* lower aurora */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[700px] opacity-60">
        <div
          className="pricing-aurora absolute inset-0"
          style={{ animationDirection: "alternate-reverse" }}
        />
      </div>
      {/* fine grid with vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      {/* film grain */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] pricing-noise" />
      {/* horizon line */}
      <div className="pointer-events-none absolute inset-x-0 top-[90vh] -z-10 h-px bg-gradient-to-r from-transparent via-[#00A8B5]/40 to-transparent" />
    </>
  );
}
