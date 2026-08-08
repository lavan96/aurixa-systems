// Client & CRM, and Operations.
import type { DocsSection } from "./docsTypes.ts";

export const CLIENT_SECTIONS: DocsSection[] = [
  // ───────────────────────────── Client & CRM ────────────────────────────────
  {
    slug: "client-management",
    title: "Client Management",
    summary: "The client record — every tab, what belongs in it, and how the parts connect.",
    group: "Client & CRM",
    moduleSlug: null,
    guideSectionId: "client-management",
    readMinutes: 14,
    blocks: [
      {
        kind: "prose",
        text:
          "The client record is the spine of the platform. Reports are generated from it, deals hang off it, compliance records reference it, and the portal shows the client their own slice of it. Time spent keeping a client record complete pays back everywhere else, because every downstream calculation reads from here.",
      },
      {
        kind: "subsection",
        title: "Creating and organising clients",
        blocks: [
          {
            kind: "steps",
            items: [
              "Create the client from the Clients list, from an inbound lead, or by importing a batch under Data Import.",
              "Complete the Personal tab first — name, contact details, date of birth and residency. Several downstream calculations depend on these.",
              "Add additional contacts for partners and co-borrowers. A co-borrower recorded here is included in borrowing capacity rather than treated as a separate client.",
              "Set the client's status and assign an owner so the record appears on the right person's Overview.",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "Clients are archived, never hard-deleted, because reports and compliance records reference them. Archiving removes a client from working views while keeping the history intact.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "The tabs",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Overview", detail: "The summary view — position at a glance, recent activity and outstanding actions." },
              { name: "Personal", detail: "Identity and contact detail, residency and marital status. Feeds compliance and lending calculations." },
              { name: "Properties", detail: "Current holdings with value, debt, rent and purchase history. The basis of portfolio analysis." },
              { name: "Employment", detail: "Employer, role, tenure and income type. Lenders treat PAYG, self-employed and contract income differently, and so does the capacity model." },
              { name: "Financials", detail: "Income, expenses, assets and liabilities — the full position that borrowing capacity is computed from." },
              { name: "Reports", detail: "Everything generated for this client, with version history." },
              { name: "Sent Reports", detail: "What was actually delivered, through which channel, and whether it was opened." },
              { name: "Requests", detail: "Report requests raised by or for this client." },
              { name: "Notes", detail: "Free-text record of conversations and decisions, timestamped and attributed." },
              { name: "Reminders", detail: "Follow-ups against this client, feeding your Overview and notifications." },
              { name: "Client Forms", detail: "Structured data collection sent to the client to complete themselves." },
              { name: "Files", detail: "Documents held against the client, with controlled access." },
              { name: "Activity / Documents", detail: "The chronological audit trail of what happened on this record and who did it." },
              { name: "Portal Messages", detail: "Two-way messaging with the client through their portal login." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Scale-tier tabs",
        blocks: [
          {
            kind: "prose",
            text:
              "Higher tiers add tabs to the same record rather than creating a separate screen: Deals, Send To Finance, Portfolio Analysis, Send Portfolio To Client, Send Agreement, Conversations, Appointments, Finance Messages, Borrowing Capacity and AI. Each is documented in its own section, and each is gated independently — a tab you cannot see is a module your plan does not include.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Working with the record",
        blocks: [
          {
            kind: "list",
            items: [
              "Review — a structured completeness check that flags what is missing before you generate anything",
              "Download Client Details PDF — the full position as a document, for file notes or a lender",
              "Portal Access — invite the client to their own login, or revoke it",
              "View As Client — see exactly what the client sees in their portal, which is the only reliable way to check before inviting them",
            ],
          },
          {
            kind: "note",
            tone: "tip",
            text:
              "Run Review before generating a first report for a new client. It takes seconds and catches the missing-income-record problem that otherwise surfaces as a confusing number in front of the client.",
          },
        ],
      },
    ],
  },
  {
    slug: "client-forms",
    title: "Client Forms",
    summary: "Structured data collection sent to clients, and how responses land on the record.",
    group: "Client & CRM",
    moduleSlug: "client-forms",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Client Forms replaces the emailed spreadsheet. You send a structured form, the client completes it in their own time, and the answers land directly on their record as typed data rather than as an attachment somebody has to re-key.",
      },
      {
        kind: "steps",
        title: "Sending a form",
        items: [
          "Open the client and choose Client Forms.",
          "Select the form template — fact find, expense breakdown, property detail, or a template your workspace has defined.",
          "Pre-fill what you already know. The client sees existing data and corrects it rather than starting from a blank page, which materially improves completion.",
          "Send. The client receives a secure link; no login is required unless your workspace requires one.",
          "Review the response. Changed values are highlighted against what was there before, so you approve the delta rather than re-reading everything.",
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Responses do not overwrite the client record automatically. A human reviews and accepts them, because a client mistyping an income figure should not silently change a borrowing calculation.",
      },
    ],
  },
  {
    slug: "borrowing-capacity",
    title: "Borrowing Capacity",
    summary: "Modelling what a client can borrow, across lenders and scenarios.",
    group: "Client & CRM",
    moduleSlug: "borrowing-capacity",
    guideSectionId: "borrowing-capacity",
    readMinutes: 10,
    blocks: [
      {
        kind: "prose",
        text:
          "Borrowing capacity is the constraint that determines what advice is even possible. The module computes it from the client's recorded financial position using lender-style servicing assumptions, and lets you model how it moves under different scenarios.",
      },
      {
        kind: "subsection",
        title: "What drives the calculation",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Income", detail: "By type and with the shading lenders apply — overtime, bonus, rental and self-employed income are not treated as salary." },
              { name: "Existing commitments", detail: "Current loans at assessment rate, not actual rate, which is where most client estimates go wrong." },
              { name: "Living expenses", detail: "The greater of declared expenses and the applicable household benchmark." },
              { name: "Credit facilities", detail: "Card and line-of-credit limits assessed on limit rather than balance." },
              { name: "Dependants and household", detail: "Household composition, which moves the benchmark materially." },
              { name: "Assessment buffer", detail: "The serviceability buffer applied over the actual rate." },
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Scenarios",
        blocks: [
          {
            kind: "prose",
            text:
              "A single capacity figure is less useful than the shape of the constraint. Scenarios let you model the same client under different structures and see which lever actually moves the number.",
          },
          {
            kind: "list",
            items: [
              "Consolidating or closing credit facilities",
              "Adding or removing a co-borrower",
              "Different loan structures and terms",
              "Income changes — a pay rise, a partner returning to work, a new rental",
              "Interest-rate movement against the assessment buffer",
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "Capacity computed here is indicative and lender policy varies. It is a planning tool for advice conversations, not a pre-approval, and the report disclaimer should say so plainly.",
          },
        ],
      },
      {
        kind: "prose",
        text:
          "Capacity is recomputed as the client's recorded position changes, so a record kept current gives a current answer. Where the Lender Intelligence module is enabled, capacity can be compared across specific lender policies rather than a single generic assumption.",
      },
    ],
  },
  {
    slug: "portfolio-analysis",
    title: "Portfolio Analysis",
    summary: "Analysing a client's whole holding — concentration, performance and equity position.",
    group: "Client & CRM",
    moduleSlug: "portfolio-analysis",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "Individual property analysis misses portfolio-level risk. A client with four properties in one suburb has a concentration problem no single-property report will reveal. Portfolio Analysis looks at the holding as a whole.",
      },
      {
        kind: "list",
        title: "What it assesses",
        items: [
          "Total position — value, debt, equity and loan-to-value across the portfolio",
          "Geographic and asset-type concentration",
          "Aggregate cash flow, including which properties subsidise which",
          "Usable equity available for the next acquisition",
          "Performance of each holding since acquisition",
          "Portfolio-level yield against holding cost",
        ],
      },
      {
        kind: "prose",
        text:
          "The output supports the strategic conversation — whether to buy, hold, restructure debt or sell — rather than just describing the current state. Where Send Portfolio To Client is enabled, the analysis can be packaged and delivered to the client directly.",
      },
    ],
  },
  {
    slug: "send-portfolio",
    title: "Send Portfolio To Client",
    summary: "Packaging portfolio analysis into a client-ready deliverable and sending it.",
    group: "Client & CRM",
    moduleSlug: "send-portfolio",
    readMinutes: 4,
    blocks: [
      {
        kind: "prose",
        text:
          "Portfolio analysis is an internal working view by default. This turns it into a branded client deliverable — with the commentary, disclaimers and presentation appropriate for something the client keeps.",
      },
      {
        kind: "steps",
        items: [
          "Run the portfolio analysis and confirm the underlying property records are current.",
          "Choose the presentation — the summary position, or the full analysis with per-property detail.",
          "Add commentary. The numbers carry the analysis; the commentary carries the advice.",
          "Send through the portal or by email. Delivery is recorded against the client record with open tracking.",
        ],
      },
    ],
  },
  {
    slug: "client-ai",
    title: "Client AI",
    summary: "AI assistance scoped to a single client's record and history.",
    group: "Client & CRM",
    moduleSlug: "client-ai",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Client AI is the assistant narrowed to one client. It can read that client's position, history, reports and notes, and answer questions about them — what changed since the last review, what is missing before a report can be generated, what the notes say about their risk appetite.",
      },
      {
        kind: "list",
        title: "Typical uses",
        items: [
          "Summarising a long note and interaction history before a meeting",
          "Identifying gaps in the record that will block a report",
          "Drafting a follow-up that reflects what was actually discussed",
          "Explaining a change in the client's computed position between two dates",
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Client AI reads only the client records your permissions already allow. It is not a way around scoping, and every interaction is attributed and logged.",
      },
    ],
  },
  {
    slug: "lender-intelligence",
    title: "Lender Intelligence",
    summary: "Lender policies, rate cards and comparing capacity across lenders.",
    group: "Client & CRM",
    moduleSlug: "lenders",
    guideSectionId: "lender-intelligence",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Lenders differ enough that a single generic capacity figure can mislead. Lender Intelligence holds lender-specific policy and pricing so capacity, cost and suitability can be compared lender by lender.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Rate cards", detail: "Current pricing by product and loan-to-value band, tracked as it changes." },
          { name: "Policy positions", detail: "Income shading, expense benchmarks, assessment buffers and acceptable security." },
          { name: "Capacity comparison", detail: "The same client assessed under each lender's rules, showing where the spread comes from." },
          { name: "Rate alerts", detail: "Notification when a tracked lender moves pricing." },
          { name: "Favourites", detail: "The lenders your business actually uses, kept to the front." },
          { name: "Submissions", detail: "Tracking applications lodged, with status." },
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Policy data is maintained to be current but lenders change positions without notice. Confirm anything decision-critical directly with the lender.",
      },
    ],
  },
  {
    slug: "email-copilot",
    title: "Email Copilot",
    summary: "Client email in the workspace — threading, drafting and linking to records.",
    group: "Client & CRM",
    moduleSlug: "email-copilot",
    guideSectionId: "email-copilot",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Email Copilot brings client correspondence into the client record instead of leaving it in a personal mailbox where nobody else can see it. Threads are linked to clients, drafts are assisted, and the history survives staff changes.",
      },
      {
        kind: "subsection",
        title: "Connecting a mailbox",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open Settings → Integrations and connect your mail provider.",
              "Authorise. The platform requests the minimum scope needed to read and send on your behalf.",
              "Choose which folders are in scope. Personal mail can be excluded entirely.",
              "Confirm the linking rules — how inbound mail is matched to client records.",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Working with mail",
        blocks: [
          {
            kind: "list",
            items: [
              "Threads matched to clients automatically by address, with manual linking for the ones that need it",
              "Unlinked mail queue, so nothing matched incorrectly is silently lost",
              "Assisted drafting that has the client's context available",
              "Scheduled sends, for writing now and sending at a sensible hour",
              "Snippets for the replies you write repeatedly",
              "Attachments stored against the client record",
            ],
          },
          {
            kind: "note",
            tone: "compliance",
            text:
              "Mail visibility follows client scoping: staff see correspondence for clients they are entitled to. Connecting a mailbox does not publish your inbox to the workspace.",
          },
        ],
      },
    ],
  },
  {
    slug: "conversations",
    title: "Conversations",
    summary: "Unified messaging across channels, threaded against the client.",
    group: "Client & CRM",
    moduleSlug: null,
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Conversations consolidates messaging channels into one thread per client, so the history of what was said does not depend on which channel it was said through.",
      },
      {
        kind: "list",
        items: [
          "Portal messages from the client's login",
          "SMS and messaging-platform conversations where connected",
          "Inbound and outbound history in one chronological view",
          "Attribution — who on your side replied, and when",
        ],
      },
    ],
  },
  {
    slug: "call-logs",
    title: "Call Logs",
    summary: "Call recording, transcription, analytics and alerting.",
    group: "Client & CRM",
    moduleSlug: "call-logs",
    guideSectionId: "call-logs",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "Call Logs captures calls with their transcripts and analysis, linked to the client where the number matches. It supports both quality review and the practical need to remember what was agreed on a call three weeks ago.",
      },
      {
        kind: "fields",
        title: "What a call record holds",
        rows: [
          { name: "Participants and duration", detail: "Who called whom, when, and for how long." },
          { name: "Recording", detail: "Audio, accessible only to users with call-log permission." },
          { name: "Transcript", detail: "Searchable text, which is what makes historic calls actually findable." },
          { name: "Summary", detail: "The key points and any commitments made." },
          { name: "Sentiment and flags", detail: "Analysis output, used for coaching and escalation rather than as a verdict." },
          { name: "Client link", detail: "Matched to the client record where the number is recognised." },
        ],
      },
      {
        kind: "subsection",
        title: "Alert rules",
        blocks: [
          {
            kind: "prose",
            text:
              "Alert rules watch for conditions worth a human's attention — a flagged sentiment, a missed call from a client mid-deal, an unusually short call on an important account — and raise a notification rather than relying on someone reviewing every call.",
          },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Call recording carries legal obligations that vary by jurisdiction, including consent and notification. Configure recording to match your obligations; the platform enforces access control, not your consent policy.",
      },
    ],
  },

  // ────────────────────────────── Operations ─────────────────────────────────
  {
    slug: "deal-pipeline",
    title: "Deal Pipeline",
    summary: "Tracking deals through stages, with dates, risk and commission.",
    group: "Operations",
    moduleSlug: "deal-pipeline",
    guideSectionId: "deal-pipeline",
    readMinutes: 11,
    blocks: [
      {
        kind: "prose",
        text:
          "The Deal Pipeline tracks transactions from first commitment to settlement and beyond. It is the forecasting surface and the operational checklist at once: stages drive the forecast, and the critical dates attached to each deal drive the work.",
      },
      {
        kind: "subsection",
        title: "Stages",
        blocks: [
          {
            kind: "prose",
            text:
              "Stages are configurable to your process. What matters is that a stage change is an event with a date, not just a column move — the platform records when each transition happened, which is what makes velocity and conversion analysis meaningful.",
          },
          {
            kind: "list",
            items: [
              "Stage progression with completion tracking per stage",
              "Time-in-stage, surfacing deals that have stalled",
              "Conversion rates between stages",
              "Pipeline velocity, so a forecast reflects how deals actually move rather than how you hope they will",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Critical dates",
        blocks: [
          {
            kind: "fields",
            rows: [
              { name: "Finance clause", detail: "The date finance must be confirmed. Missing it is the most expensive administrative failure in the process." },
              { name: "Cooling-off", detail: "Expiry of the cooling-off period." },
              { name: "Building and pest", detail: "Inspection and satisfaction dates." },
              { name: "Settlement", detail: "The settlement date with countdown, and warning as it approaches." },
              { name: "Build milestones", detail: "For construction, the progress payment schedule and its stages." },
            ],
          },
          {
            kind: "note",
            tone: "warning",
            text:
              "Deal dates drive notifications. A date left blank produces no warning — the absence of an alert is not confirmation that nothing is due.",
          },
        ],
      },
      {
        kind: "subsection",
        title: "Risk and commission",
        blocks: [
          {
            kind: "list",
            items: [
              "Risk status per deal, with the reason recorded",
              "Stale-deal detection where nothing has moved",
              "Commission forecast from deals in flight",
              "Commission actuals once settled, reconciled against forecast",
              "Clawback monitoring, so a clawback window is tracked rather than discovered",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Construction deals",
        blocks: [
          {
            kind: "prose",
            text:
              "Construction transactions carry a progress payment schedule — deposit, slab, frame, lock-up, fixing and completion — with builder invoices tracked against each stage. Where the Builder Portal is enabled, the builder updates progress directly rather than by email.",
          },
        ],
      },
    ],
  },
  {
    slug: "reminders",
    title: "Reminders",
    summary: "Follow-ups against clients and deals, assignment and escalation.",
    group: "Operations",
    moduleSlug: null,
    guideSectionId: "reminders",
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "Reminders are the platform's answer to the follow-up that lives in someone's head. They attach to a client or deal, carry an owner and a date, and surface on Overview and in notifications as they come due.",
      },
      {
        kind: "list",
        items: [
          "Created manually, from a call or note, or automatically by a workflow",
          "Assigned to a specific user, so ownership is unambiguous",
          "Due dates with overdue escalation",
          "Bulk creation across a set of clients for a campaign or review cycle",
          "Completion recorded with who closed it and when",
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Follow-up dates on the client record and reminders serve different purposes: the follow-up date is the relationship cadence, a reminder is a specific task. Using reminders for cadence produces a permanently red list.",
      },
    ],
  },
  {
    slug: "checklists",
    title: "Checklists",
    summary: "Repeatable process templates instantiated against clients and deals.",
    group: "Operations",
    moduleSlug: null,
    guideSectionId: "checklists",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Checklists turn the process that lives in a senior staff member's head into something a new starter can execute. A template is defined once, then instantiated against a client or deal, where it becomes a working list with its own state.",
      },
      {
        kind: "subsection",
        title: "Templates",
        blocks: [
          {
            kind: "list",
            items: [
              "Sections and items, ordered as the process actually runs",
              "Required versus optional items",
              "Guidance text per item, so the instruction travels with the task",
              "Versioning — improving a template does not rewrite checklists already in flight",
            ],
          },
        ],
      },
      {
        kind: "subsection",
        title: "Instances",
        blocks: [
          {
            kind: "prose",
            text:
              "An instance is a live checklist against a specific client or deal. Items are ticked with attribution and timestamp, progress is visible, and the completed instance stays on the record as evidence the process was followed — which is the part that matters in a compliance review.",
          },
        ],
      },
    ],
  },
  {
    slug: "game-plan",
    title: "Game Plan",
    summary: "Long-horizon client strategy — phases, milestones, KPIs and actions.",
    group: "Operations",
    moduleSlug: null,
    guideSectionId: "game-plan",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "A Game Plan is the multi-year strategy for a client, held as a living document rather than a PDF written once and forgotten. It structures the intent — where the client is going, in what phases, measured how.",
      },
      {
        kind: "fields",
        title: "Structure",
        rows: [
          { name: "Phases", detail: "Sequential stages of the strategy, each with its own timeframe and objective." },
          { name: "Milestones", detail: "Concrete achievements within a phase — a purchase, an equity threshold, a refinance." },
          { name: "KPIs", detail: "The measures that indicate whether the plan is on track, with current and target values." },
          { name: "Actions", detail: "Specific tasks, assignable and completable, that move a phase forward." },
          { name: "Notes", detail: "The rationale — why this strategy, and what was agreed with the client." },
        ],
      },
      {
        kind: "prose",
        text:
          "The value is in the review cycle. Because KPIs carry current values, a plan can be revisited against reality — which is a materially better annual review conversation than reprinting the original document.",
      },
    ],
  },
  {
    slug: "agreements",
    title: "Agreements",
    summary: "Generating, sending and tracking agreements through to signature.",
    group: "Operations",
    moduleSlug: "agreements",
    guideSectionId: "agreements",
    readMinutes: 8,
    blocks: [
      {
        kind: "prose",
        text:
          "Agreements handles the documents that formalise the relationship — engagement terms, agency agreements, fee disclosures — from generation through signature to the executed copy on file.",
      },
      {
        kind: "steps",
        title: "The lifecycle",
        items: [
          "Choose the agreement template. Templates carry your terms, branding and the clauses your licensing requires.",
          "Generate against the client. Client details, fees and property specifics are merged from the record rather than typed.",
          "Review before sending. The generated document is editable up to the point it is sent.",
          "Send for signature through the connected e-signature provider.",
          "Track progress — sent, viewed, partially signed, executed — with each event recorded.",
          "The executed document lands on the client record automatically and is retained.",
        ],
      },
      {
        kind: "fields",
        title: "Tracking",
        rows: [
          { name: "Status", detail: "Draft, sent, viewed, signed, executed, declined or expired." },
          { name: "Signature events", detail: "Each signatory's action with timestamp — the evidence trail if execution is ever questioned." },
          { name: "Reminders", detail: "Automatic follow-up on unsigned agreements." },
          { name: "Expiry", detail: "Agreements that lapse unsigned are closed rather than left ambiguous." },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Agreement templates carry legal weight. Changes should go through whatever review your business requires — the platform versions templates so you can evidence which wording a given client actually signed.",
      },
    ],
  },
  {
    slug: "agreement-centre",
    title: "Agreement Centre",
    summary: "Partner agreements end to end — internal review, portal issuance, execution and the executed vault.",
    group: "Operations",
    moduleSlug: "agreements",
    guideSectionId: "partner-network",
    readMinutes: 9,
    blocks: [
      {
        kind: "prose",
        text:
          "The Agreement Centre manages the agreements between your business and its finance partners — the Strategic Property Referral Agreement (the partner refers clients to you) and the Finance Referral & Commission Agreement (you refer clients to the partner). The legal wording of both templates is locked; you configure the parties, the white-label branding and the commercial schedule, never the clauses.",
      },
      {
        kind: "steps",
        title: "The lifecycle",
        items: [
          "Create from a template. The direction of each agreement — who refers to whom, and who issues it — is shown before you select.",
          "Configure the variables the template leaves open: parties, licence details, the commercial schedule, notice periods. Your organisation's details prefill from settings.",
          "Review internally. An agreement cannot be issued until it passes validation — every field the document requires, listed with a jump link to fix it.",
          "Issue into the Finance Partner Portal, or download it as PDF or DOCX to manage outside the platform. Both paths stay available throughout.",
          "The partner reviews inside their portal, accepts, or lodges a structured change request against a named section — they can never edit the document itself.",
          "Execution is a typed electronic signature: the partner signs, you counter-sign, and the fully executed master is generated and stored automatically. No manual re-upload, ever.",
        ],
      },
      {
        kind: "fields",
        title: "What the record keeps",
        rows: [
          { name: "Versions", detail: "Every issued version is frozen — field values, branding and the template's content fingerprint. A reissue after a change request is a new version with a field-level diff; nothing sent externally is ever silently overwritten." },
          { name: "Change requests", detail: "The partner's requests, the section each one names, and how each was answered." },
          { name: "Signatures", detail: "Signatory, capacity, method and timestamp for each party, per version." },
          { name: "Activity", detail: "Created, reviewed, issued, viewed, accepted, signed, counter-signed, executed, downloaded — the full timeline, mirrored into the tamper-evident compliance ledger." },
        ],
      },
      {
        kind: "note",
        tone: "compliance",
        text:
          "Executed agreements are immutable: the master copy is written once, downloads are served from that single stored document, and every download of it is an audited access event. Varying an executed agreement means a new version through the same review-and-issue path, with the history preserved.",
      },
    ],
  },
  {
    slug: "marketing-analytics",
    title: "Marketing & Attribution",
    summary: "Lead sources, campaign performance and what actually produces clients.",
    group: "Operations",
    moduleSlug: "marketing",
    guideSectionId: "marketing-analytics",
    readMinutes: 7,
    blocks: [
      {
        kind: "prose",
        text:
          "Marketing attribution connects spend to outcome. Because leads, clients and deals all live in the same system, attribution can follow a lead from first touch through to settled commission rather than stopping at form submission.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Lead source", detail: "Where each client originated, captured at creation and retained." },
          { name: "Attribution", detail: "First-touch and last-touch, because campaigns that open relationships differ from those that close them." },
          { name: "Campaign performance", detail: "Leads, conversion rate, deals and revenue per campaign." },
          { name: "Funnel", detail: "Progression from lead through client to deal, showing where drop-off occurs." },
          { name: "Marketing reports", detail: "Scheduled reporting on the above, distributed to whoever needs it." },
        ],
      },
      {
        kind: "note",
        tone: "tip",
        text:
          "Attribution is only as good as the source captured at creation. Enforcing lead source as a required field is the single change that most improves this module's usefulness.",
      },
    ],
  },
  {
    slug: "automation",
    title: "Automation",
    summary: "Scheduled and triggered work that runs without anyone remembering to run it.",
    group: "Operations",
    moduleSlug: null,
    guideSectionId: "automation",
    readMinutes: 6,
    blocks: [
      {
        kind: "prose",
        text:
          "Automation covers the recurring work the platform can do unattended — scheduled report generation, periodic data refreshes, review cycles and triggered follow-ups.",
      },
      {
        kind: "list",
        title: "What can be automated",
        items: [
          "Auto-report switches — regenerating a client's reporting on a schedule",
          "Scheduled market data refreshes",
          "Review-cycle reminders raised automatically at an interval",
          "Triggered actions on deal stage changes",
          "Scheduled marketing report distribution",
        ],
      },
      {
        kind: "note",
        tone: "warning",
        text:
          "Automated actions run with the permissions of the user who configured them, and every run is logged. An automation that starts failing raises a notification rather than failing silently.",
      },
    ],
  },
  {
    slug: "commission-ledger",
    title: "Commission Ledger",
    summary: "Commission forecast, actuals, payouts and clawback tracking.",
    group: "Operations",
    moduleSlug: null,
    readMinutes: 5,
    blocks: [
      {
        kind: "prose",
        text:
          "The commission ledger is the financial reconciliation layer over the pipeline: what is expected, what has been received, what is owed onward, and what is at risk of clawback.",
      },
      {
        kind: "fields",
        rows: [
          { name: "Forecast", detail: "Expected commission from deals in flight, weighted by stage." },
          { name: "Actuals", detail: "Received commission, reconciled against the forecast that preceded it." },
          { name: "Payouts", detail: "Onward payments to advisors or referrers, with an audit record." },
          { name: "Clawback", detail: "Deals inside a clawback window, so an early repayment is anticipated rather than discovered." },
        ],
      },
    ],
  },
];
