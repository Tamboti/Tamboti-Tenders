import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Bookmark, Bell, Eye, CreditCard, DollarSign, AlertTriangle, TrendingUp as TrendingUpIcon } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { handleDbError } from "@/lib/dbError";
import { useCountryReference } from "@/hooks/use-country-reference";
import { resolveCountryDisplay } from "@/lib/countries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatTile } from "@/components/analytics/StatTile";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PRO_PRICE_USD } from "@/lib/plan";
import { formatCurrency } from "@/lib/format";

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const CHART_CONFIG = { value: { label: "Count", color: "hsl(var(--primary))" } };

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// Fills every day in the window (even zero-count days) so the line doesn't
// skip gaps, then labels each bucket for the X axis.
const bucketByDay = (isoDates: string[], days: number) => {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const iso of isoDates) {
    const key = iso.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value,
  }));
};

const countBy = (values: (string | null | undefined)[], topN: number) => {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, value]) => ({ name, value }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const excludingAdmins = <T,>(query: PostgrestFilterBuilder<any, any, T>, adminIds: string[]) =>
  adminIds.length > 0 ? query.not("user_id", "in", `(${adminIds.join(",")})`) : query;

// Single-series trend — no legend needed (the card title names the series);
// one consistent accent color throughout, per the dataviz "emphasis, not
// categorical" guidance for single-metric charts.
const TrendChart = ({ data }: { data: { date: string; value: number }[] }) => (
  <ChartContainer config={CHART_CONFIG} className="h-64 w-full">
    <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        interval="preserveStartEnd"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={32}
        allowDecimals={false}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
      />
      <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
      <Line
        dataKey="value"
        type="monotone"
        stroke="var(--color-value)"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
      />
    </LineChart>
  </ChartContainer>
);

// Horizontal ranking bars — better for long category/country/title names than
// vertical columns, and each bar is one metric (not a multi-series identity),
// so a single accent hue throughout is correct (no categorical palette needed).
const RankingChart = ({ data }: { data: { name: string; value: number }[] }) => (
  <ChartContainer config={CHART_CONFIG} className="h-64 w-full">
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
      <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
      <XAxis
        type="number"
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
      />
      <YAxis
        type="category"
        dataKey="name"
        tickLine={false}
        axisLine={false}
        width={110}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
      />
      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
      <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} barSize={18} />
    </BarChart>
  </ChartContainer>
);

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <Card className="overflow-hidden">
    <div className="px-4 py-3 border-b border-border">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-4">{children}</div>
  </Card>
);

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function Analytics() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const { byIso2 } = useCountryReference();

  // Admins are the people building this platform, not the members we're
  // trying to understand — every query below excludes their own activity so
  // testing/dogfooding never skews the numbers.
  const adminIdsQuery = useQuery({
    queryKey: ["analytics-admin-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("id").eq("role", "admin");
      if (error) throw new Error(handleDbError(error));
      return (data ?? []).map((r) => r.id);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const adminIds = adminIdsQuery.data ?? [];

  const totalsQuery = useQuery({
    queryKey: ["analytics-totals", adminIds],
    enabled: adminIdsQuery.isSuccess,
    queryFn: async () => {
      const [users, bookmarks, activeAlerts, visitors, subscriptions] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).neq("role", "admin"),
        excludingAdmins(supabase.from("tender_bookmarks").select("user_id", { count: "exact", head: true }), adminIds),
        excludingAdmins(
          supabase.from("alert_preferences").select("id", { count: "exact", head: true }).eq("enabled", true),
          adminIds
        ),
        supabase.from("site_visits").select("device_id"),
        excludingAdmins(supabase.from("subscriptions").select("user_id, status"), adminIds),
      ]);
      for (const r of [users, bookmarks, activeAlerts, visitors, subscriptions]) {
        if (r.error) throw new Error(handleDbError(r.error));
      }
      const subRows = (subscriptions.data ?? []) as { user_id: string; status: string }[];
      const proSubscribers = subRows.filter((r) => r.status === "active" || r.status === "trialing").length;
      const pastDue = subRows.filter((r) => r.status === "past_due").length;
      return {
        users: users.count ?? 0,
        bookmarks: bookmarks.count ?? 0,
        activeAlerts: activeAlerts.count ?? 0,
        uniqueVisitors: new Set((visitors.data ?? []).map((r) => r.device_id)).size,
        proSubscribers,
        pastDue,
        mrr: proSubscribers * PRO_PRICE_USD,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const sinceIso = useMemo(() => isoDaysAgo(rangeDays), [rangeDays]);
  const sinceDate = useMemo(() => sinceIso.slice(0, 10), [sinceIso]);

  const rangeQuery = useQuery({
    queryKey: ["analytics-range", rangeDays, adminIds],
    enabled: adminIdsQuery.isSuccess,
    queryFn: async () => {
      const [signups, bookmarks, alertsSent, visits, newSubscriptions] = await Promise.all([
        supabase.from("user_profiles").select("created_at").neq("role", "admin").gte("created_at", sinceIso),
        excludingAdmins(
          supabase
            .from("tender_bookmarks")
            .select("user_id, tender_id, created_at, tenders(title, title_en, category, country, country_iso2)")
            .gte("created_at", sinceIso),
          adminIds
        ),
        supabase
          .from("alert_sent_tenders")
          .select("sent_at, alert_preferences(user_id)")
          .gte("sent_at", sinceIso),
        supabase.from("site_visits").select("visited_on").gte("visited_on", sinceDate),
        excludingAdmins(
          supabase.from("subscriptions").select("user_id, created_at").gte("created_at", sinceIso),
          adminIds
        ),
      ]);
      for (const r of [signups, bookmarks, alertsSent, visits, newSubscriptions]) {
        if (r.error) throw new Error(handleDbError(r.error));
      }
      const adminSet = new Set(adminIds);
      return {
        signups: signups.data ?? [],
        bookmarks: (bookmarks.data ?? []) as {
          tender_id: string;
          created_at: string;
          tenders: {
            title: string;
            title_en: string | null;
            category: string | null;
            country: string | null;
            country_iso2: string | null;
          } | null;
        }[],
        alertsSent: ((alertsSent.data ?? []) as { sent_at: string; alert_preferences: { user_id: string } | null }[]).filter(
          (r) => !r.alert_preferences || !adminSet.has(r.alert_preferences.user_id)
        ),
        visits: visits.data ?? [],
        newSubscriptions: (newSubscriptions.data ?? []) as { user_id: string; created_at: string }[],
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const signupsTrend = useMemo(
    () => bucketByDay((rangeQuery.data?.signups ?? []).map((r) => r.created_at), rangeDays),
    [rangeQuery.data, rangeDays]
  );
  const bookmarksTrend = useMemo(
    () => bucketByDay((rangeQuery.data?.bookmarks ?? []).map((r) => r.created_at), rangeDays),
    [rangeQuery.data, rangeDays]
  );
  const alertsSentTrend = useMemo(
    () => bucketByDay((rangeQuery.data?.alertsSent ?? []).map((r) => r.sent_at), rangeDays),
    [rangeQuery.data, rangeDays]
  );
  const visitsTrend = useMemo(
    () => bucketByDay((rangeQuery.data?.visits ?? []).map((r) => r.visited_on), rangeDays),
    [rangeQuery.data, rangeDays]
  );
  const newSubscriptionsTrend = useMemo(
    () => bucketByDay((rangeQuery.data?.newSubscriptions ?? []).map((r) => r.created_at), rangeDays),
    [rangeQuery.data, rangeDays]
  );

  const bookmarkedCategories = useMemo(
    () => countBy((rangeQuery.data?.bookmarks ?? []).map((r) => r.tenders?.category), 8),
    [rangeQuery.data]
  );
  const bookmarkedCountries = useMemo(() => {
    const names = (rangeQuery.data?.bookmarks ?? []).map(
      (r) => resolveCountryDisplay(r.tenders?.country, r.tenders?.country_iso2, byIso2).name || null
    );
    return countBy(names, 8);
  }, [rangeQuery.data, byIso2]);

  const topBookmarkedTenders = useMemo(() => {
    const rows = rangeQuery.data?.bookmarks ?? [];
    const byTender = new Map<string, { title: string; count: number }>();
    for (const r of rows) {
      const title = r.tenders?.title_en || r.tenders?.title || "Untitled tender";
      const existing = byTender.get(r.tender_id);
      if (existing) existing.count += 1;
      else byTender.set(r.tender_id, { title, count: 1 });
    }
    return Array.from(byTender.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => ({ name: truncate(t.title, 42), value: t.count }));
  }, [rangeQuery.data]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            How members use Tender Compass — admin activity is excluded from every number below.
          </p>
        </div>
      </div>

      {/* KPI tiles — all-time totals, not scoped to the date range below */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={totalsQuery.data?.users ?? "—"} icon={Users} />
        <StatTile label="Total bookmarks" value={totalsQuery.data?.bookmarks ?? "—"} icon={Bookmark} />
        <StatTile label="Active alerts" value={totalsQuery.data?.activeAlerts ?? "—"} icon={Bell} />
        <StatTile label="Unique visitors" value={totalsQuery.data?.uniqueVisitors ?? "—"} icon={Eye} />
      </div>

      {/* Revenue — Pro subscriber counts and MRR, same all-time scope as above */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Revenue</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pro subscribers" value={totalsQuery.data?.proSubscribers ?? "—"} icon={CreditCard} />
          <StatTile
            label="MRR"
            value={totalsQuery.data ? formatCurrency(totalsQuery.data.mrr) : "—"}
            icon={DollarSign}
          />
          <StatTile label="Past due" value={totalsQuery.data?.pastDue ?? "—"} icon={AlertTriangle} />
          <StatTile
            label="Free → Pro conversion"
            value={
              totalsQuery.data && totalsQuery.data.users > 0
                ? `${((totalsQuery.data.proSubscribers / totalsQuery.data.users) * 100).toFixed(1)}%`
                : "—"
            }
            icon={TrendingUpIcon}
          />
        </div>
      </div>

      {/* Date range — scopes every chart below it */}
      <div className="flex items-center gap-1.5">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => setRangeDays(opt.days)}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-medium transition-colors",
              rangeDays === opt.days
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Unique visits" subtitle={`Deduped per device per day, last ${rangeDays} days`}>
          <TrendChart data={visitsTrend} />
        </ChartCard>
        <ChartCard title="Signups" subtitle={`New users, last ${rangeDays} days`}>
          <TrendChart data={signupsTrend} />
        </ChartCard>
        <ChartCard title="Bookmarks" subtitle={`New bookmarks, last ${rangeDays} days`}>
          <TrendChart data={bookmarksTrend} />
        </ChartCard>
        <ChartCard title="Alerts sent" subtitle={`Alert emails delivered, last ${rangeDays} days`}>
          <TrendChart data={alertsSentTrend} />
        </ChartCard>
        <ChartCard title="New subscriptions" subtitle={`New Pro subscriptions started, last ${rangeDays} days`}>
          <TrendChart data={newSubscriptionsTrend} />
        </ChartCard>
        <ChartCard title="Most-bookmarked categories" subtitle={`Last ${rangeDays} days`}>
          <RankingChart data={bookmarkedCategories} />
        </ChartCard>
        <ChartCard title="Most-bookmarked countries" subtitle={`Last ${rangeDays} days`}>
          <RankingChart data={bookmarkedCountries} />
        </ChartCard>
        <ChartCard title="Top bookmarked tenders" subtitle={`Specific opportunities drawing the most interest, last ${rangeDays} days`}>
          <RankingChart data={topBookmarkedTenders} />
        </ChartCard>
      </div>
    </div>
  );
}
