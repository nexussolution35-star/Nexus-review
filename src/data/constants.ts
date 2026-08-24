/**
 * App-wide constants shared by the UI and (historically) the seed generator.
 * Runtime data now comes from Supabase; these are the fixed values the UI needs.
 */

export const RESTAURANT_NAME = "The Fireside Grill";
export const GOOGLE_REVIEW_URL = "https://g.page/r/fireside-grill/review";
export const GOOGLE_INVITE_MIN_COMBINED = 7;

// The demo tenant's data window. Used only for the date-range control defaults.
export const TODAY = "2026-08-22";
export const DATA_START = "2026-03-01";

export const ISSUES = [
  "Slow service",
  "Order accuracy",
  "Food quality",
  "Atmosphere",
  "Billing",
  "Cleanliness",
  "Drinks",
];

export const DEFAULT_STAFF_TEMPLATE =
  "Hi {name}, thanks for visiting {Restaurant name} today. Could you tell us how we did? Tap the link below. It takes 30 seconds and helps us serve you better.";

export const REVIEW_FOLLOWUP_HOURS = 48;
