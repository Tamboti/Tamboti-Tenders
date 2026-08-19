// Free/Pro plan constants — keep these in sync with the DB triggers in
// supabase/migrations/20260805120000_add_plan_limits.sql, which are the
// actual enforcement boundary. These copies drive UI messaging/pre-checks.
export const FREE_BOOKMARK_LIMIT = 5;
export const FREE_ALERT_LIMIT = 1;
export const FREE_VISIBILITY_DAYS = 30;
export const PRO_PRICE_USD = 99;

export type BillingInterval = "monthly" | "annual";

// Annual = 2 months free (10x the monthly price), billed as one yearly charge.
export const PRO_PRICE_ANNUAL_TOTAL_USD = PRO_PRICE_USD * 10;
export const PRO_PRICE_ANNUAL_MONTHLY_EQUIVALENT_USD = PRO_PRICE_ANNUAL_TOTAL_USD / 12;
export const PRO_ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - PRO_PRICE_ANNUAL_TOTAL_USD / (PRO_PRICE_USD * 12)) * 100,
);

// True once a tender is close enough to its deadline that Free users can see
// full detail on it — Pro removes this window entirely.
export const isWithinFreeVisibilityWindow = (deadline: string | null): boolean => {
  if (!deadline) return true;
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysLeft <= FREE_VISIBILITY_DAYS;
};

// The bookmark/alert triggers raise a plain RAISE EXCEPTION (no custom
// ERRCODE), which Postgres reports as SQLSTATE P0001. handleDbError doesn't
// know this message — callers check this first and show an upgrade prompt
// instead of falling back to the generic error toast.
export const isPlanLimitError = (error: unknown): boolean =>
  (error as { code?: string } | null)?.code === "P0001";

// Single source of truth for what each plan actually does, so Pricing and
// Billing can't drift into listing different features for the same plan
// (they did — Billing promised "Priority support", which isn't a real,
// gated capability anywhere in the product). Every line here should map to
// something the code actually enforces.
export const FREE_PLAN_FEATURES = [
  "Full search & browse of all tenders",
  `Full detail once a tender is within ${FREE_VISIBILITY_DAYS} days of its deadline`,
  `Up to ${FREE_BOOKMARK_LIMIT} bookmarks`,
  `${FREE_ALERT_LIMIT} active alert`,
];

export const PRO_PLAN_FEATURES = [
  "See every tender the moment it's published - no waiting for the deadline to get close",
  "View original source postings anytime, on every tender",
  "Unlimited bookmarks",
  "Unlimited alerts",
];
