import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import Tenders from "./pages/Tenders";
import TenderDetailPage from "./pages/TenderDetailPage";
import Alerts from "./pages/Alerts";
import Sources from "./pages/Sources";
import Bookmarks from "./pages/Bookmarks";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Tenders />} />
                  <Route path="/tender/:id" element={<TenderDetailPage />} />
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
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
