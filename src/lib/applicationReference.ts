/**
 * The application reference issued at Stage 1, e.g. `AX-7Q2M4L9XZ1`.
 *
 * These rules were written twice — once for the Stage 2 resume form and once
 * for the Stage 3 scheduler — and they now gate access to a page, so they live
 * in one place. Two copies of a security-relevant pattern is one copy too many.
 *
 * The reference is ten characters of `[A-Z0-9]` after the prefix: large enough
 * that guessing one is not a practical attack, small enough that people read it
 * off a screen and type it back with the wrong case and stray spaces. Every
 * function here is total and pure — nothing throws, nothing touches the network.
 */

/** The canonical form. Anchored, so a longer string never partially matches. */
export const APPLICATION_REFERENCE_PATTERN = /^AX-[A-Z0-9]{10}$/;

/** The reference body without its prefix. */
const BODY_PATTERN = /^[A-Z0-9]{10}$/;

/** Characters that are part of a reference; everything else is noise. */
const NOISE = /[^A-Z0-9]/g;

export function isApplicationReference(value: unknown): value is string {
  return typeof value === "string" && APPLICATION_REFERENCE_PATTERN.test(value);
}

/**
 * Cleans up what the applicant typed as they type it: upper case, no spaces,
 * and the `AX-` prefix supplied for them. People copy the reference out of an
 * email, so it arrives with stray spaces, lower case, or no prefix at all.
 */
export function formatReferenceInput(value: string): string {
  const cleaned = String(value ?? "").toUpperCase().replace(NOISE, "");
  const body = cleaned.startsWith("AX") ? cleaned.slice(2) : cleaned;
  return body ? `AX-${body.slice(0, 10)}` : cleaned.startsWith("AX") ? "AX-" : "";
}

/** Normalises a reference for submission, or "" when it is not a valid one. */
export function normaliseReference(value: string): string {
  const cleaned = String(value ?? "").toUpperCase().replace(NOISE, "");
  const body = cleaned.startsWith("AX") ? cleaned.slice(2) : cleaned;
  if (!BODY_PATTERN.test(body)) return "";
  const reference = `AX-${body}`;
  return APPLICATION_REFERENCE_PATTERN.test(reference) ? reference : "";
}

/**
 * Reads the reference an Aurixa email links with (`?ref=AX-...`).
 *
 * The link is a convenience, not proof of anything: it only saves the applicant
 * retyping the reference. Whatever reads this still has to check the reference
 * against the server before it means access to anything.
 */
export function readReferenceFromUrl(url: URL | { searchParams: URLSearchParams }): string {
  const raw = url.searchParams.get("ref") ?? url.searchParams.get("reference") ?? "";
  return normaliseReference(raw);
}
