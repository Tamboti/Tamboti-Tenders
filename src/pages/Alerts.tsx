import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Bell, SlidersHorizontal } from "lucide-react";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

type Rule = {
  id: string;
  user_id: string;
  country: string | null;
  category: string | null;
  keyword: string | null;
  min_value_usd: number | null;
  active: boolean | null;
  created_at: string | null;
};

const Alerts = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [minValue, setMinValue] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(handleDbError(error));
    setRules((data as Rule[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const add = async () => {
    if (!user) return;
    if (!country && !category && !keyword && !minValue) {
      toast.error("Set at least one criterion");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("alert_rules").insert({
      user_id: user.id,
      country: country || null,
      category: category || null,
      keyword: keyword || null,
      min_value_usd: minValue ? Number(minValue) : null,
      active: true,
    });
    setAdding(false);
    if (error) return toast.error(handleDbError(error));
    setCountry("");
    setCategory("");
    setKeyword("");
    setMinValue("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id);
    if (error) return toast.error(handleDbError(error));
    setRules((r) => r.filter((x) => x.id !== id));
  };

  const toggleActive = async (rule: Rule) => {
    const { error } = await supabase
      .from("alert_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) return toast.error(handleDbError(error));
    setRules((rs) =>
      rs.map((r) => (r.id === rule.id ? { ...r, active: !rule.active } : r))
    );
  };

  return (
    <div className="px-6 py-10 lg:px-10  mx-auto space-y-10">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Notifications
        </p>
        <h1 className="page-title">Email alerts</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Get notified when new tenders match your criteria.
        </p>
      </div>

      {/* New rule card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Card header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">New alert rule</p>
            <p className="text-xs text-muted-foreground">Leave any field blank to match anything</p>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Country", value: country, set: setCountry, placeholder: "e.g. ZM" },
            { label: "Category", value: category, set: setCategory, placeholder: "e.g. IT services" },
            { label: "Keyword", value: keyword, set: setKeyword, placeholder: "cloud, security…" },
            { label: "Min value (USD)", value: minValue, set: setMinValue, placeholder: "100,000", type: "number" },
          ].map(({ label, value, set, placeholder, type }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </label>
              <Input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="h-9 rounded-lg text-sm transition-colors focus-visible:ring-0"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button
            onClick={add}
            disabled={adding}
            className="h-9 rounded-lg px-4 text-sm font-medium shadow-none transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {adding ? "Adding…" : "Add rule"}
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Your rules
        </p>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-14 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No alerts yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Create your first rule above to get started.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Fields */}
                <div className="flex flex-wrap gap-x-7 gap-y-2 flex-1 min-w-0">
                  <RuleField label="Country" value={r.country} />
                  <RuleField label="Category" value={r.category} />
                  <RuleField label="Keyword" value={r.keyword} />
                  <RuleField
                    label="Min value"
                    value={r.min_value_usd ? `$${r.min_value_usd.toLocaleString()}` : null}
                  />
                  <RuleField label="Created" value={formatDate(r.created_at)} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!r.active}
                      onCheckedChange={() => toggleActive(r)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="w-10 text-xs text-muted-foreground">
                      {r.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RuleField = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div className="min-w-0">
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </p>
    <p className={`truncate text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground/70"}`}>
      {value ?? "Any"}
    </p>
  </div>
);

export default Alerts;