import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Login = () => {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not sign in");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-white">
      <div className="absolute inset-0 z-0 bg-app-warm-glow" aria-hidden />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <section className="w-full max-w-sm p-6 sm:p-7">
          <div className="mb-6 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-gray-900">
              Sign in to view multiple tenders from around the world.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
                className="h-11 rounded-md border border-gray-100 shadow-sm focus:ring-0 focus:ring-offset-0"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
                className="h-11 rounded-md border border-gray-100 shadow-sm focus:ring-0 focus:ring-offset-0"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-md border border-gray-100 bg-black shadow-sm"
              disabled={submitting || !email.trim() || !password}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
