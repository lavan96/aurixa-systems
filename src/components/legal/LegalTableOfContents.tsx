import { useEffect, useState } from "react";
import type { LegalSectionDefinition } from "../../lib/legal";

export function LegalTableOfContents({ sections }: { sections: LegalSectionDefinition[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-22% 0px -65%", threshold: [0, .1] });
    sections.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [sections]);
  const links = <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol>;
  return <aside className="legal-index"><nav className="legal-index__desktop" aria-label="Document sections"><p>Document index</p>{links}</nav><details className="legal-index__mobile"><summary>Document index <span>{sections.length} sections</span></summary><nav aria-label="Document sections">{links}</nav></details></aside>;
}
