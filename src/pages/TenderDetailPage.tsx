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
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    {/* SVG illustration */}
    <div className="relative">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
      >
        {/* Outer ring */}
        <circle
          cx="52"
          cy="52"
          r="36"
          className="stroke-border"
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
        {/* Lens body */}
        <circle
          cx="52"
          cy="52"
          r="28"
          className="fill-muted stroke-muted-foreground/30"
          strokeWidth="1.5"
        />
        {/* Inner glare */}
        <circle cx="44" cy="44" r="5" className="fill-muted-foreground/10" />

        {/* X mark inside lens */}
        <line
          x1="44"
          y1="44"
          x2="60"
          y2="60"
          className="stroke-muted-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="44"
          x2="44"
          y2="60"
          className="stroke-muted-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Handle */}
        <line
          x1="71"
          y1="71"
          x2="90"
          y2="90"
          className="stroke-foreground/40"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="71"
          y1="71"
          x2="90"
          y2="90"
          className="stroke-foreground/10"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>

      {/* Subtle glow behind */}
      <div className="absolute inset-0 -z-10 rounded-full bg-muted-foreground/5 blur-2xl scale-110" />
    </div>

    {/* Text */}
    <div className="flex flex-col gap-1.5 max-w-xs">
      <p className="text-base font-semibold tracking-tight text-foreground">
        Tender not found
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        This tender may have been removed or the link is incorrect.
      </p>
    </div>

    {/* CTA */}
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 mt-1 text-sm font-medium text-foreground border border-border rounded-full px-4 py-2 hover:bg-muted transition-colors duration-150"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 7H3M3 7L6.5 3.5M3 7L6.5 10.5" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
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