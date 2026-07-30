import type { LegalDocumentKind } from "../../lib/legal";

export type LegalChapterDefinition = {
  title: string;
  start: number;
  end: number;
};

export const LEGAL_CHAPTERS: Record<LegalDocumentKind, LegalChapterDefinition[]> = {
  privacy: [
    { title: "Information Collection", start: 0, end: 6 },
    { title: "Handling and Protection", start: 6, end: 10 },
    { title: "Individual Rights and Response", start: 10, end: 13 },
    { title: "Wider Privacy Governance", start: 13, end: 18 },
  ],
  terms: [
    { title: "Agreement and Access", start: 0, end: 3 },
    { title: "Commercial Arrangements", start: 3, end: 6 },
    { title: "Platform Use and Data", start: 6, end: 13 },
    { title: "Rights and Service Governance", start: 13, end: 19 },
    { title: "Legal Framework", start: 19, end: 27 },
  ],
};

export const LEGAL_THEMES: Record<LegalDocumentKind, string> = {
  privacy: "Controlled information throughout its lifecycle",
  terms: "One agreement. Clear rights and responsibilities.",
};
