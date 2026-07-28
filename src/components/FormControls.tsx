/**
 * Shared Aurixa form primitives.
 *
 * Moved verbatim out of the Stage 1 Priority Access form so Stage 2 reuses the
 * same labelling, dark control styling, teal focus treatment and accessible
 * dropdown behaviour rather than duplicating them. The markup and class names
 * are unchanged — the Contact page renders exactly as before.
 */

import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Option } from "../lib/waitlist";

export const inputBaseClass =
  "w-full min-h-[48px] bg-[#040B16] border px-4 py-3 text-white text-[14px] font-light transition-all focus:outline-none focus:ring-1 placeholder:text-gray-500";

/** Invalid state is carried by border colour AND the text error beneath it. */
export const controlClass = (hasError: boolean) =>
  `${inputBaseClass} ${
    hasError
      ? "border-red-400/70 focus:border-red-400 focus:ring-red-400"
      : "border-white/15 focus:border-[#00A8B5] focus:ring-[#00A8B5]"
  }`;

export const labelClass =
  "block text-[11px] uppercase tracking-[0.12em] text-[#C3CCDD] font-bold leading-snug";

export const helperClass = "text-[12px] text-[#9CA3B8] font-light leading-snug";

export const errorClass = "text-[13px] text-red-300 font-light";

/** Two paired fields per row: subgrid keeps labels, controls and helpers aligned. */
export const pairedRowClass =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-5 sm:grid-rows-[auto_auto_auto]";

/**
 * Required marker. The asterisk is text (not colour alone) and every form
 * carrying it also states "Required fields are marked *" (section 14.4).
 */
export function RequiredMark() {
  return (
    <span className="text-[#C89B3C] ml-1" aria-hidden="true">
      *
    </span>
  );
}

export const describedBy = (id: string, helper: boolean, error: boolean) =>
  [helper ? `${id}-helper` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  /** Set when the field sits in a paired row so it can share the row's tracks. */
  paired?: boolean;
  /** Overrides the default uppercase micro-label (Stage 2 uses full sentences). */
  labelClassName?: string;
  children: ReactNode;
};

export function Field({ id, label, required, helper, error, paired, labelClassName, children }: FieldProps) {
  return (
    <div className={paired ? "grid gap-y-2 sm:row-span-3 sm:grid-rows-subgrid" : "space-y-2"}>
      <label htmlFor={id} className={labelClassName ?? labelClass}>
        {label}
        {required && <RequiredMark />}
      </label>
      <div>{children}</div>
      <div className="space-y-1">
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
    </div>
  );
}

/**
 * Accessible listbox used for every Aurixa dropdown.
 *
 * The menu always renders directly beneath its trigger, overlays the content
 * below instead of pushing it down, and scrolls internally once the list is
 * taller than its maximum height. The trigger carries the field id so the
 * error-focus logic keeps working, and a hidden input keeps the field name and
 * value present in the DOM.
 */
type DropdownProps = {
  id: string;
  name: string;
  label: string;
  options: Option[];
  value: string;
  placeholder: string;
  onSelect: (value: string) => void;
  required?: boolean;
  helper?: string;
  error?: string;
  paired?: boolean;
  /** Overrides the default uppercase micro-label (Stage 2 uses full sentences). */
  labelClassName?: string;
};

export function Dropdown({
  id,
  name,
  label,
  options,
  value,
  placeholder,
  onSelect,
  required,
  helper,
  error,
  paired,
  labelClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openList = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onSelect(option.value);
    setOpen(false);
    setActiveIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const describedByIds =
    [helper ? `${id}-helper` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={paired ? "grid gap-y-2 sm:row-span-3 sm:grid-rows-subgrid" : "space-y-2"}>
      <label htmlFor={id} className={labelClassName ?? labelClass}>
        {label}
        {required && <RequiredMark />}
      </label>

      <div className="relative" ref={containerRef}>
        <input type="hidden" name={name} value={value} />
        <button
          type="button"
          id={id}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-required={required ? "true" : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedByIds}
          onClick={() => (open ? setOpen(false) : openList(selectedIndex >= 0 ? selectedIndex : 0))}
          onKeyDown={handleKeyDown}
          className={`${controlClass(Boolean(error))} flex items-center justify-between gap-2 text-left`}
        >
          <span className={selectedLabel ? "text-white truncate" : "text-gray-500 truncate"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[#9CA3B8] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul
            id={`${id}-listbox`}
            ref={listRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[240px] overflow-y-auto border border-[#00A8B5]/40 bg-[#040B16] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(index);
                  }}
                  className={`px-4 py-2.5 text-[13px] font-light cursor-pointer ${
                    index === activeIndex ? "bg-[#00A8B5]/15 text-white" : "text-[#B6C0D4]"
                  } ${isSelected ? "border-l-2 border-[#C89B3C]" : "border-l-2 border-transparent"}`}
                >
                  {option.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1">
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
    </div>
  );
}
