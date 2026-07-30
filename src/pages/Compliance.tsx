import { MotionConfig, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { PRIVACY_POLICY_URL } from "../lib/waitlist";
import { AnimatedGovernanceSystem } from "../components/AnimatedGovernanceSystem";
import { HeroBackground } from "../components/HeroBackgrounds";

const frameworkLayers = [
  {
    number: "01",
    title: "Infrastructure Protection",
    description:
      "Established infrastructure, encrypted data handling and controlled access supporting the secure operation of the Aurixa environment.",
  },
  {
    number: "02",
    title: "Client Due Diligence",
    description:
      "Structured AML/CTF and customer due diligence workflows supporting client information collection, review and record management.",
  },
  {
    number: "03",
    title: "Information Governance",
    description:
      "Clear privacy practices, controlled information handling and defined terms governing use of the Aurixa platform.",
  },
  {
    number: "04",
    title: "Operational Responsibility",
    description:
      "Application controls, internal governance and clearly assigned responsibilities supporting accountable platform use.",
  },
] as const;

const protectionLayers = [
  {
    number: "01",
    label: "Infrastructure assurance",
    title: "Established Infrastructure Controls",
    description:
      "Aurixa operates within enterprise-grade infrastructure supported by independently assessed SOC 2 Type II controls and ISO 27001:2022 certification.",
  },
  {
    number: "02",
    label: "Data protection",
    title: "Protected at Rest and in Transit",
    description:
      "Customer data is protected using AES-256 encryption while stored and TLS encryption while being transmitted between authorised systems and users.",
  },
  {
    number: "03",
    label: "Application governance",
    title: "Controlled Within Aurixa",
    description:
      "Aurixa maintains responsibility for application configuration, access governance, user permissions and internal operational safeguards within the platform environment.",
  },
] as const;

const diligenceStages = [
  {
    number: "01",
    title: "Collect",
    subtitle: "Client Information",
    description:
      "Bring relevant client details, supporting documents and onboarding information into one structured operational environment.",
  },
  {
    number: "02",
    title: "Assess",
    subtitle: "Due Diligence Requirements",
    description:
      "Coordinate customer due diligence activities through defined steps, assigned responsibilities and documented review processes.",
  },
  {
    number: "03",
    title: "Review",
    subtitle: "Ongoing Oversight",
    description:
      "Maintain visibility over outstanding information, follow-up actions, scheduled reviews and unresolved requirements.",
  },
  {
    number: "04",
    title: "Retain",
    subtitle: "Operational Records",
    description:
      "Maintain a clearer record of documents, activities, decisions and actions associated with the client relationship.",
  },
] as const;

const responsibilities = [
  {
    label: "Aurixa provides",
    items: [
      "Operational structure",
      "Workflow visibility",
      "Access controls",
      "Record management",
      "Platform governance",
    ],
  },
  {
    label: "The organisation maintains",
    items: [
      "Regulatory responsibility",
      "Internal compliance programs",
      "Business-specific controls",
      "Policy decisions",
      "Appropriate platform use",
    ],
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
      <h2 className="mt-6 font-display text-4xl font-light leading-tight tracking-tight text-white md:text-5xl">
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
      className={`group mt-9 inline-flex max-w-full items-center rounded-sm border border-[#C89B3C]/40 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00A8B5] sm:px-6 sm:tracking-[0.25em] lg:mt-auto ${unavailable ? "cursor-not-allowed opacity-60" : "transition-colors hover:border-[#C89B3C]"}`}
    >
      {children}
      <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-[#C89B3C] transition-transform group-hover:translate-x-1" />
    </a>
  );
}

function SystemSignal() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-6 top-0 hidden h-px lg:block"
    >
      <motion.span
        className="absolute -top-1 h-2 w-2 rounded-full bg-[#D7B35F] shadow-[0_0_14px_#D7B35F]"
        animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export default function Compliance() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full overflow-hidden bg-[#040B16]">
        <section
          aria-labelledby="compliance-heading"
          className="relative border-b border-white/5 pt-32"
        >
          <HeroBackground variant="platform" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
            <div className="mb-24 grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,.85fr)]">
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
                  className="mb-8 font-display text-[2rem] font-light leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[2.65rem] xl:text-[3.75rem]"
                >
                  <span className="block text-liquid-chrome drop-shadow-md lg:whitespace-nowrap">
                    Compliance, Structured
                  </span>
                  <span className="block text-chrome-prismatic italic drop-shadow-2xl lg:whitespace-nowrap">
                    Into Every Layer.
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-3xl text-xl font-light leading-relaxed text-[#9CA3AF]"
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

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:py-32">
          <SectionHeader
            eyebrow="Connected Compliance"
            title="One Environment. Four Operational Layers."
            description="Aurixa brings infrastructure protection, client due diligence, information governance and operational responsibility into one connected framework. Each layer supports clearer oversight while remaining part of the same operational environment."
            centred
          />
          <div className="relative mt-16 border-y border-white/10 bg-[#081426]/55 lg:grid lg:grid-cols-4">
            <CornerTicks />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-8 top-0 w-px bg-gradient-to-b from-[#00A8B5]/10 via-[#00A8B5]/70 to-[#C89B3C]/30 lg:bottom-auto lg:left-0 lg:right-0 lg:top-8 lg:h-px lg:w-auto"
            />
            <SystemSignal />
            {frameworkLayers.map((layer, index) => (
              <motion.article
                {...reveal}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                key={layer.number}
                className="relative min-w-0 py-8 pl-16 pr-7 lg:border-r lg:border-white/10 lg:px-7 lg:pb-10 lg:pt-16 lg:last:border-r-0 xl:px-9"
              >
                <span className="absolute left-[1.7rem] top-9 h-2.5 w-2.5 rounded-full border border-[#5EDDE8] bg-[#071426] shadow-[0_0_10px_#00A8B5] lg:left-7 lg:top-[1.7rem]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs tracking-[0.3em] text-[#D7B35F]">
                    {layer.number}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#5EDDE8]/70">
                    Layer online
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-light leading-tight text-white">
                  {layer.title}
                </h3>
                <p className="mt-5 text-sm font-light leading-relaxed text-[#9CA3AF]">
                  {layer.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#0B162C]/25 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <SectionHeader
              eyebrow="Security Architecture"
              title="Protection Across Every Layer."
              description="Aurixa combines independently assessed infrastructure, encrypted data handling and application-level controls to support secure and accountable platform delivery."
            />
            <div className="security-architecture relative mt-16 overflow-hidden border border-white/10 bg-[#071322]/70">
              <CornerTicks />
              <div className="security-architecture__grid" aria-hidden="true" />
              {protectionLayers.map((layer, index) => (
                <motion.article
                  {...reveal}
                  key={layer.number}
                  className="security-layer"
                >
                  <div className="security-layer__meta">
                    <span className="security-layer__number font-mono tracking-[0.3em] text-[#D7B35F]">
                      {layer.number}
                    </span>
                    <p className="security-layer__label font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#5EDDE8]">
                      {layer.label}
                    </p>
                  </div>
                  <div className="security-layer__connector" aria-hidden="true">
                    <span className="security-layer__spine" />
                    <span className={`security-layer__node security-layer__node--${index + 1}`} />
                    <span className="security-layer__branch" />
                    {index === 0 && <span className="security-layer__signal" />}
                  </div>
                  <div className="security-layer__content">
                    <h3 className="font-display text-2xl font-light leading-tight text-white md:text-[1.75rem] lg:text-3xl">
                      {layer.title}
                    </h3>
                    <p className="mt-4 max-w-[43rem] text-sm font-light leading-relaxed text-[#9CA3AF] md:text-base">
                      {layer.description}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:py-32">
          <SectionHeader
            eyebrow="AML/CTF & Customer Due Diligence"
            title="Due Diligence in Motion."
            description="Aurixa supports structured AML/CTF and customer due diligence workflows throughout the client lifecycle. Information, responsibilities, reviews and operational records remain connected within one controlled process."
          />
          <div className="relative mt-16 border-y border-white/10 bg-[#081426]/45 lg:grid lg:grid-cols-4">
            <CornerTicks />
            <div
              aria-hidden="true"
              className="absolute bottom-8 left-[1.85rem] top-8 w-px bg-[#00A8B5]/60 lg:bottom-auto lg:left-8 lg:right-8 lg:top-[3.15rem] lg:h-px lg:w-auto"
            />
            <SystemSignal />
            {diligenceStages.map((stage, index) => (
              <motion.article
                {...reveal}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                key={stage.number}
                className="relative min-w-0 py-8 pl-16 pr-6 lg:border-r lg:border-white/10 lg:px-7 lg:pb-11 lg:pt-20 lg:last:border-r-0 xl:px-9"
              >
                <span className="absolute left-[1.55rem] top-10 grid h-3 w-3 place-items-center rounded-full border border-[#D7B35F] bg-[#081426] shadow-[0_0_10px_#C89B3C] lg:left-7 lg:top-[2.8rem]" />
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#5EDDE8]">
                  {stage.number} {stage.title}
                </p>
                <h3 className="mt-6 font-display text-3xl font-light text-white">
                  {stage.title}
                </h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#D7B35F]">
                  {stage.subtitle}
                </p>
                <p className="mt-5 text-sm font-light leading-relaxed text-[#9CA3AF]">
                  {stage.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#0B162C]/25 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <SectionHeader
              eyebrow="Information Governance"
              title="Clear Policies. Defined Responsibilities."
              description="Privacy practices and platform terms provide a clear framework for how information is handled and how the Aurixa environment may be accessed and used."
            />
            <div className="relative mt-16 grid overflow-hidden border border-white/10 bg-[#081426]/70 lg:grid-cols-2">
              <CornerTicks />
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-0 hidden h-full w-px bg-gradient-to-b from-[#00A8B5]/15 via-[#C89B3C]/60 to-[#00A8B5]/15 lg:block"
              />
              <motion.article
                {...reveal}
                className="relative flex flex-col items-start border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:p-14"
              >
                <div className="flex w-full items-center justify-between gap-4">
                  <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.22em] text-[#5EDDE8]">
                    Privacy & Information Handling
                  </p>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[#00A8B5] shadow-[0_0_10px_#00A8B5]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-7 font-display text-3xl font-light text-white md:text-4xl">
                  Privacy, Explained Clearly.
                </h3>
                <p className="mt-6 font-light leading-relaxed text-[#9CA3AF]">
                  Aurixa’s Privacy Policy explains how personal information may
                  be collected, used, protected and disclosed. It also outlines
                  user rights and the available processes for privacy enquiries,
                  access requests and correction requests.
                </p>
                <LegalLink href={PRIVACY_POLICY_URL}>
                  View Privacy Policy
                </LegalLink>
              </motion.article>
              <motion.article
                {...reveal}
                className="relative flex flex-col items-start p-7 sm:p-10 lg:p-14"
              >
                <div className="flex w-full items-center justify-between gap-4">
                  <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.22em] text-[#D7B35F]">
                    Platform Terms & Responsibilities
                  </p>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full border border-[#C89B3C]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-7 font-display text-3xl font-light text-white md:text-4xl">
                  Clear Terms for Platform Use.
                </h3>
                <p className="mt-6 font-light leading-relaxed text-[#9CA3AF]">
                  Aurixa’s Terms and Conditions define the rules governing
                  platform access, account responsibilities, permitted use,
                  subscriptions, intellectual property, service availability and
                  termination.
                </p>
                <LegalLink href="">View Terms & Conditions</LegalLink>
              </motion.article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:py-32">
          <SectionHeader
            eyebrow="Shared Governance"
            title="Structured Systems. Clear Responsibility."
            description="Aurixa provides the operational structure needed to organise compliance-related workflows, controls and records. Each organisation remains responsible for understanding its obligations, maintaining its internal compliance program and determining how Aurixa should be applied within its business."
          />
          <div className="relative mt-16 grid border border-[#C89B3C]/25 bg-gradient-to-br from-[#C89B3C]/5 via-[#081426]/80 to-[#00A8B5]/5 md:grid-cols-2">
            <CornerTicks />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 hidden h-full w-px bg-white/10 md:block"
            />
            {responsibilities.map((responsibility, index) => (
              <motion.article
                {...reveal}
                key={responsibility.label}
                className={`relative p-7 sm:p-10 lg:p-14 ${index === 0 ? "border-b border-white/10 md:border-b-0" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#00A8B5] shadow-[0_0_10px_#00A8B5]" : "bg-[#C89B3C] shadow-[0_0_10px_#C89B3C]"}`}
                  />
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-white">
                    {responsibility.label}
                  </h3>
                </div>
                <ul className="mt-8 space-y-4">
                  {responsibility.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-4 text-sm font-light text-[#B1B8C5] sm:text-base"
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 ${index === 0 ? "text-[#5EDDE8]" : "text-[#D7B35F]"}`}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-32 sm:px-6">
          <motion.div
            {...reveal}
            className="relative overflow-hidden border border-[#00A8B5]/30 bg-[#081426] px-6 py-14 text-center sm:px-10 md:p-20"
          >
            <CornerTicks />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-16 w-px bg-gradient-to-b from-[#C89B3C] to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-[#00A8B5]/50 to-transparent"
            />
            <div className="relative">
              <Eyebrow centred>Operational Confidence</Eyebrow>
              <h2 className="mx-auto mt-7 max-w-4xl font-display text-4xl font-light leading-tight text-white md:text-6xl">
                Bring Greater Structure to Compliance Operations.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-[#9CA3AF] md:text-lg">
                Connect security, due diligence, information governance and
                operational responsibility within one structured Aurixa
                environment.
              </p>
              <Link
                to="/contact"
                className="group mt-10 inline-flex max-w-full items-center rounded-sm bg-[#00A8B5] px-7 py-3 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_0_50px_-10px] shadow-[#00A8B5]/70 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] sm:px-8 sm:tracking-[0.25em]"
              >
                Join Waitlist
                <ArrowRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
