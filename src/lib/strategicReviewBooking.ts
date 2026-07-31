/**
 * Stage 3 strategic review scheduling helpers.
 *
 * Three concerns live here so the page component stays presentational and the
 * rules stay testable without a browser:
 *
 *   1. Resolving the booking calendar URL. The embed URL is configuration, so
 *      it is validated before it ever reaches an iframe `src`: HTTPS only, no
 *      embedded credentials, and the host must belong to Microsoft Bookings.
 *      A misconfigured value fails closed to "no calendar" rather than framing
 *      an arbitrary origin.
 *   2. Resolving the applicant's application reference. The reference is
 *      already known to the applicant (it is issued with their application and
 *      repeated in the scheduling email), so it may travel in the link, but it
 *      is validated against the issued format and never trusted as access.
 *   3. Describing the visitor's own time zone, so the page can state the times
 *      it is showing instead of asserting a fixed offset.
 */

/** Hosts that may be framed as the booking calendar. */
export const BOOKING_HOST_ALLOWLIST = [
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.live.com",
  "bookings.microsoft.com",
  "book.ms",
] as const;

/** Issued application references, e.g. `AX-7Q2M4L9XZ1`. */
const APPLICATION_REFERENCE_PATTERN = /^AX-[A-Z0-9]{10}$/;

export const REVIEW_REFERENCE_STORAGE_KEY = "aurixa_strategic_review_reference";

export type BookingPrefill = {
  name?: string;
  email?: string;
};

const isAllowedBookingHost = (hostname: string): boolean =>
  BOOKING_HOST_ALLOWLIST.some((host) => hostname === host || hostname.endsWith(`.${host}`));

const cleanParam = (value: string | undefined): string => {
  if (typeof value !== "string") return "";
  // Strip control characters that would otherwise ride into the query string.
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
};

/**
 * Validates the configured booking URL and layers on any prefill the applicant
 * has already given us. Returns `null` when nothing safe can be framed, which
 * the page renders as "calendar not connected" rather than a broken iframe.
 */
export function resolveBookingUrl(raw: string | null | undefined, prefill: BookingPrefill = {}): string | null {
  const candidate = cleanParam(raw ?? undefined);
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!isAllowedBookingHost(url.hostname.toLowerCase())) return null;

  const name = cleanParam(prefill.name);
  const email = cleanParam(prefill.email);
  // Never overwrite a value the configured link already carries.
  if (name && !url.searchParams.has("name")) url.searchParams.set("name", name);
  if (email && !url.searchParams.has("email")) url.searchParams.set("email", email);

  return url.toString();
}

/** True when `value` matches the reference format issued with an application. */
export function isApplicationReference(value: unknown): value is string {
  return typeof value === "string" && APPLICATION_REFERENCE_PATTERN.test(value);
}

/**
 * Reads the application reference from the link, falling back to one already
 * accepted in this tab. A malformed or repeated `ref` parameter is ignored
 * rather than displayed, and any stored value that no longer parses is dropped.
 */
export function resolveApplicationReference(url: URL, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">): string {
  const supplied = url.searchParams.getAll("ref");

  if (supplied.length === 1) {
    const reference = supplied[0].trim().toUpperCase();
    if (isApplicationReference(reference)) {
      try {
        storage?.setItem(REVIEW_REFERENCE_STORAGE_KEY, reference);
      } catch {
        // Storage may be unavailable; the reference still shows this page load.
      }
      return reference;
    }
    return "";
  }

  if (supplied.length > 1) return "";

  try {
    const stored = storage?.getItem(REVIEW_REFERENCE_STORAGE_KEY) ?? null;
    if (stored === null) return "";
    if (isApplicationReference(stored)) return stored;
    storage?.removeItem(REVIEW_REFERENCE_STORAGE_KEY);
    return "";
  } catch {
    return "";
  }
}

// Zone handling lives in ./timeZone, which the scheduler shares. Re-exported
// here so callers of this module keep a single import for the page's needs.
export {
  describeTimeZone,
  formatLocalTime,
  formatUtcOffset,
  readTimeZoneId,
  type TimeZoneDescriptor,
} from "./timeZone";

import type { TimeZoneDescriptor as ZoneDescriptor } from "./timeZone";

/**
 * Builds the manual scheduling fallback used whenever the calendar cannot be
 * shown, so the applicant is never left without a way to book.
 */
export function buildSchedulingFallbackMailto(options: {
  address: string;
  reference?: string;
  timeZone?: ZoneDescriptor;
  /** A time the applicant already picked, so they do not have to describe it again. */
  requestedTime?: string;
}): string {
  const reference = isApplicationReference(options.reference) ? options.reference : "";
  const subject = reference
    ? `Strategic review scheduling - ${reference}`
    : "Strategic review scheduling";
  const requested = options.requestedTime?.trim() ?? "";
  const lines = [
    "Hello Aurixa team,",
    "",
    "I would like to arrange my Stage 03 strategic review.",
    reference ? `Application reference: ${reference}` : "",
    options.timeZone ? `My time zone: ${options.timeZone.label} (${options.timeZone.offsetLabel})` : "",
    "",
    ...(requested ? ["The time I would like to request:", requested] : ["Suitable times for me are:", "-"]),
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "");

  return `mailto:${options.address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
