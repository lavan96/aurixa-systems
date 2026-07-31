/**
 * Stage 2 resume-by-reference form.
 *
 * Shown on the locked questionnaire screen so an applicant whose secure link
 * has expired is not stuck: they continue with the reference issued at Stage 1
 * and the work email the application was filed under. Both are required — the
 * reference travels in email and is not a credential on its own.
 */

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import {
  EMPTY_RESUME_DETAILS,
  RESUME_COPY,
  formatReferenceInput,
  normaliseReference,
  validateResumeDetails,
  type ResumeDetailErrors,
  type ResumeDetails,
  type ResumeFailure,
} from "../../lib/questionnaireResume";

const FIELD_CLASS =
  "mt-2 w-full border border-white/15 bg-[#040B16]/80 px-4 py-3 text-[15px] font-light text-white " +
  "placeholder:text-[#5A6577] focus:border-[#00A8B5] focus:outline-none";

const LABEL_CLASS = "text-[11px] font-bold uppercase tracking-[0.16em] text-[#9CA3B8]";

export type ResumeByReferenceProps = {
  /** Resolves with the failure reason, or null once the session is open. */
  onResume: (details: { applicationId: string; workEmail: string }) => Promise<ResumeFailure | null>;
  supportEmail: string;
};

export function ResumeByReference({ onResume, supportEmail }: ResumeByReferenceProps) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<ResumeDetails>(EMPTY_RESUME_DETAILS);
  const [errors, setErrors] = useState<ResumeDetailErrors>({});
  const [failure, setFailure] = useState<ResumeFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateResumeDetails(details);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const reason = await onResume({
      applicationId: normaliseReference(details.reference),
      workEmail: details.workEmail.trim(),
    });
    setSubmitting(false);
    // On success the page swaps this screen for the questionnaire itself.
    if (reason) setFailure(reason);
  };

  if (!open) {
    return (
      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="text-[13px] font-light leading-relaxed text-[#9CA3B8]">
          Link expired, or cannot find it? You can continue with the application reference from your
          Aurixa confirmation email.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 border border-[#C89B3C]/60 bg-[#C89B3C]/10 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-[#F5D17A] transition-colors hover:border-[#C89B3C] hover:bg-[#C89B3C]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          CONTINUE WITH MY REFERENCE
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 border-t border-white/10 pt-6 text-left">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C89B3C]">
        CONTINUE WITH YOUR REFERENCE
      </p>
      <p className="mt-3 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
        Enter the application reference from your Aurixa email and the work email you applied with.
        We need both before reopening the questionnaire.
      </p>

      <label className="mt-5 block">
        <span className={LABEL_CLASS}>Application reference</span>
        <input
          name="reference"
          value={details.reference}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="AX-7Q2M4L9XZ1"
          aria-invalid={Boolean(errors.reference)}
          aria-describedby={errors.reference ? "resume-error-reference" : undefined}
          onChange={(event) =>
            setDetails((current) => ({ ...current, reference: formatReferenceInput(event.target.value) }))
          }
          className={`${FIELD_CLASS} font-mono tracking-[0.08em]`}
        />
        {errors.reference && (
          <b id="resume-error-reference" className="mt-2 block text-[12px] font-normal text-[#E9A294]">
            {errors.reference}
          </b>
        )}
      </label>

      <label className="mt-4 block">
        <span className={LABEL_CLASS}>Work email</span>
        <input
          name="workEmail"
          type="email"
          value={details.workEmail}
          autoComplete="email"
          placeholder="you@yourfirm.com.au"
          aria-invalid={Boolean(errors.workEmail)}
          aria-describedby={errors.workEmail ? "resume-error-workEmail" : undefined}
          onChange={(event) => setDetails((current) => ({ ...current, workEmail: event.target.value }))}
          className={FIELD_CLASS}
        />
        {errors.workEmail && (
          <b id="resume-error-workEmail" className="mt-2 block text-[12px] font-normal text-[#E9A294]">
            {errors.workEmail}
          </b>
        )}
      </label>

      {failure && (
        <p role="alert" className="mt-4 border border-[#E28B7C]/40 bg-[#E28B7C]/10 px-4 py-3 text-[13px] font-light leading-relaxed text-[#D8C3BD]">
          {RESUME_COPY[failure]}
          {(failure === "invalid_reference" || failure === "not_configured") && (
            <>
              {" "}
              <a className="text-[#C89B3C] underline underline-offset-2" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </>
          )}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] items-center gap-2 border border-[#C89B3C]/60 bg-[#C89B3C]/10 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-[#F5D17A] transition-colors hover:border-[#C89B3C] hover:bg-[#C89B3C]/20 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> CHECKING
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden="true" /> REOPEN QUESTIONNAIRE
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setFailure(null); setErrors({}); }}
          className="inline-flex min-h-[48px] items-center px-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#9CA3B8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
