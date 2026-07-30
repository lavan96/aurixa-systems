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

// Only confirmed public metadata belongs here. Publication dates and version
// numbers remain in the legal review checklist until approved.
export const LEGAL_DOCUMENT_META = {
  entity: LEGAL_ENTITY.name,
  documentType: "Platform governance",
  governingLocation: LEGAL_ENTITY.location,
} as const;

export type LegalSectionDefinition = {
  id: string;
  title: string;
  category?: string;
  content: ReactNode;
};

export type LegalDocumentKind = "privacy" | "terms";
