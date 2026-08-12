import { FormEvent, useState } from "react";
import { Navigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LOGO_URL, SITE_NAME } from "@/lib/brand";

// Reached two ways: (1) the link from a password-reset email, which lands
// here with a recovery session already established by supabase-js reading
// the token out of the URL (see client.ts — detectSessionInUrl is on by
// default), or (2) an already-signed-in user browsing here directly. Both
// cases just need a valid session, so this reuses AuthContext's session
// rather than listening for the transient PASSWORD_RECOVERY auth event —
// simpler, and avoids a race if that event fires before this page mounts.
const ResetPassword = () => {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <Navigate to="/login" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not update password");
      return;
    }
    toast.success("Password updated — signing you in.");
    setDone(true);
  };

  const isReady = !submitting && password.length >= 6 && confirmPassword.length >= 6;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
      <div className="relative w-full max-w-[380px] flex flex-col">
        <div className="mb-5">
          <NavLink to="/" className="flex items-center mb-10 justify-center text-center w-full shrink-0">
            <img src={LOGO_URL} alt={SITE_NAME} className=" w-14 object-contain" />
            <span className="whitespace-nowrap text-2xl font-semibold tracking-tighter text-primary">Tamboti Tenders</span>
          </NavLink>

          <h1 className="text-[20px] font-semibold tracking-[-0.5px] text-foreground leading-tight">
            Set a new password
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            Choose a new password for your account.
          </p>
        </div>

        {!loading && !session ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-[14px] text-muted-foreground">
              This reset link is invalid or has expired.
            </p>
            <NavLink
              to="/login"
              className="mt-2 h-[46px] w-full rounded-[10px] bg-primary text-white text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity duration-150 hover:opacity-80"
            >
              Back to sign in
            </NavLink>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">
                New password
              </label>
              <input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                disabled={submitting || loading}
                className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-[13px] font-medium text-muted-foreground">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                disabled={submitting || loading}
                className="h-[46px] w-full px-3.5 rounded-[10px] border border-input bg-background text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!isReady || loading}
              className="mt-2 h-[46px] w-full rounded-[10px] bg-primary text-white text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity duration-150 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
