import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position on navigation by itself. This
// only resets window scroll — the public site's model (PublicLayout scrolls
// the window). AppLayout (the dashboard) deliberately isn't touched here: it
// scrolls inside its own <main class="overflow-y-auto">, and it already has
// its own fade transition (AnimatePresence keyed on pathname) — forcing that
// container to snap to 0 mid-fade read as a jarring reload rather than a
// clean nav. Keyed on pathname only (not search) so filter/query changes on
// the same page don't jerk it back to the top.
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
};
