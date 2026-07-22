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
import Landing from "./pages/Landing";
import Tenders from "./pages/Tenders";
import TenderDetailPage from "./pages/TenderDetailPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Alerts from "./pages/Alerts";
import Sources from "./pages/Sources";
import Bookmarks from "./pages/Bookmarks";
import Login from "./pages/Login";
import PostsAdmin from "./pages/admin/PostsAdmin";
import PostEditor from "./pages/admin/PostEditor";
import NotFound from "./pages/NotFound.tsx";
import { RouteTracker } from "@/components/analytics/RouteTracker";

const queryClient = new QueryClient();

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
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/tenders" element={<Tenders />} />
                  <Route path="/tender/:id" element={<TenderDetailPage />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                </Route>
                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route path="/alerts" element={<Alerts />} />
                    <Route
                      path="/sources"
                      element={
                        <RequireRole role="admin">
                          <Sources />
                        </RequireRole>
                      }
                    />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    <Route
                      path="/admin/posts"
                      element={
                        <RequireRole role="admin">
                          <PostsAdmin />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/admin/posts/new"
                      element={
                        <RequireRole role="admin">
                          <PostEditor />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/admin/posts/:id"
                      element={
                        <RequireRole role="admin">
                          <PostEditor />
                        </RequireRole>
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
