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
import Alerts from "./pages/Alerts";
import Sources from "./pages/Sources";
import Bookmarks from "./pages/Bookmarks";
import Billing from "./pages/Billing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import PostsAdmin from "./pages/admin/PostsAdmin";
import Analytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound.tsx";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

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
                          <Sources />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <RequireRole role="admin">
                          <Analytics />
                        </RequireRole>
                      }
                    />
                    {/* New/edit posts open as a modal on this page — see PostsAdmin.tsx — rather than a separate route. */}
                    <Route
                      path="/admin/posts"
                      element={
                        <RequireRole role="admin">
                          <PostsAdmin />
                        </RequireRole>
                      }
                    />
                    {/* Member portal — same pages any signed-in user (member
                        or admin) reaches from the "Portal"/"Dashboard" button
                        in PublicNav. See nav.ts for the sidebar entries. */}
                    <Route path="/portal/tenders" element={<Tenders />} />
                    <Route path="/portal/bookmarks" element={<Bookmarks />} />
                    <Route path="/portal/alerts" element={<Alerts />} />
                    <Route path="/portal/billing" element={<Billing />} />
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
