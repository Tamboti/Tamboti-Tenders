// Thin GA4 wrapper. GA4's default SPA auto-tracking only fires once on load,
// so route changes are tracked manually via RouteTracker + trackPageview().
// No-ops outside production or when VITE_GA_MEASUREMENT_ID isn't set, so
// local dev never pollutes real analytics data.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

const enabled = () => import.meta.env.PROD && !!MEASUREMENT_ID;

let initialized = false;

export const initAnalytics = () => {
  if (!enabled() || initialized) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  // send_page_view: false — RouteTracker fires the initial and every
  // subsequent pageview manually via trackPageview().
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });
};

export const trackPageview = (path: string) => {
  if (!enabled() || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path });
};

export const trackEvent = (name: string, params?: Record<string, unknown>) => {
  if (!enabled() || !window.gtag) return;
  window.gtag("event", name, params);
};
