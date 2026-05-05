import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tender } from "@/lib/types";
import { TenderDetail } from "@/components/tender/TenderDetail";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";

/* ─── Shimmer primitive ──────────────────────────────────────────── */

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted/70", className)} />
);

/* ─── Skeleton ───────────────────────────────────────────────────── */

const TenderDetailSkeleton = () => (
  <div className="space-y-6 pb-2">
    {/* Header */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shimmer className="h-5 w-20 rounded-full" />
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-16" />
      </div>
      <Shimmer className="h-6 w-4/5" />
      <Shimmer className="h-4 w-2/3" />
      <div className="flex items-center gap-2 pt-1">
        <Shimmer className="h-8 w-[160px] rounded-md" />
        <Shimmer className="h-8 w-[100px] rounded-md" />
      </div>
    </div>

    <hr className="border-border/60" />

    {/* Meta grid */}
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-4 w-28" />
        </div>
      ))}
    </div>

    <hr className="border-border/60" />

    {/* AI Summary */}
    <div className="space-y-3">
      <Shimmer className="h-3 w-20" />
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-2">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-[90%]" />
        <Shimmer className="h-3.5 w-[70%]" />
      </div>
    </div>

    <hr className="border-border/60" />

    {/* Description */}
    <div className="space-y-3">
      <Shimmer className="h-3 w-24" />
      <div className="space-y-2">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-[80%]" />
        <Shimmer className="h-3.5 w-[55%]" />
      </div>
    </div>

    <hr className="border-border/60" />

    {/* Notes */}
    <div className="space-y-3">
      <Shimmer className="h-3 w-28" />
      <Shimmer className="h-16 w-full rounded-xl" />
    </div>

    {/* Footer */}
    <div className="flex gap-4 border-t border-border/60 pt-3">
      <Shimmer className="h-3 w-36" />
      <Shimmer className="h-3 w-32" />
    </div>
  </div>
);

/* ─── Not found ──────────────────────────────────────────────────── */

const NotFound = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
    <span className="text-4xl select-none">🔍</span>
    <p className="text-base font-medium text-foreground">Tender not found</p>
    <p className="text-sm text-muted-foreground">
      This tender may have been removed or the link is incorrect.
    </p>
    <Link
      to="/"
      className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      Back to all tenders
    </Link>
  </div>
);

/* ─── Page ───────────────────────────────────────────────────────── */

const TenderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
    setTender(data as Tender | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  return (
    <PageContainer className="max-w-5xl space-y-6">

      {/* ── Back button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="group inline-flex items-center gap-1.5 w-fit rounded-lg px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>Tenders</span>
      </button>

      {/* ── Content ── */}
      {loading ? (
        <TenderDetailSkeleton />
      ) : !tender ? (
        <NotFound />
      ) : (
        <TenderDetail tender={tender} onChanged={load} />
      )}

    </PageContainer>
  );
};

export default TenderDetailPage;