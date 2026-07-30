import { motion } from "motion/react";
import type { CSSProperties } from "react";

type ControlModuleProps = {
  x: number;
  y: number;
  radius: number;
  reverse?: boolean;
  speed: "slow" | "medium" | "fast";
  kind: "verification" | "records" | "access" | "review";
};

function ControlModule({ x, y, radius, reverse = false, speed, kind }: ControlModuleProps) {
  const labels = {
    verification: "VERIFY",
    records: "RECORD",
    access: "ACCESS",
    review: "REVIEW",
  } as const;

  return (
    <g filter="url(#governance-shadow)">
      <circle cx={x} cy={y} r={radius} fill="url(#governance-face)" stroke="url(#governance-stroke)" strokeWidth="1.25" />
      <circle cx={x} cy={y} r={radius * 0.76} fill="#06101e" stroke="rgba(200,155,60,.32)" />
      <g
        className={`platform-gear platform-gear--${speed}${reverse ? " platform-gear--reverse" : ""}`}
        style={{ transformOrigin: `${x}px ${y}px` }}
      >
        <circle cx={x} cy={y} r={radius * 0.88} fill="none" stroke="#00a8b5" strokeOpacity=".38" strokeWidth="3" strokeDasharray={`${radius * 0.62} ${radius * 0.24}`} />
        <circle cx={x} cy={y} r={radius * 0.57} fill="none" stroke="#c89b3c" strokeOpacity=".4" strokeDasharray="3 9" />
        {[0, 90, 180, 270].map((angle) => (
          <rect
            key={angle}
            x={x - 3}
            y={y - radius * 0.9}
            width="6"
            height="12"
            rx="1"
            fill="#081827"
            stroke="#d7b35f"
            strokeWidth=".7"
            transform={`rotate(${angle} ${x} ${y})`}
          />
        ))}
      </g>
      {kind === "records" || kind === "review" ? (
        <g fill="none" strokeLinecap="round">
          <rect x={x - radius * 0.3} y={y - radius * 0.29} width={radius * 0.6} height={radius * 0.58} rx="3" fill="#0b1a2a" stroke="#60758a" />
          {[-0.13, 0, 0.13].map((offset, index) => (
            <path key={offset} d={`M${x - radius * 0.18} ${y + radius * offset}H${x + radius * (index === 2 ? 0.08 : 0.18)}`} stroke={index === 0 ? "#d7b35f" : "#00a8b5"} strokeOpacity=".7" />
          ))}
        </g>
      ) : (
        <g fill="none">
          <path d={`M${x} ${y - radius * 0.28}L${x + radius * 0.27} ${y - radius * 0.12}V${y + radius * 0.2}L${x} ${y + radius * 0.32}L${x - radius * 0.27} ${y + radius * 0.2}V${y - radius * 0.12}Z`} fill="#0b1a2a" stroke="#00a8b5" strokeOpacity=".7" />
          <path d={`M${x - radius * 0.12} ${y}L${x - radius * 0.025} ${y + radius * 0.09}L${x + radius * 0.15} ${y - radius * 0.12}`} stroke="#d7b35f" strokeWidth="2" />
        </g>
      )}
      <text x={x} y={y + radius * 0.56} textAnchor="middle" fill="#8190a1" fontSize={Math.max(5, radius * 0.1)} letterSpacing="1.4">{labels[kind]}</text>
    </g>
  );
}

const signals = [
  { path: "M315 285 L469 190", delay: "-1s", duration: "7s" },
  { path: "M315 285 L470 390", delay: "-4s", duration: "8s" },
  { path: "M315 285 L175 410", delay: "-2s", duration: "7.5s" },
  { path: "M315 285 L160 190", delay: "-5s", duration: "8.5s" },
] as const;

export function AnimatedGovernanceSystem() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.15 }}
      className="relative flex min-h-[360px] items-center justify-center sm:min-h-[460px] lg:min-h-[540px]"
      aria-label="Animated connected governance control system"
      role="img"
    >
      <style>{`
        @keyframes governance-signal-travel { to { offset-distance: 100%; } }
        @keyframes governance-path-flow { to { stroke-dashoffset: -56; } }
        .governance-signal { offset-distance: 0%; animation: governance-signal-travel var(--signal-duration) linear infinite; }
        .governance-path-flow { animation: governance-path-flow 11s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .governance-signal, .governance-path-flow { animation-play-state: paused; }
        }
      `}</style>
      <div className="absolute inset-[12%] rounded-full bg-[#00A8B5]/[0.06] blur-3xl" />
      <svg viewBox="0 0 620 590" className="relative w-full max-w-[620px] overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="governance-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3d583" /><stop offset=".48" stopColor="#8c6a28" /><stop offset="1" stopColor="#00a8b5" />
          </linearGradient>
          <radialGradient id="governance-face" cx="35%" cy="25%">
            <stop offset="0" stopColor="#27374b" /><stop offset=".48" stopColor="#101c2c" /><stop offset="1" stopColor="#050c16" />
          </radialGradient>
          <radialGradient id="governance-core-glow">
            <stop offset="0" stopColor="#f5d17a" stopOpacity=".8" /><stop offset=".32" stopColor="#00a8b5" stopOpacity=".25" /><stop offset="1" stopColor="#00a8b5" stopOpacity="0" />
          </radialGradient>
          <filter id="governance-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity=".75" />
          </filter>
          <filter id="governance-signal-glow" x="-300%" y="-300%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g opacity=".45" fill="none">
          <circle cx="315" cy="285" r="246" stroke="#00a8b5" strokeOpacity=".18" />
          <circle className="platform-gear platform-gear--slow" style={{ transformOrigin: "315px 285px" }} cx="315" cy="285" r="226" stroke="#c89b3c" strokeOpacity=".16" strokeDasharray="2 14" />
          <circle className="platform-gear platform-gear--medium platform-gear--reverse" style={{ transformOrigin: "315px 285px" }} cx="315" cy="285" r="196" stroke="url(#governance-stroke)" strokeOpacity=".22" strokeDasharray="76 18 5 31" />
          <path d="M72 285H558M315 42V530" stroke="#8aa1b8" strokeOpacity=".1" />
          <path d="M151 123L479 451M479 123L151 451" stroke="#8aa1b8" strokeOpacity=".07" />
        </g>

        <g className="governance-path-flow" fill="none" stroke="url(#governance-stroke)" strokeWidth="1.2" strokeDasharray="5 9" opacity=".58">
          {signals.map(({ path }) => <path key={path} d={path} />)}
        </g>

        <circle cx="315" cy="285" r="165" fill="url(#governance-core-glow)" opacity=".35" className="platform-gear-pulse" />
        <g filter="url(#governance-shadow)">
          <circle cx="315" cy="285" r="112" fill="url(#governance-face)" stroke="url(#governance-stroke)" strokeWidth="1.5" />
          <circle cx="315" cy="285" r="91" fill="#06101e" stroke="#c89b3c" strokeOpacity=".35" />
          <g className="platform-gear platform-gear--slow" style={{ transformOrigin: "315px 285px" }} fill="none">
            <circle cx="315" cy="285" r="98" stroke="#00a8b5" strokeOpacity=".42" strokeWidth="4" strokeDasharray="78 18" />
            <circle cx="315" cy="285" r="73" stroke="#c89b3c" strokeOpacity=".45" strokeDasharray="3 12" />
          </g>
          <rect x="273" y="243" width="84" height="84" rx="9" fill="#09182a" stroke="url(#governance-stroke)" />
          <rect x="285" y="255" width="60" height="60" rx="4" fill="#071321" stroke="#00a8b5" strokeOpacity=".5" />
          <path d="M297 276H333M297 286H325M297 296H335" stroke="#8190a1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="337" cy="263" r="4" fill="#d7b35f" className="platform-gear-node" />
          <text x="315" y="345" textAnchor="middle" fill="#8190a1" fontSize="7" letterSpacing="1.7">GOVERNANCE CORE</text>
        </g>

        <ControlModule x={469} y={190} radius={67} speed="medium" reverse kind="verification" />
        <ControlModule x={470} y={390} radius={58} speed="fast" kind="records" />
        <ControlModule x={175} y={410} radius={73} speed="medium" reverse kind="review" />
        <ControlModule x={160} y={190} radius={58} speed="fast" reverse kind="access" />

        {signals.map(({ path, delay, duration }, index) => (
          <circle
            key={path}
            r="3.5"
            fill={index % 2 ? "#f5d17a" : "#5edde8"}
            filter="url(#governance-signal-glow)"
            className="governance-signal"
            style={{ offsetPath: `path('${path}')`, animationDelay: delay, "--signal-duration": duration } as CSSProperties}
          />
        ))}

        {[[315, 77], [527, 285], [315, 507], [92, 285], [463, 118], [497, 444], [130, 456]].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`} className="platform-gear-node" style={{ animationDelay: `${index * 0.22}s` }}>
            <circle cx={cx} cy={cy} r="6" fill="#071522" stroke="#00a8b5" /><circle cx={cx} cy={cy} r="2" fill="#f5d17a" />
          </g>
        ))}
        <text x="315" y="558" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">CONNECTED GOVERNANCE CONTROLS</text>
      </svg>
    </motion.div>
  );
}
