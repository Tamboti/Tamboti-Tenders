import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_ALERT_LIMIT, isPlanLimitError } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  ChevronDown,
  Clock,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { handleDbError } from "@/lib/dbError";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { MailOpen } from "iconoir-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "daily" | "weekly";

type AlertPreference = {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  emails: string[];
  countries: string[];
  categories: string[];
  closing_soon_only: boolean;
  frequency: Frequency;
  last_sent_at: string | null;
};

type AlertDraft = Omit<AlertPreference, "id" | "user_id" | "last_sent_at">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseEmails = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const toggleIn = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

const relativeTime = (iso: string | null) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Multi-Select Combobox ────────────────────────────────────────────────────

function MultiSelectCombobox({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const triggerLabel =
    selected.length === 0
      ? `Any ${label.toLowerCase()}`
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm transition-all hover:border-foreground/30",
          open && "border-ring ring-1 ring-ring"
        )}
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map((opt) => {
                const on = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggle(opt)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors",
                      on ? "text-primary" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {on && "✓"}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {selected.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => onToggle(s)}
                      className="hover:text-primary/60 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Alert Modal ──────────────────────────────────────────────────────────────

function AlertModal({
  open,
  onClose,
  initial,
  countries,
  categories,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  initial: AlertPreference | null;
  countries: string[];
  categories: string[];
  onSave: (draft: AlertDraft, emailRaw: string) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  saving: boolean;
  deleting: boolean;
}) {
  const blank: AlertDraft = {
    name: "",
    enabled: true,
    emails: [],
    countries: [],
    categories: [],
    closing_soon_only: false,
    frequency: "daily",
  };

  const [draft, setDraft] = useState<AlertDraft>(blank);
  const [emailRaw, setEmailRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft({
        name: initial.name,
        enabled: initial.enabled,
        emails: initial.emails,
        countries: initial.countries,
        categories: initial.categories,
        closing_soon_only: initial.closing_soon_only,
        frequency: initial.frequency,
      });
      setEmailRaw((initial.emails ?? []).join(", "));
    } else {
      setDraft(blank);
      setEmailRaw("");
    }
  }, [open, initial?.id]);

  const patch = (p: Partial<AlertDraft>) => setDraft((d) => ({ ...d, ...p }));

  const emails = parseEmails(emailRaw);
  const invalidEmails = emails.filter((e) => !isEmail(e));
  const canSave = emails.length > 0 && invalidEmails.length === 0 && !saving && !deleting;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial ? "Edit alert" : "New alert"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          {/* Name + toggle */}
          <div className="flex items-center gap-3">
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Alert name"
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {draft.enabled ? "On" : "Off"}
              </span>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(v) => patch({ enabled: v })}
              />
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Recipients</label>
            <Input
              placeholder="you@company.com, team@company.com"
              value={emailRaw}
              onChange={(e) => setEmailRaw(e.target.value)}
            />
            {invalidEmails.length > 0 && (
              <p className="text-xs text-destructive">
                Invalid: {invalidEmails.join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Separate multiple addresses with a comma.
            </p>
          </div>

          {/* Frequency + Closing window — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Frequency</label>
              <div className="flex gap-2">
                {(["daily", "weekly"] as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => patch({ frequency: f })}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      draft.frequency === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Closing window</label>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3">
                <Switch
                  checked={draft.closing_soon_only}
                  onCheckedChange={(v) => patch({ closing_soon_only: v })}
                />
                <span className="text-xs text-muted-foreground">Next 7 days only</span>
              </label>
            </div>
          </div>

          {/* Countries */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Countries</label>
              {draft.countries.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {draft.countries.length} selected
                </span>
              )}
            </div>
            <MultiSelectCombobox
              label="Countries"
              options={countries}
              selected={draft.countries}
              onToggle={(v) => patch({ countries: toggleIn(draft.countries, v) })}
              onClear={() => patch({ countries: [] })}
            />
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Categories</label>
              {draft.categories.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {draft.categories.length} selected
                </span>
              )}
            </div>
            <MultiSelectCombobox
              label="Categories"
              options={categories}
              selected={draft.categories}
              onToggle={(v) => patch({ categories: toggleIn(draft.categories, v) })}
              onClear={() => patch({ categories: [] })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
          {initial && onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={saving || deleting}
            >
              {deleting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(draft, emailRaw)}
              disabled={!canSave}
            >
              {saving && <div role="status" aria-label="Loading...">
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
              }
              {saving ? "Saving..." : initial ? "Save changes" : "Create alert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onToggleEnabled,
  onEdit,
  onTest,
  testing,
}: {
  alert: AlertPreference;
  onToggleEnabled: (v: boolean) => void;
  onEdit: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const lastSent = relativeTime(alert.last_sent_at);

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-foreground/20",
        !alert.enabled && "opacity-55"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {alert.name}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 px-1.5 py-0 text-[10px] capitalize"
          >
            {alert.frequency}
          </Badge>
          {alert.closing_soon_only && (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-600 dark:border-amber-900 dark:bg-amber-950/20"
            >
              <Clock className="mr-1 h-2.5 w-2.5" />
              7 days
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MailOpen className="h-3 w-3 shrink-0" />
            {alert.emails.length === 0
              ? "No recipients"
              : alert.emails.length === 1
                ? alert.emails[0]
                : `${alert.emails.length} recipients`}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3 shrink-0" />
            {alert.countries.length === 0
              ? "All countries"
              : alert.countries.length === 1
                ? alert.countries[0]
                : `${alert.countries.length} countries`}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3 shrink-0" />
            {alert.categories.length === 0
              ? "All categories"
              : alert.categories.length === 1
                ? alert.categories[0]
                : `${alert.categories.length} categories`}
          </span>
          {lastSent && (
            <span className="text-muted-foreground/50">Sent {lastSent}</span>
          )}
        </div>
      </div>

      {/* Actions — always visible on mobile, hover-reveal pencil on desktop */}
      <div className="flex shrink-0 items-center gap-1">
     
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
          onClick={onTest}
          disabled={testing}
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Switch
          checked={alert.enabled}
          onCheckedChange={onToggleEnabled}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Alerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertPreference[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prefs, error: prefErr }, { data: facets, error: facetsErr }] =
      await Promise.all([
        supabase
          .from("alert_preferences")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("tenders")
          .select("country,category")
          .eq("enrichment_status", "enriched")
          .limit(1000),
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
    const rows = facets ?? [];
    setCountries(
      [...new Set(rows.map((r) => r.country).filter(Boolean) as string[])].sort()
    );
    setCategories(
      [...new Set(rows.map((r) => r.category).filter(Boolean) as string[])].sort()
    );
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const openCreate = () => {
    if (!isPro && alerts.length >= FREE_ALERT_LIMIT) {
      toast.error(`Free plan limit reached — ${FREE_ALERT_LIMIT} alert. Upgrade to Pro for unlimited.`, {
        action: { label: "Upgrade", onClick: () => navigate("/pricing") },
      });
      return;
    }
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (a: AlertPreference) => { setEditTarget(a); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const toggleEnabled = async (alert: AlertPreference, enabled: boolean) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, enabled } : a)));
    const { error } = await supabase
      .from("alert_preferences")
      .update({ enabled })
      .eq("id", alert.id)
      .eq("user_id", user!.id);
    if (error) {
      toast.error(handleDbError(error));
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, enabled: !enabled } : a)));
    }
  };

  const handleSave = async (draft: AlertDraft, emailRaw: string) => {
    if (!user) return;
    const emails = parseEmails(emailRaw);
    const invalids = emails.filter((e) => !isEmail(e));
    if (emails.length === 0) return toast.error("Add at least one recipient email");
    if (invalids.length > 0) return toast.error(`Invalid emails: ${invalids.join(", ")}`);

    setSaving(true);
    const payload = {
      name: draft.name.trim() || "New alert",
      enabled: draft.enabled,
      emails,
      countries: draft.countries,
      categories: draft.categories,
      closing_soon_only: draft.closing_soon_only,
      frequency: draft.frequency,
    };

    if (editTarget) {
      const { error } = await supabase
        .from("alert_preferences")
        .update(payload)
        .eq("id", editTarget.id)
        .eq("user_id", user.id);
      setSaving(false);
      if (error) return toast.error(handleDbError(error));
      setAlerts((prev) =>
        prev.map((a) => (a.id === editTarget.id ? { ...a, ...payload } : a))
      );
      toast.success(`Saved "${payload.name}"`);
    } else {
      const { data, error } = await supabase
        .from("alert_preferences")
        .insert({ ...payload, user_id: user.id })
        .select("*")
        .single();
      setSaving(false);
      if (error) {
        if (isPlanLimitError(error)) {
          closeModal();
          toast.error(`Free plan limit reached — ${FREE_ALERT_LIMIT} alert. Upgrade to Pro for unlimited.`, {
            action: { label: "Upgrade", onClick: () => navigate("/pricing") },
          });
          return;
        }
        return toast.error(handleDbError(error));
      }
      setAlerts((prev) => [data as AlertPreference, ...prev]);
      toast.success("Alert created");
      trackEvent("alert_created");
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!user || !editTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("alert_preferences")
      .delete()
      .eq("id", editTarget.id)
      .eq("user_id", user.id);
    setDeleting(false);
    if (error) return toast.error(handleDbError(error));
    setAlerts((prev) => prev.filter((a) => a.id !== editTarget.id));
    toast.success(`Deleted "${editTarget.name}"`);
    closeModal();
  };

  const sendTest = async (alert: AlertPreference) => {
    if (!user) return;
    setSendingTestId(alert.id); 
    const { data, error } = await supabase.functions.invoke("tender-email-alerts", {
      body: { alertId: alert.id, mode: "test" },
    });
    setSendingTestId(null);
    if (error) return toast.error(handleDbError(error));
    toast.success("Test email sent");
  };

  return (
    <PageContainer className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Email alerts</h1>
          <p className="mt-0.5 max-w-sm text-sm text-muted-foreground">
            Receive digest emails when new tenders match your filters.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="shrink-0">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New alert
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center ">
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
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No alerts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first alert to start receiving tender digest emails.
          </p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New alert
          </Button>
        </div>
      ) : (
        <div className="space-y-2 grid grid-cols-1  lg:grid-cols-2     ">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggleEnabled={(v) => toggleEnabled(alert, v)}
              onEdit={() => openEdit(alert)}
              onTest={() => sendTest(alert)}
              testing={sendingTestId === alert.id}
            />
          ))}
        </div>
      )}

      <AlertModal
        open={modalOpen}
        onClose={closeModal}
        initial={editTarget}
        countries={countries}
        categories={categories}
        onSave={handleSave}
        onDelete={editTarget ? handleDelete : undefined}
        saving={saving}
        deleting={deleting}
      />
    </PageContainer>
  );
};

export default Alerts;