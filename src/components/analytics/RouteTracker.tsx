import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageview } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { getAnonUserId } from "@/lib/anonUser";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";

// One row per device per day — the (device_id, visited_on) primary key means
// a repeat visit same day just hits the unique constraint, which we swallow
// below, so refreshing/browsing all day never inflates the count. Fires once
// per app load, not per route change.
//
// This is a plain insert, not an upsert — an upsert compiles to
// `INSERT ... ON CONFLICT`, which under RLS requires SELECT visibility on
// the table to check for conflicts. Our SELECT policy is admin-only (raw
// visit rows shouldn't be publicly readable), so anon/member inserts would
// fail RLS entirely with an upsert. A plain insert only needs the INSERT
// policy, so we just catch the expected unique-violation (23505) instead.
let trackedThisLoad = false;
const trackVisit = () => {
  if (trackedThisLoad) return;
  trackedThisLoad = true;
  // The Postgrest builder is a lazy thenable — nothing is sent over the wire
  // until it's awaited or .then()'d, so this .then() is load-bearing, not decorative.
  supabase
    .from("site_visits")
    .insert({ device_id: getAnonUserId(), visited_on: new Date().toISOString().slice(0, 10) })
    .then(({ error }) => {
      if (error && error.code !== "23505") console.warn("Failed to record visit", error);
    });
};

// Mounted once inside <BrowserRouter>. Fires the GA init on first mount and
// a pageview on every route change thereafter.
export const RouteTracker = () => {
  const location = useLocation();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Wait for the role check so an admin's own browsing never counts as a
  // visit — the Analytics page needs real usage, not the developer testing.
  useEffect(() => {
    if (authLoading || roleLoading || isAdmin) return;
    trackVisit();
  }, [authLoading, roleLoading, isAdmin]);

  return null;
};
