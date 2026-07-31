import {
  AnswerMap,
  Q,
  QUESTIONNAIRE_VERSION,
  ReviewSection,
  StoredAnswer,
  buildCompletionPayload,
  buildReviewSections,
} from "./readinessQuestionnaire";
import type { ReadinessPrefill } from "./readinessQuestionnaireService";

export const MAKE_READINESS_WEBHOOK_URL =
  "https://hook.eu2.make.com/kbxnu4e130wxe42q3xgprij28sofddvk";

const SUBMISSION_TYPE = "business_readiness_questionnaire" as const;
const SUBMISSION_SOURCE = "Aurixa Business Readiness Questionnaire" as const;
const SUBMISSION_PAGE = "/questionnaire" as const;
const DEFAULT_TIMEOUT_MS = 20_000;

export type ReadinessSubmissionFields = {
  role: string;
  authority: string;
  authorityOther: string;
  userCount: string;
  entityStructure: string;
  regions: string[];
  systems: string[];
  systemsOther: string;
  informationManagement: string[];
  informationManagementOther: string;
  problems: string[];
  problemsOther: string;
  adminTime: string;
  difficultWorkflow: string;
  capabilities: string[];
  integrations: string[];
  phoneSystem: string;
  customSystemName: string;
  customSystemApi: string;
  customSystemOwner: string;
  customSystemWorkflow: string;
  migration: string;
  migrationSources: string;
  migrationRecords: string;
  migrationDocuments: string;
  migrationQuality: string;
  migrationTiming: string;
  timing: string;
  security: string[];
  securityContext: string;
  enterpriseSso: string;
  enterpriseBoundaries: string;
  enterpriseProcurement: string;
  nextStep: string;
  investmentRange: string;
  projectSponsor: string;
};

/**
 * How the applicant reached Stage 2. Mirrors the Airtable "Stage 2 Access
 * Method" options exactly — the Make scenario maps this value straight through,
 * so an expired-link recovery is visible in the operations record instead of
 * looking like a normal submission.
 */
export type StageTwoAccessMode =
  | "Secure link (token)"
  | "Application ID fallback"
  | "Same-session handoff"
  | "Manual entry";

export type HandoffSubmissionPayload = {
  submissionType: typeof SUBMISSION_TYPE;
  source: typeof SUBMISSION_SOURCE;
  page: typeof SUBMISSION_PAGE;
  applicationId: string;
  questionnaireVersion: string;
  responseVersion: number;
  submittedAt: string;
  accessMode: StageTwoAccessMode;
  applicant: ReadinessPrefill;
  fields: ReadinessSubmissionFields;
  answers: StoredAnswer[];
  activeConditionalQuestionIds: string[];
  reviewSections: ReviewSection[];
  summaryText: string;
  rawResponseJson: string;
};

export type HandoffSubmissionResult = {
  ok: boolean;
  applicationId?: string;
  completedAt?: string;
  reason?: "http_error" | "network_error" | "timeout" | "invalid_response";
};

type SubmitHandoffInput = {
  applicationId: string;
  answers: AnswerMap;
  responseVersion: number;
  prefill: ReadinessPrefill;
  accessMode?: StageTwoAccessMode | string;
  /** Test seam; production always uses the browser fetch implementation. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

const itemMap = (sections: ReviewSection[]) =>
  new Map(sections.flatMap((section) => section.items).filter((item) => item.answered).map((item) => [item.questionId, item]));

const buildFields = (sections: ReviewSection[]): ReadinessSubmissionFields => {
  const items = itemMap(sections);
  const one = (id: string) => items.get(id)?.values.join(", ") ?? "";
  const many = (id: string) => items.get(id)?.values ?? [];
  const ranked = (id: string) => many(id).map((value, index) => `${index + 1}. ${value}`);

  return {
    role: one(Q.role), authority: one(Q.authority), authorityOther: one(Q.authorityOther),
    userCount: one(Q.userCount), entityStructure: one(Q.entityStructure), regions: many(Q.regions),
    systems: many(Q.systems), systemsOther: one(Q.systemsOther),
    informationManagement: many(Q.informationManagement),
    informationManagementOther: one(Q.informationManagementOther), problems: many(Q.problems),
    problemsOther: one(Q.problemsOther), adminTime: one(Q.adminTime),
    difficultWorkflow: one(Q.difficultWorkflow), capabilities: ranked(Q.capabilities),
    integrations: many(Q.integrations), phoneSystem: one(Q.phoneSystem),
    customSystemName: one(Q.customSystemName), customSystemApi: one(Q.customSystemApi),
    customSystemOwner: one(Q.customSystemOwner), customSystemWorkflow: one(Q.customSystemWorkflow),
    migration: one(Q.migration), migrationSources: one(Q.migrationSources),
    migrationRecords: one(Q.migrationRecords), migrationDocuments: one(Q.migrationDocuments),
    migrationQuality: one(Q.migrationQuality), migrationTiming: one(Q.migrationTiming),
    timing: one(Q.timing), security: many(Q.security), securityContext: one(Q.securityContext),
    enterpriseSso: one(Q.enterpriseSso), enterpriseBoundaries: one(Q.enterpriseBoundaries),
    enterpriseProcurement: one(Q.enterpriseProcurement), nextStep: one(Q.nextStep),
    investmentRange: one(Q.investmentRange), projectSponsor: one(Q.projectSponsor),
  };
};

export const buildSummaryText = (sections: ReviewSection[]): string =>
  sections
    .filter((section) => section.items.some((item) => item.answered))
    .map((section) => {
      const answers = section.items.filter((item) => item.answered).map((item) => {
        const value = item.ranked
          ? item.values.map((label, index) => `${index + 1}. ${label}`).join("\n")
          : item.values.join(", ");
        return `${item.question}\n${value}`;
      });
      return `${section.title.toUpperCase()}\n\n${answers.join("\n\n")}`;
    })
    .join("\n\n--------------------------------------------------\n\n");

export function buildHandoffSubmissionPayload(input: Omit<SubmitHandoffInput, "fetchImpl" | "timeoutMs">): HandoffSubmissionPayload {
  const submittedAt = (input.now?.() ?? new Date()).toISOString();
  const completion = buildCompletionPayload(input.applicationId, input.answers, input.responseVersion);
  const reviewSections = buildReviewSections(input.answers);
  const responseDocument = {
    ...completion,
    submissionType: SUBMISSION_TYPE,
    source: SUBMISSION_SOURCE,
    page: SUBMISSION_PAGE,
    submittedAt,
    accessMode: (input.accessMode as StageTwoAccessMode) ?? "Secure link (token)",
    applicant: { ...input.prefill },
    fields: buildFields(reviewSections),
    reviewSections,
    summaryText: buildSummaryText(reviewSections),
  };

  return { ...responseDocument, rawResponseJson: JSON.stringify(responseDocument) };
}

const validDate = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

export async function submitHandoffQuestionnaire(input: SubmitHandoffInput): Promise<HandoffSubmissionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const payload = buildHandoffSubmissionPayload(input);

  try {
    const response = await (input.fetchImpl ?? fetch)(MAKE_READINESS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Application-Id": input.applicationId },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "http_error" };

    const body = await response.text();
    // Make may acknowledge with an empty 2xx while the response mapping is being configured.
    if (!body.trim()) return { ok: true, applicationId: input.applicationId, completedAt: payload.submittedAt };

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { ok: false, reason: "invalid_response" };
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "invalid_response" };
    const result = parsed as Record<string, unknown>;
    if (result.success !== true || result.applicationId !== input.applicationId || !validDate(result.completedAt)) {
      return { ok: false, reason: "invalid_response" };
    }
    return { ok: true, applicationId: input.applicationId, completedAt: result.completedAt };
  } catch (error) {
    return { ok: false, reason: controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError") ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}
