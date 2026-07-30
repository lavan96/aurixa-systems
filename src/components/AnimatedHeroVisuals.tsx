import { motion } from "motion/react";
import type { ReactNode } from "react";

type HeroVisualProps = {
  label: string;
  children: ReactNode;
};

function HeroVisual({ label, children }: HeroVisualProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
      className="relative hidden min-h-[520px] items-center justify-center lg:flex"
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-[14%] rounded-full bg-[#00A8B5]/[0.055] blur-3xl" />
      {children}
    </motion.div>
  );
}

const visualClassName = "relative w-full max-w-[590px] overflow-visible";

export function SolutionsHeroVisual() {
  const spokes = Array.from({ length: 12 }, (_, index) => index * 30);

  return (
    <HeroVisual label="Animated strategic market targeting and growth system">
      <svg viewBox="0 0 600 560" className={visualClassName} aria-hidden="true">
        <defs>
          <linearGradient id="solution-line" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#00a8b5" /><stop offset=".55" stopColor="#f5d17a" /><stop offset="1" stopColor="#c89b3c" />
          </linearGradient>
          <radialGradient id="solution-core"><stop stopColor="#f5d17a" stopOpacity=".55" /><stop offset=".25" stopColor="#00a8b5" stopOpacity=".16" /><stop offset="1" stopColor="#00a8b5" stopOpacity="0" /></radialGradient>
          <filter id="solution-glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx="300" cy="270" r="235" fill="url(#solution-core)" className="hero-visual-breathe" />
        <g fill="none" transform="translate(300 270)">
          <circle r="210" stroke="#00a8b5" strokeOpacity=".14" />
          <circle r="171" stroke="#c89b3c" strokeOpacity=".22" strokeDasharray="3 10" className="hero-visual-spin-slow" />
          <circle r="126" stroke="#00a8b5" strokeOpacity=".32" strokeDasharray="34 13" className="hero-visual-spin-reverse" />
          {spokes.map((rotation) => <path key={rotation} d="M0-126V-210" stroke="#7894a8" strokeOpacity=".12" transform={`rotate(${rotation})`} />)}
        </g>
        <g className="solution-scan" transform="translate(300 270)">
          <path d="M0 0L-72-196A209 209 0 0 1 72-196Z" fill="url(#solution-line)" opacity=".1" />
          <line y2="-210" stroke="#00a8b5" strokeWidth="1.5" filter="url(#solution-glow)" />
        </g>
        <g filter="url(#solution-glow)">
          <circle cx="300" cy="270" r="70" fill="#07111f" stroke="url(#solution-line)" strokeWidth="1.5" />
          <circle cx="300" cy="270" r="45" fill="none" stroke="#00a8b5" strokeOpacity=".45" />
          <path d="M266 270H334M300 236V304" stroke="#f5d17a" strokeOpacity=".75" />
          <circle cx="300" cy="270" r="8" fill="#f5d17a" className="hero-visual-node" />
        </g>
        <g className="solution-growth-line" fill="none" stroke="url(#solution-line)" strokeWidth="3" filter="url(#solution-glow)">
          <path d="M88 425L162 390L225 407L289 344L351 361L421 281L509 215" />
          <path d="M487 214H510V237" />
        </g>
        {[[88,425],[162,390],[225,407],[289,344],[351,361],[421,281],[509,215]].map(([cx, cy], index) => <circle key={cx} cx={cx} cy={cy} r="5" fill={index === 6 ? "#f5d17a" : "#00a8b5"} className="hero-visual-node" style={{ animationDelay: `${index * .16}s` }} />)}
        <text x="300" y="530" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">PRECISION · CONVERGENCE · GROWTH</text>
      </svg>
    </HeroVisual>
  );
}

export function IndustriesHeroVisual() {
  const sectors = [
    { angle: -90, label: "ADVISORY" }, { angle: 30, label: "ENTERPRISE" }, { angle: 150, label: "PROPERTY" },
  ];

  return (
    <HeroVisual label="Animated network connecting property industry leaders">
      <svg viewBox="0 0 600 560" className={visualClassName} aria-hidden="true">
        <defs>
          <linearGradient id="industry-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5d17a" /><stop offset=".5" stopColor="#9b772f" /><stop offset="1" stopColor="#00a8b5" /></linearGradient>
          <radialGradient id="industry-core"><stop stopColor="#00a8b5" stopOpacity=".42" /><stop offset=".35" stopColor="#c89b3c" stopOpacity=".1" /><stop offset="1" stopOpacity="0" /></radialGradient>
          <filter id="industry-glow"><feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#00a8b5" floodOpacity=".45" /></filter>
        </defs>
        <circle cx="300" cy="270" r="235" fill="url(#industry-core)" className="hero-visual-breathe" />
        <g transform="translate(300 270)" fill="none">
          <circle r="213" stroke="#8494a4" strokeOpacity=".14" />
          <circle r="187" stroke="#c89b3c" strokeOpacity=".24" strokeDasharray="1 14" className="hero-visual-spin-slow" />
          <path d="M0-187L162 94L-162 94Z" stroke="#00a8b5" strokeOpacity=".2" />
          <circle r="113" stroke="#00a8b5" strokeOpacity=".22" strokeDasharray="12 8" className="hero-visual-spin-reverse" />
        </g>
        {sectors.map(({ angle, label }, index) => {
          const radians = angle * Math.PI / 180;
          const x = 300 + Math.cos(radians) * 187;
          const y = 270 + Math.sin(radians) * 187;
          return <g key={label} transform={`translate(${x} ${y})`} className="industry-orbit-node" style={{ animationDelay: `${index * .6}s` }}><circle r="36" fill="#07111f" stroke="url(#industry-metal)" /><circle r="27" fill="none" stroke="#00a8b5" strokeOpacity=".22" /><path d="M-8 8V-4L0-12L8-4V8M-13 8H13" fill="none" stroke="#f5d17a" /><text y="55" textAnchor="middle" fill="#8392a3" fontSize="8" letterSpacing="2">{label}</text></g>;
        })}
        <g transform="translate(300 270)" filter="url(#industry-glow)">
          <path d="M0-82L71-41V41L0 82L-71 41V-41Z" fill="#07111f" stroke="url(#industry-metal)" strokeWidth="1.5" />
          <path d="M0-55L48-28V28L0 55L-48 28V-28Z" fill="none" stroke="#00a8b5" strokeOpacity=".35" />
          <path d="M-28 28V2L0-24L28 2V28M-36 28H36M-14 28V8H14V28" fill="none" stroke="#f5d17a" strokeWidth="2" />
        </g>
        <g className="industry-capital-ring" transform="translate(300 270)"><circle cy="-113" r="5" fill="#f5d17a" /><circle cy="-113" r="12" fill="none" stroke="#f5d17a" strokeOpacity=".35" /></g>
        <text x="300" y="530" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">ONE SYSTEM · EVERY MARKET OPERATOR</text>
      </svg>
    </HeroVisual>
  );
}

export function AboutHeroVisual() {
  const nodes = [[300,95],[445,165],[470,330],[385,445],[215,445],[130,330],[155,165],[300,175],[395,260],[350,365],[250,365],[205,260]];
  const links = [[0,7],[1,8],[2,8],[2,9],[3,9],[4,10],[5,10],[5,11],[6,11],[7,8],[8,9],[9,10],[10,11],[11,7],[7,9],[8,10]];

  return (
    <HeroVisual label="Animated collective of people and code working as one system">
      <svg viewBox="0 0 600 560" className={visualClassName} aria-hidden="true">
        <defs>
          <linearGradient id="about-code" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00a8b5" /><stop offset=".55" stopColor="#d9e1ea" /><stop offset="1" stopColor="#f5d17a" /></linearGradient>
          <radialGradient id="about-core"><stop stopColor="#f5d17a" stopOpacity=".38" /><stop offset=".25" stopColor="#00a8b5" stopOpacity=".12" /><stop offset="1" stopOpacity="0" /></radialGradient>
          <filter id="about-glow"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#00a8b5" floodOpacity=".5" /></filter>
        </defs>
        <circle cx="300" cy="280" r="235" fill="url(#about-core)" className="hero-visual-breathe" />
        <g fill="none" stroke="#6d879b" strokeOpacity=".24">
          {links.map(([a,b], index) => <path key={index} d={`M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}`} className="about-data-link" style={{ animationDelay: `${index * .1}s` }} />)}
        </g>
        <g transform="translate(300 280)">
          <circle r="107" fill="#07111f" fillOpacity=".72" stroke="#00a8b5" strokeOpacity=".28" />
          <circle r="88" fill="none" stroke="#c89b3c" strokeOpacity=".32" strokeDasharray="4 11" className="hero-visual-spin-slow" />
          <path d="M-39-23L-65 0L-39 23M39-23L65 0L39 23M14-49L-14 49" fill="none" stroke="url(#about-code)" strokeWidth="3" filter="url(#about-glow)" />
          <circle r="12" fill="#07111f" stroke="#f5d17a" /><circle r="4" fill="#f5d17a" className="hero-visual-node" />
        </g>
        {nodes.map(([cx,cy], index) => <g key={`${cx}-${cy}`} className="about-person-node" style={{ animationDelay: `${index * .13}s` }} transform={`translate(${cx} ${cy})`}><circle r={index < 7 ? 16 : 9} fill="#07111f" stroke={index % 3 === 0 ? "#f5d17a" : "#00a8b5"} strokeOpacity=".8" /><circle cy={-3} r={index < 7 ? 4 : 2.5} fill="#d9e1ea" /><path d={index < 7 ? "M-7 8C-6 1 6 1 7 8" : "M-4 5C-3 1 3 1 4 5"} fill="none" stroke="#8392a3" /></g>)}
        <g fill="#6e8193" fontFamily="monospace" fontSize="9" opacity=".55">
          <text x="88" y="118">01 101 // ORIGIN</text><text x="406" y="418">HUMAN + SYSTEM</text><text x="88" y="438">BUILD // SOLVE</text>
        </g>
        <text x="300" y="530" textAnchor="middle" fill="#8190a1" fontSize="10" letterSpacing="4">THE COLLECTIVE · BEHIND THE CODE</text>
      </svg>
    </HeroVisual>
  );
}
