import { motion } from "motion/react";

const gearPoints = (teeth: number, outerRadius: number, rootRadius: number) =>
  Array.from({ length: teeth * 4 }, (_, index) => {
    const step = index % 4;
    const radius = step === 1 || step === 2 ? outerRadius : rootRadius;
    const angle = (index / (teeth * 4)) * Math.PI * 2 - Math.PI / 2;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(" ");

type GearProps = { x: number; y: number; radius: number; teeth: number; reverse?: boolean; speed: "slow" | "medium" | "fast" };

function Gear({ x, y, radius, teeth, reverse = false, speed }: GearProps) {
  return (
    <g className={`platform-gear platform-gear--${speed}${reverse ? " platform-gear--reverse" : ""}`} style={{ transformOrigin: `${x}px ${y}px` }}>
      <g transform={`translate(${x} ${y})`}>
        <polygon points={gearPoints(teeth, radius, radius * 0.82)} fill="url(#gear-face)" stroke="url(#gear-stroke)" strokeWidth="1.25" />
        <circle r={radius * 0.63} fill="#06101e" stroke="rgba(200,155,60,.42)" />
        <circle r={radius * 0.42} fill="none" stroke="rgba(0,168,181,.2)" strokeWidth="5" />
        <circle r={radius * 0.2} fill="#09182a" stroke="url(#gear-stroke)" strokeWidth="1.5" />
        <circle r={radius * 0.065} fill="#d7b35f" />
      </g>
    </g>
  );
}

export function AnimatedGearSystem() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.15 }} className="platform-gears relative hidden lg:flex items-center justify-center min-h-[540px]" aria-label="Animated interconnected intelligence engine" role="img">
      <div className="absolute inset-[12%] rounded-full bg-[#00A8B5]/[0.06] blur-3xl" />
      <svg viewBox="0 0 620 590" className="relative w-full max-w-[620px] overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="gear-stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3d583" /><stop offset=".48" stopColor="#8c6a28" /><stop offset="1" stopColor="#00a8b5" /></linearGradient>
          <radialGradient id="gear-face" cx="35%" cy="25%"><stop offset="0" stopColor="#27374b" /><stop offset=".48" stopColor="#101c2c" /><stop offset="1" stopColor="#050c16" /></radialGradient>
          <radialGradient id="core-glow"><stop offset="0" stopColor="#f5d17a" stopOpacity=".8" /><stop offset=".32" stopColor="#00a8b5" stopOpacity=".25" /><stop offset="1" stopColor="#00a8b5" stopOpacity="0" /></radialGradient>
          <filter id="gear-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity=".75" /></filter>
        </defs>
        <g opacity=".45" fill="none">
          <circle cx="315" cy="285" r="246" stroke="#00a8b5" strokeOpacity=".18" />
          <circle cx="315" cy="285" r="226" stroke="#c89b3c" strokeOpacity=".12" strokeDasharray="2 14" />
          <path d="M72 285H548M315 42V530" stroke="#8aa1b8" strokeOpacity=".1" />
          <path d="M151 123L479 451M479 123L151 451" stroke="#8aa1b8" strokeOpacity=".07" />
        </g>
        <circle cx="315" cy="285" r="165" fill="url(#core-glow)" opacity=".35" className="platform-gear-pulse" />
        <g filter="url(#gear-shadow)">
          <Gear x={315} y={285} radius={112} teeth={16} speed="slow" />
          <Gear x={469} y={214} radius={67} teeth={12} speed="medium" reverse />
          <Gear x={452} y={371} radius={51} teeth={10} speed="fast" />
          <Gear x={189} y={415} radius={73} teeth={12} speed="medium" reverse />
          <Gear x={164} y={221} radius={54} teeth={10} speed="fast" reverse />
        </g>
        {[[315, 77], [527, 285], [315, 507], [92, 285], [463, 118], [497, 444], [130, 456]].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`} className="platform-gear-node" style={{ animationDelay: `${index * 0.22}s` }}><circle cx={cx} cy={cy} r="6" fill="#071522" stroke="#00a8b5" /><circle cx={cx} cy={cy} r="2" fill="#f5d17a" /></g>
        ))}
        <text x="315" y="558" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">INTERCONNECTED INTELLIGENCE</text>
      </svg>
    </motion.div>
  );
}
