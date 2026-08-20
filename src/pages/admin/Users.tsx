import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, Search, Sparkles, ExternalLink, Loader2 } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { StatTile } from "@/components/analytics/StatTile";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import type { PaymentRecord } from "@/hooks/use-subscription";

type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  createdAt: string | null;
  subscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  currentPeriodEnd: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  trialing: "Pro (trial)",
  past_due: "Payment failed",
  canceled: "Canceled",
  inactive: "Free",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  trialing: "bg-success/15 text-success border-success/30",
  past_due: "bg-destructive/15 text-destructive border-destructive/30",
  canceled: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
};

const PlanBadge = ({ user }: { user: AdminUserRow }) => {
  if (user.role === "admin") {
    return (
      <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
        <Sparkles className="h-3 w-3" /> Admin
      </Badge>
    );
  }
  const label = STATUS_LABEL[user.subscriptionStatus] ?? user.subscriptionStatus;
  return <Badge variant="outline" className={STATUS_BADGE_CLASS[user.subscriptionStatus]}>{label}</Badge>;
};

function PaymentHistorySheet({ user, open, onOpenChange, onRoleChanged }: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChanged: (userId: string, role: "admin" | "member") => void;
}) {
  const { user: currentUser } = useAuth();
  const [roleTarget, setRoleTarget] = useState<"admin" | "member" | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  const paymentsQuery = useQuery({
    queryKey: ["admin-user-history", user?.id],
    queryFn: async (): Promise<PaymentRecord[]> => {
      const { data, error } = await supabase.functions.invoke<{ payments?: PaymentRecord[]; error?: string }>(
        "admin-users",
        { body: { action: "history", userId: user!.id } },
      );
      if (error) throw new Error(data?.error ?? error.message);
      return data?.payments ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const confirmRoleChange = async () => {
    if (!user || !roleTarget) return;
    setUpdatingRole(true);
    const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
      "admin-users",
      { body: { action: "setRole", userId: user.id, role: roleTarget } },
    );
    setUpdatingRole(false);
    if (error || !data?.success) {
      toast.error(data?.error ?? error?.message ?? "Failed to update role");
      return;
    }
    toast.success(roleTarget === "admin" ? "Promoted to admin" : "Admin access removed");
    onRoleChanged(user.id, roleTarget);
    setRoleTarget(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md border-l border-border/60">
        {user && (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Payment history
              </span>
              <h2 className="mt-1 text-lg font-semibold text-foreground truncate">
                {user.fullName || user.email || "Unknown user"}
              </h2>
              {user.fullName && user.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <PlanBadge user={user} />
                {user.role === "admin" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={user.id === currentUser?.id}
                    title={user.id === currentUser?.id ? "You can't remove your own admin access" : undefined}
                    onClick={() => setRoleTarget("member")}
                  >
                    Remove admin
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRoleTarget("admin")}>
                    Make admin
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {paymentsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : paymentsQuery.isError ? (
                <p className="text-sm text-destructive">Couldn't load payment history.</p>
              ) : paymentsQuery.data && paymentsQuery.data.length > 0 ? (
                <div className="divide-y divide-border">
                  {paymentsQuery.data.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{formatDate(p.createdAt)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.number ?? "—"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(p.amountUsd, p.currency.toUpperCase())}
                        </span>
                        {p.hostedInvoiceUrl && (
                          <a
                            href={p.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="View receipt"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No payments on file.</p>
              )}
            </div>
          </>
        )}
      </SheetContent>

      <AlertDialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleTarget === "admin" ? "Make this user an admin?" : "Remove admin access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleTarget === "admin"
                ? `${user?.fullName || user?.email || "This user"} will get full access to the admin dashboard, including users, billing, and content.`
                : `${user?.fullName || user?.email || "This user"} will lose access to the admin dashboard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmRoleChange();
              }}
              disabled={updatingRole}
            >
              {updatingRole ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {roleTarget === "admin" ? "Make admin" : "Remove admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async (): Promise<AdminUserRow[]> => {
      // Same pattern as Sources/Analytics — user_profiles and subscriptions
      // are readable directly under RLS for an admin (admin_read_policies.sql),
      // so only the email lookup (auth.users, never client-readable) goes
      // through the edge function.
      const [profilesRes, subsRes, emailsRes] = await Promise.all([
        supabase.from("user_profiles").select("id, role, full_name, created_at").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("user_id, status, current_period_end"),
        supabase.functions.invoke<{ emails?: Record<string, string | null>; error?: string }>(
          "admin-users",
          { body: { action: "emails" } },
        ),
      ]);

      if (profilesRes.error) throw new Error(profilesRes.error.message);
      if (subsRes.error) throw new Error(subsRes.error.message);
      if (emailsRes.error) throw new Error(emailsRes.data?.error ?? emailsRes.error.message);

      const subByUser = new Map((subsRes.data ?? []).map((s) => [s.user_id, s]));
      const emails = emailsRes.data?.emails ?? {};

      return (profilesRes.data ?? []).map((p) => {
        const sub = subByUser.get(p.id);
        return {
          id: p.id,
          email: emails[p.id] ?? null,
          fullName: p.full_name,
          role: p.role,
          createdAt: p.created_at,
          subscriptionStatus: (sub?.status ?? "inactive") as AdminUserRow["subscriptionStatus"],
          currentPeriodEnd: sub?.current_period_end ?? null,
        };
      });
    },
    staleTime: 60_000,
  });

  const users = usersQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const proCount = users.filter((u) => u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing").length;
  const pastDueCount = users.filter((u) => u.subscriptionStatus === "past_due").length;

  const openHistory = (u: AdminUserRow) => {
    setSelected(u);
    setSheetOpen(true);
  };

  const handleRoleChanged = (userId: string, role: "admin" | "member") => {
    setSelected((prev) => (prev && prev.id === userId ? { ...prev, role } : prev));
    queryClient.setQueryData<AdminUserRow[]>(["admin-users-list"], (prev) =>
      prev?.map((u) => (u.id === userId ? { ...u, role } : u))
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Look up an account, its plan, and its payment history.</p>
      </div>

      {usersQuery.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn't load users: {usersQuery.error instanceof Error ? usersQuery.error.message : "Unknown error"}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={usersQuery.isLoading ? "—" : users.length} icon={UsersIcon} />
        <StatTile label="Pro subscribers" value={usersQuery.isLoading ? "—" : proCount} icon={Sparkles} />
        <StatTile label="Payment failed" value={usersQuery.isLoading ? "—" : pastDueCount} icon={UsersIcon} />
        <StatTile label="Admins" value={usersQuery.isLoading ? "—" : users.filter((u) => u.role === "admin").length} icon={Sparkles} />
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Email</th>
                <th className="text-left font-medium px-4 py-2">Plan</th>
                <th className="text-left font-medium px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {usersQuery.isError ? "Couldn't load users, see the error above." : search ? "No matching users." : "No users yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openHistory(u)}
                    className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{u.fullName || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email || "—"}</td>
                    <td className="px-4 py-2.5"><PlanBadge user={u} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/60">
          {usersQuery.isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {usersQuery.isError ? "Couldn't load users, see the error above." : search ? "No matching users." : "No users yet."}
            </div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => openHistory(u)}
                className="w-full px-4 py-3.5 text-left space-y-1.5 active:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-foreground truncate">
                    {u.fullName || u.email || "Unknown"}
                  </span>
                  <PlanBadge user={u} />
                </div>
                {u.fullName && u.email && (
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                )}
                <p className="text-[11px] text-muted-foreground/70">Joined {formatDate(u.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </Card>

      <PaymentHistorySheet
        user={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRoleChanged={handleRoleChanged}
      />
    </div>
  );
}
