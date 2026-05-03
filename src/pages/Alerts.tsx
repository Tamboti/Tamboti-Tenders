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
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Notifications
        </p>
        <h1 style={{ fontFamily: "serif" }} className="text-2xl font-semibold tracking-tight text-foreground">
          Email alerts
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Get notified when new tenders match your criteria.
        </p>
      </div>

      {/* New rule card */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-800">New alert rule</p>
            <p className="text-xs text-zinc-400">Leave any field blank to match anything</p>
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                {label}
              </label>
              <Input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="h-9 text-sm rounded-lg border-zinc-200 bg-zinc-50 placeholder:text-zinc-300 focus:bg-white focus:border-zinc-400 focus:ring-0 transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end">
          <Button
            onClick={add}
            disabled={adding}
            className="h-9 px-4 text-sm font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 active:scale-[0.98] transition-all shadow-none"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {adding ? "Adding…" : "Add rule"}
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Your rules
        </p>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-2xl border border-zinc-100 bg-zinc-50 animate-pulse"
              />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] py-14 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">No alerts yet</p>
              <p className="text-xs text-zinc-400 mt-0.5">Create your first rule above to get started.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4 flex items-center justify-between gap-4 flex-wrap transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
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
                      className="data-[state=checked]:bg-zinc-900"
                    />
                    <span className="text-xs text-zinc-400 w-10">
                      {r.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:bg-red-50 hover:text-red-400 transition-colors"
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
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-0.5">
      {label}
    </p>
    <p className={`text-sm font-medium truncate ${value ? "text-zinc-800" : "text-zinc-300"}`}>
      {value ?? "Any"}
    </p>
  </div>
);

export default Alerts;