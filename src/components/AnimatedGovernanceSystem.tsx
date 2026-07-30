import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

type ComplianceModuleProps = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  delay: string;
  symbol: ReactNode;
};

function ComplianceModule({ x, y, title, subtitle, delay, symbol }: ComplianceModuleProps) {
  const textX = x - 37;
  const isDueDiligence = title === "AML/CTF & CDD";

  return (
    <g
      className="compliance-module"
      style={{ transformOrigin: `${x}px ${y}px`, animationDelay: delay }}
    >
      <rect
        x={x - 88}
        y={y - 48}
        width="176"
        height="96"
        rx="9"
        fill="url(#compliance-panel)"
        stroke="url(#compliance-stroke)"
        strokeWidth="1.2"
        filter="url(#compliance-shadow)"
      />
      <path
        d={`M${x - 76} ${y - 35}H${x - 60}M${x + 60} ${y - 35}H${x + 76}M${x - 76} ${y + 35}H${x - 60}M${x + 60} ${y + 35}H${x + 76}`}
        stroke="#00a8b5"
        strokeOpacity=".42"
      />
      <g transform={`translate(${x - 62} ${y})`}>{symbol}</g>
      <circle cx={x + 72} cy={y - 33} r="4.5" fill="#071522" stroke="#00a8b5" />
      <circle cx={x + 72} cy={y - 33} r="1.8" fill="#f5d17a" className="platform-gear-node" />
      <text
        x={textX}
        y={y - 7}
        fill="#e3e8ee"
        fontSize={isDueDiligence ? "10.5" : "11.5"}
        fontWeight="600"
        letterSpacing={isDueDiligence ? ".85" : "1.15"}
      >
        {title}
      </text>
      <text
        x={textX}
        y={y + 13}
        fill="#9aa8b8"
        fontSize="8.6"
        letterSpacing=".25"
        {...(isDueDiligence ? { textLength: 108, lengthAdjust: "spacingAndGlyphs" } : {})}
      >
        {subtitle}
      </text>
      <path d={`M${textX} ${y + 27}H${x + 65}`} stroke="#60758a" strokeOpacity=".28" />
      <path d={`M${textX} ${y + 27}H${x + 18}`} stroke="#c89b3c" strokeOpacity=".55" />
    </g>
  );
}

const signalPaths = [
  { path: "M166 163 C205 190 238 218 273 253", delay: "-1s", duration: "8s" },
  { path: "M464 163 C423 190 392 218 357 253", delay: "-5s", duration: "8s" },
  { path: "M166 407 C207 381 239 351 273 317", delay: "-3s", duration: "8s" },
  { path: "M464 407 C424 380 391 351 357 317", delay: "-7s", duration: "8s" },
] as const;

const SecuritySymbol = (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="-13" y="-15" width="26" height="30" rx="3" fill="#09182a" stroke="#00a8b5" strokeOpacity=".75" />
    <path d="M-7-7H7M-7 0H3M-7 7H7" stroke="#8190a1" />
    <circle cx="8" cy="0" r="3" fill="#d7b35f" stroke="none" />
  </g>
);

const DueDiligenceSymbol = (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cy="-7" r="5" stroke="#d7b35f" />
    <path d="M-10 10C-9 2 9 2 10 10M14-10H23M14-2H23M14 6H23" stroke="#00a8b5" />
    <path d="M16-12L18-10 22-14" stroke="#d7b35f" />
  </g>
);

const PrivacySymbol = (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="-14" y="-13" width="28" height="26" rx="3" fill="#09182a" stroke="#00a8b5" strokeOpacity=".75" />
    <path d="M-8-6H8M-8 0H5M-8 6H2" stroke="#8190a1" />
    <circle cx="10" cy="9" r="5" fill="#071522" stroke="#d7b35f" />
    <path d="M8 9L10 11 13 7" stroke="#d7b35f" />
  </g>
);

const GovernanceSymbol = (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-12-15H8L14-9V15H-12Z" fill="#09182a" stroke="#d7b35f" strokeOpacity=".8" />
    <path d="M8-15V-9H14M-6-5H8M-6 1H8M-6 7H3" stroke="#8190a1" />
    <circle cx="9" cy="9" r="3" fill="#00a8b5" stroke="none" />
  </g>
);

export function AnimatedGovernanceSystem() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.15 }}
      className="relative flex min-h-[360px] items-center justify-center sm:min-h-[460px] lg:min-h-[540px]"
      aria-label="Animated connected compliance operating system"
      role="img"
    >
      <style>{`
        @keyframes compliance-signal-travel { to { offset-distance: 100%; } }
        @keyframes compliance-path-flow { to { stroke-dashoffset: -56; } }
        @keyframes compliance-module-status {
          0%, 18%, 100% { filter: none; }
          7% { filter: drop-shadow(0 0 8px rgba(0,168,181,.38)); }
        }
        @keyframes compliance-core-activity {
          0%, 100% { opacity: .45; transform: scale(.94); }
          50% { opacity: .9; transform: scale(1.04); }
        }
        .compliance-signal { offset-distance: 0%; animation: compliance-signal-travel var(--signal-duration) linear infinite; }
        .compliance-path-flow { animation: compliance-path-flow 11s linear infinite; }
        .compliance-module { transform-box: fill-box; animation: compliance-module-status 8s ease-in-out infinite; }
        .compliance-core-activity { transform-box: fill-box; transform-origin: center; animation: compliance-core-activity 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .compliance-signal, .compliance-path-flow, .compliance-module, .compliance-core-activity { animation-play-state: paused; }
        }
      `}</style>
      <div className="absolute inset-[12%] rounded-full bg-[#00A8B5]/[0.06] blur-3xl" />
      <svg viewBox="0 0 620 590" className="relative w-full max-w-[620px] overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="compliance-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3d583" /><stop offset=".48" stopColor="#8c6a28" /><stop offset="1" stopColor="#00a8b5" />
          </linearGradient>
          <radialGradient id="compliance-panel" cx="35%" cy="25%">
            <stop offset="0" stopColor="#223247" /><stop offset=".5" stopColor="#101c2c" /><stop offset="1" stopColor="#050c16" />
          </radialGradient>
          <radialGradient id="compliance-core-glow">
            <stop offset="0" stopColor="#f5d17a" stopOpacity=".65" /><stop offset=".35" stopColor="#00a8b5" stopOpacity=".22" /><stop offset="1" stopColor="#00a8b5" stopOpacity="0" />
          </radialGradient>
          <filter id="compliance-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity=".75" />
          </filter>
          <filter id="compliance-signal-glow" x="-300%" y="-300%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g fill="none">
          <rect x="58" y="48" width="514" height="474" rx="94" stroke="#00a8b5" strokeOpacity=".16" />
          <rect x="78" y="68" width="474" height="434" rx="78" stroke="#c89b3c" strokeOpacity=".12" strokeDasharray="2 14" />
          <path d="M315 49V521M59 285H571" stroke="#8aa1b8" strokeOpacity=".07" />
          <path d="M88 84H132M498 84H542M88 486H132M498 486H542" stroke="#00a8b5" strokeOpacity=".28" />
        </g>

        <g className="compliance-path-flow" fill="none" stroke="url(#compliance-stroke)" strokeWidth="1.25" strokeDasharray="5 9" opacity=".65">
          {signalPaths.map(({ path }) => <path key={path} d={path} />)}
        </g>

        <circle cx="315" cy="285" r="126" fill="url(#compliance-core-glow)" className="platform-gear-pulse" />
        <g filter="url(#compliance-shadow)">
          <rect x="220" y="229" width="190" height="112" rx="16" fill="url(#compliance-panel)" stroke="url(#compliance-stroke)" strokeWidth="1.5" />
          <rect x="231" y="240" width="168" height="90" rx="10" fill="#06101e" stroke="#00a8b5" strokeOpacity=".3" />
          <g className="platform-gear platform-gear--slow" style={{ transformOrigin: "315px 285px" }} fill="none">
            <circle cx="315" cy="285" r="47" stroke="#00a8b5" strokeOpacity=".32" strokeDasharray="30 12 4 14" />
            <circle cx="315" cy="285" r="37" stroke="#c89b3c" strokeOpacity=".3" strokeDasharray="2 9" />
          </g>
          <circle cx="315" cy="272" r="17" fill="#09182a" stroke="#c89b3c" strokeOpacity=".75" />
          <path d="M306 272H324M315 263V281" stroke="#00a8b5" strokeWidth="1.5" />
          <circle cx="315" cy="272" r="5" fill="#d7b35f" className="compliance-core-activity" />
          <text x="315" y="307" textAnchor="middle" fill="#e3e8ee" fontSize="10.5" fontWeight="600" letterSpacing=".7" textLength="158" lengthAdjust="spacingAndGlyphs">COMPLIANCE OPERATING LAYER</text>
          <text x="315" y="321" textAnchor="middle" fill="#8190a1" fontSize="7.5" letterSpacing="1">CONNECTED OVERSIGHT</text>
        </g>

        <ComplianceModule x={166} y={147} title="SECURITY" subtitle="Infrastructure & Access" delay="0s" symbol={SecuritySymbol} />
        <ComplianceModule x={464} y={147} title="AML/CTF & CDD" subtitle="Due Diligence Workflows" delay="2s" symbol={DueDiligenceSymbol} />
        <ComplianceModule x={166} y={423} title="PRIVACY" subtitle="Information Management" delay="4s" symbol={PrivacySymbol} />
        <ComplianceModule x={464} y={423} title="GOVERNANCE" subtitle="Terms & Responsibility" delay="6s" symbol={GovernanceSymbol} />

        {signalPaths.map(({ path, delay, duration }, index) => (
          <circle
            key={path}
            r="3.5"
            fill={index % 2 ? "#f5d17a" : "#5edde8"}
            filter="url(#compliance-signal-glow)"
            className="compliance-signal"
            style={{ offsetPath: `path('${path}')`, animationDelay: delay, "--signal-duration": duration } as CSSProperties}
          />
        ))}

        {[[315, 58], [557, 285], [315, 512], [73, 285]].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`} className="platform-gear-node" style={{ animationDelay: `${index * 0.55}s` }}>
            <circle cx={cx} cy={cy} r="6" fill="#071522" stroke="#00a8b5" /><circle cx={cx} cy={cy} r="2" fill="#f5d17a" />
          </g>
        ))}
        <text x="315" y="558" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">CONNECTED COMPLIANCE OPERATIONS</text>
      </svg>
    </motion.div>
  );
}
