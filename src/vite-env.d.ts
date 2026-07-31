/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mission Control base URL — the headless billing engine behind /pricing. */
  readonly VITE_BILLING_API_URL?: string;
  /** Mission Control base URL for mirroring waitlist leads into /leads. */
  readonly VITE_MISSION_CONTROL_URL?: string;
  /** Aurixa's own lead-capture API (Supabase functions base URL). */
  readonly VITE_STOREFRONT_API_URL?: string;
  /** Supabase project URL, used to derive the functions base URL. */
  readonly VITE_SUPABASE_URL?: string;
  /**
   * Stage 1 intake badge key. One of: applications_open, priority_review_window,
   * august_2026_intake, limited_capacity, under_review, enterprise_intake.
   * Anything unrecognised or expired falls back to "Applications Under Review".
   */
  readonly VITE_INTAKE_BADGE?: string;
  /** ISO date after which the intake badge reverts to the safe default. */
  readonly VITE_INTAKE_BADGE_EXPIRES?: string;
  /** Stage 2 Business Readiness Questionnaire URL; unset hides the direct link. */
  readonly VITE_READINESS_QUESTIONNAIRE_URL?: string;
  /** Public privacy policy URL shown beside the collection notice. */
  readonly VITE_PRIVACY_POLICY_URL?: string;
  /**
   * Stage 3 Microsoft Bookings embed URL. Set only to replace the built-in
   * scheduler with a Bookings embed; must be an HTTPS Microsoft Bookings
   * address, and anything else is ignored.
   */
  readonly VITE_BOOKINGS_URL?: string;
  /** Optional Make.com scenario mirroring Stage 3 booking requests. */
  readonly VITE_MAKE_BOOKING_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
