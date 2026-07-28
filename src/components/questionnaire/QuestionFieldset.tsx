/**
 * Shared chrome for a grouped Stage 2 question.
 *
 * Grouped controls (radio, checkbox and the ranked capability list) need a
 * fieldset/legend rather than a label (section 14.4). The fieldset itself is
 * programmatically focusable so validation can move focus to the first invalid
 * question and assistive technology announces the legend, requirement state and
 * error together.
 */

import { ReactNode } from "react";
import { errorClass, helperClass } from "../FormControls";

/**
 * Stage 2 questions are full sentences, so they use a sentence-case question
 * style rather than the uppercase micro-label used for the short Stage 1 field
 * names. Exported so the one dropdown question (BRQ-01) matches the rest.
 */
export const questionLabelClass =
  "block text-[15px] font-semibold leading-snug text-white";

type QuestionFieldsetProps = {
  /** Stable question identifier — also the DOM id used for error focus. */
  id: string;
  /** Applicant-facing number, e.g. "01". Never a database key on its own. */
  number: string;
  question: string;
  required?: boolean;
  helper?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function QuestionFieldset({
  id,
  number,
  question,
  required,
  helper,
  error,
  children,
}: QuestionFieldsetProps) {
  const describedByIds =
    [helper ? `${id}-helper` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-required={required ? "true" : undefined}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedByIds}
      className={`space-y-3 border-l-2 pl-4 sm:pl-5 outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0B162C] ${
        error ? "border-red-400/70" : "border-white/10"
      }`}
    >
      <legend className="sr-only">{`Question ${number}. ${question}${required ? " (required)" : " (optional)"}`}</legend>

      <div aria-hidden="true" className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00A8B5]">{number}</p>
        <p className={questionLabelClass}>
          {question}
          {required ? (
            <span className="text-[#C89B3C] ml-1">*</span>
          ) : (
            <span className="text-[#9CA3B8] ml-2 text-[12px] font-normal">Optional</span>
          )}
        </p>
      </div>

      {helper && (
        <div id={`${id}-helper`} className={helperClass}>
          {helper}
        </div>
      )}

      {children}

      {error && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * A nested conditional follow-up. Kept visually subordinate to its trigger so
 * it is obvious the question appeared because of the answer above it.
 */
export function ConditionalBlock({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 space-y-4 border-l-2 border-[#C89B3C]/40 bg-[#040B16]/50 px-4 py-4 sm:px-5">
      {children}
    </div>
  );
}
