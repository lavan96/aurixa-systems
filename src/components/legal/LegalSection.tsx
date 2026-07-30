import type { LegalSectionDefinition } from "../../lib/legal";

export function LegalSection({ section, index }: { section: LegalSectionDefinition; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  return <section id={section.id} className="legal-section" aria-labelledby={`${section.id}-heading`}>
    <div className="legal-section__marker" aria-hidden="true" />
    <p className="legal-section__category">{number}{section.category ? ` / ${section.category}` : " / GOVERNANCE PROVISION"}</p>
    <h2 id={`${section.id}-heading`}>{section.title}</h2>
    <div className="legal-prose">{section.content}</div>
  </section>;
}
