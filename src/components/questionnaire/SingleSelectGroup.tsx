/**
 * Accessible single-select group — native radio inputs in Aurixa option cards.
 *
 * Native radios keep arrow-key roving, form semantics and screen-reader
 * announcements intact; the card is only the visual treatment. Selection is
 * carried by the radio's checked state, the teal border AND the visible ring on
 * the control itself, so it never depends on colour alone.
 */

import { Option } from "../../lib/readinessQuestionnaire";

type SingleSelectGroupProps = {
  /** Stable question identifier — namespaces every input id. */
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Two columns on wider viewports; single column keeps long labels readable. */
  columns?: 1 | 2;
  invalid?: boolean;
};

export function SingleSelectGroup({
  name,
  options,
  value,
  onChange,
  columns = 2,
  invalid,
}: SingleSelectGroupProps) {
  return (
    <div
      className={`grid gap-1.5 ${columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {options.map((option) => {
        const checked = option.value === value;
        const inputId = `${name}--${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={`flex min-h-[48px] cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-[13px] font-light leading-snug transition-colors focus-within:ring-1 focus-within:ring-[#00A8B5] ${
              checked
                ? "border-[#00A8B5]/60 bg-[#00A8B5]/10 text-white"
                : invalid
                  ? "border-red-400/40 text-[#B6C0D4] hover:border-red-400/70"
                  : "border-white/15 text-[#B6C0D4] hover:border-white/35"
            }`}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A8B5]"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
