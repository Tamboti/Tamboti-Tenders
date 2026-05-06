import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2, Play, Globe, CheckCircle2, XCircle, Clock3 } from "lucide-react";
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
  { fn: "Undp-scraper", label: "UNDP Scraper", country: "Global", source: "undp" },
];

const statusVariant = (s: string) => {
  const v = s.toLowerCase();
  if (v === "success" || v === "ok" || v === "completed") return "bg-success/15 text-success border-success/30";
  if (v === "running" || v === "pending") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
};

const StatusIcon = ({ status }: { status: string }) => {
  const v = status.toLowerCase();
  if (v === "success" || v === "ok" || v === "completed")
    return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
  if (v === "running" || v === "pending")
    return <Clock3 className="h-3.5 w-3.5 text-warning shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
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

  useEffect(() => { loadLogs(); }, []);

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

  const runEnrichment = async () => {
    setRunning((r) => ({ ...r, "enrich-tenders": true }));
    toast.info("Running enrichment batch...");
    try {
      const { data, error } = await supabase.functions.invoke("enrich-tenders", { body: { batchSize: 10 } });
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
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run scrapers manually and review their execution history.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!!running["enrich-tenders"]}
          onClick={runEnrichment}
          className="self-start sm:self-auto shrink-0"
        >
          {running["enrich-tenders"] ? (
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
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5" />
          )}
          Run enrichment
        </Button>
      </div>

      {/* ── Scraper cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCRAPERS.map((s) => {
          const last = logs.find((l) => l.source?.toLowerCase().includes(s.source));
          const isRunning = !!running[s.fn];
          return (
            <Card key={s.fn} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{s.fn}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => runScraper(s)} disabled={isRunning} className="shrink-0">
                  {isRunning ? (
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
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Run
                </Button>
              </div>

              {last && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-1.5">
                  <div className="flex justify-between">
                    <span>Last run</span>
                    <span className="text-foreground">
                      {last.ran_at ? formatDistanceToNow(new Date(last.ran_at), { addSuffix: true }) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
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

      {/* ── Recent runs ── */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent runs</h2>
        </div>

        {/* Desktop table (md+) */}
        <div className="hidden md:block overflow-x-auto">
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
                <td colSpan={7} className="px-4 py-8 text-center">
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
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
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

        {/* Mobile log cards (< md) */}
        <div className="md:hidden divide-y divide-border/60">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No runs yet. Tap "Run" above to start a scraper.
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="px-4 py-3.5 space-y-2">
                {/* Row 1: source + status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground truncate">{l.source}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] shrink-0 ${statusVariant(l.status)}`}>
                    <StatusIcon status={l.status} />
                    {l.status}
                  </span>
                </div>

                {/* Row 2: stats chips */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="text-foreground font-medium">{l.records_inserted ?? "—"}</span> inserted
                  </span>
                  <span>
                    <span className="text-foreground font-medium">{l.records_found ?? "—"}</span> found
                  </span>
                  {l.duration_ms != null && (
                    <span>
                      <span className="text-foreground font-medium">{(l.duration_ms / 1000).toFixed(1)}s</span>
                    </span>
                  )}
                  {l.ran_at && (
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(l.ran_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Row 3: error if any */}
                {l.error_message && (
                  <p className="text-[11px] text-destructive line-clamp-2 font-mono bg-destructive/5 rounded px-2 py-1">
                    {l.error_message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}