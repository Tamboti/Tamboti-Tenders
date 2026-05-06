import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { handleDbError } from "@/lib/dbError";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";

type AlertPreference = {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  emails: string[];
  countries: string[];
  categories: string[];
  closing_soon_only: boolean;
  frequency: "daily" | "weekly";
  last_sent_at: string | null;
};

const parseEmails = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const Alerts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertPreference[]>([]);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});

  const [countries, setCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prefs, error: prefErr }, { data: facets, error: facetsErr }] = await Promise.all([
      supabase.from("alert_preferences").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tenders").select("country,category").eq("enrichment_status", "enriched").limit(1000),
    ]);

    if (prefErr) toast.error(handleDbError(prefErr));
    if (facetsErr) toast.error(handleDbError(facetsErr));

    const list = ((prefs ?? []) as AlertPreference[]).map((p) => ({
      ...p,
      frequency: p.frequency ?? "daily",
      emails: p.emails ?? [],
      countries: p.countries ?? [],
      categories: p.categories ?? [],
      name: p.name ?? "New alert",
    }));
    setAlerts(list);
    const inputs: Record<string, string> = {};
    list.forEach((p) => {
      inputs[p.id] = (p.emails ?? []).join(", ");
    });
    setEmailInputs(inputs);

    const rows = facets ?? [];
    const allCountries = [...new Set(rows.map((r) => r.country).filter(Boolean) as string[])].sort();
    const allCategories = [...new Set(rows.map((r) => r.category).filter(Boolean) as string[])].sort();
    setCountries(allCountries);
    setCategories(allCategories);

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const toggleIn = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

  const updateAlert = (id: string, patch: Partial<AlertPreference>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const createAlert = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      name: `Alert ${alerts.length + 1}`,
      enabled: true,
      emails: user.email ? [user.email] : [],
      countries: [] as string[],
      categories: [] as string[],
      closing_soon_only: false,
      frequency: "daily" as const,
    };
    const { data, error } = await supabase
      .from("alert_preferences")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    const created = data as AlertPreference;
    setAlerts((prev) => [created, ...prev]);
    setEmailInputs((prev) => ({ ...prev, [created.id]: (created.emails ?? []).join(", ") }));
    toast.success("New alert profile created");
  };

  const save = async (alert: AlertPreference) => {
    if (!user) return;
    const emails = parseEmails(emailInputs[alert.id] ?? "");
    const invalidEmails = emails.filter((e) => !isEmail(e));
    if (emails.length === 0) return toast.error("Add at least one recipient email");
    if (invalidEmails.length > 0) return toast.error(`Invalid emails: ${invalidEmails.join(", ")}`);

    setSavingId(alert.id);
    const payload = {
      name: alert.name.trim() || "New alert",
      enabled: alert.enabled,
      emails,
      countries: alert.countries ?? [],
      categories: alert.categories ?? [],
      closing_soon_only: alert.closing_soon_only,
      frequency: alert.frequency,
    };
    const { error } = await supabase
      .from("alert_preferences")
      .update(payload)
      .eq("id", alert.id)
      .eq("user_id", user.id);
    setSavingId(null);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    updateAlert(alert.id, payload);
    setEmailInputs((prev) => ({ ...prev, [alert.id]: emails.join(", ") }));
    toast.success(`Saved "${payload.name}"`);
  };

  const sendTest = async (alert: AlertPreference) => {
    if (!user) return;
    setSendingTestId(alert.id);
    const { data, error } = await supabase.functions.invoke("send-alert-digest", {
      body: { mode: "test", alertId: alert.id },
    });
    setSendingTestId(null);
    if (error) {
      toast.error(error.message ?? "Failed to send test email");
      return;
    }
    if (data?.sent) {
      toast.success(`Test email sent (${data.matched ?? 0} matches)`);
    } else {
      toast.info(data?.reason ?? "No matching tenders for current preferences");
    }
  };

  const removeAlert = async (alert: AlertPreference) => {
    if (!user) return;
    setDeletingId(alert.id);
    const { error } = await supabase
      .from("alert_preferences")
      .delete()
      .eq("id", alert.id)
      .eq("user_id", user.id);
    setDeletingId(null);
    if (error) return toast.error(handleDbError(error));
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    setEmailInputs((prev) => {
      const next = { ...prev };
      delete next[alert.id];
      return next;
    });
    toast.success(`Deleted "${alert.name}"`);
  };

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="page-title">Email alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
            Create multiple alert profiles. Each one can target different recipients and filters.
        </p>
      </div>
        <Button onClick={createAlert} className="shrink-0">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New alert
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No alert profiles yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first alert profile to start receiving digest emails.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const emails = parseEmails(emailInputs[alert.id] ?? "");
            const invalidEmails = emails.filter((e) => !isEmail(e));
            const busy = savingId === alert.id || sendingTestId === alert.id || deletingId === alert.id;
            return (
              <div key={alert.id} className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 rounded-lg bg-muted p-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <Input
                          value={alert.name}
                          onChange={(e) => updateAlert(alert.id, { name: e.target.value })}
                          placeholder="Alert name"
                          className="h-9 max-w-[18rem]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Matches tenders by selected countries/categories and optional closing-soon window.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{alert.enabled ? "Enabled" : "Disabled"}</span>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={(v) => updateAlert(alert.id, { enabled: v })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Recipients (comma-separated)</label>
                    <Input
                      placeholder="you@company.com, team@company.com"
                      value={emailInputs[alert.id] ?? ""}
                      onChange={(e) => setEmailInputs((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                    />
                    {invalidEmails.length > 0 && (
                      <p className="text-xs text-destructive">Invalid: {invalidEmails.join(", ")}</p>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Frequency</p>
                      <div className="flex gap-2">
                        {(["daily", "weekly"] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => updateAlert(alert.id, { frequency: f })}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                              alert.frequency === f
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {f === "daily" ? "Daily" : "Weekly"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Options</p>
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                          checked={alert.closing_soon_only}
                          onCheckedChange={(v) => updateAlert(alert.id, { closing_soon_only: v })}
                        />
                        Only tenders closing in the next 7 days
                      </label>
                    </div>
                  </div>

                  <FacetPicker
                    label="Countries"
                    values={countries}
                    selected={alert.countries ?? []}
                    onToggle={(v) => updateAlert(alert.id, { countries: toggleIn(alert.countries ?? [], v) })}
                  />

                  <FacetPicker
                    label="Categories"
                    values={categories}
                    selected={alert.categories ?? []}
                    onToggle={(v) => updateAlert(alert.id, { categories: toggleIn(alert.categories ?? [], v) })}
                  />

                  <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeAlert(alert)}
                      disabled={busy}
                    >
                      {deletingId === alert.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Delete
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => sendTest(alert)} disabled={busy}>
                        {sendingTestId === alert.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Send test
                      </Button>
                      <Button onClick={() => save(alert)} disabled={busy}>
                        {savingId === alert.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

const FacetPicker = ({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-foreground">{label}</p>
    {values.length === 0 ? (
      <p className="text-xs text-muted-foreground">No options available yet.</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isOn = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                isOn
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default Alerts;