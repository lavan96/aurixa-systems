import type { LegalDocumentKind } from "../../lib/legal";

type ModuleType = "access" | "service" | "use" | "responsibility";

const ModuleIcon = ({ type }: { type: ModuleType }) => {
  if (type === "access") return <><circle cx="0" cy="-4" r="4"/><path d="M-7 7c1-6 13-6 14 0M9-7v11M6 1l3 3 5-6"/></>;
  if (type === "service") return <><rect x="-9" y="-8" width="18" height="16"/><path d="M-5-3H5M-5 1H5M-5 5H1M-5-8v-3M5-8v-3"/></>;
  if (type === "use") return <><path d="M-11 5h7l4-10 4 10h7M7 1l4 4-4 4"/><circle cx="0" cy="-5" r="2"/></>;
  return <><path d="M0-11 10-7v7c0 7-4 10-10 13C-6 10-10 7-10 0v-7Z"/><path d="m-5 0 4 4 7-8"/></>;
};

function Module({ x, y, title, subtitle, type, accent }: { x: number; y: number; title: string; subtitle: string; type: ModuleType; accent: "teal" | "gold" }) {
  return <g className={`terms-module terms-module--${type} terms-module--${accent}`} transform={`translate(${x} ${y})`}>
    <rect x="4" y="5" width="178" height="78" rx="2" className="terms-module__shadow"/><rect width="186" height="78" rx="2" className="terms-module__surface"/><rect x="5" y="5" width="176" height="68" className="terms-module__inner"/>
    <path className="terms-module__corner" d="M0 15V0h15M171 78h15V63"/><path className="terms-module__edge" d="M6 6h48M132 72h48"/>
    <g transform="translate(25 39)" className="terms-module__icon"><rect x="-17" y="-17" width="34" height="34" rx="2"/><g><ModuleIcon type={type}/></g></g>
    <text className="terms-module__title" x="53" y="31">{title}</text><text className="terms-module__subtitle" x="53" y="50">{subtitle}</text>
    <circle className="terms-module__status" cx="170" cy="14" r="3"/><path className="terms-module__meter" d="M158 63h12"/>
  </g>;
}

const Indicator = ({ x, y, width, label, tone = "teal", subdued = false }: { x: number; y: number; width: number; label: string; tone?: "teal" | "gold"; subdued?: boolean }) => <g className={`terms-indicator terms-indicator--${tone}${subdued ? " terms-indicator--subdued" : ""}`} transform={`translate(${x} ${y})`}><rect width={width} height="24" rx="1"/><path d={`M0 8V0h8M${width - 8} 24h8v-8`}/><circle cx="11" cy="12" r="2.5"/><text x="21" y="15">{label}</text></g>;

export function LegalHeroVisual({ caption }: { kind: LegalDocumentKind; caption: string }) {
  return <figure className="legal-visual terms-agreement" aria-hidden="true"><svg viewBox="0 0 600 450" className="w-full" focusable="false">
    <defs>
      <linearGradient id="terms-boundary" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D7B35F"/><stop offset=".48" stopColor="#8496A5"/><stop offset="1" stopColor="#5EDDE8"/></linearGradient>
      <radialGradient id="terms-atmosphere"><stop stopColor="#9B7934" stopOpacity=".18"/><stop offset=".52" stopColor="#123752" stopOpacity=".12"/><stop offset="1" stopColor="#030A15" stopOpacity="0"/></radialGradient>
      <linearGradient id="terms-paper" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#14283A"/><stop offset=".5" stopColor="#091827"/><stop offset="1" stopColor="#050E19"/></linearGradient>
      <linearGradient id="terms-sweep"><stop stopColor="#D7B35F" stopOpacity="0"/><stop offset=".5" stopColor="#F0D693" stopOpacity=".35"/><stop offset="1" stopColor="#D7B35F" stopOpacity="0"/></linearGradient>
      <filter id="terms-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="terms-depth" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="11" stdDeviation="13" floodColor="#000713" floodOpacity=".85"/><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#D7B35F" floodOpacity=".12"/></filter>
      <pattern id="terms-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#A8C6CD" strokeOpacity=".045"/></pattern>
    </defs>
    <rect width="600" height="450" fill="#040B16"/><rect width="600" height="450" fill="url(#terms-grid)"/><ellipse cx="300" cy="225" rx="260" ry="190" fill="url(#terms-atmosphere)"/>
    <g className="terms-field" fill="none"><path className="terms-boundary" d="M35 62h30V39h470v23h30v326h-30v23H65v-23H35z"/><rect x="51" y="55" width="498" height="340" rx="3"/><path className="terms-contract-ring" d="M125 225c0-101 78-160 175-160s175 59 175 160-78 160-175 160-175-59-175-160Z"/><path d="M67 86h45M488 86h45M67 364h45M488 364h45M67 102V86M533 102V86M67 364v-16M533 364v-16"/></g>
    <path className="terms-procedure-sweep" d="M68 112H532"/>
    <g className="terms-boundary__markers"><text x="69" y="76">AGREEMENT / CONTROL 01</text><text x="531" y="378" textAnchor="end">GOVERNED USE · ACTIVE</text></g>
    <g className="terms-connectors"><path d="M207 137H230Q242 137 242 151v25"/><path d="M393 137H370Q358 137 358 151v25"/><path d="M207 313H230Q242 313 242 299v-25"/><path d="M393 313H370Q358 313 358 299v-25"/><path className="terms-spine" d="M218 225h-40M382 225h40"/></g>
    <g className="terms-signals" filter="url(#terms-glow)"><circle r="3"><animateMotion dur="10s" repeatCount="indefinite" path="M207 137H230Q242 137 242 151v25"/></circle><circle r="3"><animateMotion dur="10s" begin="2.5s" repeatCount="indefinite" path="M358 176v-25q0-14 12-14h23"/></circle><circle r="3"><animateMotion dur="10s" begin="5s" repeatCount="indefinite" path="M242 274v25q0 14-12 14h-23"/></circle><circle r="3"><animateMotion dur="10s" begin="7.5s" repeatCount="indefinite" path="M358 274v25q0 14 12 14h23"/></circle></g>
    <Module x={21} y={99} title="ACCESS" subtitle="Accounts & Authorised Users" type="access" accent="teal"/><Module x={393} y={99} title="SERVICE" subtitle="Plans, Orders & Delivery" type="service" accent="gold"/><Module x={21} y={273} title="USE" subtitle="Permitted & Prohibited Activity" type="use" accent="gold"/><Module x={393} y={273} title="RESPONSIBILITY" subtitle="Data, Compliance & Decisions" type="responsibility" accent="teal"/>
    <g className="terms-agreement__core" filter="url(#terms-depth)"><rect x="218" y="169" width="174" height="120" rx="4" className="terms-agreement__layer terms-agreement__layer--rear"/><rect x="209" y="161" width="174" height="120" rx="4" className="terms-agreement__layer terms-agreement__layer--back"/><rect x="218" y="169" width="164" height="112" rx="3" className="terms-agreement__layer"/><rect x="226" y="177" width="148" height="96" rx="1" className="terms-agreement__inner"/><path className="terms-agreement__header" d="M226 202h148"/><path className="terms-agreement__section" d="M238 217h96M238 225h76M238 233h86M238 241h62M238 249h73"/><text className="terms-agreement__title" x="300" y="190" textAnchor="middle">PLATFORM AGREEMENT</text><text className="terms-agreement__subtitle" x="300" y="199" textAnchor="middle">TERMS OF ACCESS &amp; USE</text><g className="terms-agreement__confirmation" transform="translate(354 250)"><circle r="11"/><circle r="7"/><path d="m-4 0 3 3 6-7"/></g><path className="terms-agreement__signature" d="M238 260h54m-47-5 7 5 10-8 9 8"/><path className="terms-agreement__shine" d="M230 179h140"/><circle className="terms-agreement__status" cx="363" cy="187" r="3"/><circle className="terms-agreement__pulse" cx="363" cy="187" r="9"/></g>
    <Indicator x={55} y={51} width={80} label="BILLING" tone="gold"/><Indicator x={151} y={51} width={151} label="INTELLECTUAL PROPERTY"/><Indicator x={318} y={51} width={140} label="CONFIDENTIALITY" tone="gold"/><Indicator x={91} y={375} width={102} label="SUSPENSION" subdued/><Indicator x={244} y={375} width={112} label="TERMINATION" tone="gold" subdued/><Indicator x={407} y={375} width={90} label="DISPUTES" subdued/>
  </svg><figcaption>{caption}</figcaption></figure>;
}
