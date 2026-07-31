import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Globe2, Loader2, Mail } from "lucide-react";
import {
  BOOKING_HORIZON_DAYS,
  HOST_TIME_ZONE,
  SESSION_MINUTES,
  SUGGESTED_TIME_ZONES,
  buildMonthMatrix,
  crossesDateBoundary,
  firstAvailableDay,
  formatDayLabel,
  formatMonthLabel,
  formatSlotRange,
  formatSlotTime,
  generateReviewSlots,
  groupSlotsByDay,
  parseDayKey,
  shiftDayKey,
} from "../../lib/reviewAvailability";
import {
  EMPTY_BOOKING_DETAILS,
  buildReviewIcs,
  icsFileName,
  validateBookingDetails,
  type BookingDetailErrors,
  type BookingDetails,
} from "../../lib/reviewBooking";
import { submitBookingRequest } from "../../lib/reviewBookingClient";
import { describeTimeZone, isValidTimeZone, toDayKey } from "../../lib/timeZone";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Availability is recomputed on this cadence so the lead time stays honest. */
const AVAILABILITY_REFRESH_MS = 5 * 60_000;

type Phase = "selecting" | "details" | "submitting" | "confirmed" | "failed";

export type ReviewSchedulerProps = {
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  applicationReference: string;
  prefill: { fullName: string; workEmail: string; organisation: string };
  supportEmail: string;
  /** Mailto fallback, given the currently selected time. */
  buildFallbackMailto: (requestedTime: string) => string;
};

/** The zone picker: the detected zone first, then the zones Aurixa commonly meets in. */
function useZoneOptions(timeZone: string) {
  return useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; offset: string }[] = [];
    const add = (id: string, label: string) => {
      if (!id || seen.has(id) || !isValidTimeZone(id)) return;
      seen.add(id);
      options.push({ id, label, offset: describeTimeZone(new Date(), id).offsetLabel });
    };
    add(timeZone, `${timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone} (detected)`);
    for (const zone of SUGGESTED_TIME_ZONES) add(zone.id, zone.label);
    return options;
  }, [timeZone]);
}

export function ReviewScheduler({
  timeZone,
  onTimeZoneChange,
  applicationReference,
  prefill,
  supportEmail,
  buildFallbackMailto,
}: ReviewSchedulerProps) {
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parts = toDayKey(new Date(), timeZone).split("-");
    return { year: Number(parts[0]), month: Number(parts[1]) };
  });
  const [details, setDetails] = useState<BookingDetails>(EMPTY_BOOKING_DETAILS);
  const [errors, setErrors] = useState<BookingDetailErrors>({});
  const [phase, setPhase] = useState<Phase>("selecting");
  const [confirmedSlot, setConfirmedSlot] = useState<number | null>(null);
  const [focusedDay, setFocusedDay] = useState("");
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const confirmedRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusDay = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), AVAILABILITY_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDetails((current) => ({
      ...current,
      fullName: current.fullName || prefill.fullName,
      workEmail: current.workEmail || prefill.workEmail,
      organisation: current.organisation || prefill.organisation,
    }));
  }, [prefill.fullName, prefill.workEmail, prefill.organisation]);

  const slots = useMemo(() => generateReviewSlots(now), [now]);
  const byDay = useMemo(() => groupSlotsByDay(slots, timeZone), [slots, timeZone]);

  const todayKey = toDayKey(now, timeZone);
  const horizonKey = toDayKey(new Date(now.getTime() + BOOKING_HORIZON_DAYS * 86_400_000), timeZone);

  // Keep a valid day selected as availability, or the applicant's zone, changes.
  useEffect(() => {
    setSelectedDay((current) => {
      if (current && (byDay.get(current)?.length ?? 0) > 0) return current;
      return firstAvailableDay(byDay, current || todayKey);
    });
  }, [byDay, todayKey]);

  useEffect(() => {
    if (!selectedDay) return;
    const parsed = parseDayKey(selectedDay);
    if (!parsed) return;
    setVisibleMonth((current) =>
      current.year === parsed.year && current.month === parsed.month ? current : { year: parsed.year, month: parsed.month },
    );
  }, [selectedDay]);

  // A slot belongs to the day it was chosen on; clear it when that changes.
  useEffect(() => {
    setSelectedSlot((current) =>
      current !== null && (byDay.get(selectedDay) ?? []).includes(current) ? current : null,
    );
  }, [selectedDay, byDay]);

  // The keyboard cursor follows the selection unless the applicant moved it.
  useEffect(() => {
    setFocusedDay((current) => (current ? current : selectedDay));
  }, [selectedDay]);

  useEffect(() => {
    if (!shouldFocusDay.current) return;
    shouldFocusDay.current = false;
    dayRefs.current.get(focusedDay)?.focus();
  }, [focusedDay]);

  const daySlots = byDay.get(selectedDay) ?? [];
  const matrix = useMemo(() => buildMonthMatrix(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const zoneOptions = useZoneOptions(timeZone);
  const zone = useMemo(() => describeTimeZone(new Date(selectedSlot ?? Date.now()), timeZone), [timeZone, selectedSlot]);

  const monthStartKey = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-01`;
  const monthEndKey = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-31`;
  const monthHasEarlier = useMemo(() => firstAvailableDay(byDay) < monthStartKey, [byDay, monthStartKey]);
  const monthHasLater = horizonKey > monthEndKey;

  /** Exactly one cell is tabbable, and it is always one the grid can focus. */
  const tabbableDay = useMemo(() => {
    const keys = matrix.flat().map((cell) => cell.key);
    if (keys.includes(focusedDay)) return focusedDay;
    if (keys.includes(selectedDay)) return selectedDay;
    const inMonth = matrix.flat().filter((cell) => cell.inMonth);
    return inMonth.find((cell) => (byDay.get(cell.key)?.length ?? 0) > 0)?.key ?? inMonth[0]?.key ?? "";
  }, [matrix, focusedDay, selectedDay, byDay]);

  const step = useCallback(
    (months: number) => {
      setVisibleMonth((current) => {
        const index = current.year * 12 + (current.month - 1) + months;
        return { year: Math.floor(index / 12), month: (index % 12) + 1 };
      });
    },
    [],
  );

  const selectDay = useCallback((key: string) => {
    setSelectedDay(key);
    setFocusedDay(key);
    const parsed = parseDayKey(key);
    if (parsed) setVisibleMonth({ year: parsed.year, month: parsed.month });
  }, []);

  /** Arrow-key roving focus across the month grid, as a date picker should. */
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target = "";

    if (event.key in moves) target = shiftDayKey(key, moves[event.key]);
    else if (event.key === "PageUp") target = shiftDayKey(key, -28);
    else if (event.key === "PageDown") target = shiftDayKey(key, 28);
    else if (event.key === "Home") target = firstAvailableDay(byDay, todayKey);
    else if (event.key === "End") target = [...byDay.keys()].sort().pop() ?? key;
    else return;

    event.preventDefault();
    if (!target || target < todayKey || target > horizonKey) return;
    shouldFocusDay.current = true;
    setFocusedDay(target);
    const parsed = parseDayKey(target);
    if (parsed) setVisibleMonth({ year: parsed.year, month: parsed.month });
  };

  const chooseSlot = (slot: number) => {
    setSelectedSlot(slot);
    setPhase("details");
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedSlot === null) return;

    const found = validateBookingDetails(details);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = Object.keys(found)[0];
      detailsRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    setPhase("submitting");
    const result = await submitBookingRequest({
      slot: selectedSlot,
      details,
      applicantTimeZone: timeZone,
      applicationReference,
    });

    if (result.ok) {
      setConfirmedSlot(selectedSlot);
      setPhase("confirmed");
      // Move the reader to the outcome rather than leaving them on a gone form.
      window.requestAnimationFrame(() => {
        confirmedRef.current?.focus();
        confirmedRef.current?.scrollIntoView({ block: "nearest" });
      });
    } else {
      setPhase("failed");
    }
  };

  const downloadIcs = () => {
    if (confirmedSlot === null) return;
    const ics = buildReviewIcs({
      slot: confirmedSlot,
      organiserEmail: supportEmail,
      attendeeName: details.fullName.trim(),
      attendeeEmail: details.workEmail.trim(),
      applicationReference,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = icsFileName(confirmedSlot, timeZone);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const restart = () => {
    setPhase("selecting");
    setConfirmedSlot(null);
    setSelectedSlot(null);
  };

  const selectedLabel =
    selectedSlot !== null
      ? `${formatDayLabel(toDayKey(new Date(selectedSlot), timeZone))}, ${formatSlotRange(selectedSlot, timeZone)}`
      : "";

  if (phase === "confirmed" && confirmedSlot !== null) {
    return (
      <div className="scheduler scheduler--confirmed" role="status" aria-live="polite" tabIndex={-1} ref={confirmedRef}>
        <span className="scheduler-confirmed__mark" aria-hidden="true"><Check /></span>
        <p className="scheduler-eyebrow">TIME REQUESTED</p>
        <h3>We have your preferred time.</h3>
        <p className="scheduler-confirmed__lead">
          The Aurixa team will confirm this session by email, usually within one business day. Add it to your
          calendar now so the slot is held in your own schedule.
        </p>
        <dl className="scheduler-confirmed__facts">
          <div>
            <dt>Requested time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(confirmedSlot), timeZone))}<span>{formatSlotRange(confirmedSlot, timeZone)} · {zone.label} ({zone.offsetLabel})</span></dd>
          </div>
          <div>
            <dt>Aurixa time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(confirmedSlot), HOST_TIME_ZONE))}<span>{formatSlotRange(confirmedSlot, HOST_TIME_ZONE)} · {HOST_TIME_ZONE.replace("_", " ")}</span></dd>
          </div>
          <div>
            <dt>Confirmation</dt>
            <dd>{details.workEmail.trim()}<span>Meeting access details arrive with the confirmation.</span></dd>
          </div>
          {applicationReference && (
            <div>
              <dt>Application reference</dt>
              <dd className="is-mono">{applicationReference}</dd>
            </div>
          )}
        </dl>
        <div className="scheduler-actions">
          <button type="button" className="scheduler-button scheduler-button--primary" onClick={downloadIcs}>
            <CalendarCheck aria-hidden="true" /> ADD TO YOUR CALENDAR
          </button>
          <button type="button" className="scheduler-button" onClick={restart}>
            CHOOSE A DIFFERENT TIME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scheduler">
      <div className="scheduler-toolbar">
        <div className="scheduler-month">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!monthHasEarlier}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <strong aria-live="polite">{formatMonthLabel(visibleMonth.year, visibleMonth.month)}</strong>
          <button type="button" onClick={() => step(1)} disabled={!monthHasLater} aria-label="Next month">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <label className="scheduler-zone">
          <Globe2 aria-hidden="true" />
          <span>Times shown in</span>
          <select value={timeZone} onChange={(event) => onTimeZoneChange(event.target.value)}>
            {zoneOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label} · {option.offset}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="scheduler-body">
        <div className="scheduler-calendar">
          <div className="scheduler-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="scheduler-grid" role="group" aria-label="Choose a date">
            {matrix.flat().map((cell) => {
              const count = byDay.get(cell.key)?.length ?? 0;
              const available = count > 0;
              const isSelected = cell.key === selectedDay;
              return (
                <button
                  key={cell.key}
                  type="button"
                  ref={(node) => {
                    if (node) dayRefs.current.set(cell.key, node);
                    else dayRefs.current.delete(cell.key);
                  }}
                  className={[
                    "scheduler-day",
                    cell.inMonth ? "" : "is-outside",
                    available ? "is-available" : "is-empty",
                    isSelected ? "is-selected" : "",
                    cell.key === todayKey ? "is-today" : "",
                  ].filter(Boolean).join(" ")}
                  aria-disabled={!available}
                  tabIndex={cell.key === tabbableDay ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={`${formatDayLabel(cell.key)}${available ? `, ${count} times available` : ", no times available"}`}
                  onFocus={() => setFocusedDay(cell.key)}
                  onClick={() => { if (available) selectDay(cell.key); }}
                  onKeyDown={(event) => onDayKeyDown(event, cell.key)}
                >
                  <span>{cell.day}</span>
                  {available && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="scheduler-legend">
            <span className="scheduler-legend__dot" aria-hidden="true" /> Available
            <span className="scheduler-legend__rule" aria-hidden="true" />
            {SESSION_MINUTES}-minute session
          </p>
        </div>

        <div className="scheduler-slots">
          <p className="scheduler-slots__heading">
            <Clock aria-hidden="true" />
            {selectedDay ? formatDayLabel(selectedDay, { year: undefined }) : "Select a date"}
          </p>
          {daySlots.length === 0 ? (
            <p className="scheduler-empty">
              {byDay.size === 0
                ? "No review times are open at the moment. Send your preferred times and the team will arrange a session."
                : "No times remain on this date. Choose another highlighted date."}
            </p>
          ) : (
            <>
              <div className="scheduler-slot-list" role="group" aria-label={`Available times on ${formatDayLabel(selectedDay)}`}>
                {daySlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`scheduler-slot ${slot === selectedSlot ? "is-selected" : ""}`}
                    aria-pressed={slot === selectedSlot}
                    onClick={() => chooseSlot(slot)}
                  >
                    {formatSlotTime(slot, timeZone)}
                    {crossesDateBoundary(slot, timeZone) && (
                      <em title={`${formatSlotTime(slot, HOST_TIME_ZONE)} in ${HOST_TIME_ZONE}`}>+1</em>
                    )}
                  </button>
                ))}
              </div>
              <p className="scheduler-zone-note">
                Shown in {zone.label} ({zone.offsetLabel}{zone.abbreviation ? ` · ${zone.abbreviation}` : ""}).
                {timeZone !== HOST_TIME_ZONE && selectedSlot !== null && (
                  <> Aurixa sees this as {formatSlotTime(selectedSlot, HOST_TIME_ZONE)} {HOST_TIME_ZONE.split("/").pop()?.replace("_", " ")} time.</>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {selectedSlot !== null && (
        <div className="scheduler-details" ref={detailsRef}>
          <div className="scheduler-summary">
            <CalendarDays aria-hidden="true" />
            <div>
              <p>YOUR SELECTION</p>
              <strong>{selectedLabel}</strong>
              <span>{zone.label} ({zone.offsetLabel}) · {SESSION_MINUTES} minutes</span>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="scheduler-fields">
              <label>
                <span>Full name<i aria-hidden="true">*</i></span>
                <input
                  name="fullName"
                  value={details.fullName}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "booking-error-fullName" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, fullName: event.target.value }))}
                />
                {errors.fullName && <b id="booking-error-fullName">{errors.fullName}</b>}
              </label>
              <label>
                <span>Work email<i aria-hidden="true">*</i></span>
                <input
                  name="workEmail"
                  type="email"
                  value={details.workEmail}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.workEmail)}
                  aria-describedby={errors.workEmail ? "booking-error-workEmail" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, workEmail: event.target.value }))}
                />
                {errors.workEmail && <b id="booking-error-workEmail">{errors.workEmail}</b>}
              </label>
              <label>
                <span>Organisation</span>
                <input
                  name="organisation"
                  value={details.organisation}
                  autoComplete="organization"
                  onChange={(event) => setDetails((current) => ({ ...current, organisation: event.target.value }))}
                />
              </label>
              <label>
                <span>Phone <em>optional</em></span>
                <input
                  name="phone"
                  type="tel"
                  value={details.phone}
                  autoComplete="tel"
                  onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label className="scheduler-fields__wide">
                <span>Anything to cover in the session <em>optional</em></span>
                <textarea
                  name="notes"
                  rows={3}
                  value={details.notes}
                  onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>

            {phase === "failed" && (
              <p className="scheduler-error" role="alert">
                <strong>That request did not reach the Aurixa team.</strong>
                <span>
                  Please try once more, or{" "}
                  <a href={buildFallbackMailto(selectedLabel)}>send this time by email</a> and the team will confirm it.
                </span>
              </p>
            )}

            <div className="scheduler-actions">
              <button type="submit" className="scheduler-button scheduler-button--primary" disabled={phase === "submitting"}>
                {phase === "submitting"
                  ? <><Loader2 className="is-spinning" aria-hidden="true" /> SENDING REQUEST</>
                  : <><CalendarCheck aria-hidden="true" /> {phase === "failed" ? "TRY AGAIN" : "REQUEST THIS TIME"}</>}
              </button>
              <a className="scheduler-button" href={buildFallbackMailto(selectedLabel)}>
                <Mail aria-hidden="true" /> EMAIL INSTEAD
              </a>
            </div>
            <p className="scheduler-consent">
              Aurixa uses these details to confirm your strategic review and to prepare for the session. The team
              confirms your time by email, usually within one business day.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
