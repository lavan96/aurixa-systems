import { MotionConfig, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PRIVACY_POLICY_URL } from "../lib/waitlist";
import { AnimatedGovernanceSystem } from "../components/AnimatedGovernanceSystem";

const overviewCards = [
  {
    label: "Security",
    title: "Security & Infrastructure",
    description:
      "Infrastructure, encryption and access controls designed to support the secure operation of the Aurixa environment.",
  },
  {
    label: "Due diligence",
    title: "AML/CTF & CDD",
    description:
      "Structured workflows that support customer due diligence, information collection, review processes and operational recordkeeping.",
  },
  {
    label: "Privacy",
    title: "Privacy Management",
    description:
      "Clear information about how personal information is collected, used, protected and managed within the Aurixa environment.",
  },
  {
    label: "Platform governance",
    title: "Terms & Conditions",
    description:
      "Clear terms governing platform access, account responsibilities, permitted use and service arrangements.",
  },
] as const;

const securityCards = [
  {
    label: "Backend infrastructure",
    title: "Secure Backend Infrastructure",
    description:
      "Aurixa’s backend operates within enterprise-grade infrastructure supported by independently assessed SOC 2 Type 2 controls and ISO 27001 certification. Customer data is protected using AES-256 encryption at rest and TLS encryption while in transit.",
  },
  {
    label: "Web infrastructure",
    title: "Protected Web Infrastructure",
    description:
      "Aurixa’s web environment is delivered through secure, globally distributed infrastructure designed to strengthen protected access, service resilience and application delivery. The underlying infrastructure maintains independently assessed SOC 2 Type II controls and ISO 27001:2022 certification.",
  },
  {
    label: "Aurixa controls",
    title: "Shared Security Responsibility",
    description:
      "Aurixa maintains responsibility for application configuration, access governance, user permissions and internal operational safeguards. These controls are managed within the Aurixa environment to support secure, accountable and consistent platform delivery.",
  },
] as const;

const capabilities = [
  {
    title: "Client Information Collection",
    description:
      "Bring relevant client information, supporting documents and onboarding details into one structured operational environment.",
  },
  {
    title: "Due Diligence Workflows",
    description:
      "Coordinate customer due diligence activities through defined steps, responsibilities and review processes.",
  },
  {
    title: "Review Tracking",
    description:
      "Maintain visibility over outstanding information, follow-up actions, scheduled reviews and unresolved requirements.",
  },
  {
    title: "Operational Records",
    description:
      "Retain a clearer record of activities, documents, decisions and actions associated with the client relationship.",
  },
] as const;

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#00A8B5]/40" />
    </>
  );
}

function Eyebrow({
  children,
  centred = false,
}: {
  children: string;
  centred?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${centred ? "justify-center" : ""}`}
    >
      <span className="h-px w-9 bg-[#C89B3C]" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#C89B3C]">
        {children}
      </span>
      {centred && <span className="h-px w-9 bg-[#C89B3C]" />}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  centred = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centred?: boolean;
}) {
  return (
    <motion.header
      {...reveal}
      className={centred ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}
    >
      <Eyebrow centred={centred}>{eyebrow}</Eyebrow>
      <h2 className="mt-6 text-4xl font-light leading-tight tracking-tight text-white md:text-5xl">
        {title}
      </h2>
      <p className="mt-6 text-base font-light leading-relaxed text-[#9CA3AF] md:text-lg">
        {description}
      </p>
    </motion.header>
  );
}

function LegalLink({ href, children }: { href: string; children: string }) {
  const unavailable = !href;
  return (
    <a
      href={href || "#"}
      onClick={unavailable ? (event) => event.preventDefault() : undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      aria-disabled={unavailable || undefined}
      title={unavailable ? "This document is not yet available" : undefined}
      className="group mt-9 inline-flex items-center rounded-sm border border-[#C89B3C]/40 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:border-[#C89B3C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00A8B5] lg:mt-auto"
    >
      {children}
      <ArrowRight className="ml-3 h-4 w-4 text-[#C89B3C] transition-transform group-hover:translate-x-1" />
    </a>
  );
}

export default function Compliance() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full overflow-hidden bg-[#040B16]">
        <section
          aria-labelledby="compliance-heading"
          className="relative border-b border-white/5 pb-20 pt-32"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,168,181,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,168,181,.08) 1px,transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(circle at 70% 45%, black, transparent 62%)",
            }}
          />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,.85fr)]">
              <div>
                <div className="mb-8 flex items-center gap-3">
                  <span className="h-px w-12 bg-[#C89B3C]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                    Compliance & Governance
                  </span>
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  id="compliance-heading"
                  className="mb-8 text-4xl font-display font-light leading-[1.05] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-[5rem]"
                >
                  <span className="block drop-shadow-md">
                    Compliance, Structured
                  </span>
                  <span className="block italic text-[#C89B3C] drop-shadow-[0_0_18px_rgba(200,155,60,0.18)]">
                    Into Every Layer.
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-3xl text-lg font-light leading-relaxed text-[#9CA3AF] md:text-xl"
                >
                  Aurixa brings security, due diligence and governance workflows
                  into one connected operational environment, helping
                  organisations maintain stronger oversight across client
                  onboarding, information handling and platform use.
                </motion.p>
              </div>
              <AnimatedGovernanceSystem />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-32">
          <SectionHeader
            eyebrow="Connected Governance"
            title="Clearer Control Across Critical Operations."
            description="Aurixa supports organisations across the operational areas where security, accountability and structured processes matter most."
            centred
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card, index) => (
              <motion.article
                {...reveal}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                key={card.label}
                className="glass-panel glass-panel-hover relative min-h-64 overflow-hidden p-7 md:min-h-72 md:p-8"
              >
                <CornerTicks />
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5EDDE8]">
                  {card.label}
                </p>
                <h3 className="mt-7 text-2xl font-light leading-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-5 text-sm font-light leading-relaxed text-[#9CA3AF]">
                  {card.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#0B162C]/25 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              eyebrow="Security & Infrastructure"
              title="Built on Trusted Infrastructure."
              description="Aurixa Systems operates using established infrastructure supported by independently assessed security and compliance programs."
            />
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {securityCards.map((card, index) => (
                <motion.article
                  {...reveal}
                  key={card.label}
                  className={`group relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-8 shadow-[0_30px_80px_-30px] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 md:p-9 ${index === 1 ? "border-[#C89B3C]/40 shadow-[#C89B3C]/20" : "border-[#00A8B5]/35 shadow-[#00A8B5]/20"}`}
                >
                  <CornerTicks />
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.3em] ${index === 1 ? "text-[#C89B3C]" : "text-[#5EDDE8]"}`}
                  >
                    {card.label}
                  </p>
                  <h3 className="mt-6 text-2xl font-semibold leading-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
                    {card.description}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-32">
          <SectionHeader
            eyebrow="AML/CTF & Customer Due Diligence"
            title="Structured Due Diligence. Clearer Oversight."
            description="Aurixa supports structured AML/CTF and customer due diligence workflows across client onboarding, information collection, review and record management. The platform helps teams organise required steps, maintain visibility over outstanding actions and retain a clearer operational record throughout the client lifecycle."
          />
          <div className="mt-16 grid border-l border-t border-white/10 md:grid-cols-2">
            {capabilities.map((item, index) => (
              <motion.article
                {...reveal}
                key={item.title}
                className="relative border-b border-r border-white/10 p-8 md:p-10"
              >
                <span className="font-mono text-[10px] tracking-[0.3em] text-[#00A8B5]">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-2xl font-light text-white">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-[#9CA3AF]">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 md:pb-32">
          <div className="grid overflow-hidden border border-white/10 bg-[#0B162C]/35 lg:grid-cols-2">
            <motion.article
              {...reveal}
              className="relative flex flex-col items-start p-8 md:p-14 lg:border-r lg:border-white/10"
            >
              <CornerTicks />
              <Eyebrow>Privacy</Eyebrow>
              <h2 className="mt-6 text-4xl font-light text-white">
                Privacy, Explained Clearly.
              </h2>
              <p className="mt-6 font-light leading-relaxed text-[#9CA3AF]">
                Aurixa’s Privacy Policy explains how personal information may be
                collected, used, protected and disclosed, together with the
                choices and rights available to users. It also explains how
                privacy enquiries, access requests and correction requests can
                be raised.
              </p>
              <LegalLink href={PRIVACY_POLICY_URL}>
                View Privacy Policy
              </LegalLink>
            </motion.article>
            <motion.article
              {...reveal}
              className="relative flex flex-col items-start p-8 md:p-14"
            >
              <CornerTicks />
              <Eyebrow>Platform Terms</Eyebrow>
              <h2 className="mt-6 text-4xl font-light text-white">
                Clear Terms for Platform Use.
              </h2>
              <p className="mt-6 font-light leading-relaxed text-[#9CA3AF]">
                Aurixa’s Terms and Conditions establish the rules governing
                access to and use of the platform, including account
                responsibilities, permitted use, subscriptions, intellectual
                property, service availability and termination.
              </p>
              <LegalLink href="">View Terms & Conditions</LegalLink>
            </motion.article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 md:pb-32">
          <motion.div
            {...reveal}
            className="relative overflow-hidden border border-[#C89B3C]/30 bg-gradient-to-br from-[#C89B3C]/10 via-[#0B162C]/70 to-[#00A8B5]/10 p-9 md:p-16"
          >
            <CornerTicks />
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 h-80 w-80 rotate-45 border border-[#00A8B5]/15"
            />
            <div className="relative max-w-4xl">
              <Eyebrow>Governance Principle</Eyebrow>
              <h2 className="mt-7 text-4xl font-light leading-tight text-white md:text-5xl">
                Technology Supports Compliance. Responsibility Remains Clear.
              </h2>
              <p className="mt-7 max-w-3xl text-lg font-light leading-relaxed text-[#B1B8C5]">
                Aurixa provides systems and workflows designed to support
                structured operational and compliance processes. Each
                organisation remains responsible for understanding its
                obligations, maintaining its internal controls and determining
                how the platform should be used within its business.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-32">
          <div className="relative overflow-hidden rounded-3xl border border-[#00A8B5]/30 bg-gradient-to-br from-[#00A8B5]/10 via-[#0B162C] to-[#C89B3C]/10 p-10 text-center md:p-20">
            <Eyebrow centred>Structured Operations</Eyebrow>
            <h2 className="mt-7 text-4xl font-light md:text-6xl">
              Build With Greater Confidence.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-[#9CA3AF]">
              Bring security, governance and compliance-related workflows into
              one connected operational environment.
            </p>
            <Link
              to="/contact"
              className="group mt-10 inline-flex items-center rounded-sm bg-[#00A8B5] px-8 py-3 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-[0_0_50px_-10px] shadow-[#00A8B5]/70 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C]"
            >
              Join Waitlist{" "}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
