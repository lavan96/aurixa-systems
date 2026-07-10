import { useEffect } from "react";
import { pricingUrl } from "../lib/pricing";

/**
 * /pricing — public front door into the billing flow (user-attributed pricing
 * workflow; docs/user-tracking-pricing-workflow-plan.md §3.2, Option A).
 *
 * The live, checkout-capable pricing page lives in Mission Control. This route
 * exists so `aurixasystems…/pricing` is a stable campaign URL: it immediately
 * forwards there with `origin_source=aurixa_site` + inbound UTM params so
 * purchases arriving from the public web stay source-attributed. Client-side
 * redirect on purpose — keep this route out of any sitemap.
 */
export default function Pricing() {
  useEffect(() => {
    window.location.replace(pricingUrl());
  }, []);

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
        Taking you to pricing…
      </p>
      <a
        href={pricingUrl()}
        className="text-sm font-semibold text-[#00A8B5] underline-offset-4 hover:underline"
      >
        Continue to plans &amp; pricing
      </a>
    </div>
  );
}
