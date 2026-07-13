import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";

const MAKE_WAITLIST_WEBHOOK_URL = "https://hook.eu2.make.com/589rb23xwbgovfj3iuemtcuxm75cccut";

const WAITLIST_FIELD_NAMES = [
  "directiveFirstName",
  "directiveLastName",
  "corporateEmail",
  "mobileNumber",
  "entityName",
  "entityClassification",
  "annualOriginationTransactionVolume",
  "currentTechStackBottlenecks",
] as const;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const cleanTextValue = (value: string) =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanEmailValue = (value: string) => cleanTextValue(value).toLowerCase();

const formatAustralianMobileNumber = (value: string) => {
  const compactValue = value.replace(/[\s().-]/g, "");

  if (/^04\d{8}$/.test(compactValue)) {
    return `+61${compactValue.slice(1)}`;
  }

  if (/^614\d{8}$/.test(compactValue)) {
    return `+${compactValue}`;
  }

  if (/^\+614\d{8}$/.test(compactValue)) {
    return compactValue;
  }

  return "";
};

const cleanWaitlistValue = (fieldName: (typeof WAITLIST_FIELD_NAMES)[number], value: string) => {
  if (fieldName === "corporateEmail") {
    return cleanEmailValue(value);
  }

  if (fieldName === "mobileNumber") {
    return formatAustralianMobileNumber(value);
  }

  return cleanTextValue(value);
};

const cleanFieldOnBlur = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const field = event.currentTarget;
  const fieldName = field.name as (typeof WAITLIST_FIELD_NAMES)[number];

  if (!WAITLIST_FIELD_NAMES.includes(fieldName)) {
    return;
  }

  field.value = cleanWaitlistValue(fieldName, field.value);
};

export default function Contact() {
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionStatus("idle");
    setSubmissionMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(
      WAITLIST_FIELD_NAMES.map((fieldName) => [
        fieldName,
        cleanWaitlistValue(fieldName, String(formData.get(fieldName) ?? "")),
      ]),
    ) as Record<(typeof WAITLIST_FIELD_NAMES)[number], string>;

    if (WAITLIST_FIELD_NAMES.some((fieldName) => fieldName !== "mobileNumber" && values[fieldName] === "")) {
      setSubmissionStatus("error");
      setSubmissionMessage("Please complete all required fields.");
      return;
    }

    if (!values.mobileNumber) {
      setSubmissionStatus("error");
      setSubmissionMessage("Please enter a valid Australian mobile number starting with 04 or +614.");
      return;
    }

    if (!isValidEmail(values.corporateEmail)) {
      setSubmissionStatus("error");
      setSubmissionMessage("Please enter a valid corporate email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...values,
        source: "AURIXA Contact Waitlist Page",
        page: "/contact",
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch(MAKE_WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Waitlist webhook submission failed");
      }

      form.reset();
      setSubmissionStatus("success");
      setSubmissionMessage("Waitlist application submitted successfully.");
    } catch (error) {
      console.error(error);
      setSubmissionStatus("error");
      setSubmissionMessage("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full relative pt-32 pb-20 min-h-screen bg-[#040B16] overflow-hidden">
      <HeroBackground variant="contact" />
      
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 relative z-10">
        
        {/* Left Side */}
        <div className="pt-10 flex flex-col justify-between">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-px bg-white/50" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Restricted Action</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[4.5rem] font-display font-light mb-8 tracking-[-0.02em] leading-[1.05]">
              <span className="block text-white mb-2">The</span>
              <span className="italic text-chrome-prismatic drop-shadow-2xl">Waitlist.</span>
            </h1>
            
            <div className="space-y-6 text-gray-400 text-lg font-light leading-relaxed mb-12">
              <p>
                We strictly cap our active partner ecosystem to ensure our infrastructure provides an unassailable, asymmetrical advantage in the market. This restricted action protects infrastructure fidelity for active partners while preserving a controlled path for firms seeking enterprise operational intelligence.
              </p>
              <p>
                Application review cycle is now open. Firms will be selected via strict merit-based hierarchy regarding transaction volume, market stance, and alignment with Aurixa's strategic objectives. Submit credentials that demonstrate operational maturity, systemic capability, and the current bottlenecks preventing your firm from scaling through unified infrastructure.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 border-l-[3px] border-[#C89B3C]/40 pl-6 py-2"
          >
            <div className="flex items-center gap-2 mb-4 text-white">
              <ShieldAlert className="w-5 h-5 " style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h3 className="font-display font-semibold text-xl tracking-wide uppercase">Operational Freeze</h3>
            </div>
            <p className="text-gray-400 font-light text-sm leading-relaxed mb-4">
              "To maintain extreme architectural fidelity for our Tier-1 partners, we limit new integrations. We do not accept capital for queue priority. Allocation is earned by proving your firm has the systemic capability to dominate your sector once armed with our software. Submit your credentials meticulously. Q4 review is calibrated around transaction volume, market stance, and alignment with Aurixa Systems' strategic objectives."
            </p>
            <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-mono">
              — Founding Partner, Aurixa Systems
            </div>
          </motion.div>
        </div>

        {/* Right Side / Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative group p-[1px] self-start overflow-hidden rounded-sm bg-gradient-to-br from-[#00A8B5]/20 via-[#C89B3C]/20 to-transparent"
        >
          <div className="absolute inset-0 bg-chrome-prismatic opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
          <div className="bg-[#0B162C]/95 backdrop-blur-2xl p-8 md:p-12 relative z-10 border border-t-white/10 border-l-white/10">
            <div className="mb-10 pb-6 border-b border-white/10 flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-display font-light text-white mb-2">Waitlist Credentials</h3>
                <p className="text-[#9CA3B8] text-sm font-light">All fields are mandatory.</p>
              </div>
              <div className="px-3 py-1 bg-[#C89B3C]/10 border border-[#C89B3C]/30 text-[#C89B3C] text-[10px] uppercase tracking-widest font-mono rounded-sm text-right leading-tight">
                Q4 Review Cycle
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleWaitlistSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Directive First Name</label>
                  <input type="text" name="directiveFirstName" required onBlur={cleanFieldOnBlur} autoComplete="given-name" className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Directive Last Name</label>
                  <input type="text" name="directiveLastName" required onBlur={cleanFieldOnBlur} autoComplete="family-name" className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Corporate Email</label>
                <input type="email" name="corporateEmail" required onBlur={cleanFieldOnBlur} autoComplete="email" className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Mobile Number</label>
                <input type="tel" name="mobileNumber" required onBlur={cleanFieldOnBlur} autoComplete="tel" inputMode="tel" placeholder="04XX XXX XXX" pattern="(?:\+?61|0)4[0-9 ]{8,12}" className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" />
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono ml-1">Australian mobile only. Stored as +614XXXXXXXX.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Entity Name</label>
                  <input type="text" name="entityName" required onBlur={cleanFieldOnBlur} autoComplete="organization" className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Entity Classification</label>
                  <select name="entityClassification" required className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm appearance-none">
                    <option value="" className="bg-[#040B16]">Select Segment...</option>
                    <option value="buyers_agent" className="bg-[#040B16]">Buyers Agency</option>
                    <option value="property_advisory" className="bg-[#040B16]">Property Advisory Firm</option>
                    <option value="real_estate_agency" className="bg-[#040B16]">Real Estate Agency</option>
                    <option value="mortgage_finance" className="bg-[#040B16]">Mortgage & Finance Business</option>
                    <option value="wealth_advisor" className="bg-[#040B16]">Wealth Management Firm</option>
                    <option value="financial_planner" className="bg-[#040B16]">Financial Planning Office</option>
                    <option value="investment_group" className="bg-[#040B16]">Investment Group</option>
                    <option value="developer" className="bg-[#040B16]">Developer</option>
                    <option value="enterprise" className="bg-[#040B16]">Enterprise Aggregate</option>
                    <option value="enterprise_property_network" className="bg-[#040B16]">Enterprise Property Network</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Annual Origination / Transaction Volume</label>
                <select name="annualOriginationTransactionVolume" required className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm appearance-none">
                  <option value="" className="bg-[#040B16]">Select Volume Bracket...</option>
                  <option value="tier_1" className="bg-[#040B16]">Under $50M</option>
                  <option value="tier_2" className="bg-[#040B16]">$50M - $150M</option>
                  <option value="tier_3" className="bg-[#040B16]">$150M - $500M</option>
                  <option value="tier_4" className="bg-[#040B16]">$500M+</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Current Tech Stack Bottlenecks</label>
                <textarea name="currentTechStackBottlenecks" required rows={3} onBlur={cleanFieldOnBlur} className="w-full bg-[#040B16] border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-light text-sm" placeholder="Detail the fragmentation or inefficiencies currently stalling your firm's pipeline..."></textarea>
              </div>

              {submissionMessage && (
                <p
                  className={`text-sm font-light ${
                    submissionStatus === "success" ? "text-[#C89B3C]" : "text-red-300"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {submissionMessage}
                </p>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full mt-8 group relative flex items-center justify-center px-8 py-5 text-[12px] font-black tracking-[0.25em] uppercase text-white btn-chrome-prismatic outline-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_0_20px_rgba(200,155,60,0.2)] hover:shadow-[0_0_40px_rgba(0,168,181,0.4)] border-none rounded-sm overflow-hidden">
                <span className="relative z-10 text-white transition-colors duration-300 drop-shadow-md">{isSubmitting ? "Transmitting Credentials..." : "Submit Waitlist Application"}</span>
                <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 relative z-10 transition-all duration-300 drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500 ease-out z-0"></div>
              </button>
              
              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <p className="text-left text-[10px] text-gray-500 uppercase tracking-widest font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                  Queue Active
                </p>
                <p className="text-right text-[10px] text-[#C89B3C] uppercase tracking-widest font-mono">
                  Review Cycle Pending
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
