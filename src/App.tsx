import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import Solutions from "./pages/Solutions";
import Industries from "./pages/Industries";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import PricingSuccess from "./pages/PricingSuccess";
import PricingCancel from "./pages/PricingCancel";
import CardSaved from "./pages/CardSaved";
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
  const isPricingPage = pathname === "/pricing";

  return (
    <>
      <ScrollToTop />
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="icon-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#F5D17A" offset="0%" />
            <stop stopColor="#C89B3C" offset="50%" />
            <stop stopColor="#8A6B29" offset="100%" />
          </linearGradient>
        </defs>
      </svg>
      <div className="min-h-screen flex flex-col bg-[#040B16] text-white overflow-x-hidden selection:bg-[#C89B3C] selection:text-white">
        {!isPricingPage && <Navbar />}
        <main className="flex-grow flex flex-col items-center">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/pricing/success" element={<PricingSuccess />} />
            <Route path="/pricing/cancel" element={<PricingCancel />} />
            <Route path="/pricing/card-saved" element={<CardSaved />} />
            <Route path="/about" element={<About />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/schedule-strategic-review" element={<ScheduleStrategicReview />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </main>
        {!isPricingPage && <Footer />}
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
