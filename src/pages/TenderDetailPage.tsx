import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { TenderNotes } from "@/components/tender/TenderNotes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Building2,
  MapPin,
  Tag,
  DollarSign,
  Clock,
  Hash,
  FileText,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const Row = ({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </div>
    <div className="text-sm font-medium text-right max-w-[60%] break-words">{value}</div>
  </div>
);

const TenderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("New");
  const [updating, setUpdating] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
    const t = (data as Tender | null) ?? null;
    setTender(t);
    if (t) setStatus(t.workflow_status);
    setLoading(false);
  };

  const loadBookmark = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("tender_bookmarks")
      .select("tender_id")
      .eq("user_id", user.id)
      .eq("tender_id", id)
      .maybeSingle();
    setBookmarked(!!data);
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    loadBookmark();
  }, [user, id]);

  const updateStatus = async (next: string) => {
    if (!tender) return;
    setUpdating(true);
    const { error } = await supabase
      .from("tenders")
      .update({ workflow_status: next })
      .eq("id", tender.id);
    setUpdating(false);
    if (error) return toast.error(error.message);
    setStatus(next);
    toast.success(`Status: ${next}`);
  };

  const toggleBookmark = async () => {
    if (!user || !tender) return;
    if (bookmarked) {
      const { error } = await supabase
        .from("tender_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("tender_id", tender.id);
      if (error) return toast.error(error.message);
      setBookmarked(false);
    } else {
      const { error } = await supabase
        .from("tender_bookmarks")
        .insert({ user_id: user.id, tender_id: tender.id });
      if (error) return toast.error(error.message);
      setBookmarked(true);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to tenders
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">Tender not found.</div>
      </div>
    );
  }

  const dDays = daysUntil(tender.deadline);

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 space-y-6">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to tenders
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {user && (
            <Button variant="outline" size="sm" onClick={toggleBookmark}>
              {bookmarked ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 mr-1.5 text-accent" /> Bookmarked
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Bookmark
                </>
              )}
            </Button>
          )}
          {tender.source_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={tender.source_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Source
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-6 lg:p-8">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {tender.country ?? "—"}
          </span>
          {tender.reference_number && (
            <span className="text-xs text-muted-foreground font-mono">
              · {tender.reference_number}
            </span>
          )}
          <span className="text-xs text-muted-foreground">· {tender.source}</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {tender.title}
        </h1>
        {tender.procuring_entity && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {tender.procuring_entity}
          </div>
        )}

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Deadline
            </div>
            <div className="text-sm font-semibold mt-1">{formatDate(tender.deadline)}</div>
            {dDays != null && (
              <div
                className={cn(
                  "text-xs mt-0.5",
                  dDays < 0
                    ? "text-destructive"
                    : dDays < 7
                      ? "text-warning"
                      : "text-muted-foreground"
                )}
              >
                {dDays < 0 ? `${Math.abs(dDays)} days ago` : `in ${dDays} days`}
              </div>
            )}
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Estimated value
            </div>
            <div className="text-sm font-semibold mt-1">
              {formatCurrency(tender.estimated_value_usd)}
            </div>
            {tender.original_currency && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {tender.original_currency}
              </div>
            )}
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Category
            </div>
            <div className="text-sm font-semibold mt-1 truncate">
              {tender.category ?? "—"}
            </div>
            {tender.procurement_type && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {tender.procurement_type}
              </div>
            )}
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Workflow
            </div>
            <Select value={status} onValueChange={updateStatus} disabled={updating}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {(tender.summary_en || tender.summary_cs) && (
            <section className="rounded-lg border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-accent" /> AI summary
              </h2>
              {tender.summary_en && (
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                  {tender.summary_en}
                </div>
              )}
              {tender.summary_cs && (
                <div className="mt-3 pt-3 border-t border-border text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {tender.summary_cs}
                </div>
              )}
            </section>
          )}

          {tender.description && (
            <section className="rounded-lg border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold mb-3">Description</h2>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {tender.description}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-3">Internal notes</h2>
            <TenderNotes tenderId={tender.id} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-2">Details</h2>
            <div>
              <Row icon={Building2} label="Procuring entity" value={tender.procuring_entity ?? "—"} />
              <Row icon={MapPin} label="Country" value={tender.country ?? "—"} />
              <Row icon={MapPin} label="Region" value={tender.location_region ?? "—"} />
              <Row icon={MapPin} label="District" value={tender.location_district ?? "—"} />
              <Row icon={Tag} label="Category" value={tender.category ?? "—"} />
              <Row icon={Tag} label="Procurement type" value={tender.procurement_type ?? "—"} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-2">Timeline & value</h2>
            <div>
              <Row icon={Calendar} label="Deadline" value={formatDate(tender.deadline)} />
              <Row icon={Calendar} label="Published" value={formatDate(tender.publication_date)} />
              <Row
                icon={Clock}
                label="Contract duration"
                value={
                  tender.contract_duration_days
                    ? `${tender.contract_duration_days} days`
                    : "—"
                }
              />
              <Row
                icon={DollarSign}
                label="Estimated value"
                value={formatCurrency(tender.estimated_value_usd)}
              />
              <Row
                icon={DollarSign}
                label="Currency"
                value={tender.original_currency ?? "—"}
              />
              <Row
                icon={DollarSign}
                label="Participation fee"
                value={
                  tender.participation_fee != null
                    ? formatCurrency(tender.participation_fee, tender.original_currency ?? "USD")
                    : "—"
                }
              />
              <Row icon={Layers} label="Lots" value={tender.lot_count ?? "—"} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-2">Source</h2>
            <div>
              <Row icon={Hash} label="Reference" value={tender.reference_number ?? "—"} />
              <Row icon={Hash} label="Source" value={tender.source} />
              <Row icon={Hash} label="Source ID" value={<span className="font-mono text-xs">{tender.source_id}</span>} />
              <Row label="Scraped" value={formatDateTime(tender.scraped_at)} />
              <Row label="Updated" value={formatDateTime(tender.updated_at)} />
              <Row label="Enrichment" value={tender.enrichment_status} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TenderDetailPage;
