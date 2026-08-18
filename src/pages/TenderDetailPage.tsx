import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Tender } from "@/lib/types";
import { TenderDetail } from "@/components/tender/TenderDetail";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { Seo } from "@/components/seo/Seo";
import { displayTitle, tenderPath } from "@/lib/tenderLanguage";
import { trackEvent } from "@/lib/analytics";

/* ─── Shimmer primitive ──────────────────────────────────────────── */

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted/70", className)} />
);

/* ─── Skeleton ───────────────────────────────────────────────────── */

const TenderDetailSkeleton = () => (
  <div className="space-y-8 pb-2">
    {/* Utility row */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Shimmer className="h-7 w-24 rounded-full" />
        <Shimmer className="h-4 w-16" />
      </div>
      <Shimmer className="h-8 w-[100px] rounded-md" />
    </div>

    {/* Title */}
    <div className="space-y-3">
      <Shimmer className="h-8 w-full" />
      <Shimmer className="h-8 w-3/4" />
      <Shimmer className="h-8 w-[160px] rounded-md" />
    </div>

    {/* Meta */}
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border/60 py-6 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-4 w-28" />
        </div>
      ))}
    </div>

    {/* Summary */}
    <div className="space-y-2.5">
      <Shimmer className="h-3 w-16" />
      <div className="space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-[90%]" />
        <Shimmer className="h-4 w-[70%]" />
      </div>
    </div>

    {/* Description */}
    <div className="space-y-2.5">
      <Shimmer className="h-3 w-24" />
      <div className="space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-[80%]" />
        <Shimmer className="h-4 w-[55%]" />
      </div>
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
      to="/tenders"
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
  const location = useLocation();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
    setTender(data as Tender | null);
    setLoading(false);
    if (data) trackEvent("view_tender", { tender_id: id });
  };

  // Re-fetch without toggling `loading`, so in-place edits (status, bookmark)
  // update the tender data without flashing the page back to the skeleton.
  const refresh = async () => {
    if (!id) return;
    const { data } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
    setTender(data as Tender | null);
  };

  useEffect(() => { load(); }, [id]);

  // Once loaded, canonicalize the address bar to the title-slugged path —
  // covers old bookmarked/emailed bare `/tender/:id` links and any stale
  // slug (title changed since a link was shared) without a redirect loop,
  // since this only fires when the path is actually wrong.
  useEffect(() => {
    if (!tender) return;
    const correctPath = tenderPath(tender);
    if (location.pathname !== correctPath) {
      navigate(correctPath, { replace: true });
    }
  }, [tender, location.pathname, navigate]);

  return (
    <PageContainer className="max-w-5xl space-y-6">

      {tender && (
        <Seo
          title={displayTitle(tender)}
          description={tender.summary_en ?? undefined}
          url={typeof window !== "undefined" ? `${window.location.origin}${tenderPath(tender)}` : undefined}
          type="article"
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: displayTitle(tender),
            description: tender.summary_en ?? undefined,
            datePublished: tender.publication_date ?? undefined,
            dateModified: tender.updated_at ?? undefined,
            author: { "@type": "Organization", name: "Tamboti Tenders" },
            publisher: { "@type": "Organization", name: "Tamboti Tenders" },
            mainEntityOfPage:
              typeof window !== "undefined" ? `${window.location.origin}${tenderPath(tender)}` : undefined,
          }}
        />
      )}

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
        <motion.div
          key={tender.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <TenderDetail tender={tender} onChanged={refresh} />
        </motion.div>
      )}

    </PageContainer>
  );
};

export default TenderDetailPage;