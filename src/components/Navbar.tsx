import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#040B16]/90 backdrop-blur-xl border-b border-[#00A8B5]/20">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <svg viewBox="0 0 100 100" className="w-10 h-10 group-hover:scale-105 transition-transform" fill="none">
            <defs>
              <linearGradient id="nav-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF"/>
                <stop offset="30%" stopColor="#00A8B5"/>
                <stop offset="70%" stopColor="#C89B3C"/>
                <stop offset="100%" stopColor="#0A192F"/>
              </linearGradient>
              <radialGradient id="nav-orb-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF"/>
                <stop offset="30%" stopColor="#F5D17A"/>
                <stop offset="80%" stopColor="#C89B3C"/>
                <stop offset="100%" stopColor="#0A0F14"/>
              </radialGradient>
              <filter id="nav-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Outer Triangle */}
            <path d="M50 15 L85 80 L15 80 Z" stroke="url(#nav-gold-grad)" strokeWidth="6" strokeLinejoin="miter" />
            {/* Inner Triangle Cut */}
            <path d="M50 32 L71 72 L29 72 Z" stroke="url(#nav-gold-grad)" strokeWidth="2" strokeLinejoin="miter" />
            {/* Center Orb */}
            <circle cx="50" cy="58" r="14" fill="url(#nav-orb-grad)" filter="url(#nav-neon-glow)" />
          </svg>
          <span className="text-2xl font-display tracking-[0.2em] uppercase text-chrome-prismatic transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(200,155,60,0.8)] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Aurixa Systems
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Home", href: "/" },
            { label: "Platform", href: "/platform" },
            { label: "Solutions", href: "/solutions" },
            { label: "Industries", href: "/industries" },
            { label: "About", href: "/about" },
            { label: "Resources", href: "/resources" }
          ].map((item) => (
            <Link 
              key={item.label} 
              to={item.href}
              className="text-[13px] font-semibold text-gray-300 hover:text-white transition-colors tracking-wide"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/contact" 
            className="group relative inline-flex items-center justify-center px-6 py-2.5 text-[13px] font-black tracking-widest uppercase text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,168,181,0.3)] hover:shadow-[0_0_30px_rgba(200,155,60,0.6)]"
          >
            <span className="relative z-10 text-white tracking-[0.25em] font-semibold">JOIN WAITLIST</span>
          <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
          </Link>
        </div>

        <button 
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/> : <Menu className="w-6 h-6" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-[#0B162C] border-b border-[#00A8B5]/20 p-6 flex flex-col gap-4 shadow-[0_20px_40px_rgba(0,168,181,0.1)]">
          <Link to="/" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">Home</Link>
          <Link to="/platform" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">Platform</Link>
          <Link to="/solutions" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">Solutions</Link>
          <Link to="/industries" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">Industries</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">About</Link>
          <Link to="/resources" onClick={() => setIsOpen(false)} className="text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5]">Resources</Link>
          <hr className="border-white/10 my-2" />
          <Link to="/contact" onClick={() => setIsOpen(false)} className="text-lg font-bold text-[#C89B3C] uppercase tracking-widest hover:text-[#00A8B5]">Join Waitlist</Link>
        </div>
      )}
    </header>
  );
}
