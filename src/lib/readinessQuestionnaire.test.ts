/**
 * Stage 2 questionnaire logic tests (section 17.1 — conditional logic,
 * validation and completion acceptance criteria).
 *
 * Run with `npm test`. These cover the pure question-bank logic; interaction,
 * layout and accessibility behaviour is verified in the browser.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  AnswerMap,
  MAX_PROBLEMS,
  CAPABILITY_OPTIONS,
  INTEGRATION_OPTIONS,
  REGION_OPTIONS,
  NOT_YET_KNOWN,
  Q,
  QUESTIONNAIRE_VERSION,
  RANKED_CAPABILITY_COUNT,
  SECTIONS,
  SECURITY_EXCLUSIVE_VALUES,
  SYSTEMS_EXCLUSIVE_VALUES,
  activeQuestionIds,
  buildCompletionPayload,
  buildReviewSections,
  buildStoredAnswers,
  clearedByExclusiveSelection,
  firstInvalidSection,
  isWithin90Days,
  needsEnterpriseReadiness,
  sectionIndexOf,
  suggestedCapabilityOrder,
  systemProductQuestionId,
  toggleExclusiveMultiSelect,
  validateAll,
  validateSection,
} from "./readinessQuestionnaire";

/** A complete, valid, minimal set of answers used as the baseline. */
const validAnswers = (): AnswerMap => ({
  [Q.role]: "founder_director",
  [Q.authority]: "final_decision_maker",
  [Q.userCount]: "4_to_10",
  [Q.entityStructure]: "single_office",
  [Q.regions]: ["nsw", "vic"],

  [Q.systems]: ["crm", "reporting"],
  [Q.problems]: ["duplicate_entry", "manual_reports"],
  [Q.adminTime]: "5_to_10_hours",

  [Q.capabilities]: [
    "crm",
    "onboarding_workflow",
    "report_generation",
    "client_partner_portals",
    "api_integrations",
  ],
  [Q.integrations]: ["microsoft_365"],
  [Q.migration]: "no",

  [Q.timing]: "3_to_6_months",
  [Q.security]: ["mfa"],
  [Q.nextStep]: "general_demonstration",
});

// ── Structure ──────────────────────────────────────────────────────────────

test("questionnaire has four sections and a stable version", () => {
  assert.equal(SECTIONS.length, 4);
  assert.deepEqual(
    SECTIONS.map((section) => section.title),
    [
      "Organisation Profile",
      "Current Systems and Workflows",
      "Aurixa Capability Requirements",
      "Implementation Readiness",
    ],
  );
  assert.equal(QUESTIONNAIRE_VERSION, "business-readiness-v1");
});

test("core question identifiers are the stable BRQ- references", () => {
  assert.deepEqual(
    [
      Q.role,
      Q.authority,
      Q.userCount,
      Q.entityStructure,
      Q.regions,
      Q.systems,
      Q.problems,
      Q.adminTime,
      Q.difficultWorkflow,
      Q.capabilities,
      Q.integrations,
      Q.migration,
      Q.timing,
      Q.security,
      Q.nextStep,
      Q.investmentRange,
    ],
    [
      "BRQ-01",
      "BRQ-02",
      "BRQ-03",
      "BRQ-04",
      "BRQ-05",
      "BRQ-06",
      "BRQ-07",
      "BRQ-08",
      "BRQ-09",
      "BRQ-10",
      "BRQ-11",
      "BRQ-12",
      "BRQ-13",
      "BRQ-14",
      "BRQ-15",
      "BRQ-16",
    ],
  );
});

test("every question maps back to the section that renders it", () => {
  assert.equal(sectionIndexOf(Q.role), 0);
  assert.equal(sectionIndexOf(Q.systemsOther), 1);
  assert.equal(sectionIndexOf(systemProductQuestionId("crm")), 1);
  assert.equal(sectionIndexOf(Q.migrationRecords), 2);
  assert.equal(sectionIndexOf(Q.projectSponsor), 3);
});

// ── Validation ─────────────────────────────────────────────────────────────

test("a complete answer set passes every section", () => {
  assert.deepEqual(validateAll(validAnswers()), {});
  assert.equal(firstInvalidSection(validAnswers()), -1);
});

test("an empty questionnaire reports every required core question", () => {
  const errors = validateAll({});
  for (const questionId of [
    Q.role,
    Q.authority,
    Q.userCount,
    Q.entityStructure,
    Q.regions,
    Q.systems,
    Q.problems,
    Q.adminTime,
    Q.capabilities,
    Q.integrations,
    Q.migration,
    Q.timing,
    Q.security,
    Q.nextStep,
  ]) {
    assert.ok(errors[questionId], `expected an error for ${questionId}`);
  }
  // BRQ-09 and BRQ-16 are optional.
  assert.equal(errors[Q.difficultWorkflow], undefined);
  assert.equal(errors[Q.investmentRange], undefined);
  assert.equal(firstInvalidSection({}), 0);
});

test("section validation only reports that section", () => {
  const answers = validAnswers();
  delete answers[Q.timing];
  assert.deepEqual(validateSection(0, answers), {});
  assert.ok(validateSection(3, answers)[Q.timing]);
});

test("selecting Other requires an explanation", () => {
  const answers = { ...validAnswers(), [Q.role]: "other" };
  assert.ok(validateSection(0, answers)[Q.roleOther]);

  answers[Q.roleOther] = "Head of transformation";
  assert.equal(validateSection(0, answers)[Q.roleOther], undefined);

  const authority = { ...validAnswers(), [Q.authority]: "other" };
  assert.ok(validateSection(0, authority)[Q.authorityOther]);

  const problems = { ...validAnswers(), [Q.problems]: ["other"] };
  assert.ok(validateSection(1, problems)[Q.problemsOther]);
});

test("explanations are length limited", () => {
  const answers = { ...validAnswers(), [Q.role]: "other", [Q.roleOther]: "x".repeat(121) };
  assert.match(validateSection(0, answers)[Q.roleOther], /under 120 characters/);
});

test("BRQ-07 accepts at most three operational problems", () => {
  const answers = {
    ...validAnswers(),
    [Q.problems]: ["duplicate_entry", "manual_reports", "slow_onboarding", "limited_analytics"],
  };
  assert.match(validateSection(1, answers)[Q.problems], new RegExp(`no more than ${MAX_PROBLEMS}`));

  answers[Q.problems] = ["duplicate_entry", "manual_reports", "slow_onboarding"];
  assert.equal(validateSection(1, answers)[Q.problems], undefined);
});

test("BRQ-10 requires exactly five distinct ranked capabilities", () => {
  const four = { ...validAnswers(), [Q.capabilities]: ["crm", "finance_portal", "report_generation", "smsf_workflow"] };
  assert.match(validateSection(2, four)[Q.capabilities], new RegExp(`rank ${RANKED_CAPABILITY_COUNT}`));

  const duplicated = { ...validAnswers(), [Q.capabilities]: ["crm", "crm", "finance_portal", "report_generation", "smsf_workflow"] };
  assert.match(validateSection(2, duplicated)[Q.capabilities], /must be different/);
});

test("BRQ-09 is optional but capped at 750 characters", () => {
  const answers = { ...validAnswers(), [Q.difficultWorkflow]: "" };
  assert.equal(validateSection(1, answers)[Q.difficultWorkflow], undefined);

  answers[Q.difficultWorkflow] = "x".repeat(751);
  assert.match(validateSection(1, answers)[Q.difficultWorkflow], /under 750 characters/);
});

test("BRQ-05 offers Australian states and territories only", () => {
  assert.deepEqual(
    REGION_OPTIONS.map((option) => option.value),
    ["act", "nsw", "nt", "qld", "sa", "tas", "vic", "wa"],
  );
  // No international option remains, so nothing can trigger a follow-up.
  assert.ok(!("regionsOther" in Q));
  assert.deepEqual(validateSection(0, { ...validAnswers(), [Q.regions]: ["qld"] }), {});
});

test("Aurixa Voice is named as the capability; slug unchanged", () => {
  const voice = CAPABILITY_OPTIONS.find((option) => option.value === "voice_automation");
  assert.equal(voice.label, "AI Voice Agents & Call Logging");
});

test("the applicant's phone system is an integration, not a capability", () => {
  const phone = INTEGRATION_OPTIONS.find((option) => option.value === "telephony");
  assert.equal(phone.label, "Existing Phone or VoIP System");
  // Aurixa's own voice capability is not offered as something to integrate with.
  assert.ok(!INTEGRATION_OPTIONS.some((option) => /voice agent/i.test(option.label)));
});

test("selecting an existing phone system asks which one", () => {
  const answers = { ...validAnswers(), [Q.integrations]: ["telephony"] };
  assert.ok(activeQuestionIds(answers).includes(Q.phoneSystem));
  assert.ok(validateSection(2, answers)[Q.phoneSystem], "the follow-up is required");

  answers[Q.phoneSystem] = "3CX";
  assert.deepEqual(validateSection(2, answers), {});

  // Not asked when no phone system is selected.
  assert.ok(!activeQuestionIds(validAnswers()).includes(Q.phoneSystem));

  // Retained but inactive if the applicant unselects it.
  const unselected = { ...validAnswers(), [Q.phoneSystem]: "3CX" };
  const stored = buildStoredAnswers(unselected).find((a) => a.questionId === Q.phoneSystem);
  assert.equal(stored.active, false);
});

// ── Conditional logic (section 6.6) ────────────────────────────────────────

test('"No central system" reveals the information-management question', () => {
  const answers = { ...validAnswers(), [Q.systems]: ["no_central_system"] };
  assert.ok(activeQuestionIds(answers).includes(Q.informationManagement));
  assert.ok(validateSection(1, answers)[Q.informationManagement]);

  answers[Q.informationManagement] = ["spreadsheets"];
  assert.equal(validateSection(1, answers)[Q.informationManagement], undefined);

  assert.ok(!activeQuestionIds(validAnswers()).includes(Q.informationManagement));
});

test("product-name fields appear only for selected system categories", () => {
  const active = activeQuestionIds(validAnswers());
  assert.ok(active.includes(systemProductQuestionId("crm")));
  assert.ok(active.includes(systemProductQuestionId("reporting")));
  assert.ok(!active.includes(systemProductQuestionId("telephony")));
});

test("custom internal system reveals four follow-ups and requires three", () => {
  const answers = { ...validAnswers(), [Q.integrations]: ["custom_internal_system"] };
  const active = activeQuestionIds(answers);
  for (const questionId of [Q.customSystemName, Q.customSystemApi, Q.customSystemOwner, Q.customSystemWorkflow]) {
    assert.ok(active.includes(questionId), `expected ${questionId} to be active`);
  }

  const errors = validateSection(2, answers);
  assert.ok(errors[Q.customSystemName]);
  assert.ok(errors[Q.customSystemApi]);
  assert.ok(errors[Q.customSystemWorkflow]);
  assert.equal(errors[Q.customSystemOwner], undefined, "internal business owner is optional");

  assert.ok(!activeQuestionIds(validAnswers()).includes(Q.customSystemName));
});

test("migration follow-ups appear only for a migration category", () => {
  for (const value of ["no", "not_yet_known"]) {
    const answers = { ...validAnswers(), [Q.migration]: value };
    assert.ok(!activeQuestionIds(answers).includes(Q.migrationSources), `${value} should hide follow-ups`);
    assert.deepEqual(validateSection(2, answers), {});
  }

  const answers = { ...validAnswers(), [Q.migration]: "documents_history" };
  const active = activeQuestionIds(answers);
  for (const questionId of [
    Q.migrationSources,
    Q.migrationRecords,
    Q.migrationDocuments,
    Q.migrationQuality,
    Q.migrationTiming,
  ]) {
    assert.ok(active.includes(questionId), `expected ${questionId} to be active`);
  }

  const errors = validateSection(2, answers);
  assert.ok(errors[Q.migrationSources]);
  assert.ok(errors[Q.migrationRecords]);
  assert.ok(errors[Q.migrationTiming]);
  assert.equal(errors[Q.migrationQuality], undefined, "data-quality notes are optional");
});

test('migration counts accept a number or "Not yet known", never a forced figure', () => {
  const answers = {
    ...validAnswers(),
    [Q.migration]: "basic_contacts",
    [Q.migrationSources]: "Legacy CRM",
    [Q.migrationTiming]: "with_go_live",
    [Q.migrationRecords]: 4200,
    [Q.migrationDocuments]: NOT_YET_KNOWN,
  };
  assert.deepEqual(validateSection(2, answers), {});

  answers[Q.migrationRecords] = -5;
  assert.ok(validateSection(2, answers)[Q.migrationRecords]);
});

test("security detail appears only for a named requirement", () => {
  assert.ok(activeQuestionIds(validAnswers()).includes(Q.securityContext));

  for (const exclusive of SECURITY_EXCLUSIVE_VALUES) {
    const answers = { ...validAnswers(), [Q.security]: [exclusive] };
    assert.ok(!activeQuestionIds(answers).includes(Q.securityContext), `${exclusive} should hide the detail field`);
  }
});

test("enterprise readiness follow-ups appear for large or multi-entity organisations", () => {
  assert.equal(needsEnterpriseReadiness(validAnswers()), false);

  const manyUsers = { ...validAnswers(), [Q.userCount]: "more_than_100" };
  assert.equal(needsEnterpriseReadiness(manyUsers), true);
  const active = activeQuestionIds(manyUsers);
  assert.ok(active.includes(Q.enterpriseSso));
  assert.ok(active.includes(Q.enterpriseBoundaries));
  assert.ok(active.includes(Q.enterpriseProcurement));

  for (const structure of ["multiple_legal_entities", "national", "international"]) {
    assert.equal(needsEnterpriseReadiness({ ...validAnswers(), [Q.entityStructure]: structure }), true);
  }

  // They are qualification inputs, never required answers.
  assert.deepEqual(validateSection(3, manyUsers), {});
});

test("budget and sponsor questions appear only within 90 days", () => {
  for (const timing of ["immediately", "within_30_days", "60_to_90_days"]) {
    const answers = { ...validAnswers(), [Q.timing]: timing };
    assert.equal(isWithin90Days(answers), true);
    const active = activeQuestionIds(answers);
    assert.ok(active.includes(Q.investmentRange));
    assert.ok(active.includes(Q.projectSponsor));
    // Both remain optional.
    assert.deepEqual(validateSection(3, answers), {});
  }

  for (const timing of ["3_to_6_months", "6_to_12_months", "researching_only"]) {
    const answers = { ...validAnswers(), [Q.timing]: timing };
    assert.equal(isWithin90Days(answers), false);
    const active = activeQuestionIds(answers);
    assert.ok(!active.includes(Q.investmentRange), `${timing} must suppress the budget question`);
    assert.ok(!active.includes(Q.projectSponsor), `${timing} must suppress the sponsor question`);
  }
});

// ── Mutually exclusive selections ──────────────────────────────────────────

test("exclusive options replace named selections and vice versa", () => {
  const systems = ["crm", "reporting"];
  assert.deepEqual(
    toggleExclusiveMultiSelect(systems, "no_central_system", SYSTEMS_EXCLUSIVE_VALUES),
    ["no_central_system"],
  );
  assert.deepEqual(
    toggleExclusiveMultiSelect(["no_central_system"], "crm", SYSTEMS_EXCLUSIVE_VALUES),
    ["crm"],
  );
  assert.deepEqual(
    toggleExclusiveMultiSelect(["crm", "reporting"], "crm", SYSTEMS_EXCLUSIVE_VALUES),
    ["reporting"],
  );
});

test("clearing a meaningful set is surfaced for confirmation rather than done silently", () => {
  assert.deepEqual(
    clearedByExclusiveSelection(["crm", "reporting"], "no_central_system", SYSTEMS_EXCLUSIVE_VALUES),
    ["crm", "reporting"],
  );
  // Nothing to clear: no confirmation needed.
  assert.deepEqual(clearedByExclusiveSelection([], "no_central_system", SYSTEMS_EXCLUSIVE_VALUES), []);
  assert.deepEqual(clearedByExclusiveSelection(["crm"], "reporting", SYSTEMS_EXCLUSIVE_VALUES), []);
});

// ── Stored answers and submission payload ──────────────────────────────────

test("hidden conditional answers are retained but marked inactive", () => {
  const answers: AnswerMap = {
    ...validAnswers(),
    [Q.role]: "founder_director",
    // Left over from when "Other" was selected.
    [Q.roleOther]: "Head of transformation",
  };

  const stored = buildStoredAnswers(answers);
  const roleOther = stored.find((answer) => answer.questionId === Q.roleOther);
  assert.ok(roleOther, "the previous answer is kept, not deleted");
  assert.equal(roleOther.active, false);

  const payload = buildCompletionPayload("AX-TEST", answers, 3);
  assert.ok(!payload.activeConditionalQuestionIds.includes(Q.roleOther));
  assert.equal(payload.questionnaireVersion, QUESTIONNAIRE_VERSION);
  assert.equal(payload.responseVersion, 3);
  assert.equal(payload.applicationId, "AX-TEST");
});

test("free text is trimmed and capped before it leaves the browser", () => {
  const answers: AnswerMap = {
    ...validAnswers(),
    [Q.difficultWorkflow]: `  ${"x".repeat(800)}  `,
    [Q.role]: "other",
    [Q.roleOther]: "   Head   of   transformation   ",
  };
  const stored = buildStoredAnswers(answers);
  assert.equal(String(stored.find((answer) => answer.questionId === Q.difficultWorkflow).value).length, 750);
  assert.equal(
    stored.find((answer) => answer.questionId === Q.roleOther).value,
    "Head of transformation",
  );
});

test("empty answers are not stored", () => {
  const stored = buildStoredAnswers({ [Q.role]: "", [Q.regions]: [], [Q.adminTime]: "not_measured" });
  assert.deepEqual(
    stored.map((answer) => answer.questionId),
    [Q.adminTime],
  );
});

// ── Review screen ──────────────────────────────────────────────────────────

test("the review screen shows labels, ranked order and only active answers", () => {
  const answers: AnswerMap = {
    ...validAnswers(),
    [Q.timing]: "researching_only",
    // Stale answers from an earlier selection.
    [Q.investmentRange]: "more_than_5000",
    [Q.roleOther]: "Head of transformation",
  };

  const sections = buildReviewSections(answers);
  assert.equal(sections.length, 4);

  const allItems = sections.flatMap((section) => section.items);
  const ids = allItems.map((item) => item.questionId);
  assert.ok(!ids.includes(Q.investmentRange), "suppressed budget answer must not appear");
  assert.ok(!ids.includes(Q.roleOther), "inactive explanation must not appear");

  const role = allItems.find((item) => item.questionId === Q.role);
  assert.deepEqual(role.values, ["Founder or Director"], "labels, never slugs");

  const capabilities = allItems.find((item) => item.questionId === Q.capabilities);
  assert.equal(capabilities.ranked, true);
  assert.deepEqual(capabilities.values, [
    "CRM",
    "Onboarding and workflow",
    "Report generation",
    "Client and partner portals",
    "API and integrations",
  ]);
});

test("the review screen flags unanswered required questions", () => {
  const answers = validAnswers();
  delete answers[Q.adminTime];

  const item = buildReviewSections(answers)
    .flatMap((section) => section.items)
    .find((entry) => entry.questionId === Q.adminTime);

  assert.equal(item.answered, false);
  assert.equal(item.required, true);
});

test("unanswered optional questions are omitted from the review", () => {
  const items = buildReviewSections(validAnswers()).flatMap((section) => section.items);
  const ids = items.map((item) => item.questionId);

  // BRQ-09 and the optional product-name fields were never filled in.
  assert.ok(!ids.includes(Q.difficultWorkflow));
  assert.ok(!ids.includes(systemProductQuestionId("crm")));

  // An answered optional question is still shown.
  const withNotes = buildReviewSections({
    ...validAnswers(),
    [Q.difficultWorkflow]: "Handover between sales and finance stalls for days.",
  }).flatMap((section) => section.items);
  assert.ok(withNotes.some((item) => item.questionId === Q.difficultWorkflow));
});

// ── Organisation-type suggestions ──────────────────────────────────────────

test("organisation type reorders capabilities without removing or preselecting any", () => {
  const buyersAgency = suggestedCapabilityOrder("buyers_agent");
  assert.equal(buyersAgency.length, suggestedCapabilityOrder(undefined).length);
  assert.equal(buyersAgency[0].value, "buyers_agency_workflow");

  const finance = suggestedCapabilityOrder("mortgage_finance");
  assert.equal(finance[0].value, "finance_portal");
  assert.ok(finance.some((option) => option.value === "smsf_workflow"), "no option is removed");

  // Nothing is selected on the applicant's behalf.
  assert.deepEqual(buildStoredAnswers({}).filter((answer) => answer.questionId === Q.capabilities), []);
});
