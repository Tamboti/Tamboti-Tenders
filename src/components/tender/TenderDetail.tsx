import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TenderNotes } from "./TenderNotes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Clock,
  Layers,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ─── tiny helpers ──────────────────────────────────────────────── */

const Field = ({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {label}
    </span>
    <span className="text-[14px] font-medium text-foreground leading-snug">{value}</span>
  </div>
);

const DeadlineBadge = ({ days }: { days: number | null }) => {
  if (days == null) return null;
  const isOverdue = days < 0;
  const isSoon = days >= 0 && days < 7;
  return (
    <span
      className={cn(
        "ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isOverdue && "bg-destructive/10 text-destructive",
        isSoon && !isOverdue && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        !isOverdue && !isSoon && "bg-muted text-muted-foreground",
      )}
    >
      {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
    </span>
  );
};

const Divider = () => <hr className="border-border/60" />;

/* ─── main component ────────────────────────────────────────────── */

export const TenderDetail = ({
  tender,
  onChanged,
}: {
  tender: Tender;
  onChanged?: () => void;
}) => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [status, setStatus] = useState(tender.workflow_status);
  const [updating, setUpdating] = useState(false);
  const dDays = daysUntil(tender.deadline);

  const updateStatus = async (next: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("tenders")
      .update({ workflow_status: next })
      .eq("id", tender.id);
    setUpdating(false);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    setStatus(next);
    toast.success(`Status updated to ${next}`);
    onChanged?.();
  };

  /* Build only the fields that have values */
  const metaFields: { icon?: any; label: string; value: React.ReactNode }[] = [
    tender.procuring_entity && {
      icon: Building2,
      label: "Procuring entity",
      value: tender.procuring_entity,
    },
    tender.country && { icon: Globe, label: "Country", value: tender.country },
    tender.category && { icon: Tag, label: "Category", value: tender.category },
    tender.procurement_type && {
      label: "Procurement type",
      value: tender.procurement_type,
    },
    tender.deadline && {
      icon: Calendar,
      label: "Deadline",
      value: (
        <span>
          {formatDate(tender.deadline)}
          <DeadlineBadge days={dDays} />
        </span>
      ),
    },
    tender.publication_date && {
      label: "Published",
      value: formatDate(tender.publication_date),
    },
    tender.estimated_value_usd && {
      icon: DollarSign,
      label: "Estimated value",
      value: formatCurrency(tender.estimated_value_usd),
    },
    tender.original_currency && {
      label: "Currency",
      value: tender.original_currency,
    },
    (tender.location_region || tender.location_district) && {
      icon: MapPin,
      label: "Location",
      value: [tender.location_region, tender.location_district]
        .filter(Boolean)
        .join(", "),
    },
    tender.lot_count && { icon: Layers, label: "Lots", value: tender.lot_count },
    tender.contract_duration_days && {
      icon: Clock,
      label: "Contract duration",
      value: `${tender.contract_duration_days} days`,
    },
  ].filter(Boolean) as { icon?: any; label: string; value: React.ReactNode }[];

  return (
    <div className="space-y-6 pb-2">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* top-row: badge, ref, source */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {tender.reference_number && (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {tender.reference_number}
            </code>
          )}
          {tender.source && (
            <span className="text-[12px] text-muted-foreground">{tender.source}</span>
          )}
        </div>

        {/* title */}
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
          {tender.title}
        </h2>
        {tender.title_cs && (
          <p className="text-sm text-muted-foreground">{tender.title_cs}</p>
        )}

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isAdmin && (
            <Select value={status} onValueChange={updateStatus} disabled={updating}>
              <SelectTrigger className="h-8 w-[160px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tender.source_url && (
            <Button variant="outline" size="sm" className="h-8 text-sm" asChild>
              <a href={tender.source_url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View source
              </a>
            </Button>
          )}
        </div>
      </div>

      <Divider />

      {/* ── Meta grid ────────────────────────────────────────────── */}
      {metaFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {metaFields.map((f, i) => (
            <Field key={i} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {/* ── AI Summary ───────────────────────────────────────────── */}
      {(tender.summary_en || tender.summary_cs) && (
        <>
          <Divider />
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              AI Summary
            </h3>
            {tender.summary_en && (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                {tender.summary_en}
              </p>
            )}
            {tender.summary_cs && (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                {tender.summary_cs}
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Description ──────────────────────────────────────────── */}
      {tender.description && (
        <>
          <Divider />
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {tender.description}
            </p>
          </div>
        </>
      )}

      {/* ── Internal notes ───────────────────────────────────────── */}
      <>
        <Divider />
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Internal notes
          </h3>
          <TenderNotes tenderId={tender.id} />
        </div>
      </>

      {/* ── Footer meta ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        {tender.scraped_at && <span>Scraped {formatDateTime(tender.scraped_at)}</span>}
        {tender.updated_at && <span>Updated {formatDateTime(tender.updated_at)}</span>}
        {tender.enrichment_status && <span>Enrichment: {tender.enrichment_status}</span>}
      </div>
    </div>
  );
};
