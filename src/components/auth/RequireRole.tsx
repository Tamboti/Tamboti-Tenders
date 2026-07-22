import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/use-user-role";
import { Lock } from "@/components/icons";

/**
 * Client-side gate for a route's *presentation* only — the real enforcement
 * is Postgres RLS (is_admin(auth.uid()) on the underlying tables/policies).
 * This just avoids rendering a page a member can't use any data from.
 */
export const RequireRole = ({ role, children }: { role: UserRole; children: ReactNode }) => {
  const { role: currentRole, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  if (currentRole !== role) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
          <Lock className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Admin access required</p>
          <p className="mx-auto max-w-xs text-xs text-muted-foreground">
            This page is only available to admins. If you think this is a mistake, contact an admin.
          </p>
        </div>
        <Link
          to="/tenders"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Back to Tenders
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
