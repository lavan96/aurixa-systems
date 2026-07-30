type StageType = "collect" | "use" | "protect" | "rights";

const StageIcon = ({ type }: { type: StageType }) => {
  if (type === "collect") return <><path d="M7 5h13v15H7z"/><path d="M3 9h8M7 5l4 4-4 4"/></>;
  if (type === "use") return <><circle cx="7" cy="12" r="3"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M10 11l7-4M10 13l7 4"/></>;
  if (type === "protect") return <><path d="M4 7h16v12H4zM8 7V4h8v3M8 11h8M8 15h5"/><circle cx="18" cy="15" r="1.5"/></>;
  return <><circle cx="9" cy="8" r="3"/><path d="M3 19c1-4 3-6 6-6s5 2 6 6M16 6h6v10h-6M18 9h2M18 12h2"/></>;
};

const Stage = ({ x, y, title, subtitle, type, accent }: { x: number; y: number; title: string; subtitle: string; type: StageType; accent: "teal" | "gold" }) => (
  <g className={`privacy-stage privacy-stage--${type} privacy-stage--${accent}`} transform={`translate(${x} ${y})`}>
    <rect x="3" y="4" width="160" height="76" rx="3" className="privacy-stage__shadow"/>
    <rect width="166" height="76" rx="3" className="privacy-stage__surface"/>
    <rect x="5" y="5" width="156" height="66" rx="1" className="privacy-stage__inner"/>
    <path d="M0 17V0h17M149 76h17V59" className="privacy-stage__corner"/>
    <path d="M6 6h48M112 70h48" className="privacy-stage__edge"/>
    <g transform="translate(14 25)" className="privacy-stage__icon"><rect x="-6" y="-9" width="36" height="36" rx="2"/><g transform="translate(0 0)"><StageIcon type={type}/></g></g>
    <text x="57" y="30" className="privacy-stage__title">{title}</text>
    <text x="57" y="49" className="privacy-stage__subtitle">{subtitle}</text>
    <circle cx="151" cy="15" r="3" className="privacy-stage__status"/><path d="M143 61h10" className="privacy-stage__meter"/>
  </g>
);

const Status = ({ x, y, label, tone = "teal" }: { x: number; y: number; label: string; tone?: "teal" | "gold" }) => (
  <g className={`privacy-indicator privacy-indicator--${tone}`} transform={`translate(${x} ${y})`}><circle r="4"/><path d="M8 0h8"/><text x="21" y="3">{label}</text></g>
);

export function PrivacyLifecycleVisual() {
  return <figure className="legal-visual privacy-lifecycle" aria-hidden="true">
    <svg viewBox="0 0 600 450" className="w-full" focusable="false">
      <defs>
        <linearGradient id="privacy-boundary" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5EDDE8"/><stop offset=".48" stopColor="#8297A8"/><stop offset="1" stopColor="#D7B35F"/></linearGradient>
        <radialGradient id="privacy-atmosphere"><stop stopColor="#1B8190" stopOpacity=".24"/><stop offset=".5" stopColor="#0B2B43" stopOpacity=".13"/><stop offset="1" stopColor="#030A15" stopOpacity="0"/></radialGradient>
        <linearGradient id="privacy-record-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#10283C"/><stop offset=".48" stopColor="#09192A"/><stop offset="1" stopColor="#050E1B"/></linearGradient>
        <linearGradient id="privacy-scan"><stop stopColor="#5EDDE8" stopOpacity="0"/><stop offset=".5" stopColor="#8FF5F3" stopOpacity=".32"/><stop offset="1" stopColor="#5EDDE8" stopOpacity="0"/></linearGradient>
        <filter id="privacy-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="privacy-depth" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000713" floodOpacity=".8"/><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#2BC4CF" floodOpacity=".14"/></filter>
        <pattern id="privacy-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8BBDCA" strokeOpacity=".052"/></pattern>
        <pattern id="privacy-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#B9E9ED" fillOpacity=".12"/></pattern>
      </defs>
      <rect width="600" height="450" fill="#040C18"/><rect width="600" height="450" fill="url(#privacy-grid)"/><ellipse cx="300" cy="225" rx="250" ry="188" fill="url(#privacy-atmosphere)"/>
      <g className="privacy-field" fill="none"><path className="privacy-boundary" d="M38 64h34V42h456v22h34v322h-34v22H72v-22H38z"/><rect x="55" y="58" width="490" height="334" rx="4"/><ellipse cx="300" cy="225" rx="208" ry="151"/><ellipse className="privacy-orbit" cx="300" cy="225" rx="178" ry="129"/><path d="M76 88h38M486 88h38M76 362h38M486 362h38M76 104v-16M524 104V88M76 362v-16M524 362v-16"/></g>
      <path className="privacy-sweep" d="M74 112H526"/>
      <g className="privacy-data-dots"><path d="M50 119h42v58H50zM508 268h42v61h-42z" fill="url(#privacy-dots)"/></g>
      <g className="privacy-connectors"><path d="M200 132C230 132 230 169 254 177"/><path d="M400 132C370 132 370 169 346 177"/><path d="M200 318C230 318 230 281 254 273"/><path d="M400 318C370 318 370 281 346 273"/><path className="privacy-rail" d="M117 174v102M483 174v102"/></g>
      <g className="privacy-signals" filter="url(#privacy-glow)"><circle r="3"><animateMotion dur="9s" repeatCount="indefinite" path="M200 132C230 132 230 169 254 177"/></circle><circle r="3"><animateMotion dur="9s" begin="2.2s" repeatCount="indefinite" path="M346 177C370 169 370 132 400 132"/></circle><circle r="3"><animateMotion dur="9s" begin="4.5s" repeatCount="indefinite" path="M200 318C230 318 230 281 254 273"/></circle><circle r="3"><animateMotion dur="9s" begin="6.7s" repeatCount="indefinite" path="M346 273C370 281 370 318 400 318"/></circle></g>
      <Stage x={34} y={94} title="COLLECT" subtitle="Information Received" type="collect" accent="teal"/><Stage x={400} y={94} title="USE" subtitle="Authorised Purposes" type="use" accent="gold"/><Stage x={34} y={280} title="PROTECT" subtitle="Access & Safeguards" type="protect" accent="gold"/><Stage x={400} y={280} title="RIGHTS" subtitle="Access & Correction" type="rights" accent="teal"/>
      <g className="privacy-record" filter="url(#privacy-depth)"><rect x="226" y="157" width="148" height="142" rx="5" className="privacy-record__back"/><rect x="236" y="150" width="128" height="142" rx="4" className="privacy-record__outer"/><rect x="244" y="158" width="112" height="126" rx="2" className="privacy-record__inner"/><path d="M244 178h112M244 260h112" className="privacy-record__rule"/><path d="M251 166h20M329 276h20" className="privacy-record__highlight"/><circle cx="255" cy="169" r="3"/><path d="M264 167h54M264 172h34"/><g className="privacy-record__identity"><circle cx="271" cy="212" r="12"/><path d="M253 238c3-13 33-13 36 0"/></g><path className="privacy-record__fields" d="M300 207h43M300 216h36M300 225h40M300 234h27"/><text x="300" y="190" textAnchor="middle" className="privacy-record__title">PERSONAL INFORMATION</text><text x="300" y="251" textAnchor="middle" className="privacy-record__subtitle">CONTROLLED RECORD · GOVERNED</text><rect x="246" y="160" width="108" height="8" className="privacy-record__scan"/><circle cx="345" cy="270" r="4" className="privacy-record__status"/><circle cx="345" cy="270" r="9" className="privacy-record__pulse"/></g>
      <g className="privacy-indicators"><Status x={109} y={208} label="DISCLOSURE"/><Status x={423} y={208} label="RETENTION" tone="gold"/><Status x={109} y={250} label="REQUESTS" tone="gold"/><Status x={423} y={250} label="RESPONSE"/></g>
      <g className="privacy-coordinates"><text x="61" y="78">FIELD / PII-04</text><text x="539" y="378" textAnchor="end">GOVERNANCE ACTIVE</text></g>
    </svg><figcaption>PERSONAL INFORMATION LIFECYCLE</figcaption>
  </figure>;
}
