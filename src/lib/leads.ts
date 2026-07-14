/**
 * Mission Control lead-capture client.
 *
 * The waitlist form's primary pipeline is unchanged: Make.com webhook →
 * Airtable. After that webhook succeeds, we ALSO mirror the same payload into
 * Mission Control (fire-and-forget) so operators see the lead in the /leads
 * console and get a realtime notification the moment it comes in.
 *
 * Mission Control dedupes on (corporateEmail + submittedAt), so if the
 * Make.com scenario is also configured to forward the lead server-to-server,
 * the double delivery still lands exactly once.
 *
 * This mirror must NEVER affect the visitor's experience — failures are
 * swallowed (logged to the console only) and the submission result shown to
 * the user reflects the Make.com webhook alone.
 */

const MISSION_CONTROL_URL = (
  (import.meta.env.VITE_MISSION_CONTROL_URL as string | undefined) ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");

export const MISSION_CONTROL_LEAD_CAPTURE_URL = `${MISSION_CONTROL_URL}/api/public/leads/capture`;

export function mirrorLeadToMissionControl(payload: Record<string, unknown>): void {
  try {
    void fetch(MISSION_CONTROL_LEAD_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Let the request outlive the page if the visitor navigates away.
      keepalive: true,
    }).catch((error) => {
      console.warn("Mission Control lead mirror failed (non-blocking)", error);
    });
  } catch (error) {
    console.warn("Mission Control lead mirror failed (non-blocking)", error);
  }
}
