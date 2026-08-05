import { FormEvent, useState } from "react";
import { Navigate, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { LOGO_URL } from "@/lib/brand";

type Mode = "signin" | "signup";

const Login = () => {
  const { session, loading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const location = useLocation();
  // A `from` in nav state means RequireAuth bounced them here from a specific
  // page — honor that over the role default. Otherwise send admins straight
  // to the admin dashboard, since that's where their work is.
  const explicitFrom = (location.state as { from?: string } | null)?.from;
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    if (explicitFrom) return <Navigate to={explicitFrom} replace />;
    if (roleLoading) {
      return (
        <div className="min-h-screen grid place-items-center bg-background">
          <div className="text-sm text-muted-foreground">Signing in...</div>
        </div>
      );
    }
    return <Navigate to={isAdmin ? "/admin/sources" : "/tenders"} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return;
    setSubmitting(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/tenders`,
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
        },
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message || "Could not sign up");
        return;
      }
      // If the project has email confirmations enabled, there will be no session yet.
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) {
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        trackEvent("sign_up");
        toast.success("Welcome to Tender Compass!");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not sign in");
      return;
    }
    trackEvent("login");
  };

  const isReady =
    !submitting &&
    email.trim() &&
    password &&
    (mode === "signin" || password.length >= 6);

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
      

      <div className="relative w-full max-w-[380px] flex flex-col">
        <div className="mb-5">

        <NavLink to="/" className="flex items-center mb-10 justify-center text-center w-full shrink-0 ">
          <img src={LOGO_URL} alt="Tender Compass" className=" w-14 object-contain" />
          <span className="whitespace-nowrap text-2xl font-semibold tracking-tighter text-primary">Tamboti Tenders</span>
        </NavLink>


          <h1 className="text-[20px] font-semibold tracking-[-0.5px] text-foreground leading-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {mode === "signin"
              ? "Sign in to access a variety of tenders."
              : "Sign up to start tracking tenders across Africa."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 inline-flex rounded-[10px] border border-border bg-muted/40 p-1 text-[13px] font-medium">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 h-8 rounded-[7px] transition-colors",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-[13px] font-medium text-muted-foreground">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
                className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
              className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 6 : undefined}
              disabled={submitting}
              className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!isReady}
            className="mt-2 h-[46px] w-full rounded-[10px] bg-primary text-white text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity duration-150 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-8  text-center">
          <p className="text-[14px] text-muted-foreground">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
