import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LegalSectionDefinition } from "../../lib/legal";

const GROUPS = [
  ["Agreement Foundation", 0, 3],
  ["Commercial Arrangements", 3, 6],
  ["Platform Use and Data", 6, 13],
  ["Rights and Service Governance", 13, 19],
  ["Legal Framework", 19, 27],
] as const;

export function LegalTableOfContents({ sections }: { sections: LegalSectionDefinition[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const activeIndex = Math.max(0, sections.findIndex(({ id }) => id === active));
  const activeGroup = GROUPS.findIndex(([, start, end]) => activeIndex >= start && activeIndex < end);
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => setOpenGroups((current) => new Set(current).add(activeGroup)), [activeGroup]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -68%", threshold: [0, .1] });
    sections.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [sections]);
  const groupedLinks = useMemo(() => GROUPS.map(([label, start, end], groupIndex) => (
    <details key={label} open={openGroups.has(groupIndex)} onToggle={(event) => {
      const isOpen = event.currentTarget.open;
      setOpenGroups((current) => { const next = new Set(current); isOpen ? next.add(groupIndex) : next.delete(groupIndex); return next; });
    }}>
      <summary><span>{String(groupIndex + 1).padStart(2, "0")}</span>{label}<i aria-hidden="true" /></summary>
      <ol>{sections.slice(start, end).map((section, offset) => { const index = start + offset; return <li key={section.id}><a href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>; })}</ol>
    </details>
  )), [active, openGroups, sections]);
  return <aside className="legal-index" style={{ "--document-progress": `${((activeIndex + 1) / sections.length) * 100}%` } as CSSProperties}>
    <nav className="legal-index__desktop" aria-label="Document sections"><div className="legal-index__heading"><p>Governance navigator</p><span>{activeIndex + 1} / {sections.length}</span></div><div className="legal-progress" aria-hidden="true"><i /></div>{groupedLinks}</nav>
    <details className="legal-index__mobile"><summary>Document Sections <span>{activeIndex + 1} / {sections.length}</span></summary><nav aria-label="Document sections">{groupedLinks}</nav></details>
  </aside>;
}
