import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Loader2, Play, RefreshCw, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ScrapeLog = {
  id: string;
  source: string;
  status: string;
  records_found: number | null;
  records_inserted: number | null;
  duration_ms: number | null;
  error_message: string | null;
  ran_at: string | null;
};

type Scraper = {
  fn: string;
  label: string;
  country: string;
  source: string;
};

const SCRAPERS: Scraper[] = [
  { fn: "tnz-scrapper", label: "Tanzania Scraper", country: "Tanzania", source: "tanzania" },
  { fn: "zm-scrapper", label: "Zambia Scraper", country: "Zambia", source: "zambia" },
  { fn: "undp-scrapper", label: "UNDP Scraper", country: "Global", source: "undp" },
];

const statusVariant = (s: string) => {
  const v = s.toLowerCase();
  if (v === "success" || v === "ok" || v === "completed") return "bg-success/15 text-success border-success/30";
  if (v === "running" || v === "pending") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
};

export default function Sources() {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Record<string, boolean>>({});

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from("scrape_logs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Failed to load scrape logs", { description: error.message });
    } else {
      setLogs((data as ScrapeLog[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const runScraper = async (s: Scraper) => {
    setRunning((r) => ({ ...r, [s.fn]: true }));
    toast.info(`Starting ${s.label}...`);
    try {
      const { data, error } = await supabase.functions.invoke(s.fn, { body: {} });
      if (error) throw error;
      const inserted = (data as any)?.records_inserted ?? (data as any)?.inserted ?? "?";
      toast.success(`${s.label} finished`, { description: `Inserted ${inserted} records` });
    } catch (e: any) {
      toast.error(`${s.label} failed`, { description: e?.message ?? "Unknown error" });
    } finally {
      setRunning((r) => ({ ...r, [s.fn]: false }));
      loadLogs();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run scrapers manually and review their execution history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!!running["enrich-tenders"]}
            onClick={async () => {
              setRunning((r) => ({ ...r, "enrich-tenders": true }));
              toast.info("Running enrichment batch...");
              try {
                const { data, error } = await supabase.functions.invoke("enrich-tenders", {
                  body: { batchSize: 10 },
                });
                if (error) throw error;
                const d = data as any;
                toast.success("Enrichment finished", {
                  description: `Processed ${d?.processed ?? 0} · enriched ${d?.enriched ?? 0} · failed ${d?.failed ?? 0}`,
                });
              } catch (e: any) {
                toast.error("Enrichment failed", { description: e?.message ?? "Unknown error" });
              } finally {
                setRunning((r) => ({ ...r, "enrich-tenders": false }));
              }
            }}
          >
            {running["enrich-tenders"] ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Run enrichment
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCRAPERS.map((s) => {
          const last = logs.find((l) => l.source?.toLowerCase().includes(s.source));
          const isRunning = !!running[s.fn];
          return (
            <Card key={s.fn} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{s.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.fn}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => runScraper(s)} disabled={isRunning}>
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Run now
                </Button>
              </div>
              {last && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Last run</span>
                    <span className="text-foreground">
                      {last.ran_at ? formatDistanceToNow(new Date(last.ran_at), { addSuffix: true }) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${statusVariant(last.status)}`}>
                      {last.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Records inserted</span>
                    <span className="text-foreground">{last.records_inserted ?? 0}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Source</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-right font-medium px-4 py-2">Found</th>
                <th className="text-right font-medium px-4 py-2">Inserted</th>
                <th className="text-right font-medium px-4 py-2">Duration</th>
                <th className="text-left font-medium px-4 py-2">Ran at</th>
                <th className="text-left font-medium px-4 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No runs yet. Click "Run now" above to start a scraper.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-foreground">{l.source}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${statusVariant(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-foreground">{l.records_found ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-foreground">{l.records_inserted ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {l.duration_ms != null ? `${(l.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {l.ran_at ? new Date(l.ran_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-destructive max-w-xs truncate" title={l.error_message ?? ""}>
                      {l.error_message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
