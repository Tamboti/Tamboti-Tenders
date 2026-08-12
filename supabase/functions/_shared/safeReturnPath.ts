// Whitelists the in-app paths Stripe is allowed to redirect back to after
// checkout/the billing portal — never interpolate a client-supplied path
// straight into a redirect URL (open-redirect risk), even though APP_URL
// itself is fixed server-side.
const ALLOWED_RETURN_PATHS = ["/pricing", "/portal/billing"];

export function safeReturnPath(path: unknown, fallback = "/pricing"): string {
  return typeof path === "string" && ALLOWED_RETURN_PATHS.includes(path) ? path : fallback;
}
