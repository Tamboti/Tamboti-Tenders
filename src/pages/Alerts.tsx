import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Bell } from "lucide-react";
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
    if (error) toast.error(error.message);
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
    if (error) return toast.error(error.message);
    setCountry("");
    setCategory("");
    setKeyword("");
    setMinValue("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRules((r) => r.filter((x) => x.id !== id));
  };

  const toggleActive = async (rule: Rule) => {
    const { error } = await supabase
      .from("alert_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) return toast.error(error.message);
    setRules((rs) =>
      rs.map((r) => (r.id === rule.id ? { ...r, active: !rule.active } : r))
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email alerts</h1>
        <p className="text-sm text-muted-foreground">
          Get notified when new tenders match your criteria.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New alert rule</CardTitle>
          <CardDescription>Leave fields blank to match anything.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. CZ" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. IT services"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Keyword</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="cloud, security…"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min value (USD)</Label>
              <Input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={add} disabled={adding}>
              <Plus className="h-4 w-4 mr-1" /> Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Your rules
        </h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Bell className="h-6 w-6" />
              No alerts yet. Create your first rule above.
            </CardContent>
          </Card>
        ) : (
          rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-wrap gap-x-6 gap-y-1 flex-1 min-w-0">
                  <Field label="Country" value={r.country} />
                  <Field label="Category" value={r.category} />
                  <Field label="Keyword" value={r.keyword} />
                  <Field
                    label="Min value"
                    value={r.min_value_usd ? `$${r.min_value_usd.toLocaleString()}` : null}
                  />
                  <Field label="Created" value={formatDate(r.created_at)} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!r.active} onCheckedChange={() => toggleActive(r)} />
                    <span className="text-xs text-muted-foreground">
                      {r.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm font-medium">{value || "Any"}</div>
  </div>
);

export default Alerts;
