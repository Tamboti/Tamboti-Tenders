import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Tenders from "./pages/Tenders";
import TenderDetailPage from "./pages/TenderDetailPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import {
  loadAlerts,
  loadSources,
  loadBookmarks,
  loadBilling,
  loadPostsAdmin,
  loadAnalytics,
  loadAdminUsers,
} from "@/lib/lazyRoutes";

// Everything behind RequireAuth (the member portal + admin dashboard) is
// lazy-loaded — none of it belongs in the bundle a first-time anonymous
// visitor downloads just to see the landing page. The rich-text editor
// (PostsAdmin) and charts (Analytics) are the heaviest offenders. These
// share their import functions with lazyRoutes.ts, which AppLayout uses to
// prefetch the rest of this set in the background once you're in the
// dashboard, so switching tabs after the first one doesn't hit this
// fallback again.
const Alerts = lazy(loadAlerts);
const Sources = lazy(loadSources);
const Bookmarks = lazy(loadBookmarks);
const Billing = lazy(loadBilling);
const PostsAdmin = lazy(loadPostsAdmin);
const Analytics = lazy(loadAnalytics);
const AdminUsers = lazy(loadAdminUsers);

// Fits inside AppLayout's <main>, not the full viewport — Sidebar stays put
// while this shows, so only ever the content area appears to "reload".
const RouteFallback = () => (
  <div className="grid min-h-[50vh] place-items-center">
    <div className="text-sm text-muted-foreground">Loading...</div>
  </div>
);

const queryClient = new QueryClient();

// /tenders is the public marketing-shell version of the tenders list —
// once someone's signed in they should land in the portal instead, same
// page underneath (Tenders is reused by both routes) but with the
// dashboard chrome. /tender/:id stays public for everyone regardless of
// auth state (shared links, SEO).
const PublicTendersRoute = () => {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/portal/tenders" replace />;
  return <Tenders />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ScrollToTop />
              <RouteTracker />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/tenders" element={<PublicTendersRoute />} />
                  <Route path="/tender/:id" element={<TenderDetailPage />} />
                  <Route path="/tender/:id/:slug" element={<TenderDetailPage />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  {/* Old unprefixed/public-shell URLs — redirect so
                      bookmarked/shared links still land correctly. */}
                  <Route path="/bookmarks" element={<Navigate to="/portal/bookmarks" replace />} />
                  <Route path="/alerts" element={<Navigate to="/portal/alerts" replace />} />
                  <Route path="/sources" element={<Navigate to="/admin/sources" replace />} />
                </Route>
                {/* AppLayout is the shared dashboard shell for both members and
                    admins — Sidebar (nav.ts) filters admin-only sections out
                    for non-admins, so /portal/* works for any signed-in user
                    while /admin/sources, /admin/analytics and /admin/posts
                    stay admin-gated (consistent prefix, no bare routes). */}
                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route
                      path="/admin/sources"
                      element={
                        <RequireRole role="admin">
                          <Suspense fallback={<RouteFallback />}>
                            <Sources />
                          </Suspense>
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <RequireRole role="admin">
                          <Suspense fallback={<RouteFallback />}>
                            <Analytics />
                          </Suspense>
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <RequireRole role="admin">
                          <Suspense fallback={<RouteFallback />}>
                            <AdminUsers />
                          </Suspense>
                        </RequireRole>
                      }
                    />
                    {/* New/edit posts open as a modal on this page — see PostsAdmin.tsx — rather than a separate route. */}
                    <Route
                      path="/admin/posts"
                      element={
                        <RequireRole role="admin">
                          <Suspense fallback={<RouteFallback />}>
                            <PostsAdmin />
                          </Suspense>
                        </RequireRole>
                      }
                    />
                    {/* Member portal — same pages any signed-in user (member
                        or admin) reaches from the "Portal"/"Dashboard" button
                        in PublicNav. See nav.ts for the sidebar entries.
                        /portal/tenders reuses the same eagerly-loaded Tenders
                        page as the public route, so no Suspense needed there. */}
                    <Route path="/portal/tenders" element={<Tenders />} />
                    <Route
                      path="/portal/bookmarks"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <Bookmarks />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/portal/alerts"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <Alerts />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/portal/billing"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <Billing />
                        </Suspense>
                      }
                    />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
