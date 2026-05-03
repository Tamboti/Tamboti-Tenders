import { FormEvent, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Login = () => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/`;
  }, []);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    setSending(false);

    if (error) {
      toast.error(error.message || "Could not send magic link");
      return;
    }

    setSentTo(normalized);
    toast.success("Magic link sent. Check your inbox.");
  };

  const fromPath = (location.state as { from?: string } | null)?.from;

  return (
    <div className="min-h-screen w-full bg-white relative">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 100%, rgba(253, 224, 71, 0.4) 0%, transparent 60%),
            radial-gradient(circle at 50% 100%, rgba(251, 191, 36, 0.4) 0%, transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(244, 114, 182, 0.5) 0%, transparent 80%)
          `,
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <section className="w-full max-w-sm  p-6 sm:p-7">
          <div className="space-y-2 mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-gray-900">
                Sign in to view multiple tenders from around the world.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={sending}
                  className="h-11 rounded-md border border-gray-100 shadow-sm focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-md border border-gray-100 bg-black shadow-sm"
                disabled={sending || !email.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send magic link"
                )}
              </Button>
            </form>

            {sentTo && (
              <p className="mt-4 text-xs text-black leading-relaxed">
                Link sent to <span className="text-foreground font-bold">{sentTo}</span>. Open the
                email on this device to continue.
              </p>
            )}

            
        </section>
      </div>
    </div>
  );
};

export default Login;
