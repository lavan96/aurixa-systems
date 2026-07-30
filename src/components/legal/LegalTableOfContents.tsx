import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LegalDocumentKind, LegalSectionDefinition } from "../../lib/legal";
import { LEGAL_CHAPTERS } from "./legalChapters";

export function LegalTableOfContents({ kind, sections }: { kind: LegalDocumentKind; sections: LegalSectionDefinition[] }) {
  const groups = LEGAL_CHAPTERS[kind];
  const [active, setActive] = useState(sections[0]?.id);
  const activeIndex = Math.max(0, sections.findIndex(({ id }) => id === active));
  const activeGroup = groups.findIndex(({ start, end }) => activeIndex >= start && activeIndex < end);
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
  const groupedLinks = useMemo(() => groups.map(({ title, start, end }, groupIndex) => (
    <details key={title} open={openGroups.has(groupIndex)} onToggle={(event) => {
      const isOpen = event.currentTarget.open;
      setOpenGroups((current) => { const next = new Set(current); isOpen ? next.add(groupIndex) : next.delete(groupIndex); return next; });
    }}>
      <summary><span>{String(groupIndex + 1).padStart(2, "0")}</span>{title}<i aria-hidden="true" /></summary>
      <ol>{sections.slice(start, end).map((section, offset) => { const index = start + offset; return <li key={section.id}><a href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>; })}</ol>
    </details>
  )), [active, groups, openGroups, sections]);
  return <aside className="legal-index" data-kind={kind} style={{ "--document-progress": `${((activeIndex + 1) / sections.length) * 100}%` } as CSSProperties}>
    <nav className="legal-index__desktop" aria-label="Document sections"><div className="legal-index__heading"><p>Governance navigator</p><span>{activeIndex + 1} / {sections.length}</span></div><div className="legal-progress" aria-label={`Document progress: ${activeIndex + 1} of ${sections.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={sections.length} aria-valuenow={activeIndex + 1}><i /></div>{groupedLinks}</nav>
    <details className="legal-index__mobile"><summary>Document Sections <span>{sections[activeIndex]?.title}</span></summary><nav aria-label="Document sections">{groupedLinks}</nav></details>
  </aside>;
}
