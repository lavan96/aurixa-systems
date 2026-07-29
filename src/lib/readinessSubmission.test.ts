import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AnswerMap, Q } from "./readinessQuestionnaire";
import {
  MAKE_READINESS_WEBHOOK_URL,
  buildHandoffSubmissionPayload,
  submitHandoffQuestionnaire,
} from "./readinessSubmission";

const applicationId = "AX-0123456789";
const prefill = {
  applicationId,
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@example.test",
  organisationName: "Analytical Engines",
  role: "founder_director",
  organisationType: "property_services",
  annualVolume: "50_to_100",
};
const answers = (): AnswerMap => ({
  [Q.role]: "founder_director",
  [Q.roleOther]: "Inactive former role",
  [Q.authority]: "other",
  [Q.authorityOther]: "I chair the purchasing committee",
  [Q.userCount]: "4_to_10",
  [Q.entityStructure]: "single_office",
  [Q.regions]: ["nsw", "vic"],
  [Q.systems]: ["crm", "reporting"],
  [Q.problems]: ["duplicate_entry", "manual_reports"],
  [Q.adminTime]: "5_to_10_hours",
  [Q.capabilities]: ["report_generation", "crm", "cashflow_portfolio_analysis", "suburb_market_reporting", "calendar_task_automation"],
  [Q.integrations]: ["microsoft_365"],
  [Q.migration]: "no",
  [Q.timing]: "3_to_6_months",
  [Q.security]: ["mfa"],
  [Q.nextStep]: "general_demonstration",
});
const input = () => ({ applicationId, prefill, answers: answers(), responseVersion: 1, now: () => new Date("2026-07-29T12:00:00.000Z") });

test("uses the dedicated Stage 2 Make webhook", () => {
  assert.equal(MAKE_READINESS_WEBHOOK_URL, "https://hook.eu2.make.com/kbxnu4e130wxe42q3xgprij28sofddvk");
});

test("payload includes the existing ID, Stage 1 prefill, raw answers and readable labels", () => {
  const payload = buildHandoffSubmissionPayload(input());
  assert.equal(payload.applicationId, applicationId);
  assert.deepEqual(payload.applicant, prefill);
  assert.ok(payload.answers.some((answer) => answer.questionId === Q.adminTime && answer.value === "5_to_10_hours"));
  assert.equal(payload.fields.adminTime, "5-10 hours");
  assert.match(payload.summaryText, /Approximately how much time.*\n5-10 hours/);
});

test("ranked capabilities retain selection order and receive readable rank prefixes", () => {
  const payload = buildHandoffSubmissionPayload(input());
  assert.deepEqual(payload.fields.capabilities, [
    "1. Report generation", "2. CRM", "3. Cash-flow and portfolio analysis",
    "4. Suburb and market reporting", "5. Calendar and task automation",
  ]);
  assert.ok(payload.summaryText.indexOf("1. Report generation") < payload.summaryText.indexOf("2. CRM"));
});

test("summary and fields contain active conditional answers but exclude inactive ones", () => {
  const payload = buildHandoffSubmissionPayload(input());
  assert.equal(payload.fields.authorityOther, "I chair the purchasing committee");
  assert.match(payload.summaryText, /I chair the purchasing committee/);
  assert.doesNotMatch(payload.summaryText, /Inactive former role/);
  assert.ok(payload.answers.some((answer) => answer.questionId === Q.roleOther && answer.active === false));
});

test("rawResponseJson is valid, complete structured JSON without recursion", () => {
  const payload = buildHandoffSubmissionPayload(input());
  const raw = JSON.parse(payload.rawResponseJson);
  assert.equal(raw.applicationId, applicationId);
  assert.deepEqual(raw.answers, payload.answers);
  assert.equal(raw.rawResponseJson, undefined);
});

test("submission posts JSON with the Application ID header and accepts verified Make details", async () => {
  let requestUrl = "";
  let request: RequestInit | undefined;
  const result = await submitHandoffQuestionnaire({
    ...input(),
    fetchImpl: async (url, init) => {
      requestUrl = String(url); request = init;
      return new Response(JSON.stringify({ success: true, applicationId, completedAt: "2026-07-29T12:30:00.000Z" }), { status: 200 });
    },
  });
  assert.equal(requestUrl, MAKE_READINESS_WEBHOOK_URL);
  assert.equal(request?.method, "POST");
  assert.equal((request?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.equal((request?.headers as Record<string, string>)["X-Application-Id"], applicationId);
  assert.equal(JSON.parse(String(request?.body)).applicationId, applicationId);
  assert.deepEqual(result, { ok: true, applicationId, completedAt: "2026-07-29T12:30:00.000Z" });
});

test("an empty successful Make acknowledgement is handled without crashing", async () => {
  const result = await submitHandoffQuestionnaire({ ...input(), fetchImpl: async () => new Response("", { status: 200 }) });
  assert.deepEqual(result, { ok: true, applicationId, completedAt: "2026-07-29T12:00:00.000Z" });
});

test("non-2xx, network and malformed responses fail safely", async () => {
  assert.equal((await submitHandoffQuestionnaire({ ...input(), fetchImpl: async () => new Response("no", { status: 500 }) })).reason, "http_error");
  assert.equal((await submitHandoffQuestionnaire({ ...input(), fetchImpl: async () => { throw new TypeError("offline"); } })).reason, "network_error");
  assert.equal((await submitHandoffQuestionnaire({ ...input(), fetchImpl: async () => new Response("not json", { status: 200 }) })).reason, "invalid_response");
  assert.equal((await submitHandoffQuestionnaire({ ...input(), fetchImpl: async () => new Response(JSON.stringify({ success: true, applicationId: "AX-WRONG", completedAt: "invalid" }), { status: 200 }) })).reason, "invalid_response");
});

test("a request exceeding the timeout is aborted and fails as a timeout", async () => {
  const fetchImpl: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  const result = await submitHandoffQuestionnaire({ ...input(), fetchImpl, timeoutMs: 5 });
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("page branching preserves handoff, token, open, retry and double-submit behaviour", async () => {
  const source = await readFile(new URL("../pages/Questionnaire.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(isSubmitting \|\| !session\) return/);
  assert.match(source, /session\.access === "handoff"\s*\? await submitHandoffQuestionnaire/);
  assert.match(source, /: await completeQuestionnaire/);
  assert.match(source, /if \(!result\.ok \|\| !result\.completedAt\)[\s\S]*setSubmissionError[\s\S]*return;/);
  assert.match(source, /if \(session\.access === "handoff"\) endHandoffSession\(\);/);
  assert.ok(source.indexOf("endHandoffSession();") > source.indexOf("if (!result.ok || !result.completedAt)"));
});
