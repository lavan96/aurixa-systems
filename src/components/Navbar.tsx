import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "./BrandLogo";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#040B16]/90 backdrop-blur-xl border-b border-[#00A8B5]/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[100px] flex items-center justify-between gap-3">
        <div className="py-1 min-w-0 flex-1 md:flex-none">
          <BrandLogo compact className="max-w-[calc(100vw-6rem)] md:max-w-none" />
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Home", href: "/" },
            { label: "Platform", href: "/platform" },
            { label: "Solutions", href: "/solutions" },
            { label: "Industries", href: "/industries" },
            { label: "Pricing", href: "/pricing" },
            { label: "About", href: "/about" },
            { label: "Resources", href: "/resources" }
          ].map((item) => (
            <Link 
              key={item.label} 
              to={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`text-[13px] font-semibold text-gray-300 hover:text-white transition-colors tracking-wide ${isActive(item.href) ? "relative text-white after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:bg-[#C89B3C] after:content-['']" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/contact" 
            className="group relative isolate inline-flex items-center justify-center overflow-hidden px-6 py-2.5 text-[13px] font-black tracking-widest uppercase text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,168,181,0.3)] hover:shadow-[0_0_30px_rgba(200,155,60,0.6)]"
          >
            <span className="relative z-10 text-white tracking-[0.25em] font-semibold">JOIN WAITLIST</span>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
          </Link>
        </div>

        <button 
          type="button"
          aria-label={isOpen ? "Close mobile menu" : "Open mobile menu"}
          aria-expanded={isOpen}
          className="md:hidden relative z-50 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-slate-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A8B5]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-7 w-7" strokeWidth={2.25} /> : <Menu className="h-7 w-7" strokeWidth={2.25} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0B162C] border-b border-[#00A8B5]/20 p-6 flex flex-col gap-4 shadow-[0_20px_40px_rgba(0,168,181,0.1)]">
          <Link to="/" onClick={() => setIsOpen(false)} aria-current={isActive("/") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Home</Link>
          <Link to="/platform" onClick={() => setIsOpen(false)} aria-current={isActive("/platform") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/platform") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Platform</Link>
          <Link to="/solutions" onClick={() => setIsOpen(false)} aria-current={isActive("/solutions") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/solutions") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Solutions</Link>
          <Link to="/industries" onClick={() => setIsOpen(false)} aria-current={isActive("/industries") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/industries") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Industries</Link>
          <Link to="/pricing" onClick={() => setIsOpen(false)} aria-current={isActive("/pricing") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/pricing") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Pricing</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} aria-current={isActive("/about") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/about") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>About</Link>
          <Link to="/resources" onClick={() => setIsOpen(false)} aria-current={isActive("/resources") ? "page" : undefined} className={`text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive("/resources") ? "relative text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}>Resources</Link>
          <hr className="border-white/10 my-2" />
          <Link to="/contact" onClick={() => setIsOpen(false)} className="text-lg font-bold text-[#C89B3C] uppercase tracking-widest hover:text-[#00A8B5]">Join Waitlist</Link>
        </div>
      )}
    </header>
  );
}
