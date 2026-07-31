/**
 * Wires the pure booking logic to this site's backend.
 *
 * Everything configuration- or network-shaped lives here: the endpoint, the
 * optional Make.com mirror and the Mission Control mirror. `reviewBooking.ts`
 * stays free of `import.meta.env` so its rules can be tested outside a bundler.
 */

import { STOREFRONT_BASE, mirrorLeadToMissionControl } from "./leads";
import {
  buildBookingPayload,
  postBookingRequest,
  type BookingSubmissionResult,
  type BuildBookingPayloadInput,
} from "./reviewBooking";

/** Optional Make.com scenario for the booking desk; unset simply skips the mirror. */
const MAKE_BOOKING_WEBHOOK_URL = import.meta.env.VITE_MAKE_BOOKING_WEBHOOK_URL as string | undefined;

export type SubmitBookingInput = BuildBookingPayloadInput & {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Submits a requested review time. The applicant's result reflects the backend
 * call alone — the mirrors run only after it succeeded and never change it.
 */
export async function submitBookingRequest(input: SubmitBookingInput): Promise<BookingSubmissionResult> {
  const payload = buildBookingPayload(input);
  const result = await postBookingRequest({
    endpoint: `${STOREFRONT_BASE}/capture-lead`,
    payload,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
  });

  if (!result.ok) return result;

  if (MAKE_BOOKING_WEBHOOK_URL) {
    try {
      void fetch(MAKE_BOOKING_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Let the request outlive the page if the applicant navigates away.
        keepalive: true,
      }).catch((error) => console.warn("Booking webhook mirror failed (non-blocking)", error));
    } catch (error) {
      console.warn("Booking webhook mirror failed (non-blocking)", error);
    }
  }
  mirrorLeadToMissionControl(payload as unknown as Record<string, unknown>);

  return result;
}
