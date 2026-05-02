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
import { ExternalLink, Calendar, MapPin, Building2, Tag, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

const Field = ({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />} {label}
    </div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

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
    toast.success(`Status: ${next}`);
    onChanged?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} />
            {tender.reference_number && (
              <span className="text-xs text-muted-foreground font-mono">
                {tender.reference_number}
              </span>
            )}
            <span className="text-xs text-muted-foreground">· {tender.source}</span>
          </div>
          <h2 className="text-xl font-semibold leading-tight">{tender.title}</h2>
          {tender.title_cs && (
            <div className="text-sm text-muted-foreground">{tender.title_cs}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={status} onValueChange={updateStatus} disabled={updating}>
              <SelectTrigger className="w-[150px]">
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
          )}
          {tender.source_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={tender.source_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" /> Source
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
        <Field icon={Building2} label="Procuring entity" value={tender.procuring_entity ?? "—"} />
        <Field icon={MapPin} label="Country" value={tender.country ?? "—"} />
        <Field icon={Tag} label="Category" value={tender.category ?? "—"} />
        <Field label="Procurement type" value={tender.procurement_type ?? "—"} />
        <Field
          icon={Calendar}
          label="Deadline"
          value={
            <span>
              {formatDate(tender.deadline)}
              {dDays != null && (
                <span
                  className={`ml-2 text-xs ${
                    dDays < 0
                      ? "text-destructive"
                      : dDays < 7
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                >
                  {dDays < 0 ? `${Math.abs(dDays)}d ago` : `in ${dDays}d`}
                </span>
              )}
            </span>
          }
        />
        <Field label="Published" value={formatDate(tender.publication_date)} />
        <Field
          icon={DollarSign}
          label="Estimated value"
          value={formatCurrency(tender.estimated_value_usd)}
        />
        <Field label="Currency" value={tender.original_currency ?? "—"} />
        <Field label="Region" value={tender.location_region ?? "—"} />
        <Field label="District" value={tender.location_district ?? "—"} />
        <Field label="Lots" value={tender.lot_count ?? "—"} />
        <Field
          label="Contract duration"
          value={tender.contract_duration_days ? `${tender.contract_duration_days} days` : "—"}
        />
      </div>

      {(tender.summary_en || tender.summary_cs) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">AI Summary</h3>
          {tender.summary_en && (
            <div className="rounded-md border border-border bg-accent/5 p-3 text-sm whitespace-pre-wrap">
              {tender.summary_en}
            </div>
          )}
          {tender.summary_cs && (
            <div className="rounded-md border border-border bg-accent/5 p-3 text-sm whitespace-pre-wrap">
              {tender.summary_cs}
            </div>
          )}
        </div>
      )}

      {tender.description && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Description</h3>
          <div className="rounded-md border border-border p-3 text-sm whitespace-pre-wrap text-muted-foreground">
            {tender.description}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Internal notes</h3>
        <TenderNotes tenderId={tender.id} />
      </div>

      <div className="text-[10px] text-muted-foreground border-t border-border pt-3">
        Scraped {formatDateTime(tender.scraped_at)} · Updated {formatDateTime(tender.updated_at)} ·
        Enrichment: {tender.enrichment_status}
      </div>
    </div>
  );
};
