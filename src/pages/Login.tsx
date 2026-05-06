import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

  const isReady = !submitting && email.trim() && password;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 flex items-start justify-center overflow-hidden"
      >
        <div className="mt-[-120px] h-[500px] w-[700px] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[380px] flex flex-col">

        {/* Logo mark */}
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <img
              src="https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png"
              alt="Tender Compass"
              className="h-10 object-contain"
            />

          </div>

          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground leading-tight">
            Welcome back
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            Sign in to access a variety of tenders.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[13px] font-medium text-muted-foreground"
            >
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
              className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-muted-foreground"
              >
                Password
              </label>
              <button
                type="button"
                className="text-[13px] text-primary font-normal hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
              className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isReady}
            className="mt-2 h-[46px] w-full rounded-[10px] bg-foreground text-background text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity duration-150 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div role="status" aria-label="Loading...">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    {[...Array(8)].map((_, i) => (
                      <line
                        key={i}
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="opacity-30"
                        transform={`rotate(${i * 45} 12 12)`}
                      />
                    ))}
                  </svg>
                </div>
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-[14px] text-muted-foreground">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
            >
              Request access
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;