import type { LegalDocumentKind } from "../../lib/legal";

export function LegalHeroVisual({ kind, caption }: { kind: LegalDocumentKind; caption: string }) {
  const goldFirst = kind === "terms";
  return (
    <figure className="legal-visual" aria-label={`${caption}. A diagram of linked document controls and governance checkpoints.`}>
      <svg viewBox="0 0 560 420" role="img" aria-hidden="true" className="w-full">
        <defs>
          <linearGradient id={`legal-path-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={goldFirst ? "#D7B35F" : "#5EDDE8"} />
            <stop offset="1" stopColor={goldFirst ? "#5EDDE8" : "#D7B35F"} />
          </linearGradient>
          <filter id={`legal-glow-${kind}`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g fill="none" stroke="#5EDDE8" strokeOpacity=".16">
          <path d="M55 210H505M280 32V388" strokeDasharray="3 10" />
          <rect x="72" y="66" width="416" height="288" rx="2" />
          <rect x="105" y="94" width="350" height="232" rx="2" />
        </g>
        <g className="legal-guide-ring" transform="translate(280 210)">
          <circle r="151" fill="none" stroke="#C89B3C" strokeOpacity=".22" strokeDasharray="2 15" />
          {[0, 90, 180, 270].map((angle) => <circle key={angle} cx={Math.cos(angle * Math.PI / 180) * 151} cy={Math.sin(angle * Math.PI / 180) * 151} r="4" fill="#071322" stroke="#D7B35F" />)}
        </g>
        <g fill="#081426" stroke={`url(#legal-path-${kind})`} strokeWidth="1.2">
          <rect x="153" y="127" width="254" height="166" />
          <rect x="173" y="146" width="214" height="128" strokeOpacity=".55" />
        </g>
        <g stroke="#9CA3AF" strokeOpacity=".35">
          <path d="M199 176H361M199 195H334M199 232H361M199 251H310" />
        </g>
        <g fill="none" stroke={`url(#legal-path-${kind})`} strokeWidth="1.2" className="legal-signal-path">
          <path d="M72 210H153M407 210H488M280 66V127M280 293V354" strokeDasharray="8 8" />
        </g>
        <g className="legal-checkpoints" filter={`url(#legal-glow-${kind})`}>
          <circle cx="153" cy="210" r="5" fill="#5EDDE8"/><circle cx="407" cy="210" r="5" fill="#D7B35F"/>
          <circle cx="280" cy="127" r="5" fill="#D7B35F"/><circle cx="280" cy="293" r="5" fill="#5EDDE8"/>
        </g>
        <g fontFamily="monospace" fontSize="9" letterSpacing="2" fill="#9CA3AF">
          <text x="87" y="83">CONTROL 01</text><text x="380" y="83">ACCESS</text>
          <text x="87" y="345">VERSION</text><text x="371" y="345">VERIFIED</text>
        </g>
        <text x="280" y="218" textAnchor="middle" fontFamily="monospace" fontSize="11" letterSpacing="3" fill="#F3F4F6">GOVERNANCE CORE</text>
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
