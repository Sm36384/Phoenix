/**
 * Scrapers run only during target hub's local business hours (e.g. 9 AM – 6 PM)
 * to look like a human researcher. Prevents "night-owl bot" detection.
 */

export type HubId =
  | "Singapore"
  | "Vietnam"
  | "Hong Kong"
  | "Dubai"
  | "Riyadh"
  | "Abu Dhabi"
  | "Mumbai"
  | "Bangalore";

/** IANA timezone per hub */
export const HUB_TIMEZONES: Record<HubId, string> = {
  Singapore: "Asia/Singapore",   // SGT
  Vietnam: "Asia/Ho_Chi_Minh",
  "Hong Kong": "Asia/Hong_Kong",
  Dubai: "Asia/Dubai",           // GST
  Riyadh: "Asia/Riyadh",         // AST
  "Abu Dhabi": "Asia/Dubai",
  Mumbai: "Asia/Kolkata",
  Bangalore: "Asia/Kolkata",
};

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;

/**
 * Current local hour (0–23) in the given hub's timezone.
 */
export function getLocalHourInHub(hubId: HubId): number {
  const tz = HUB_TIMEZONES[hubId];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * True if the hub is currently within business hours (09:00–18:00 local).
 */
export function isWithinBusinessHours(hubId: HubId): boolean {
  const hour = getLocalHourInHub(hubId);
  return hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
}

/**
 * All hubs that are currently within business hours.
 */
export function getHubsInBusinessHours(): HubId[] {
  return (Object.keys(HUB_TIMEZONES) as HubId[]).filter(isWithinBusinessHours);
}

/**
 * Throws if hub is outside business hours (for strict governor).
 */
export function assertBusinessHours(hubId: HubId): void {
  if (!isWithinBusinessHours(hubId)) {
    const tz = HUB_TIMEZONES[hubId];
    throw new Error(
      `Stealth Governor: ${hubId} (${tz}) is outside business hours ${BUSINESS_START_HOUR}:00–${BUSINESS_END_HOUR}:00. Abort scrape.`
    );
  }
}
