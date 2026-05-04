import { motion } from "motion/react";
import { ArrowRight, BarChart3, Database, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";

export default function Home() {
  return (
    <div className="w-full relative w-full pt-20 bg-[#040B16]">
      
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-32 md:pt-40 md:pb-48 w-full flex flex-col items-center justify-center min-h-[90vh] overflow-hidden">
        <HeroBackground variant="home" />
        
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-[#0B162C]/80 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(200,155,60,0.15)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#C89B3C] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">Direct Onboarding Now Frozen</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-display font-light tracking-[-0.02em] leading-[1.05] mb-8"
          >
            <span className="block text-liquid-chrome mb-2 drop-shadow-lg">Where Property Intuition</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Surrenders to Mathematics.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-[#9CA3AF] max-w-3xl mb-12 font-light leading-relaxed"
          >
            If your advisory firm still relies on fragmented spreadsheets and isolated CRM data, you are bleeding capital. Aurixa Systems equips you with patched workflows, 10-year cash flow forecasting, and live financial matrices. <span className="text-white font-medium">To preserve the asymmetrical advantage of our active partners, immediate deployment is disabled.</span>
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center"
          >
            <Link to="/contact" className="w-full sm:w-auto group relative inline-flex items-center justify-center px-10 py-5 text-[12px] uppercase tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-none transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.2)] hover:shadow-[0_0_40px_rgba(0,168,181,0.4)]">
              <span className="drop-shadow-md">Join The Waitlist</span>
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
            </Link>
            <Link to="/platform" className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 text-[12px] uppercase tracking-[0.25em] font-medium text-white border border-white/20 hover:bg-white/5 rounded-none transition-colors">
              Examine The Arsenal
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust & Precision Bar */}
      <section className="w-full py-12 border-y border-white/5 bg-[#0B162C]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10 text-center">
          <div className="px-4">
            <h4 className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">Zero</h4>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Compliance Risk</p>
          </div>
          <div className="px-4">
            <h4 className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">10yr</h4>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Cashflow Analysis</p>
          </div>
          <div className="px-4">
            <h4 className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">100%</h4>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">White-Labeled</p>
          </div>
          <div className="px-4">
            <h4 className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">SOC 2</h4>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Enterprise Security</p>
          </div>
        </div>
      </section>

      {/* Intelligence Vanguard / "Soldiers" Section */}
      <section className="w-full py-32 bg-[#040B16] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(200,155,60,0.02)_50%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-px bg-[#C89B3C]" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#C89B3C]">System Sentinels</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-6 text-white drop-shadow-md">
                The Intelligence <br />
                <span className="text-chrome-prismatic italic drop-shadow-xl">Vanguard.</span>
              </h2>
            </div>
            <div>
              <p className="text-gray-400 text-lg font-light leading-relaxed mb-4">
                These are not just features. They are your tactical assets. The elite, automated agents executing your firm's strategy.
              </p>
              <p className="text-gray-400 text-lg font-light leading-relaxed">
                If you challenge the market with these assets, you don't just compete. <span className="text-white font-medium">You execute instantly. Lethal precision. Zero hesitation.</span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: "A-01",
                name: "CORE INGESTION",
                spec: "Data Assassination",
                desc: "Rapidly hunts and processes CoreLogic property matrices and manual data uploads into a singular, unified threat model. Removes spreadsheet bottlenecks permanently.",
                img: "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=500&auto=format&fit=crop"
              },
              {
                id: "V-09",
                name: "YIELD FORECASTER",
                spec: "10-Year Execution",
                desc: "Maps out multi-year holding costs, pre/post-tax impacts, and capital growth to deliver a mathematically untouchable strategy. Leaves competitors with guesswork.",
                img: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=400&h=500&auto=format&fit=crop"
              },
              {
                id: "X-99",
                name: "PROTOCOL EXPORT",
                spec: "White-Label Briefs",
                desc: "Generates stunning, board-grade capability and compliance reports instantly. Armed with your firm's exact branding. The ultimate strategic kill-shot in client meetings.",
                img: "https://images.unsplash.com/photo-1558244661-d248897f7bb4?q=80&w=400&h=500&auto=format&fit=crop"
              }
            ].map((unit, i) => (
              <div key={i} className="armor-panel group flex flex-col h-[500px] overflow-hidden hover:lethal-glow transition-all duration-500">
                <div className="h-1/2 w-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#00A8B5] mix-blend-color z-10 opacity-30 group-hover:opacity-10 transition-opacity" />
                  <div className="absolute inset-0 bg-[#C89B3C] mix-blend-color z-10 opacity-20 group-hover:opacity-50 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B162C] to-transparent z-20" />
                  <img src={unit.img} alt={unit.name} className="w-full h-full object-cover filter grayscale contrast-125 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 z-30">
                    <span className="px-2 py-1 bg-[#000]/80 border border-white/30 text-white text-[10px] font-mono tracking-widest">{unit.id}</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow justify-between relative z-30">
                  <div>
                    <h3 className="text-xl font-display font-black tracking-widest text-white mb-1 uppercase drop-shadow-md">{unit.name}</h3>
                    <p className="text-[#00A8B5] group-hover:text-[#C89B3C] transition-colors text-xs font-mono uppercase tracking-widest mb-4 drop-shadow-sm">SPEC // {unit.spec}</p>
                    <p className="text-gray-400 font-light text-sm leading-relaxed">{unit.desc}</p>
                  </div>
                  <div className="w-full h-1 bg-white/10 overflow-hidden">
                    <div className="h-full bg-chrome-prismatic w-0 group-hover:w-full transition-all duration-1000 ease-out" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Positioning Section */}
      <section className="w-full py-32 relative bg-[#0B162C] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-8 drop-shadow-md text-white">
                The <span className="italic text-chrome-prismatic drop-shadow-xl">"Penny Drop"</span> moment for <br />your high-net-worth clients.
              </h2>
              <div className="space-y-6 text-gray-400 text-lg font-light leading-relaxed">
                <p>
                  <strong className="text-white font-medium">Here is the uncomfortable truth:</strong> Your clients don't just want data; they want the undeniable mathematical conclusion clearly presented. 
                </p>
                <p>
                  Most advisory businesses operate in unscalable silos. Connecting manual serviceability calculators to property analytics and cobbling together client reports costs your firm hundreds of unrecoverable manual hours. It introduces catastrophic margin for error.
                </p>
                <p>
                  Aurixa replaces your fragmentation with an integrated weapon. Ingest financials directly, route them through APRA-aligned buffers, and instantly generate board-grade, white-labeled strategy briefs. <strong className="text-white font-medium">It’s not just software; it’s an unfair advantage.</strong>
                </p>
              </div>
            </div>
            <div className="relative">
              {/* Premium Dashboard Abstract */}
              <div className="aspect-[4/3] glass-panel p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10" />
                <div className="w-full h-full border border-white/10 rounded-sm relative z-20 bg-[#040B16] p-6 shadow-2xl flex flex-col gap-6">
                  {/* Typographic Arsenal Block */}
                  <div className="absolute inset-0 bg-chrome-prismatic opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
                  <div className="h-full w-full relative z-20 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-[#00A8B5] mb-6">Engine Architecture</span>
                    <div className="text-3xl lg:text-4xl font-display font-light text-white leading-tight mb-6 drop-shadow-md">
                      "Data is abundant.<br/><span className="text-chrome-prismatic italic drop-shadow-2xl">Prestige is scarce.</span>"
                    </div>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent mb-6 opacity-50" />
                    <p className="text-xs font-light text-[#9CA3AF] uppercase tracking-widest font-mono">10-Year Forecasting Protocols</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-40 relative overflow-hidden bg-[#040B16]">
        <div className="absolute inset-0 bg-gradient-radial from-[#111827] to-[#040B16] z-0" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-gradient-radial from-[#0A192F]/10 to-transparent blur-[120px] opacity-40 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-md bg-chrome-prismatic flex items-center justify-center mb-8 mx-auto shadow-[0_0_40px_rgba(200,155,60,0.3)] border border-white/50">
            <span className="text-white font-display font-bold text-3xl drop-shadow-md">A</span>
          </div>
          <h2 className="text-6xl md:text-7xl lg:text-[5rem] font-display font-light mb-8 tracking-tight leading-[1.05] text-white">
            Stop playing the game.<br /><span className="italic text-chrome-prismatic drop-shadow-2xl">Own the board.</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] mb-12 max-w-2xl font-light leading-relaxed">
            Immediate allocations are frozen. To preserve the systemic superiority of our integrated partners, access is heavily restricted. Review cycles are opening shortly.
          </p>
          <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] uppercase tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_40px_rgba(0,168,181,0.2)] hover:shadow-[0_0_50px_rgba(200,155,60,0.4)]">
            <span className="drop-shadow-md">Secure Priority Waitlist</span>
            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
          </Link>
        </div>
      </section>
      
    </div>
  );
}
