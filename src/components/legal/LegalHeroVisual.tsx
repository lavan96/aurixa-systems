import type { LegalDocumentKind } from "../../lib/legal";

const ModuleIcon = ({ type }: { type: "access" | "service" | "use" | "responsibility" }) => {
  if (type === "access") return <g className="terms-module__icon"><circle cx="0" cy="-4" r="4"/><path d="M-7 7c1-6 13-6 14 0M9-7v11M6 1l3 3 5-6"/></g>;
  if (type === "service") return <g className="terms-module__icon"><rect x="-9" y="-8" width="18" height="16"/><path d="M-5-3H5M-5 1H5M-5 5H1M-5-8v-3M5-8v-3"/></g>;
  if (type === "use") return <g className="terms-module__icon"><path d="M-11 5h7l4-10 4 10h7M7 1l4 4-4 4"/><circle cx="0" cy="-5" r="2"/></g>;
  return <g className="terms-module__icon"><path d="M0-11 10-7v7c0 7-4 10-10 13C-6 10-10 7-10 0v-7Z"/><path d="m-5 0 4 4 7-8"/></g>;
};

function Module({ x, y, title, subtitle, type, accent }: { x: number; y: number; title: string; subtitle: string; type: "access" | "service" | "use" | "responsibility"; accent: "teal" | "gold" }) {
  return <g className={`terms-module terms-module--${accent}`} transform={`translate(${x} ${y})`}>
    <rect className="terms-module__surface" width="174" height="69"/>
    <path className="terms-module__corner" d="M0 13V0h13M161 69h13V56"/>
    <g transform="translate(23 34)"><ModuleIcon type={type}/></g>
    <text className="terms-module__title" x="46" y="28">{title}</text>
    <text className="terms-module__subtitle" x="46" y="47">{subtitle}</text>
    <circle className="terms-module__status" cx="160" cy="13" r="3"/>
  </g>;
}

const Indicator = ({ x, y, width, label, tone = "teal" }: { x: number; y: number; width: number; label: string; tone?: "teal" | "gold" }) => <g className={`terms-indicator terms-indicator--${tone}`} transform={`translate(${x} ${y})`}>
  <rect width={width} height="22"/><circle cx="10" cy="11" r="2.5"/><text x="20" y="14">{label}</text>
</g>;

export function LegalHeroVisual({ caption }: { kind: LegalDocumentKind; caption: string }) {
  return (
    <figure className="legal-visual terms-agreement" aria-hidden="true">
      <svg viewBox="0 0 560 420" className="w-full">
        <defs>
          <linearGradient id="terms-boundary" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D7B35F"/><stop offset="1" stopColor="#5EDDE8"/></linearGradient>
          <filter id="terms-glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <pattern id="terms-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#5EDDE8" strokeOpacity=".045"/></pattern>
        </defs>
        <rect width="560" height="420" fill="url(#terms-grid)"/>
        <path className="terms-boundary" d="M38 43H522V377H38Z"/>
        <g className="terms-boundary__markers"><path d="M38 70V43h27M495 43h27v27M38 350v27h27M495 377h27v-27"/><text x="50" y="59">AGREEMENT / 01</text><text x="510" y="363" textAnchor="end">GOVERNED USE</text></g>

        <g className="terms-connectors">
          <path id="access-route" d="M194 117H218V174"/><path d="M366 117H342V174"/>
          <path d="M194 303H218V246"/><path d="M366 303H342V246"/>
        </g>
        <g className="terms-signals" filter="url(#terms-glow)">
          <circle r="3"><animateMotion dur="7s" repeatCount="indefinite" path="M194 117H218V174"/></circle>
          <circle r="3"><animateMotion dur="7s" begin="1.75s" repeatCount="indefinite" path="M342 174V117H366"/></circle>
          <circle r="3"><animateMotion dur="7s" begin="3.5s" repeatCount="indefinite" path="M218 246V303H194"/></circle>
          <circle r="3"><animateMotion dur="7s" begin="5.25s" repeatCount="indefinite" path="M342 246V303H366"/></circle>
        </g>

        <Module x={20} y={82} title="ACCESS" subtitle="Accounts & Authorised Users" type="access" accent="teal"/>
        <Module x={366} y={82} title="SERVICE" subtitle="Plans, Orders & Delivery" type="service" accent="gold"/>
        <Module x={20} y={269} title="USE" subtitle="Permitted & Prohibited Activity" type="use" accent="gold"/>
        <Module x={366} y={269} title="RESPONSIBILITY" subtitle="Data, Compliance & Decisions" type="responsibility" accent="teal"/>

        <g className="terms-agreement__core">
          <rect className="terms-agreement__layer terms-agreement__layer--back" x="211" y="168" width="138" height="88"/>
          <rect className="terms-agreement__layer" x="218" y="174" width="124" height="72"/>
          <path className="terms-agreement__section" d="M230 207H330M230 216H314M230 225H302"/>
          <text className="terms-agreement__title" x="280" y="190" textAnchor="middle">PLATFORM AGREEMENT</text>
          <text className="terms-agreement__subtitle" x="280" y="200" textAnchor="middle">TERMS OF ACCESS &amp; USE</text>
          <g className="terms-agreement__confirmation" transform="translate(318 229)"><circle r="8"/><path d="m-4 0 3 3 5-6"/></g>
          <path className="terms-agreement__signature" d="M230 235h45m-39-5 7 5 9-7 8 7"/>
          <circle className="terms-agreement__status" cx="330" cy="184" r="3"/>
        </g>

        <Indicator x={54} y={48} width={78} label="BILLING" tone="gold"/>
        <Indicator x={154} y={48} width={148} label="INTELLECTUAL PROPERTY"/>
        <Indicator x={324} y={48} width={136} label="CONFIDENTIALITY" tone="gold"/>
        <Indicator x={82} y={350} width={100} label="SUSPENSION"/>
        <Indicator x={220} y={350} width={110} label="TERMINATION" tone="gold"/>
        <Indicator x={374} y={350} width={88} label="DISPUTES"/>
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
