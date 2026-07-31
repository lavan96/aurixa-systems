import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy, ExternalLink, LockKeyhole, Mail, RotateCcw } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";
import { readReadinessHandoff } from "../lib/readinessHandoff";
import {
  buildSchedulingFallbackMailto,
  describeTimeZone,
  formatLocalTime,
  readTimeZoneId,
  resolveApplicationReference,
  resolveBookingUrl,
  type TimeZoneDescriptor,
} from "../lib/strategicReviewBooking";

/**
 * The approved Microsoft Bookings embed URL. Supplied by configuration and
 * validated in `resolveBookingUrl`, so an unset or malformed value degrades to
 * the "calendar not connected" state instead of framing an unexpected origin.
 */
const CONFIGURED_BOOKINGS_URL = import.meta.env.VITE_BOOKINGS_URL as string | undefined;

const SUPPORT_EMAIL = "admin@aurixasystems.com.au";

/** A calendar that has not painted within this window is treated as unreachable. */
const FRAME_LOAD_TIMEOUT_MS = 20_000;

const CLOCK_TICK_MS = 30_000;

/** Reveal-on-scroll is opt-in so the page is fully legible without it. */
const REVEAL_SUPPORTED = typeof window !== "undefined" && "IntersectionObserver" in window;

type BookingFrameState = "ready" | "loading" | "error" | "unavailable";

const stages = [
  { number: "01", name: "Initial Assessment", state: "Completed" },
  { number: "02", name: "Business Readiness", state: "Completed" },
  { number: "03", name: "Strategic Review", state: "Current" },
] as const;

function ApplicationStageProgress() {
  return (
    <nav aria-label="Application stages" className="review-progress review-reveal" data-reveal>
      <span className="review-progress__coordinate" aria-hidden="true">APPLICATION PATH / 03</span>
      <div className="review-progress__track" aria-hidden="true"><i /></div>
      <ol>
        {stages.map((stage, index) => {
          const current = stage.state === "Current";
          return (
            <li key={stage.number} aria-current={current ? "step" : undefined}>
              <div className={`review-progress__marker ${current ? "is-current" : "is-complete"}`}>
                {current ? <span /> : <Check aria-hidden="true" />}
              </div>
              <div>
                <p className="review-progress__stage-number">STAGE {stage.number}</p>
                <strong>{stage.name}</strong>
                <span>{stage.state}</span>
              </div>
              {index < stages.length - 1 && <i aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function JourneyStatus() {
  return (
    <div className="journey-status review-hero-sequence">
      <div><p>APPLICATION JOURNEY</p><span>Business Readiness Questionnaire received</span></div>
      <strong>FINAL STAGE ACTIVE</strong>
      <div className="journey-status__line" aria-hidden="true"><i /><i /><i className="is-active" /></div>
    </div>
  );
}

/** Shows the reference the applicant will be asked to quote, with one-tap copy. */
function ApplicationReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be refused; the reference stays selectable on screen.
    }
  };

  return (
    <div className="review-reference review-hero-sequence">
      <p>APPLICATION REFERENCE</p>
      <strong>{reference}</strong>
      {canCopy && (
        <button type="button" onClick={copy} aria-label={`Copy application reference ${reference}`}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      )}
    </div>
  );
}

function SchedulingVisual({ timeZone, localTime }: { timeZone: TimeZoneDescriptor; localTime: string }) {
  const slots = Array.from({ length: 15 }, (_, index) => index);
  return (
    <figure className="schedule-visual review-hero-sequence" aria-labelledby="schedule-visual-caption">
      <span className="technical-corner technical-corner--tl" aria-hidden="true" />
      <span className="technical-corner technical-corner--br" aria-hidden="true" />
      <span className="schedule-coordinate schedule-coordinate--one" aria-hidden="true">X 03.728</span>
      <span className="schedule-coordinate schedule-coordinate--two" aria-hidden="true">Y 18.442</span>
      <div className="schedule-visual__top"><span>AVAILABILITY</span><span>COORDINATION ACTIVE</span></div>
      <div className="schedule-intelligence" aria-hidden="true">
        <div className="schedule-plane schedule-plane--back" />
        <div className="schedule-plane">
          <div className="schedule-plane__header"><span>REVIEW WINDOW</span><b>LOCAL TIME</b></div>
          <div className="schedule-plane__slots">
            {slots.map((slot) => <i key={slot} className={slot === 7 ? "is-selected" : slot % 4 === 0 ? "is-muted" : ""}>{slot === 7 && <span>SELECTED SLOT</span>}</i>)}
          </div>
          <span className="schedule-plane__scan" />
        </div>
        <svg className="schedule-orbits" viewBox="0 0 520 360">
          <ellipse cx="282" cy="184" rx="196" ry="116" />
          <ellipse className="schedule-orbits__ring" cx="282" cy="184" rx="145" ry="145" />
          <path d="M46 276 C132 276 145 184 227 184 S351 91 466 91" />
          <circle cx="46" cy="276" r="4" /><circle cx="466" cy="91" r="5" />
        </svg>
        <div className="schedule-core"><span /><i /><b>03</b></div>
        <div className="schedule-agent schedule-agent--applicant"><i />APPLICANT</div>
        <div className="schedule-agent schedule-agent--aurixa"><i />AURIXA</div>
        <div className="schedule-timezone">
          <span>YOUR TIME ZONE</span>
          <b>{timeZone.offsetLabel}</b>
          <em>{timeZone.shortLabel}{localTime && ` · ${localTime}`}</em>
          <i />
        </div>
      </div>
      <div className="schedule-visual__status"><span /> FINAL STAGE <b>PATHWAY READY</b></div>
      <figcaption id="schedule-visual-caption">COORDINATED REVIEW SCHEDULING</figcaption>
    </figure>
  );
}

function InfoGroup({ index, label, value, children }: { index: string; label: string; value: string; children: string }) {
  return (
    <div className="review-info-group">
      <span>{index}</span>
      <div><p>{label}</p><strong>{value}</strong><div>{children}</div></div>
      <i aria-hidden="true" />
    </div>
  );
}

function ReviewPreparationPanel({ timeZone }: { timeZone: TimeZoneDescriptor }) {
  const topics = [
    "Your current operational environment",
    "Priority workflow and visibility requirements",
    "Areas identified through the Business Readiness Questionnaire",
    "Platform suitability and implementation considerations",
    "Recommended next steps",
  ];
  return (
    <section className="review-preparation review-reveal" data-reveal aria-labelledby="review-preparation-heading">
      <p className="review-eyebrow">YOUR STRATEGIC REVIEW</p>
      <h2 id="review-preparation-heading">A Focused Conversation About What Comes Next.</h2>
      <p className="review-copy">This session gives the Aurixa team an opportunity to understand your current environment, clarify the priorities identified through your questionnaire and discuss how Aurixa may support your organisation.</p>
      <div className="review-info-list">
        <InfoGroup index="01" label="SESSION FORMAT" value="Online strategic review">Meeting access details will be included with the booking confirmation.</InfoGroup>
        <InfoGroup index="02" label="EXPECTED DURATION" value="30 minutes">A focused discussion structured around your organisation and operational priorities.</InfoGroup>
        <InfoGroup index="03" label="TIME ZONE" value={`${timeZone.label} (${timeZone.offsetLabel})`}>
          Detected from your device. Times shown in the booking calendar use the time zone selected within it.
        </InfoGroup>
      </div>
      <div className="review-topics">
        <p>WHAT WE WILL COVER</p>
        <ol>{topics.map((topic, index) => <li key={topic}><span>0{index + 1}</span><strong>{topic}</strong><i aria-hidden="true" /></li>)}</ol>
      </div>
    </section>
  );
}

function AbstractCalendar() {
  return (
    <div className="abstract-calendar" aria-hidden="true">
      <div className="abstract-calendar__header"><span>CALENDAR VIEWPORT</span><i /><b>INTEGRATION LAYER</b></div>
      <div className="abstract-calendar__week"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div className="abstract-calendar__grid">
        {Array.from({ length: 28 }, (_, index) => <i key={index} className={index === 17 ? "is-window" : index % 6 === 0 || index < 3 ? "is-muted" : index % 5 === 0 ? "is-available" : ""}><span>{String(index + 1).padStart(2, "0")}</span></i>)}
      </div>
      <svg viewBox="0 0 640 340"><path d="M410 231 H489 V270 H566"/><circle cx="410" cy="231" r="5"/><circle cx="566" cy="270" r="9"/></svg>
      <div className="abstract-calendar__timezone"><span>TIME ZONE CONTEXT</span><i /><b>SELECTED WITHIN BOOKING CALENDAR</b></div>
    </div>
  );
}

/** Shown while the calendar itself is still painting, so the frame is never blank. */
function BookingSkeleton() {
  return (
    <div className="booking-skeleton" aria-hidden="true">
      <div className="booking-skeleton__bar" />
      <div className="booking-skeleton__grid">{Array.from({ length: 28 }, (_, index) => <i key={index} />)}</div>
      <div className="booking-skeleton__rail"><i /><i /><i /></div>
    </div>
  );
}

function BookingActions({
  bookingUrl,
  mailto,
  onRetry,
}: {
  bookingUrl?: string | null;
  mailto: string;
  onRetry?: () => void;
}) {
  return (
    <div className="booking-actions">
      {onRetry && (
        <button type="button" className="booking-action booking-action--primary" onClick={onRetry}>
          <RotateCcw aria-hidden="true" /> TRY AGAIN
        </button>
      )}
      {bookingUrl && (
        <a className="booking-action" href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true" /> OPEN CALENDAR IN A NEW TAB
        </a>
      )}
      <a className="booking-action" href={mailto}>
        <Mail aria-hidden="true" /> REQUEST A TIME BY EMAIL
      </a>
    </div>
  );
}

function BookingPlaceholder({ mailto }: { mailto: string }) {
  return (
    <div className="booking-placeholder">
      <AbstractCalendar />
      <div className="booking-placeholder__content">
        <p>BOOKING CALENDAR</p>
        <h3>Calendar Integration Ready.</h3>
        <div>Available appointment times will appear here once the Aurixa booking calendar is connected. In the meantime, send your preferred times and the team will confirm your strategic review directly.</div>
        <BookingActions mailto={mailto} />
      </div>
      <div className="booking-status-rail"><span><i /> MICROSOFT BOOKINGS CONNECTION PENDING</span><div><i /></div><b>CONNECTION NODE / READY</b></div>
    </div>
  );
}

/**
 * Owns the calendar frame and its lifecycle. The iframe is remounted per
 * attempt so "try again" genuinely reloads it, and a load that never resolves
 * falls through to the same recoverable error state as an outright failure.
 */
function BookingIntegrationFrame({
  url,
  state,
  attempt,
  mailto,
  onLoad,
  onError,
  onRetry,
}: {
  url: string | null;
  state: BookingFrameState;
  attempt: number;
  mailto: string;
  onLoad: () => void;
  onError: () => void;
  onRetry: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * An iframe also fires `load` for the `about:blank` document it holds before
   * the real request commits, which would end the loading state too early.
   * A cross-origin document is the signal that something committed: reading its
   * location throws, whereas `about:blank` reads back cleanly.
   *
   * A browser error page is cross-origin too, so a frame that is refused rather
   * than served still reads as loaded — which is why the panel keeps the
   * "open in a new tab / email us" fallback visible alongside a live calendar.
   */
  const handleLoad = () => {
    try {
      const href = frameRef.current?.contentWindow?.location.href;
      if (href === undefined || href === "about:blank") return;
    } catch {
      // Cross-origin — the calendar document is in.
    }
    onLoad();
  };

  if (state === "unavailable" || !url) {
    return (
      <div className="booking-frame">
        <BookingPlaceholder mailto={mailto} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="booking-frame booking-frame--message">
        <strong>The booking calendar could not be loaded.</strong>
        <span>This is usually a temporary connection issue. Try again, open the calendar in a new tab, or send your preferred times.</span>
        <BookingActions bookingUrl={url} mailto={mailto} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={`booking-frame ${state === "loading" ? "is-loading" : "is-ready"}`}>
      {state === "loading" && <BookingSkeleton />}
      <iframe
        key={attempt}
        ref={frameRef}
        src={url}
        title="Schedule an Aurixa strategic review"
        onLoad={handleLoad}
        onError={onError}
        allow="fullscreen"
      />
    </div>
  );
}

function StrategicReviewBookingPanel({
  bookingUrl,
  timeZone,
  mailto,
}: {
  bookingUrl: string | null;
  timeZone: TimeZoneDescriptor;
  mailto: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BookingFrameState>(bookingUrl ? "loading" : "unavailable");

  useEffect(() => {
    setState(bookingUrl ? "loading" : "unavailable");
    setAttempt(0);
  }, [bookingUrl]);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => setState("error"), FRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state, attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
    setState("loading");
  }, []);

  const status =
    state === "loading" ? "Loading the booking calendar."
    : state === "ready" ? "Booking calendar loaded. Select an available appointment time."
    : state === "error" ? "The booking calendar could not be loaded. Alternative options are available."
    : "The booking calendar is not connected yet. Alternative options are available.";

  return (
    <section className="review-booking review-reveal" data-reveal aria-labelledby="review-booking-heading">
      <div className="review-booking__header">
        <div>
          <p className="review-eyebrow">SELECT A TIME</p>
          <h2 id="review-booking-heading">Choose a Suitable Appointment.</h2>
          <p className="review-copy">Review the available times and select the appointment that best suits your schedule. Times are shown in {timeZone.label} ({timeZone.offsetLabel}) unless you change the time zone inside the calendar.</p>
        </div>
        <span>CAL / 03</span>
      </div>
      <div id="booking-calendar" tabIndex={-1} className="review-booking__anchor">
        <BookingIntegrationFrame
          url={bookingUrl}
          state={state}
          attempt={attempt}
          mailto={mailto}
          onLoad={() => setState((current) => (current === "loading" ? "ready" : current))}
          onError={() => setState("error")}
          onRetry={retry}
        />
      </div>
      <p className="booking-live" role="status" aria-live="polite">{status}</p>
      {bookingUrl && state !== "error" && (
        <p className="booking-fallback">
          Calendar not displaying correctly?{" "}
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">Open it in a new tab</a>{" "}
          or <a href={mailto}>send your preferred times</a>.
        </p>
      )}
      <div className="booking-context">
        <span>TIME-ZONE CONTEXT <b>{timeZone.offsetLabel} · {timeZone.shortLabel}</b></span>
        <span><LockKeyhole aria-hidden="true" /> SECURE SCHEDULING ENVIRONMENT</span>
      </div>
    </section>
  );
}

function TransitionRail() {
  return <div className="review-transition" aria-hidden="true"><span>STAGE 03</span><i><b /></i><span>STRATEGIC REVIEW</span><i /><span>FINAL APPLICATION STEP</span></div>;
}

function SupportRail({ mailto }: { mailto: string }) {
  return (
    <aside className="review-support review-reveal" data-reveal aria-labelledby="review-support-heading">
      <span className="review-support__signal" aria-hidden="true"><i /></span>
      <div><p>APPLICATION SUPPORT</p><h2 id="review-support-heading">Need Assistance Scheduling?</h2></div>
      <p>If no listed time suits you, or you need help with the scheduling process, the Aurixa team will arrange a time with you directly.</p>
      <div className="review-support__actions">
        <a href={mailto}><Mail aria-hidden="true" /> EMAIL THE TEAM</a>
        <Link to="/contact">CONTACT AURIXA <ArrowUpRight aria-hidden="true" /></Link>
      </div>
    </aside>
  );
}

export default function ScheduleStrategicReview() {
  const [reference, setReference] = useState("");
  const [prefill, setPrefill] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const [clock, setClock] = useState(() => {
    const zone = readTimeZoneId();
    const now = new Date();
    return { timeZone: describeTimeZone(now, zone), localTime: formatLocalTime(now, zone) };
  });

  // Identity: an issued reference in the link, plus any Stage 1/2 details still
  // held in this tab. Both are conveniences — neither grants access to anything.
  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }

    const url = new URL(window.location.href);
    const resolved = resolveApplicationReference(url, storage);
    setReference(resolved);

    if (url.searchParams.has("ref")) {
      url.searchParams.delete("ref");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const handoff = readReadinessHandoff();
    if (handoff) {
      setPrefill({
        name: [handoff.firstName, handoff.lastName].filter(Boolean).join(" "),
        email: handoff.workEmail,
      });
      if (!resolved) setReference(handoff.applicationId);
    }
  }, []);

  // Keep the stated time zone and clock honest across long visits and travel.
  useEffect(() => {
    const tick = () => {
      const zone = readTimeZoneId();
      const now = new Date();
      setClock({ timeZone: describeTimeZone(now, zone), localTime: formatLocalTime(now, zone) });
    };
    const interval = setInterval(tick, CLOCK_TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Schedule Your Strategic Review | Aurixa Systems";
    const robots = document.createElement("meta"); robots.name = "robots"; robots.content = "noindex, nofollow"; document.head.appendChild(robots);
    const description = document.createElement("meta");
    description.name = "description";
    description.content = "Stage 03 of the Aurixa Systems application: select a time for your strategic review with the Aurixa team.";
    document.head.appendChild(description);
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = REVEAL_SUPPORTED
      ? new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer?.unobserve(entry.target); } }), { threshold: 0.12 })
      : null;
    elements.forEach((element) => observer?.observe(element));
    const onVisibility = () => document.documentElement.classList.toggle("review-page-paused", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.title = previousTitle; robots.remove(); description.remove(); observer?.disconnect(); document.removeEventListener("visibilitychange", onVisibility); document.documentElement.classList.remove("review-page-paused"); };
  }, []);

  const bookingUrl = useMemo(
    () => resolveBookingUrl(CONFIGURED_BOOKINGS_URL, prefill),
    [prefill],
  );

  const mailto = useMemo(
    () => buildSchedulingFallbackMailto({ address: SUPPORT_EMAIL, reference, timeZone: clock.timeZone }),
    [reference, clock.timeZone],
  );

  return (
    <div className={`strategic-review-page${REVEAL_SUPPORTED ? " is-armed" : ""}`}>
      <a className="review-skip-link" href="#booking-calendar">Skip to the booking calendar</a>
      <div className="strategic-review-bg" aria-hidden="true"><HeroBackground variant="about" /><span className="review-light-field" /></div>
      <div className="review-container">
        <ApplicationStageProgress />
        <header className="review-hero">
          <div className="review-hero__copy">
            <div className="review-eyebrow-line review-hero-sequence"><span />STAGE 03 · STRATEGIC REVIEW</div>
            <h1 className="review-hero-sequence">Schedule Your Strategic Review.</h1>
            <p className="review-hero-sequence">Your Business Readiness Questionnaire has been received. Select a suitable time to meet with the Aurixa team and review your operational priorities, platform requirements and the next steps in your Aurixa journey.</p>
            <div className="review-final-status review-hero-sequence"><span aria-hidden="true" /> FINAL STAGE</div>
            <JourneyStatus />
            {reference && <ApplicationReference reference={reference} />}
          </div>
          <SchedulingVisual timeZone={clock.timeZone} localTime={clock.localTime} />
        </header>
        <TransitionRail />
        <main className="review-workspace review-reveal" data-reveal>
          <span className="technical-corner technical-corner--tl" aria-hidden="true" /><span className="technical-corner technical-corner--br" aria-hidden="true" />
          <span className="review-workspace__coordinate" aria-hidden="true">FRAME / STRATEGIC REVIEW / 03</span>
          <ReviewPreparationPanel timeZone={clock.timeZone} />
          <StrategicReviewBookingPanel bookingUrl={bookingUrl} timeZone={clock.timeZone} mailto={mailto} />
        </main>
        <SupportRail mailto={mailto} />
      </div>
    </div>
  );
}
