import { motion } from "motion/react";

const checkpoints = [
  { x: 300, y: 58, delay: "0s" },
  { x: 476, y: 142, delay: "0.5s" },
  { x: 500, y: 330, delay: "1s" },
  { x: 383, y: 443, delay: "1.5s" },
  { x: 194, y: 433, delay: "2s" },
  { x: 88, y: 292, delay: "2.5s" },
  { x: 123, y: 119, delay: "3s" },
] as const;

export function AnimatedGovernanceSystem() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.15 }}
      className="relative flex min-h-[360px] items-center justify-center sm:min-h-[430px] lg:min-h-[540px]"
      aria-hidden="true"
    >
      <style>{`
        @keyframes governance-orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes governance-orbit-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes governance-pathway {
          to { stroke-dashoffset: -84; }
        }
        @keyframes governance-checkpoint {
          0%, 100% { opacity: .38; }
          50% { opacity: 1; }
        }
        @keyframes governance-core {
          0%, 100% { opacity: .28; transform: scale(.94); }
          50% { opacity: .55; transform: scale(1.04); }
        }
        .governance-orbit,
        .governance-orbit-reverse,
        .governance-core {
          transform-box: fill-box;
          transform-origin: center;
        }
        .governance-orbit { animation: governance-orbit 36s linear infinite; }
        .governance-orbit-reverse { animation: governance-orbit-reverse 48s linear infinite; }
        .governance-pathway { animation: governance-pathway 18s linear infinite; }
        .governance-checkpoint { animation: governance-checkpoint 4.8s ease-in-out infinite; }
        .governance-core { animation: governance-core 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .governance-orbit,
          .governance-orbit-reverse,
          .governance-pathway,
          .governance-checkpoint,
          .governance-core { animation-play-state: paused; }
        }
      `}</style>

      <div className="absolute inset-[16%] rounded-full bg-[#00A8B5]/[0.06] blur-3xl" />
      <svg
        viewBox="0 0 600 510"
        className="relative w-full max-w-[580px] overflow-visible"
      >
        <defs>
          <radialGradient id="governance-core-glow">
            <stop offset="0" stopColor="#F5D17A" stopOpacity=".62" />
            <stop offset=".38" stopColor="#00A8B5" stopOpacity=".18" />
            <stop offset="1" stopColor="#00A8B5" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="governance-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C89B3C" />
            <stop offset=".55" stopColor="#60758A" />
            <stop offset="1" stopColor="#00A8B5" />
          </linearGradient>
          <filter
            id="governance-shadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="12"
              floodColor="#000"
              floodOpacity=".7"
            />
          </filter>
        </defs>

        <g fill="none" opacity=".45">
          <circle
            cx="300"
            cy="252"
            r="221"
            stroke="#00A8B5"
            strokeOpacity=".16"
          />
          <circle
            cx="300"
            cy="252"
            r="194"
            stroke="#C89B3C"
            strokeOpacity=".16"
            strokeDasharray="2 13"
          />
          <path
            d="M77 252H523M300 29V475"
            stroke="#8AA1B8"
            strokeOpacity=".08"
          />
          <path
            d="M142 94L458 410M458 94L142 410"
            stroke="#8AA1B8"
            strokeOpacity=".06"
          />
        </g>

        <g className="governance-orbit" fill="none">
          <circle
            cx="300"
            cy="252"
            r="166"
            stroke="url(#governance-line)"
            strokeOpacity=".4"
            strokeDasharray="90 32 8 42"
          />
          <rect
            x="181"
            y="133"
            width="238"
            height="238"
            rx="24"
            transform="rotate(45 300 252)"
            stroke="#00A8B5"
            strokeOpacity=".12"
          />
        </g>
        <g className="governance-orbit-reverse" fill="none">
          <circle
            cx="300"
            cy="252"
            r="116"
            stroke="#C89B3C"
            strokeOpacity=".28"
            strokeDasharray="3 15"
          />
          <path
            d="M300 112L421 322H179Z"
            stroke="#00A8B5"
            strokeOpacity=".18"
          />
        </g>

        <g
          className="governance-pathway"
          fill="none"
          stroke="url(#governance-line)"
          strokeWidth="1.2"
          strokeDasharray="5 9"
          opacity=".6"
        >
          <path d="M300 58L300 180" />
          <path d="M476 142L371 211" />
          <path d="M500 330L381 286" />
          <path d="M383 443L340 329" />
          <path d="M194 433L249 327" />
          <path d="M88 292L215 270" />
          <path d="M123 119L230 205" />
        </g>

        <circle
          cx="300"
          cy="252"
          r="108"
          fill="url(#governance-core-glow)"
          className="governance-core"
        />
        <g filter="url(#governance-shadow)">
          <circle
            cx="300"
            cy="252"
            r="65"
            fill="#071321"
            stroke="url(#governance-line)"
            strokeWidth="1.5"
          />
          <circle
            cx="300"
            cy="252"
            r="45"
            fill="none"
            stroke="#00A8B5"
            strokeOpacity=".26"
            strokeDasharray="2 8"
          />
          <rect
            x="278"
            y="230"
            width="44"
            height="44"
            rx="3"
            fill="#0B1A2A"
            stroke="#C89B3C"
            strokeOpacity=".7"
          />
          <circle cx="300" cy="252" r="7" fill="#D7B35F" />
        </g>

        {checkpoints.map(({ x, y, delay }) => (
          <g
            key={`${x}-${y}`}
            className="governance-checkpoint"
            style={{ animationDelay: delay }}
          >
            <circle
              cx={x}
              cy={y}
              r="11"
              fill="#06101E"
              stroke="#00A8B5"
              strokeOpacity=".65"
            />
            <circle cx={x} cy={y} r="3" fill="#F5D17A" />
          </g>
        ))}

        <text
          x="300"
          y="503"
          textAnchor="middle"
          fill="#8190A1"
          fontSize="10"
          letterSpacing="4"
        >
          CONNECTED GOVERNANCE CONTROLS
        </text>
      </svg>
    </motion.div>
  );
}
