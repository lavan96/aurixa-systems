import { LEGAL_DOCUMENT_META } from "../../lib/legal";

import type { LegalDocumentKind } from "../../lib/legal";

export function LegalDocumentMeta({ kind }: { kind: LegalDocumentKind }) {
  return (
    <section className="legal-meta" data-kind={kind} aria-label="Document metadata">
      <div className="legal-meta__register" aria-hidden="true"><span /><b>DOC</b></div>
      {Object.entries({ "Legal entity": LEGAL_DOCUMENT_META.entity, "Document type": LEGAL_DOCUMENT_META.documentType, "Governing location": LEGAL_DOCUMENT_META.governingLocation }).map(([label, value], index) => (
        <div key={label} className="legal-meta__item"><span>{label}</span><strong className={index === 1 ? "legal-meta__status" : ""}>{value}</strong></div>
      ))}
      <i className="legal-corner legal-corner--tl"/><i className="legal-corner legal-corner--br"/>
    </section>
  );
}
