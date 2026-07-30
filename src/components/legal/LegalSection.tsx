import type { LegalDocumentKind, LegalSectionDefinition } from "../../lib/legal";

export function LegalSection({ section, index, kind }: { section: LegalSectionDefinition; index: number; kind: LegalDocumentKind }) {
  const number = String(index + 1).padStart(2, "0");
  return <section id={section.id} className="legal-section" data-section={number} data-kind={kind} aria-labelledby={`${section.id}-heading`}>
    <div className="legal-section__marker" aria-hidden="true" />
    <p className="legal-section__category">{number}{section.category ? ` / ${section.category}` : " / GOVERNANCE PROVISION"}</p>
    <h2 id={`${section.id}-heading`}>{section.title}</h2>
    <div className="legal-section__instrument" aria-hidden="true"><span/><span/><span/><i/></div>
    <div className="legal-prose">{section.content}</div>
  </section>;
}
