import { motion } from "motion/react";
import { 
  ArrowRight, Lock, Key, LayoutGrid, Building, CalendarDays, Database, 
  BarChart2, FileText, Activity, MessageSquare, Mail, PhoneCall, UserCheck, 
  Target, Briefcase, Send, TrendingUp, Bell, ListTodo, FileSignature, 
  Map, Megaphone, PieChart, BookOpen, Zap, Copy, Palette, Plug, Cloud, 
  Cpu, ShieldCheck, UploadCloud, Layers, AlertTriangle, History, Settings, 
  Users, DollarSign, Sliders, Sparkles, Server, Network
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";

const MODULE_CATEGORIES = [
  {
    id: "01",
    title: "OPERATIONAL CORE",
    description: "Primary workflow orchestration & strategic data structuring. Workflow systems, business scalability, operational infrastructure.",
    items: [
      { name: "Workflow Systems", icon: LayoutGrid },
      { name: "Business Scalability", icon: TrendingUp },
      { name: "Operational Infrastructure", icon: Server },
      { name: "Overview", icon: LayoutGrid },
      { name: "Listings", icon: Building },
      { name: "Calendar", icon: CalendarDays },
      { name: "Sources", icon: Database },
      { name: "Deal Pipeline", icon: TrendingUp },
      { name: "Agreements", icon: FileSignature },
      { name: "Game Plan", icon: Map },
      { name: "Marketing", icon: Megaphone },
      { name: "Reminders", icon: Bell },
      { name: "Checklists", icon: ListTodo },
      { name: "User Guide", icon: BookOpen },
    ]
  },
  {
    id: "02",
    title: "INTELLIGENCE & AI",
    description: "Automated analysis, live telemetry, & generative outputs. Property analysis, scenario modelling, strategic recommendations.",
    items: [
      { name: "Property Analysis", icon: BarChart2 },
      { name: "Scenario Modelling", icon: PieChart },
      { name: "Strategic Recommendations", icon: BookOpen },
      { name: "Reports", icon: BarChart2 },
      { name: "Generated Reports", icon: FileText },
      { name: "Cash Flow Analysis", icon: Activity },
      { name: "Report Q&A", icon: MessageSquare },
      { name: "Email Copilot", icon: Sparkles },
      { name: "Charts", icon: PieChart },
    ]
  },
  {
    id: "03",
    title: "FINANCIAL INTELLIGENCE",
    description: "Borrowing capacity, cash flow, depreciation integration, and financial operations.",
    items: [
      { name: "Borrowing Capacity", icon: DollarSign },
      { name: "Cash Flow Operations", icon: Activity },
      { name: "Depreciation Integration", icon: Layers },
      { name: "Finance Portal", icon: DollarSign },
      { name: "Cash Flow Analysis", icon: Activity },
      { name: "Depreciation Comps", icon: Layers },
    ]
  },
  {
    id: "04",
    title: "CLIENT ECOSYSTEM",
    description: "Secure portals, tracking, & communications logging. CRM workflows, client engagement, lifecycle infrastructure.",
    items: [
      { name: "CRM Workflows", icon: Users },
      { name: "Client Engagement", icon: MessageSquare },
      { name: "Lifecycle Infrastructure", icon: Briefcase },
      { name: "Call Logs", icon: PhoneCall },
      { name: "Conversations", icon: MessageSquare },
      { name: "Clients", icon: UserCheck, highlight: true },
      { name: "Client Tracker", icon: Target },
      { name: "Portfolio Reports", icon: Briefcase },
      { name: "Report Requests", icon: Send },
    ]
  },
  {
    id: "05",
    title: "ENTERPRISE INFRASTRUCTURE",
    description: "Root access, global configurations, API management, administration, governance, and scalability systems.",
    items: [
       { name: "Administration Systems", icon: Settings },
       { name: "Brand Governance", icon: ShieldCheck },
       { name: "Scalability Networks", icon: Network },
       { name: "Automation", icon: Zap },
       { name: "Templates", icon: Copy },
       { name: "Branding", icon: Palette },
       { name: "Integrations", icon: Plug },
       { name: "Cloudflare", icon: Cloud },
       { name: "API Usage", icon: Cpu },
       { name: "Model Hub", icon: Server },
       { name: "Monitoring", icon: Activity },
       { name: "Quality Assurance", icon: ShieldCheck },
       { name: "Data Import", icon: UploadCloud },
       { name: "Depreciation Comps", icon: Layers },
       { name: "Error Logs", icon: AlertTriangle },
       { name: "Activity Logs", icon: History },
       { name: "Settings", icon: Settings },
       { name: "User Management", icon: Users },
       { name: "Finance Portal", icon: DollarSign },
       { name: "Portal Config", icon: Sliders },
    ]
  }
];

export default function Resources() {
  return (
    <div className="w-full relative pt-32 pb-32 bg-[#040B16] min-h-screen overflow-hidden">
      <HeroBackground variant="resources" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="max-w-4xl mb-24 flex flex-col items-center text-center mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#00A8B5]/5 border border-[#00A8B5]/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,168,181,0.1)]">
             <Server className="w-6 h-6 outline-none" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome drop-shadow-md">Global Sub-System</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Module Library.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-2xl mb-12"
          >
            A comprehensive, unrestricted index of the underlying infrastructure components mapping our entire architectural capacity. The Aurixa Intelligence Centre is a comprehensively aggregated directory of the sub-systems and governed modules embedded within the Aurixa operational ecosystem.
          </motion.p>
        </div>

        {/* --- APESHIT MODULE LIBRARY GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
          {MODULE_CATEGORIES.map((category, idx) => (
            <motion.div 
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-[1px] rounded-sm group overflow-hidden bg-gradient-to-b from-[#00A8B5]/30 to-transparent shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00A8B5]/10 via-transparent to-[#C89B3C]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="h-full bg-[#040B16] rounded-sm p-8 relative z-10 flex flex-col">
                {/* Category Header */}
                <div className="flex justify-between items-start border-b border-[#00A8B5]/20 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[#00A8B5]/50 font-mono text-[10px] tracking-[0.3em]">SEC_{category.id}</span>
                       <div className="h-[1px] w-8 bg-[#C89B3C]/40" />
                    </div>
                    <h3 className="text-xl text-white tracking-widest uppercase font-light">{category.title}</h3>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-mono text-[#00A8B5]/60 max-w-[150px] leading-relaxed uppercase opacity-60">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Sub-item Grid Elements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                  {category.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={itemIdx} 
                        className={`group/item flex items-center gap-4 p-3 rounded-sm border transition-all duration-300 relative overflow-hidden
                          ${item.highlight 
                            ? "bg-[#C89B3C]/10 border-[#C89B3C]/50 shadow-[0_0_20px_rgba(200,155,60,0.15)]" 
                            : "bg-[#0B162C]/40 border-[#00A8B5]/10 hover:border-[#00A8B5]/40 hover:bg-[#00A8B5]/5"
                          }`}
                      >
                        {/* Glow Sweep Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C89B3C]/5 to-transparent -translate-x-[150%] group-hover/item:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                        
                        <div className={`p-1.5 rounded-sm flex items-center justify-center border ${item.highlight ? 'bg-[#C89B3C]/20 border-[#C89B3C]/50' : 'bg-[#040B16] border-[#00A8B5]/20'}`}>
                          <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-[#C89B3C]' : 'text-[#00A8B5]/70 group-hover/item:text-[#00A8B5]'}`} />
                        </div>
                        <span className={`text-[12px] uppercase font-mono tracking-wider truncate
                          ${item.highlight ? 'text-[#C89B3C] font-semibold' : 'text-gray-400 group-hover/item:text-white'}
                        `}>
                          {item.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- RESTRICTED DEPLOYMENT ARCHIVES (Existing Block but Styled Up) --- */}
        <div className="w-full relative mt-32 mb-12 flex justify-center">
           <div className="absolute w-px h-24 bg-gradient-to-t from-[#C89B3C]/40 to-transparent -top-24 left-1/2 -translate-x-1/2" />
           <div className="w-3 h-3 border border-[#C89B3C] rotate-45 bg-[#040B16] shadow-[0_0_10px_#C89B3C] z-10" />
        </div>

        <div className="max-w-4xl mx-auto glass-panel p-16 text-center border-t-2 border-b-2 border-[#C89B3C]/50 shadow-[0_0_50px_rgba(200,155,60,0.05)] relative overflow-hidden bg-gradient-to-b from-[#0B162C]/30 to-[#040B16]/80 backdrop-blur-md">
           <div className="absolute inset-0 bg-chrome-prismatic opacity-[0.02] pointer-events-none mix-blend-screen" />
           
           {/* Radar sweep background effect for the locked box */}
           <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 overflow-hidden opacity-10 pointer-events-none">
              <div className="w-full h-full border border-dashed border-[#C89B3C]/30 rounded-full animate-[spin-ultra-slow_20s_linear_infinite]" />
           </div>

           <div className="relative z-10 flex flex-col items-center">
             <div className="relative w-16 h-16 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border border-[#C89B3C]/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-2 border border-[#C89B3C]/50 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                <Lock className="w-8 h-8 relative z-10" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
             </div>
             
             <h3 className="text-3xl font-display font-light text-white mb-6 tracking-wide drop-shadow-md">RESTRICTED ARCHIVES</h3>
             <p className="text-[#00A8B5]/80 font-mono text-[11px] leading-relaxed mb-10 max-w-xl uppercase tracking-widest text-center">
               Live deployment demonstrations and proprietary operational blueprints are walled off from general traffic. Access requires an authorized partner protocol link. Explore the ecosystem to access structured operational intelligence, automation systems, reporting infrastructure, and enterprise support.
             </p>
             <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] uppercase tracking-[0.25em] font-bold text-[#040B16] bg-gradient-to-r from-[#C89B3C] to-[#E2C78C] rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)] hover:shadow-[0_0_50px_rgba(200,155,60,0.5)]">
               <span className="drop-shadow-sm font-black">BOOK ENTERPRISE DEMO</span>
               <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform stroke-[#040B16] drop-shadow-sm" style={{ strokeWidth: 2 }}/>
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
