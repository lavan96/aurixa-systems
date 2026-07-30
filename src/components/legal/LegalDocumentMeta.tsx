import { LEGAL_DOCUMENT_META } from "../../lib/legal";

export function LegalDocumentMeta() {
  return (
    <section className="legal-meta" aria-label="Document metadata">
      {Object.entries({ "Effective date": LEGAL_DOCUMENT_META.effectiveDate, "Last updated": LEGAL_DOCUMENT_META.lastUpdated, Version: LEGAL_DOCUMENT_META.version, Owner: LEGAL_DOCUMENT_META.owner, Status: LEGAL_DOCUMENT_META.status }).map(([label, value], index) => (
        <div key={label} className="legal-meta__item"><span>{label}</span><strong className={index === 4 ? "legal-meta__status" : ""}>{value}</strong></div>
      ))}
      <i className="legal-corner legal-corner--tl"/><i className="legal-corner legal-corner--br"/>
    </section>
  );
}
