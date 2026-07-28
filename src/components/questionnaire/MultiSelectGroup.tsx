/**
 * Accessible multi-select group — native checkboxes in Aurixa option cards.
 *
 * Handles the two behaviours the operating model requires of every Stage 2
 * multi-select (section 6.6):
 *
 *  - Mutually exclusive options ("No central system", "None initially",
 *    "Not yet known", "None") clear the named selections and vice versa. When
 *    that would discard answers the applicant has already made, an inline
 *    confirmation is shown first — nothing is silently deleted.
 *  - A maximum selection count, with the remaining allowance stated in text and
 *    the unselected options disabled (and marked as such in text) at the limit.
 */

import { ReactNode, useState } from "react";
import {
  Option,
  clearedByExclusiveSelection,
  labelFor,
  toggleExclusiveMultiSelect,
} from "../../lib/readinessQuestionnaire";

type MultiSelectGroupProps = {
  /** Stable question identifier — namespaces every input id. */
  name: string;
  options: Option[];
  values: string[];
  onChange: (next: string[]) => void;
  /** Options that cannot coexist with any other selection. */
  exclusiveValues?: string[];
  max?: number;
  columns?: 1 | 2;
  invalid?: boolean;
  /** Optional follow-up rendered beneath a selected option (product names). */
  renderDetail?: (option: Option) => ReactNode;
};

export function MultiSelectGroup({
  name,
  options,
  values,
  onChange,
  exclusiveValues = [],
  max,
  columns = 2,
  invalid,
  renderDetail,
}: MultiSelectGroupProps) {
  const [pendingExclusive, setPendingExclusive] = useState<{ value: string; cleared: string[] } | null>(
    null,
  );

  const atLimit = max !== undefined && values.length >= max;

  const toggle = (value: string) => {
    const cleared = clearedByExclusiveSelection(values, value, exclusiveValues);
    if (cleared.length > 0) {
      setPendingExclusive({ value, cleared });
      return;
    }
    onChange(toggleExclusiveMultiSelect(values, value, exclusiveValues));
  };

  const confirmExclusive = () => {
    if (!pendingExclusive) return;
    onChange(toggleExclusiveMultiSelect(values, pendingExclusive.value, exclusiveValues));
    setPendingExclusive(null);
  };

  return (
    <div className="space-y-3">
      <div className={`grid gap-1.5 ${columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {options.map((option) => {
          const checked = values.includes(option.value);
          const blockedByLimit = !checked && atLimit && !exclusiveValues.includes(option.value);
          const inputId = `${name}--${option.value}`;
          const detail = checked && renderDetail ? renderDetail(option) : null;

          return (
            <div key={option.value} className="flex flex-col gap-1.5">
              <label
                htmlFor={inputId}
                className={`flex min-h-[48px] flex-1 items-start gap-2.5 border px-3 py-2.5 text-[13px] font-light leading-snug transition-colors focus-within:ring-1 focus-within:ring-[#00A8B5] ${
                  checked
                    ? "cursor-pointer border-[#00A8B5]/60 bg-[#00A8B5]/10 text-white"
                    : blockedByLimit
                      ? "cursor-not-allowed border-white/10 text-[#6B7689]"
                      : invalid
                        ? "cursor-pointer border-red-400/40 text-[#B6C0D4] hover:border-red-400/70"
                        : "cursor-pointer border-white/15 text-[#B6C0D4] hover:border-white/35"
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={blockedByLimit}
                  onChange={() => toggle(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A8B5]"
                />
                <span>
                  {option.label}
                  {blockedByLimit && <span className="sr-only"> (unavailable, selection limit reached)</span>}
                </span>
              </label>
              {detail}
            </div>
          );
        })}
      </div>

      {pendingExclusive && (
        <div
          role="alertdialog"
          aria-labelledby={`${name}-confirm-title`}
          className="border border-[#C89B3C]/40 bg-[#C89B3C]/5 px-4 py-3 space-y-3"
        >
          <p id={`${name}-confirm-title`} className="text-[13px] text-[#E4D5B0] font-light leading-relaxed">
            Selecting “{labelFor(options, pendingExclusive.value)}” will clear{" "}
            {pendingExclusive.cleared.length === 1
              ? `your “${labelFor(options, pendingExclusive.cleared[0])}” selection`
              : `your ${pendingExclusive.cleared.length} other selections`}
            . Do you want to continue?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmExclusive}
              className="min-h-[44px] border border-[#C89B3C]/60 px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#C89B3C] transition-colors hover:bg-[#C89B3C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
            >
              Clear and continue
            </button>
            <button
              type="button"
              onClick={() => setPendingExclusive(null)}
              className="min-h-[44px] border border-white/20 px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#B6C0D4] transition-colors hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
            >
              Keep my selections
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
