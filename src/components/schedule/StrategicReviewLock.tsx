/**
 * What an unverified visitor sees instead of the scheduler.
 *
 * The page holds here until the server has said yes, so nothing about a real
 * application — not a name, not a time, not the calendar — is rendered behind
 * it. The form is the way back in for someone who has their reference but not
 * the link from their email.
 */

import { useState, type FormEvent } from "react";
import { ArrowUpRight, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { formatReferenceInput, normaliseReference } from "../../lib/applicationReference";
import { ACCESS_COPY, type AccessFailure } from "../../lib/strategicReviewAccess";

export type StrategicReviewLockProps = {
  /** Resolves with the failure to show, or null once the page has been opened. */
  onUnlock: (reference: string) => Promise<AccessFailure | null>;
  /** Shown before the applicant has tried anything, from the initial check. */
  initialFailure: AccessFailure;
  /** Prefilled when the reference was in the link but the server refused it. */
  initialReference?: string;
  supportEmail: string;
};

/**
 * Shown while the page is still asking about a reference it found itself.
 *
 * Deliberately a separate component: the form below must not mount until the
 * reference from the link is known, or it has nothing to prefill itself with.
 */
export function StrategicReviewChecking() {
  return (
    <section className="review-lock" aria-labelledby="review-lock-heading">
      <div className="review-lock__panel">
        <p className="review-eyebrow">STAGE 03 · STRATEGIC REVIEW</p>
        <div className="review-lock__heading">
          <LockKeyhole aria-hidden="true" />
          <h1 id="review-lock-heading" tabIndex={-1}>Checking your application reference.</h1>
        </div>
        <p className="review-lock__copy" aria-live="polite">
          One moment while we verify your reference with Aurixa.
        </p>
      </div>
    </section>
  );
}

export function StrategicReviewLock({
  onUnlock,
  initialFailure,
  initialReference = "",
  supportEmail,
}: StrategicReviewLockProps) {
  const [reference, setReference] = useState(initialReference);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<AccessFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);

    if (!reference.trim()) {
      setError("Enter the application reference from your Aurixa email.");
      return;
    }
    if (!normaliseReference(reference)) {
      setError("That does not look like an Aurixa reference. It looks like AX-7Q2M4L9XZ1.");
      return;
    }
    setError("");

    setSubmitting(true);
    const reason = await onUnlock(reference);
    setSubmitting(false);
    // On success the page swaps this screen for the scheduler itself.
    if (reason) setFailure(reason);
  };

  const shown = failure ?? initialFailure;

  return (
    <section className="review-lock" aria-labelledby="review-lock-heading">
      <div className="review-lock__panel">
        <p className="review-eyebrow">STAGE 03 · STRATEGIC REVIEW</p>
        <div className="review-lock__heading">
          <LockKeyhole aria-hidden="true" />
          <h1 id="review-lock-heading" tabIndex={-1}>Application reference required.</h1>
        </div>

        <p className="review-lock__copy" aria-live="polite">{ACCESS_COPY[shown]}</p>

        <form onSubmit={submit} noValidate className="review-lock__form">
          <label htmlFor="review-lock-reference">APPLICATION REFERENCE</label>
          <input
            id="review-lock-reference"
            name="reference"
            value={reference}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="AX-7Q2M4L9XZ1"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "review-lock-error" : undefined}
            onChange={(event) => setReference(formatReferenceInput(event.target.value))}
          />
          {error && <b id="review-lock-error">{error}</b>}

          <button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="review-lock__spinner" aria-hidden="true" /> CHECKING
              </>
            ) : (
              <>
                <KeyRound aria-hidden="true" /> OPEN MY SCHEDULING PAGE
              </>
            )}
          </button>
        </form>

        <div className="review-lock__actions">
          <a href={`mailto:${supportEmail}?subject=${encodeURIComponent("Strategic review scheduling access")}`}>
            <Mail aria-hidden="true" /> EMAIL THE TEAM
          </a>
          <Link to="/">
            RETURN TO AURIXASYSTEMS.COM.AU <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
