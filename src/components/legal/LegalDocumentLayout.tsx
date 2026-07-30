import { useEffect, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../HeroBackgrounds";
import type { LegalDocumentKind, LegalSectionDefinition } from "../../lib/legal";
import { LegalDocumentMeta } from "./LegalDocumentMeta";
import { LegalHeroVisual } from "./LegalHeroVisual";
import { LegalTableOfContents } from "./LegalTableOfContents";
import { LegalSection } from "./LegalSection";

type Props = { kind: LegalDocumentKind; eyebrow: string; title: string; introduction: string; summary: ReactNode; caption: string; sections: LegalSectionDefinition[]; pageTitle: string; description: string; related: { label: string; to: string }[] };
export function LegalDocumentLayout(props: Props) {
  useEffect(() => {
    const priorTitle = document.title; const existing = document.querySelector<HTMLMetaElement>('meta[name="description"]'); const prior = existing?.content;
    document.title = props.pageTitle; const meta = existing ?? document.head.appendChild(document.createElement("meta")); meta.setAttribute("name", "description"); meta.setAttribute("content", props.description);
    return () => { document.title = priorTitle; if (prior !== undefined) meta.content = prior; else meta.remove(); };
  }, [props.pageTitle, props.description]);
  return <div className="legal-page w-full bg-[#040B16]">
    <header className="legal-hero">
      <HeroBackground variant="platform" />
      <div className="legal-container legal-hero__grid">
        <div className="relative z-10"><div className="legal-eyebrow"><span/>{props.eyebrow}</div><h1>{props.title}</h1><p>{props.introduction}</p></div>
        <LegalHeroVisual kind={props.kind} caption={props.caption}/>
      </div>
    </header>
    <main className="legal-main">
      <div className="legal-container"><LegalDocumentMeta/><section className="legal-summary" aria-labelledby="document-summary"><p className="legal-eyebrow">Document overview</p><h2 id="document-summary">A clear framework for responsible use.</h2><div>{props.summary}</div></section>
        <div className="legal-document-grid"><LegalTableOfContents sections={props.sections}/><article className="legal-document">{props.sections.map((section, index) => <div key={section.id}><LegalSection section={section} index={index}/></div>)}</article></div>
        <section className="legal-related" aria-labelledby="related-governance"><div><p className="legal-eyebrow">Connected governance</p><h2 id="related-governance">Related documents and enquiries</h2></div><div>{props.related.map((item, index) => <Link key={item.to} to={item.to}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}<ArrowRight aria-hidden="true"/></Link>)}</div></section>
        <Link to="/compliance" className="legal-back"><ArrowLeft aria-hidden="true"/> Back to Compliance</Link>
      </div>
    </main>
  </div>;
}
