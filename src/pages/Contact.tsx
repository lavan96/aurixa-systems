import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ShieldAlert, CheckCircle2, Mail, Check } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";
import { captureLead } from "../lib/leads";
import { getAttribution } from "../lib/attribution";
import {
  EMPTY_WAITLIST_FORM,
  IMPROVEMENT_AREA_OPTIONS,
  MAX_ADDITIONAL_NOTES,
  MAX_IMPROVEMENT_AREAS,
  ORGANISATION_TYPE_OPTIONS,
  PRIVACY_POLICY_URL,
  READINESS_QUESTIONNAIRE_URL,
  ROLE_OPTIONS,
  VOLUME_OPTIONS,
  WAITLIST_COPY,
  WaitlistFieldError,
  WaitlistFormValues,
  buildWaitlistPayload,
  cleanEmailValue,
  cleanTextValue,
  generateApplicationId,
  maskEmail,
  normaliseMobileNumber,
  resolveIntakeBadge,
  validateWaitlistForm,
} from "../lib/waitlist";

const MAKE_WAITLIST_WEBHOOK_URL = "https://hook.eu2.make.com/589rb23xwbgovfj3iuemtcuxm75cccut";

const FIELD_ORDER: WaitlistFieldError[] = [
  "firstName",
  "lastName",
  "workEmail",
  "mobileNumber",
  "organisationName",
  "role",
  "organisationType",
  "annualVolume",
  "improvementAreas",
  "additionalNotes",
  "privacyAcknowledged",
];

const inputBaseClass =
  "w-full min-h-[48px] bg-[#040B16] border px-4 py-3 text-white text-sm font-light transition-all focus:outline-none focus:ring-1 placeholder:text-gray-500";

/** Invalid state is carried by border colour AND the text error beneath it. */
const controlClass = (hasError: boolean) =>
  `${inputBaseClass} ${
    hasError
      ? "border-red-400/70 focus:border-red-400 focus:ring-red-400"
      : "border-white/15 focus:border-[#00A8B5] focus:ring-[#00A8B5]"
  }`;

const labelClass = "block text-[12px] uppercase tracking-[0.14em] text-[#C3CCDD] font-bold";

const helperClass = "text-[13px] text-[#9CA3B8] font-light leading-snug";

const errorClass = "text-[13px] text-red-300 font-light";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
};

function Field({ id, label, required, helper, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      {/* Reserved two-line label height keeps paired controls aligned on wide rows. */}
      <label htmlFor={id} className={`${labelClass} md:min-h-[39px]`}>
        {label}
        {required && (
          <span className="text-[#C89B3C] ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {helper && (
        <p id={`${id}-helper`} className={helperClass}>
          {helper}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Visual grouping only — one continuous form, no wizard steps. */
function FormSection({
  index,
  eyebrow,
  title,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3 border-b border-white/10 pb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C89B3C]">
          {index} / {eyebrow}
        </span>
        <h3 className="text-[15px] font-display font-light text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

type PathwayState = "complete" | "active" | "upcoming";

const PATHWAY_STEPS = [
  {
    number: "01",
    title: "Priority Access Application",
    detail: "Approximately 60-90 seconds.",
  },
  {
    number: "02",
    title: "Business Readiness Questionnaire",
    detail: "A secure 6-8 minute questionnaire is provided after submission.",
  },
  {
    number: "03",
    title: "Review and Next Step",
    detail:
      "Aurixa reviews the completed profile and identifies the appropriate discovery, demonstration or enterprise pathway.",
  },
];

/**
 * Compact vertical pathway shared by both breakpoints. State is derived purely
 * from whether a receipt exists — no additional application state.
 */
function AccessPathway({ submitted }: { submitted: boolean }) {
  const states: PathwayState[] = submitted
    ? ["complete", "active", "upcoming"]
    : ["active", "upcoming", "upcoming"];

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E9AB0] font-bold mb-4">
        What happens next
      </p>
      <ol className="relative space-y-4 sm:space-y-5">
        {PATHWAY_STEPS.map((step, index) => {
          const state = states[index];
          const isLast = index === PATHWAY_STEPS.length - 1;
          return (
            <li key={step.number} className="relative flex gap-3.5">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 bottom-[-1.25rem] w-px ${
                    state === "complete" ? "bg-[#C89B3C]/40" : "bg-white/10"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 shrink-0 flex items-center justify-center w-[27px] h-[27px] rounded-full border text-[10px] font-mono ${
                  state === "complete"
                    ? "border-[#C89B3C]/60 bg-[#C89B3C]/15 text-[#C89B3C]"
                    : state === "active"
                      ? "border-[#C89B3C] bg-[#C89B3C]/10 text-[#C89B3C] shadow-[0_0_12px_rgba(200,155,60,0.25)]"
                      : "border-[#00A8B5]/30 bg-[#00A8B5]/5 text-[#5F8C97]"
                }`}
              >
                {state === "complete" ? <Check className="w-3.5 h-3.5" /> : step.number}
              </span>
              <div className="pt-0.5">
                <p
                  className={`text-[13px] font-semibold tracking-wide ${
                    state === "upcoming" ? "text-[#8E9AB0]" : "text-white"
                  }`}
                >
                  <span className="sr-only">Step {step.number}: </span>
                  {step.title}
                  {state === "complete" && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-[#C89B3C] font-mono">
                      Complete
                    </span>
                  )}
                  {state === "active" && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-[#C89B3C] font-mono">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-[#9CA3B8] font-light leading-snug mt-1">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Contact() {
  const [values, setValues] = useState<WaitlistFormValues>(EMPTY_WAITLIST_FORM);
  const [errors, setErrors] = useState<Partial<Record<WaitlistFieldError, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [receipt, setReceipt] = useState<{
    applicationId: string;
    firstName: string;
    organisationName: string;
    workEmail: string;
  } | null>(null);

  /**
   * Stable for the lifetime of an application attempt so retries after a
   * network failure — and an email correction from the confirmation screen —
   * reference the same application rather than creating duplicates.
   */
  const applicationIdRef = useRef(generateApplicationId());
  const intakeBadge = useMemo(() => resolveIntakeBadge(), []);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAttribution("AURIXA Contact Waitlist Page", "/contact");
  }, []);

  /**
   * `overflow-x: hidden` on an ancestor makes that ancestor a scroll container,
   * which silently disables `position: sticky` for the guidance panel.
   * `overflow-x: clip` gives identical visual containment without creating a
   * scroll container. Applied only while this page is mounted and restored on
   * unmount, so no shared layout behaviour changes elsewhere.
   */
  useEffect(() => {
    const patched: Array<[HTMLElement, string]> = [];
    let node = pageRef.current?.parentElement ?? null;
    while (node && node !== document.documentElement) {
      if (getComputedStyle(node).overflowX === "hidden") {
        patched.push([node, node.style.overflowX]);
        node.style.overflowX = "clip";
      }
      node = node.parentElement;
    }
    return () => {
      patched.forEach(([element, previous]) => {
        element.style.overflowX = previous;
      });
    };
  }, []);

  const setValue = <K extends keyof WaitlistFormValues>(key: K, value: WaitlistFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleImprovementArea = (value: string) => {
    setValues((current) => {
      const selected = current.improvementAreas.includes(value)
        ? current.improvementAreas.filter((item) => item !== value)
        : current.improvementAreas.length >= MAX_IMPROVEMENT_AREAS
          ? current.improvementAreas
          : [...current.improvementAreas, value];
      return { ...current, improvementAreas: selected };
    });
    setErrors((current) => {
      if (!current.improvementAreas) return current;
      const next = { ...current };
      delete next.improvementAreas;
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Partial<Record<WaitlistFieldError, string>>) => {
    const firstField = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!firstField) return;
    const element = document.getElementById(firstField);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmissionError("");

    const fieldErrors = validateWaitlistForm(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const applicationId = applicationIdRef.current;
    const payload = buildWaitlistPayload(
      values,
      applicationId,
      getAttribution("AURIXA Contact Waitlist Page", "/contact"),
    );

    try {
      const response = await fetch(MAKE_WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Idempotency key — repeated deliveries of the same application must
          // collapse to a single record downstream.
          "X-Application-Id": applicationId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Waitlist webhook submission failed");
      }

      // Primary capture (Make.com → Airtable) succeeded — persist the lead in
      // Aurixa Systems' own backend (store of record) and mirror it into
      // Mission Control so operators are notified in real time.
      // Fire-and-forget: never blocks or fails the visitor's submission.
      captureLead(payload);

      setReceipt({
        applicationId,
        firstName: cleanTextValue(values.firstName),
        organisationName: cleanTextValue(values.organisationName),
        workEmail: cleanEmailValue(values.workEmail),
      });
    } catch (error) {
      console.error(error);
      setSubmissionError(
        "We could not submit your application just now. Please try again — your answers have been kept.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Section 5.6 — the confirmation screen offers a correction path for the work
   * email. Answers are retained and the same application reference is reused,
   * so the corrected submission updates rather than duplicates the application.
   */
  const handleCorrectEmail = () => {
    setReceipt(null);
    window.requestAnimationFrame(() => {
      const element = document.getElementById("workEmail");
      element?.focus();
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const describedBy = (id: string, helper: boolean, error: boolean) =>
    [helper ? `${id}-helper` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div
      ref={pageRef}
      className="w-full relative pt-28 lg:pt-32 pb-16 lg:pb-24 min-h-screen bg-[#040B16] overflow-x-clip"
    >
      <HeroBackground variant="contact" />

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-[minmax(290px,340px)_minmax(0,1fr)] xl:gap-12">

          {/* Guidance — sticky beside the form on desktop, stacked above it on mobile */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:sticky xl:top-28 space-y-7"
          >
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-[#C89B3C]/70" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#C89B3C]">
                  Stage 01 / Priority Access
                </span>
              </div>
              <h1 className="text-[34px] sm:text-[38px] font-display font-light text-white tracking-[-0.02em] leading-[1.12] mb-4">
                {WAITLIST_COPY.heading}
              </h1>
              <p className="text-[15px] text-[#B6C0D4] font-light leading-relaxed">
                {WAITLIST_COPY.supporting}
              </p>
              <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed mt-3">
                {WAITLIST_COPY.timeEstimate} {WAITLIST_COPY.requiredNote}.
              </p>
              <div className="mt-5 inline-flex px-3 py-1.5 bg-[#C89B3C]/10 border border-[#C89B3C]/30 text-[#C89B3C] text-[10px] uppercase tracking-[0.2em] font-mono rounded-sm">
                {intakeBadge}
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <AccessPathway submitted={Boolean(receipt)} />
            </div>

            <div className="flex gap-3 border border-[#C89B3C]/25 bg-[#C89B3C]/[0.06] px-4 py-3.5 rounded-sm">
              <ShieldAlert
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
                aria-hidden="true"
              />
              <p className="text-[13px] text-[#B6C0D4] font-light leading-relaxed">
                {WAITLIST_COPY.confidentiality}
              </p>
            </div>
          </motion.aside>

          {/* Application surface */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-sm border border-[#00A8B5]/25 bg-[#0B162C]/95 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"
            />
            <div className="p-5 sm:p-8 lg:p-10">
              {receipt ? (
                <ApplicationReceipt receipt={receipt} onCorrectEmail={handleCorrectEmail} />
              ) : (
                <>
                  <div className="mb-8 pb-6 border-b border-white/10">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#00A8B5] font-bold mb-2">
                      Priority Access Application
                    </p>
                    <h2 className="text-2xl font-display font-light text-white mb-3">Application Details</h2>
                    <p className="text-[14px] text-[#B6C0D4] font-light leading-relaxed max-w-2xl">
                      Provide the information required for Aurixa to assess your organisation and issue the
                      next qualification step.
                    </p>
                  </div>

                  <form className="space-y-9" onSubmit={handleWaitlistSubmit} noValidate>
                    <FormSection index="01" eyebrow="Contact" title="Contact Details">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Field id="firstName" label="First Name" required error={errors.firstName}>
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            autoComplete="given-name"
                            maxLength={60}
                            value={values.firstName}
                            onChange={(event) => setValue("firstName", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.firstName)}
                            aria-describedby={describedBy("firstName", false, Boolean(errors.firstName))}
                            className={controlClass(Boolean(errors.firstName))}
                          />
                        </Field>
                        <Field id="lastName" label="Last Name" required error={errors.lastName}>
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            autoComplete="family-name"
                            maxLength={60}
                            value={values.lastName}
                            onChange={(event) => setValue("lastName", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.lastName)}
                            aria-describedby={describedBy("lastName", false, Boolean(errors.lastName))}
                            className={controlClass(Boolean(errors.lastName))}
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Field
                          id="workEmail"
                          label="Work Email"
                          required
                          helper={WAITLIST_COPY.helper.workEmail}
                          error={errors.workEmail}
                        >
                          <input
                            id="workEmail"
                            name="workEmail"
                            type="email"
                            autoComplete="email"
                            maxLength={320}
                            value={values.workEmail}
                            onChange={(event) => setValue("workEmail", event.target.value)}
                            onBlur={(event) => setValue("workEmail", cleanEmailValue(event.target.value))}
                            aria-required="true"
                            aria-invalid={Boolean(errors.workEmail)}
                            aria-describedby={describedBy("workEmail", true, Boolean(errors.workEmail))}
                            className={controlClass(Boolean(errors.workEmail))}
                          />
                        </Field>

                        <Field
                          id="mobileNumber"
                          label="Mobile Number (optional)"
                          helper={WAITLIST_COPY.helper.mobileNumber}
                          error={errors.mobileNumber}
                        >
                          <input
                            id="mobileNumber"
                            name="mobileNumber"
                            type="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            placeholder="0412 345 678"
                            value={values.mobileNumber}
                            onChange={(event) => setValue("mobileNumber", event.target.value)}
                            onBlur={(event) => {
                              const normalised = normaliseMobileNumber(event.target.value);
                              if (normalised) setValue("mobileNumber", normalised);
                            }}
                            aria-invalid={Boolean(errors.mobileNumber)}
                            aria-describedby={describedBy("mobileNumber", true, Boolean(errors.mobileNumber))}
                            className={controlClass(Boolean(errors.mobileNumber))}
                          />
                        </Field>
                      </div>
                    </FormSection>

                    <FormSection index="02" eyebrow="Organisation" title="Organisation Profile">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Field
                          id="organisationName"
                          label="Organisation Name"
                          required
                          error={errors.organisationName}
                        >
                          <input
                            id="organisationName"
                            name="organisationName"
                            type="text"
                            autoComplete="organization"
                            maxLength={120}
                            value={values.organisationName}
                            onChange={(event) => setValue("organisationName", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.organisationName)}
                            aria-describedby={describedBy("organisationName", false, Boolean(errors.organisationName))}
                            className={controlClass(Boolean(errors.organisationName))}
                          />
                        </Field>
                        <Field id="role" label="Your Role" required error={errors.role}>
                          <select
                            id="role"
                            name="role"
                            value={values.role}
                            onChange={(event) => setValue("role", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.role)}
                            aria-describedby={describedBy("role", false, Boolean(errors.role))}
                            className={`${controlClass(Boolean(errors.role))} appearance-none`}
                          >
                            <option value="" className="bg-[#040B16]">Select your role...</option>
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#040B16]">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <Field
                          id="organisationType"
                          label="Organisation Type"
                          required
                          error={errors.organisationType}
                        >
                          <select
                            id="organisationType"
                            name="organisationType"
                            value={values.organisationType}
                            onChange={(event) => setValue("organisationType", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.organisationType)}
                            aria-describedby={describedBy("organisationType", false, Boolean(errors.organisationType))}
                            className={`${controlClass(Boolean(errors.organisationType))} appearance-none`}
                          >
                            <option value="" className="bg-[#040B16]">Select organisation type...</option>
                            {ORGANISATION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#040B16]">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field
                          id="annualVolume"
                          label="Approximate Annual Client or Transaction Volume"
                          required
                          helper={WAITLIST_COPY.helper.volume}
                          error={errors.annualVolume}
                        >
                          <select
                            id="annualVolume"
                            name="annualVolume"
                            value={values.annualVolume}
                            onChange={(event) => setValue("annualVolume", event.target.value)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.annualVolume)}
                            aria-describedby={describedBy("annualVolume", true, Boolean(errors.annualVolume))}
                            className={`${controlClass(Boolean(errors.annualVolume))} appearance-none`}
                          >
                            <option value="" className="bg-[#040B16]">Select volume bracket...</option>
                            {VOLUME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#040B16]">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </FormSection>

                    <FormSection index="03" eyebrow="Priorities" title="Operational Priorities">
                      <fieldset
                        className="space-y-3"
                        aria-required="true"
                        aria-invalid={Boolean(errors.improvementAreas)}
                        aria-describedby={describedBy("improvementAreas", true, Boolean(errors.improvementAreas))}
                      >
                        <legend className={labelClass}>
                          What would you most like Aurixa to improve?
                          <span className="text-[#C89B3C] ml-1" aria-hidden="true">*</span>
                        </legend>
                        <p id="improvementAreas-helper" className={helperClass}>
                          {WAITLIST_COPY.helper.improvementAreas} ({values.improvementAreas.length}/
                          {MAX_IMPROVEMENT_AREAS} selected)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                          {IMPROVEMENT_AREA_OPTIONS.map((option, index) => {
                            const checked = values.improvementAreas.includes(option.value);
                            const atLimit =
                              !checked && values.improvementAreas.length >= MAX_IMPROVEMENT_AREAS;
                            return (
                              <label
                                key={option.value}
                                htmlFor={index === 0 ? "improvementAreas" : `improvementAreas-${option.value}`}
                                className={`flex items-start gap-3 px-4 py-3 min-h-[52px] border text-[14px] font-light leading-snug transition-all focus-within:ring-1 focus-within:ring-[#00A8B5] ${
                                  checked
                                    ? "border-[#00A8B5]/60 bg-[#00A8B5]/10 text-white cursor-pointer"
                                    : atLimit
                                      ? "border-white/10 text-[#6B7689] cursor-not-allowed"
                                      : "border-white/15 text-[#B6C0D4] hover:border-white/35 cursor-pointer"
                                }`}
                              >
                                <input
                                  id={index === 0 ? "improvementAreas" : `improvementAreas-${option.value}`}
                                  type="checkbox"
                                  name="improvementAreas"
                                  value={option.value}
                                  checked={checked}
                                  disabled={atLimit}
                                  onChange={() => toggleImprovementArea(option.value)}
                                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#00A8B5]"
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {errors.improvementAreas && (
                          <p id="improvementAreas-error" className={errorClass} role="alert">
                            {errors.improvementAreas}
                          </p>
                        )}
                      </fieldset>

                      <Field
                        id="additionalNotes"
                        label="Anything Else We Should Know? (optional)"
                        helper={WAITLIST_COPY.helper.additionalNotes}
                        error={errors.additionalNotes}
                      >
                        <textarea
                          id="additionalNotes"
                          name="additionalNotes"
                          rows={3}
                          maxLength={MAX_ADDITIONAL_NOTES}
                          value={values.additionalNotes}
                          onChange={(event) => setValue("additionalNotes", event.target.value)}
                          aria-invalid={Boolean(errors.additionalNotes)}
                          aria-describedby={describedBy("additionalNotes", true, Boolean(errors.additionalNotes))}
                          className={controlClass(Boolean(errors.additionalNotes))}
                        />
                        <p className="text-[12px] text-[#9CA3B8] font-mono text-right">
                          {values.additionalNotes.length}/{MAX_ADDITIONAL_NOTES}
                        </p>
                      </Field>
                    </FormSection>

                    <FormSection index="04" eyebrow="Confirmation" title="Review and Submit">
                      <details className="border border-white/10 px-4 py-3">
                        <summary className="cursor-pointer text-[12px] uppercase tracking-[0.14em] text-[#C3CCDD] font-bold list-none flex items-center gap-2">
                          <span className="text-[#C89B3C]" aria-hidden="true">+</span> Collection notice
                        </summary>
                        <div className="mt-3 space-y-2 text-[13px] text-[#9CA3B8] font-light leading-relaxed">
                          <p>
                            Aurixa Systems Pty Ltd collects the information in this form to assess your
                            priority-access application, to send you the Business Readiness Questionnaire and to
                            contact you about the outcome. Providing the information is voluntary, but we cannot
                            assess an application without it.
                          </p>
                          <p>
                            We may disclose the information to our service providers for hosting, email delivery,
                            customer relationship management and scheduling. We handle it in accordance with the
                            Australian Privacy Principles.
                          </p>
                          <p>
                            To access or correct your information, withdraw your application or make a privacy
                            complaint, contact{" "}
                            <a className="text-[#C89B3C] hover:underline" href="mailto:privacy@aurixasystems.com.au">
                              privacy@aurixasystems.com.au
                            </a>
                            .
                          </p>
                          <p>{WAITLIST_COPY.confidentiality}</p>
                        </div>
                      </details>

                      <div className="space-y-2">
                        <label
                          htmlFor="privacyAcknowledged"
                          className="flex w-full items-start gap-3 text-[13px] text-[#B6C0D4] font-light leading-relaxed cursor-pointer"
                        >
                          <input
                            id="privacyAcknowledged"
                            name="privacyAcknowledged"
                            type="checkbox"
                            checked={values.privacyAcknowledged}
                            onChange={(event) => setValue("privacyAcknowledged", event.target.checked)}
                            aria-required="true"
                            aria-invalid={Boolean(errors.privacyAcknowledged)}
                            aria-describedby={describedBy("privacyAcknowledged", false, Boolean(errors.privacyAcknowledged))}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-[#00A8B5]"
                          />
                          <span>
                            {WAITLIST_COPY.privacyAcknowledgement}
                            <span className="text-[#C89B3C] ml-1" aria-hidden="true">*</span>
                            {PRIVACY_POLICY_URL && (
                              <>
                                {" "}
                                <a
                                  href={PRIVACY_POLICY_URL}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#C89B3C] hover:underline"
                                >
                                  Read the Privacy Policy
                                </a>
                              </>
                            )}
                          </span>
                        </label>
                        {errors.privacyAcknowledged && (
                          <p id="privacyAcknowledged-error" className={errorClass} role="alert">
                            {errors.privacyAcknowledged}
                          </p>
                        )}
                      </div>

                      <label
                        htmlFor="marketingConsent"
                        className="flex w-full items-start gap-3 text-[13px] text-[#B6C0D4] font-light leading-relaxed cursor-pointer"
                      >
                        <input
                          id="marketingConsent"
                          name="marketingConsent"
                          type="checkbox"
                          checked={values.marketingConsent}
                          onChange={(event) => setValue("marketingConsent", event.target.checked)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#00A8B5]"
                        />
                        <span>{WAITLIST_COPY.marketingConsent}</span>
                      </label>

                      <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed border-l-2 border-[#00A8B5]/40 pl-4">
                        {WAITLIST_COPY.preSubmit}
                      </p>

                      {submissionError && (
                        <p className={errorClass} role="alert">
                          {submissionError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] text-[12px] sm:text-[13px] font-black tracking-[0.18em] uppercase text-white btn-chrome-prismatic transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_0_20px_rgba(200,155,60,0.18)] hover:shadow-[0_0_32px_rgba(0,168,181,0.3)] border-none rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C]"
                      >
                        <span className="relative z-10 text-center text-white drop-shadow-md">
                          {isSubmitting ? WAITLIST_COPY.submittingButton : WAITLIST_COPY.submitButton}
                        </span>
                        <ArrowRight className="w-5 h-5 shrink-0 relative z-10 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500 ease-out z-0"></div>
                      </button>

                      <div className="pt-5 border-t border-white/10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-[#9CA3B8] uppercase tracking-[0.16em] font-mono flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" aria-hidden="true"></span>
                          {WAITLIST_COPY.queueStatus}
                        </p>
                        <p className="text-[11px] text-[#C89B3C] uppercase tracking-[0.16em] font-mono sm:text-right">
                          {WAITLIST_COPY.reviewStatus}
                        </p>
                      </div>
                    </FormSection>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** Section 5.6 / Appendix A.3 — confirmation screen. */
function ApplicationReceipt({
  receipt,
  onCorrectEmail,
}: {
  receipt: { applicationId: string; firstName: string; organisationName: string; workEmail: string };
  onCorrectEmail: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="w-6 h-6 mt-1 shrink-0"
          style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
          aria-hidden="true"
        />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl font-display font-light text-white outline-none leading-snug"
        >
          Your Aurixa application has been received
        </h2>
      </div>

      <p className="text-[14px] text-[#B6C0D4] font-light leading-relaxed">
        Thank you, {receipt.firstName}. Your priority access application for{" "}
        <span className="text-white">{receipt.organisationName}</span> has been successfully received.
      </p>

      <dl className="border border-white/10 divide-y divide-white/10">
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[#9CA3B8] font-bold">
            Application reference
          </dt>
          <dd className="text-[#C89B3C] font-mono text-[14px] break-all">{receipt.applicationId}</dd>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[#9CA3B8] font-bold">Sent to</dt>
          <dd className="text-white font-light text-[14px] break-all">{maskEmail(receipt.workEmail)}</dd>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[#9CA3B8] font-bold">
            Review timeframe
          </dt>
          <dd className="text-white font-light text-[14px] sm:text-right">
            Within two business days of questionnaire completion
          </dd>
        </div>
      </dl>

      <p className="text-[14px] text-[#B6C0D4] font-light leading-relaxed">
        The next step is to complete our Business Readiness Questionnaire. It takes approximately 6-8 minutes
        and allows our team to understand your workflows, technology environment and preferred Aurixa modules.
      </p>

      {READINESS_QUESTIONNAIRE_URL ? (
        <a
          href={READINESS_QUESTIONNAIRE_URL}
          className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] text-[12px] sm:text-[13px] font-black tracking-[0.18em] uppercase text-white btn-chrome-prismatic transition-all rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C]"
        >
          <span className="relative z-10 text-center drop-shadow-md">
            Complete Business Readiness Questionnaire
          </span>
          <ArrowRight className="w-5 h-5 shrink-0 relative z-10 group-hover:translate-x-1 transition-transform" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }} />
        </a>
      ) : (
        <div className="flex items-start gap-3 border border-[#00A8B5]/30 bg-[#00A8B5]/5 px-4 py-4">
          <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }} aria-hidden="true" />
          <p className="text-[13px] text-[#B6C0D4] font-light leading-relaxed">
            We will email your secure questionnaire link to the address above shortly. Quote your application
            reference in any correspondence.
          </p>
        </div>
      )}

      <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed">
        Once the questionnaire is completed, our team will assess your application and advise whether the
        appropriate next step is a platform discovery session, guided demonstration or enterprise requirements
        consultation.
      </p>

      <button
        type="button"
        onClick={onCorrectEmail}
        className="inline-flex min-h-[48px] items-center text-[12px] uppercase tracking-[0.16em] text-[#C89B3C] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] rounded-sm"
      >
        Not the right email address? Correct it
      </button>
    </div>
  );
}
