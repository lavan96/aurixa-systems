import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";

/** Supply the approved Microsoft Bookings embed URL here when integration is enabled. */
const MICROSOFT_BOOKINGS_URL = "";

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
                <p>STAGE {stage.number}</p>
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

function SchedulingVisual() {
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
        <div className="schedule-timezone"><span>UTC</span><b>+10:00</b><i /></div>
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

function ReviewPreparationPanel() {
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
        <InfoGroup index="03" label="TIME ZONE" value="Adjusted to your location">Available times will be displayed using the time zone selected within the booking calendar.</InfoGroup>
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

function BookingPlaceholder() {
  return (
    <div className="booking-placeholder">
      <AbstractCalendar />
      <div className="booking-placeholder__content">
        <p>BOOKING CALENDAR</p>
        <h3>Calendar Integration Ready.</h3>
        <div>Available appointment times will appear here once the Aurixa booking calendar is connected.</div>
      </div>
      <div className="booking-status-rail"><span><i /> MICROSOFT BOOKINGS CONNECTION PENDING</span><div><i /></div><b>CONNECTION NODE / READY</b></div>
    </div>
  );
}

/** The placeholder is intentionally isolated so the live iframe can replace it unchanged. */
function BookingIntegrationFrame({ url, state = "ready" }: { url?: string; state?: BookingFrameState }) {
  if (state === "loading") return <div className="booking-frame booking-frame--message" role="status">Loading booking calendar...</div>;
  if (state === "error") return <div className="booking-frame booking-frame--message" role="alert"><strong>Calendar temporarily unavailable.</strong><span>Please try again later.</span></div>;
  if (state === "unavailable") return <div className="booking-frame booking-frame--message" role="status"><strong>Appointments are currently unavailable.</strong><span>Please check again soon.</span></div>;
  return <div className="booking-frame">{url ? <iframe src={url} title="Schedule an Aurixa strategic review" loading="lazy" /> : <BookingPlaceholder />}</div>;
}

function StrategicReviewBookingPanel() {
  return (
    <section className="review-booking review-reveal" data-reveal aria-labelledby="review-booking-heading">
      <div className="review-booking__header"><div><p className="review-eyebrow">SELECT A TIME</p><h2 id="review-booking-heading">Choose a Suitable Appointment.</h2><p className="review-copy">Review the available times and select the appointment that best suits your schedule.</p></div><span>CAL / 03</span></div>
      <BookingIntegrationFrame url={MICROSOFT_BOOKINGS_URL} />
      <div className="booking-context"><span>TIME-ZONE CONTEXT <b>Selected within booking calendar</b></span><span><LockKeyhole aria-hidden="true" /> SECURE SCHEDULING ENVIRONMENT</span></div>
    </section>
  );
}

function TransitionRail() {
  return <div className="review-transition" aria-hidden="true"><span>STAGE 03</span><i><b /></i><span>STRATEGIC REVIEW</span><i /><span>FINAL APPLICATION STEP</span></div>;
}

function SupportRail() {
  return (
    <aside className="review-support review-reveal" data-reveal aria-labelledby="review-support-heading">
      <span className="review-support__signal" aria-hidden="true"><i /></span>
      <div><p>APPLICATION SUPPORT</p><h2 id="review-support-heading">Need Assistance Scheduling?</h2></div>
      <p>If you need assistance with the scheduling process, contact the Aurixa team.</p>
      <Link to="/contact">CONTACT AURIXA <ArrowUpRight aria-hidden="true" /></Link>
    </aside>
  );
}

export default function ScheduleStrategicReview() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Schedule Your Strategic Review | Aurixa Systems";
    const robots = document.createElement("meta"); robots.name = "robots"; robots.content = "noindex, nofollow"; document.head.appendChild(robots);
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    const onVisibility = () => document.documentElement.classList.toggle("review-page-paused", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.title = previousTitle; robots.remove(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); document.documentElement.classList.remove("review-page-paused"); };
  }, []);

  return (
    <div className="strategic-review-page">
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
          </div>
          <SchedulingVisual />
        </header>
        <TransitionRail />
        <main className="review-workspace review-reveal" data-reveal>
          <span className="technical-corner technical-corner--tl" aria-hidden="true" /><span className="technical-corner technical-corner--br" aria-hidden="true" />
          <span className="review-workspace__coordinate" aria-hidden="true">FRAME / STRATEGIC REVIEW / 03</span>
          <ReviewPreparationPanel /><StrategicReviewBookingPanel />
        </main>
        <SupportRail />
      </div>
    </div>
  );
}
