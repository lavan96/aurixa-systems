import { LEGAL_DOCUMENT_META } from "../../lib/legal";

export function LegalDocumentMeta() {
  return (
    <section className="legal-meta" aria-label="Document metadata">
      {Object.entries({ "Legal entity": LEGAL_DOCUMENT_META.entity, "Document type": LEGAL_DOCUMENT_META.documentType, "Governing location": LEGAL_DOCUMENT_META.governingLocation }).map(([label, value], index) => (
        <div key={label} className="legal-meta__item"><span>{label}</span><strong className={index === 1 ? "legal-meta__status" : ""}>{value}</strong></div>
      ))}
      <i className="legal-corner legal-corner--tl"/><i className="legal-corner legal-corner--br"/>
    </section>
  );
}
