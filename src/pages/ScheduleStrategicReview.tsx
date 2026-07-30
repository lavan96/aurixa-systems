import { ReactNode, useEffect } from "react";
import { CalendarDays, Check, Clock3, Globe2, Monitor, Route } from "lucide-react";
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
    <nav aria-label="Application stages" className="review-progress">
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

function SchedulingVisual() {
  const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <figure className="schedule-visual" aria-labelledby="schedule-visual-caption">
      <span className="technical-corner technical-corner--tl" aria-hidden="true" />
      <span className="technical-corner technical-corner--br" aria-hidden="true" />
      <div className="schedule-visual__top">
        <span>AVAILABILITY MATRIX</span><span>UTC +10:00</span>
      </div>
      <div className="schedule-visual__body">
        <div className="schedule-visual__days" aria-hidden="true"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span></div>
        <div className="schedule-visual__grid" aria-hidden="true">
          {slots.map((slot) => <span key={slot} className={slot === 6 ? "is-selected" : slot % 4 === 0 ? "is-muted" : ""} />)}
        </div>
        <svg className="schedule-visual__path" viewBox="0 0 420 190" aria-hidden="true">
          <path d="M168 118 H250 V76 H334" />
          <circle cx="334" cy="76" r="17" />
          <circle className="schedule-visual__pulse" cx="334" cy="76" r="5" />
        </svg>
        <div className="schedule-visual__status"><span /> SLOT SELECTED <b>COORDINATING</b></div>
      </div>
      <figcaption id="schedule-visual-caption">COORDINATED REVIEW SCHEDULING</figcaption>
    </figure>
  );
}

function InfoGroup({ icon, label, value, children }: { icon: ReactNode; label: string; value: string; children: ReactNode }) {
  return (
    <div className="review-info-group">
      <span aria-hidden="true">{icon}</span>
      <div><p>{label}</p><strong>{value}</strong><div>{children}</div></div>
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
    <section className="review-preparation" aria-labelledby="review-preparation-heading">
      <p className="review-eyebrow">YOUR STRATEGIC REVIEW</p>
      <h2 id="review-preparation-heading">A Focused Conversation About What Comes Next.</h2>
      <p className="review-copy">This session gives the Aurixa team an opportunity to understand your current environment, clarify the priorities identified through your questionnaire and discuss how Aurixa may support your organisation.</p>
      <div className="review-info-list">
        <InfoGroup icon={<Monitor />} label="SESSION FORMAT" value="Online strategic review">Meeting access details will be included with the booking confirmation.</InfoGroup>
        <InfoGroup icon={<Clock3 />} label="EXPECTED DURATION" value="30 minutes">A focused discussion structured around your organisation and operational priorities.</InfoGroup>
        <InfoGroup icon={<Globe2 />} label="TIME ZONE" value="Adjusted to your location">Available times will be displayed using the time zone selected within the booking calendar.</InfoGroup>
      </div>
      <div className="review-topics">
        <p>WHAT WE WILL COVER</p>
        <ul>{topics.map((topic, index) => <li key={topic}><span>0{index + 1}</span>{topic}</li>)}</ul>
      </div>
    </section>
  );
}

function BookingPlaceholder() {
  return (
    <div className="booking-placeholder">
      <div className="booking-placeholder__glyph" aria-hidden="true"><CalendarDays /><i /><i /><i /></div>
      <p>BOOKING CALENDAR</p>
      <h3>Calendar Integration Ready.</h3>
      <div>Available appointment times will appear here once the Aurixa booking calendar is connected.</div>
      <span><i aria-hidden="true" /> MICROSOFT BOOKINGS CONNECTION PENDING</span>
    </div>
  );
}

/** The placeholder is intentionally isolated so the live iframe can replace it unchanged. */
function BookingIntegrationFrame({ url, state = "ready" }: { url?: string; state?: BookingFrameState }) {
  if (state === "loading") return <div className="booking-frame booking-frame--message" role="status">Loading booking calendar...</div>;
  if (state === "error") return <div className="booking-frame booking-frame--message" role="alert"><strong>Calendar temporarily unavailable.</strong><span>Please try again later.</span></div>;
  if (state === "unavailable") return <div className="booking-frame booking-frame--message" role="status"><strong>Appointments are currently unavailable.</strong><span>Please check again soon.</span></div>;
  return (
    <div className="booking-frame">
      {url ? <iframe src={url} title="Schedule an Aurixa strategic review" loading="lazy" /> : <BookingPlaceholder />}
    </div>
  );
}

function StrategicReviewBookingPanel() {
  return (
    <section className="review-booking" aria-labelledby="review-booking-heading">
      <p className="review-eyebrow">SELECT A TIME</p>
      <h2 id="review-booking-heading">Choose a Suitable Appointment.</h2>
      <p className="review-copy">Review the available times and select the appointment that best suits your schedule.</p>
      <BookingIntegrationFrame url={MICROSOFT_BOOKINGS_URL} />
    </section>
  );
}

export default function ScheduleStrategicReview() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Schedule Your Strategic Review | Aurixa Systems";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => { document.title = previousTitle; robots.remove(); };
  }, []);

  return (
    <div className="strategic-review-page">
      <div className="strategic-review-bg" aria-hidden="true"><HeroBackground variant="about" /></div>
      <div className="review-container">
        <ApplicationStageProgress />
        <header className="review-hero">
          <div className="review-hero__copy">
            <div className="review-eyebrow-line"><span />STAGE 03 · STRATEGIC REVIEW</div>
            <h1>Schedule Your Strategic Review.</h1>
            <p>Your Business Readiness Questionnaire has been received. Select a suitable time to meet with the Aurixa team and review your operational priorities, platform requirements and the next steps in your Aurixa journey.</p>
            <div className="review-final-status"><Route aria-hidden="true" /> FINAL STAGE</div>
          </div>
          <SchedulingVisual />
        </header>
        <main className="review-workspace">
          <span className="technical-corner technical-corner--tl" aria-hidden="true" />
          <span className="technical-corner technical-corner--br" aria-hidden="true" />
          <ReviewPreparationPanel />
          <StrategicReviewBookingPanel />
        </main>
      </div>
    </div>
  );
}
