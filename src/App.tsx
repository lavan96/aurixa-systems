import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import Solutions from "./pages/Solutions";
import Industries from "./pages/Industries";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import PricingSuccess from "./pages/PricingSuccess";
import PricingCancel from "./pages/PricingCancel";
import CardSaved from "./pages/CardSaved";
// The A$1 Stripe test-fixture mirror of the price list. Deliberately unlisted,
// like /pricing itself: reachable by direct URL only, never from navigation.
import PricingMock from "./pages/PricingMock";
// Stage 2 readiness questionnaire. Deliberately unlisted: reachable only via the
// secure link issued with a Priority Access Application, never from navigation.
import Questionnaire from "./pages/Questionnaire";
// Stage 3 strategic review scheduling. Deliberately unlisted from public navigation.
import ScheduleStrategicReview from "./pages/ScheduleStrategicReview";
import Feedback from "./pages/Feedback";
import Compliance from "./pages/Compliance";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";

function AppShell() {
  const { pathname } = useLocation();
  // Both pricing surfaces carry their own header and footing, so the site
  // chrome is suppressed on each.
  const hidesSiteChrome = pathname === "/pricing" || pathname === "/pricing-mock";

  return (
    <>
      <ScrollToTop />
      {/* Shared gradient definition referenced by every gold-stroked icon. */}
      <svg width="0" height="0" aria-hidden="true" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="icon-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#F5D17A" offset="0%" />
            <stop stopColor="#C89B3C" offset="50%" />
            <stop stopColor="#8A6B29" offset="100%" />
          </linearGradient>
        </defs>
      </svg>
      {/* `app-shell` carries the flex column, the dynamic-viewport minimum and
          `overflow-x: clip` — see index.css for why it is not `hidden`. */}
      <div className="app-shell relative bg-[#040B16] text-white selection:bg-[#C89B3C] selection:text-white">
        <a className="skip-link" href="#main-content">Skip to content</a>
        {!hidesSiteChrome && <Navbar />}
        <main id="main-content" tabIndex={-1} className="flex-grow flex flex-col items-center outline-none">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/pricing/success" element={<PricingSuccess />} />
            <Route path="/pricing/cancel" element={<PricingCancel />} />
            <Route path="/pricing/card-saved" element={<CardSaved />} />
            <Route path="/pricing-mock" element={<PricingMock />} />
            <Route path="/about" element={<About />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/schedule-strategic-review" element={<ScheduleStrategicReview />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </main>
        {!hidesSiteChrome && <Footer />}
      </div>
    </>
  );
}

export default function App() {
  return (
    // index.css handles CSS animation under prefers-reduced-motion; this is
    // the same contract for the JS-driven entrances. "user" keeps opacity
    // fades and drops the transforms, so nothing disappears — it just stops
    // moving for people who asked it to.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </MotionConfig>
  );
}
