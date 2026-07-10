import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import {
  fetchCatalog,
  resolveHandoff,
  startCheckout,
  formatMoney,
  type Catalog,
  type CheckoutMode,
  type ResolvedHandoff,
} from "../lib/billing";

/**
 * /pricing — THE customer-facing pricing page (user-attributed pricing
 * workflow, Revision 2). All monetisation from the prime repo and every
 * clone lands here; Mission Control is only the headless billing engine
 * behind the storefront API.
 *
 * With a `?h=` handoff token (minted server-to-server by a command center),
 * purchases are live and attributed to the initiating user — checkout goes
 * straight to Stripe with no login. Without one, this is a browse-only page
 * whose CTAs route to the contact funnel.
 */
export default function Pricing() {
  const [params] = useSearchParams();
  const h = params.get("h");

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<ResolvedHandoff | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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
  const reports = catalog?.reports ?? [];

  return (
    <div className="w-full pt-[100px]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#00A8B5]">
          Plans &amp; Pricing
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight text-white">
          Pricing built for firms <span className="text-[#C89B3C]">in motion</span>.
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-[15px] leading-relaxed text-[#94A3B8]">
          Pick a plan, scale seats, top up credits as you grow. Every tier and add-on laid bare —
          in AUD, ex&nbsp;GST, with no surprises.
        </p>

        {/* Attributed purchase banner */}
        {handoff && (
          <div className="mt-8 inline-flex flex-col items-center gap-1 rounded-md border border-[#00A8B5]/40 bg-[#0B162C] px-6 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#94A3B8]">
              Purchasing for
            </span>
            <span className="text-sm font-bold text-white">
              {handoff.cloneName ?? "your workspace"}
              {handoff.originUsername && (
                <span className="ml-2 font-normal text-[#94A3B8]">
                  as {handoff.originUsername}
                </span>
              )}
            </span>
          </div>
        )}
        {h && handoff === null && (
          <div className="mt-8 inline-block rounded-md border border-[#C89B3C]/40 bg-[#0B162C] px-6 py-3 text-sm text-[#94A3B8]">
            This purchase link has expired. Head back to your dashboard and start the purchase
            again to get a fresh one.
          </div>
        )}
        {checkoutError && (
          <div className="mt-6 inline-block rounded-md border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-300">
            Checkout unavailable: {checkoutError}
          </div>
        )}
      </section>

      {catalogError && (
        <p className="pb-24 text-center text-sm text-[#94A3B8]">{catalogError}</p>
      )}

      {!catalog && !catalogError && (
        <div className="flex items-center justify-center gap-2 pb-24 text-sm text-[#94A3B8]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live pricing…
        </div>
      )}

      {/* Plans */}
      {plans.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
          <SectionHeading eyebrow="Plans" title="The tiers." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, idx) => {
              const meta = p.metadata ?? {};
              const minP = meta.price_min_cents ?? p.price_cents;
              const featured = meta.tier === 3 || idx === Math.max(0, plans.length - 2);
              const isEnterprise = p.seat_limit >= 999;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-lg border p-6 ${
                    featured
                      ? "border-[#C89B3C]/60 bg-[#0B162C] shadow-[0_0_40px_rgba(200,155,60,0.15)]"
                      : "border-[#00A8B5]/20 bg-[#0B162C]/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                      {p.name}
                    </h3>
                    {featured && (
                      <span className="rounded-sm bg-[#C89B3C] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#040B16]">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-5 text-4xl font-black text-white">
                    {formatMoney(minP, p.currency)}
                    <span className="ml-1 text-xs font-semibold text-[#94A3B8]">/mo</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                    AUD · ex GST · {isEnterprise ? "custom seats" : `${p.seat_limit} seats`}
                  </div>
                  {meta.best_for && (
                    <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">{meta.best_for}</p>
                  )}
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {(meta.highlights ?? []).map((hl, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#94A3B8]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00A8B5]" />
                        {hl}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {canBuy && !isEnterprise ? (
                      <BuyButton
                        busy={busyId === p.id}
                        featured={featured}
                        label="Get started"
                        onClick={() => void buy("seat_plan", p.id)}
                      />
                    ) : (
                      <Link
                        to="/contact"
                        className="block rounded-sm border border-[#00A8B5]/40 py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
                      >
                        {isEnterprise ? "Talk to sales" : "Get started"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Credit packs */}
      {packs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
          <SectionHeading eyebrow="Credits" title="Top up on demand." icon={<Zap className="h-4 w-4" />} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packs.slice(0, 8).map((pack) => (
              <div
                key={pack.id}
                className="flex flex-col rounded-lg border border-[#00A8B5]/20 bg-[#0B162C]/60 p-5 transition-colors hover:border-[#00A8B5]/50"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
                  {pack.name}
                </div>
                <div className="mt-3 text-3xl font-black text-white">
                  {pack.tokens.toLocaleString()}
                  <span className="ml-1.5 text-xs font-semibold text-[#94A3B8]">credits</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#C89B3C]">
                  {formatMoney(pack.price_cents, pack.currency)}
                </div>
                {pack.metadata?.best_for && (
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-[#94A3B8]">
                    {pack.metadata.best_for}
                  </p>
                )}
                <div className="mt-4">
                  {canBuy ? (
                    <BuyButton
                      busy={busyId === pack.id}
                      label="Purchase"
                      onClick={() => void buy("topup", pack.id)}
                    />
                  ) : (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/70">
                      Purchase from your dashboard
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Onboarding packages */}
      {setups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
          <SectionHeading eyebrow="Onboarding" title="Hands-on setup." icon={<ShieldCheck className="h-4 w-4" />} />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {setups.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-[#00A8B5]/20 bg-[#0B162C]/60 p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                    {s.name}
                  </h3>
                  <span className="shrink-0 text-sm font-semibold text-[#C89B3C]">
                    {s.price_min_cents != null &&
                    s.price_max_cents != null &&
                    s.price_max_cents !== s.price_min_cents
                      ? `${formatMoney(s.price_min_cents, s.currency)} – ${formatMoney(s.price_max_cents, s.currency)}`
                      : formatMoney(s.price_min_cents, s.currency)}
                  </span>
                </div>
                {s.description && (
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{s.description}</p>
                )}
                <ul className="mt-4 space-y-2">
                  {(s.deliverables ?? []).map((d, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#94A3B8]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00A8B5]" />
                      {d}
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
                      className="block rounded-sm border border-[#00A8B5]/40 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
                    >
                      Enquire
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Report economics */}
      {reports.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 md:px-6 pb-24">
          <SectionHeading eyebrow="Reports" title="Credit costs." icon={<Sparkles className="h-4 w-4" />} />
          <div className="mt-10 overflow-hidden rounded-lg border border-[#00A8B5]/20 bg-[#0B162C]/60">
            <div className="grid grid-cols-12 gap-2 border-b border-[#00A8B5]/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
              <div className="col-span-6">Report</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-3 text-right">Credits</div>
            </div>
            {reports.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 items-center gap-2 border-b border-white/5 px-5 py-3 text-sm last:border-0"
              >
                <div className="col-span-6 font-medium text-white">{r.name}</div>
                <div className="col-span-3 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {r.category ?? "—"}
                </div>
                <div className="col-span-3 text-right font-mono text-[#00A8B5]">
                  {r.credit_cost}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]/70">
            Credits consumed only on successful generation
          </p>
        </section>
      )}

      {/* Bottom CTA for anonymous visitors */}
      {!canBuy && catalog && (
        <section className="max-w-3xl mx-auto px-4 md:px-6 pb-24 text-center">
          <div className="rounded-lg border border-[#C89B3C]/30 bg-[#0B162C] p-10">
            <h2 className="text-2xl font-black text-white">
              Ready when <span className="text-[#C89B3C]">you</span> are.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#94A3B8]">
              Already a client? Start any purchase from inside your command center — it carries
              your workspace and account straight into checkout. New here? Talk to us.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-block rounded-sm bg-[#00A8B5] px-8 py-3 text-[12px] font-black uppercase tracking-[0.25em] text-white transition-transform hover:scale-105"
            >
              Talk to us
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#00A8B5]">
        {icon}
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{title}</h2>
    </div>
  );
}

function BuyButton({
  busy,
  label,
  onClick,
  featured,
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`w-full rounded-sm py-2.5 text-[12px] font-black uppercase tracking-[0.2em] transition-all disabled:cursor-wait disabled:opacity-70 ${
        featured
          ? "bg-[#C89B3C] text-[#040B16] hover:scale-[1.02]"
          : "bg-[#00A8B5] text-white hover:scale-[1.02]"
      }`}
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
