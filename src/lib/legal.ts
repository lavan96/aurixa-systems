import type { ReactNode } from "react";

export const LEGAL_ENTITY = {
  name: "Aurixa Systems Pty Ltd",
  abn: "49 695 868 243",
  location: "New South Wales, Australia",
  contactPath: "/contact",
  // Confirm legal and privacy email addresses with Australian legal counsel before adding them.
  legalEmail: undefined,
  privacyEmail: undefined,
  // Confirm any overseas processing locations before publishing them.
  overseasProcessingLocations: [] as string[],
} as const;

// Publication dates and document versions require legal approval. These neutral
// working-draft values avoid presenting unapproved dates or versions as final.
export const LEGAL_DOCUMENT_META = {
  effectiveDate: "Effective on publication",
  lastUpdated: "Pre-publication legal review",
  version: "Working draft",
  owner: LEGAL_ENTITY.name,
  status: "Legal review",
} as const;

export type LegalSectionDefinition = {
  id: string;
  title: string;
  category?: string;
  content: ReactNode;
};

export type LegalDocumentKind = "privacy" | "terms";
