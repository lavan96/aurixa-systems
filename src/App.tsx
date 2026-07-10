import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
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
        <Navbar />
        <main className="flex-grow flex flex-col items-center">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
