import type { LegalDocumentKind } from "../../lib/legal";

export function LegalChapterHeader({ kind, number, title }: { kind: LegalDocumentKind; number: number; title: string }) {
  const chapter = String(number + 1).padStart(2, "0");
  return <header className="legal-chapter" data-kind={kind}>
    <div className="legal-chapter__identity"><span>Chapter {chapter}</span><i aria-hidden="true" /></div>
    <h2 id={`chapter-${number + 1}`}>{title}</h2>
    <div className="legal-chapter__path" aria-hidden="true"><span /><span /><span /><i /></div>
  </header>;
}
