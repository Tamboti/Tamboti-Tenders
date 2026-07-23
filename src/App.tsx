import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { Loader2 } from "@/components/icons";

// Route-level code splitting — each page only downloads when visited, so a
// public visitor never pays for the admin dashboard's recharts/rich-text-editor
// weight (and vice versa). This is what actually fixes the "chunk too large"
// build warning; bumping chunkSizeWarningLimit would only have hidden it.
const Landing = lazy(() => import("./pages/Landing"));
const Tenders = lazy(() => import("./pages/Tenders"));
const TenderDetailPage = lazy(() => import("./pages/TenderDetailPage"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Sources = lazy(() => import("./pages/Sources"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Login = lazy(() => import("./pages/Login"));
const PostsAdmin = lazy(() => import("./pages/admin/PostsAdmin"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <RouteTracker />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<Landing />} />
                    <Route path="/tenders" element={<Tenders />} />
                    <Route path="/tender/:id" element={<TenderDetailPage />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    {/* Bookmarks/Alerts are regular signed-in pages, not admin
                        tooling — they stay in the public shell (same nav/footer
                        as Tenders) rather than the AppLayout dashboard. */}
                    <Route element={<RequireAuth />}>
                      <Route path="/bookmarks" element={<Bookmarks />} />
                      <Route path="/alerts" element={<Alerts />} />
                    </Route>
                  </Route>
                  {/* AppLayout is the admin dashboard shell — everything under it requires the admin role. */}
                  <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                      <Route
                        path="/sources"
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
                      {/* Same Tenders/Bookmarks/Alerts pages as the public routes,
                          mounted again here so admins can move between them
                          without leaving the dashboard shell — see nav.ts. */}
                      <Route path="/admin/tenders" element={<Tenders />} />
                      <Route path="/admin/bookmarks" element={<Bookmarks />} />
                      <Route path="/admin/alerts" element={<Alerts />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
