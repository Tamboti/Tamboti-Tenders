import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCountryReference } from "@/hooks/use-country-reference";
import { TenderCard, DeadlinePill } from "@/components/tender/TenderCard";
import { CountryCell } from "@/components/tender/CountryCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TENDER_LIST_COLUMNS, displayTitle } from "@/lib/tenderLanguage";
import { Tender } from "@/lib/types";
import { handleDbError } from "@/lib/dbError";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Bell, Bookmark, Globe } from "@/components/icons";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/contexts/AuthContext";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { PRO_PRICE_USD } from "@/lib/plan";

// Set this once a real hero image is ready — the placeholder renders until then.
const HERO_IMAGE_URL: string | null = "https://gdbodrzxdbtskyzmqmuu.supabase.co/storage/v1/object/public/Company%20assets/ChatGPT_Image_Jul_22__2026__06_34_52_PM-removebg-preview.png";

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <motion.div variants={fadeUp} className="flex flex-col gap-1">
    <div className="text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </motion.div>
);

const VALUE_PROPS = [
  {
    icon: Search,
    title: "Search every tender",
    body: "Full-text search across procurement notices from multiple African country sources, updated continuously.",
  },
  {
    icon: Bell,
    title: "Get alerted",
    body: "Set up alerts for the categories and countries you care about and get notified as new tenders appear.",
  },
  {
    icon: Bookmark,
    title: "Bookmark & track",
    body: "Save tenders to a personal workspace, add notes, and keep an eye on approaching deadlines.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Where do the tenders come from?",
    answer:
      "We continuously pull procurement notices directly from government portals, development agencies and official gazettes across African countries, then normalize and enrich them so you can search and filter consistently in one place.",
  },
  {
    question: "How often is the tender list updated?",
    answer:
      "Our sources are checked continuously throughout the day, so newly published notices typically appear within hours of going live on the originating portal.",
  },
  {
    question: "How does the platform work?",
    answer:
      "Search or browse tenders by country, category and deadline without creating an account. Sign up free to bookmark opportunities, add notes, and set up alerts so you're notified as soon as matching tenders are published.",
  },
  {
    question: "What's free and what's paid?",
    answer:
      `Browsing and searching every tender is free, no account required, and a free account gets you full detail on tenders closing within 30 days plus a handful of bookmarks and one alert. Pro ($${PRO_PRICE_USD}/month) removes those limits and gives you early visibility — you see tenders as soon as they're published instead of waiting until the deadline gets close. See the Pricing page for the full comparison.`,
  },
  {
    question: "Which countries are covered?",
    answer:
      "We track procurement notices across dozens of African countries, with coverage expanding regularly. You can see the full list of countries and open tenders on the Tenders page.",
  },
];

export const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { byIso2 } = useCountryReference();
  const [Icon0, Icon1, Icon2] = VALUE_PROPS.map((p) => p.icon);

  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const closingSoonMaxIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const countriesCovered = useMemo(
    () => Array.from(byIso2.values()).filter((c) => c.continent === "Africa").length,
    [byIso2]
  );

  const statsQuery = useQuery({
    queryKey: ["landing-stats", todayIso, closingSoonMaxIso],
    queryFn: async () => {
      // Africa is the default scope everywhere tenders are listed; NULL
      // continent means the country spelling isn't in country_reference yet,
      // so it stays visible rather than silently disappearing. Mirrors
      // Tenders.tsx's applyCommonFilters — kept separate here since Landing
      // has no filter UI.
      const totalQuery = supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null")
        .gte("deadline", todayIso);
      const closingSoonQuery = supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null")
        .gte("deadline", todayIso)
        .lte("deadline", closingSoonMaxIso);

      const [{ count: totalCount, error: totalError }, { count: soonCount, error: soonError }] =
        await Promise.all([totalQuery, closingSoonQuery]);

      if (totalError) throw new Error(handleDbError(totalError));
      if (soonError) throw new Error(handleDbError(soonError));

      return { total: totalCount ?? 0, closingSoon: soonCount ?? 0 };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const featuredQuery = useQuery({
    queryKey: ["landing-featured", todayIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select(TENDER_LIST_COLUMNS)
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null")
        .gte("deadline", todayIso)
        .order("deadline", { ascending: true })
        .limit(6);
      if (error) throw new Error(handleDbError(error));
      return ((data ?? []) as unknown) as Tender[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div>
      <Seo
        title="African Procurement Tenders, Tracked"
        url={typeof window !== "undefined" ? window.location.origin + "/" : undefined}
      />

      {/* Hero */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full text-left lg:w-3/4"
            >
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Never Miss an African Procurement Opportunity Again.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                {user
                  ? "Pick up where you left off check your bookmarks and alerts or keep browsing for new opportunities."
                  : "Search live tender notices across Africa, no account required. Sign up free to bookmark, get alerts, and never miss a deadline."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/tenders")}>
                  Browse tenders
                </Button>
                {user ? (
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/portal/bookmarks")}>
                    View your bookmarks
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/login?mode=signup")}>
                    Create free account
                  </Button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[200px] shrink-0 lg:w-1/4 lg:max-w-none"
            >
              {HERO_IMAGE_URL ? (
                <img
                  src="https://gdbodrzxdbtskyzmqmuu.supabase.co/storage/v1/object/public/Company%20assets/ChatGPT%20Image%20Aug%207,%202026,%2007_31_29%20PM%20(3).png"
                  alt=""
                  className="mx-auto aspect-square w-full object-contain"
                />
              ) : (
                <div className="mx-auto flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background/60 text-muted-foreground">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="16" rx="2" className="stroke-current" strokeWidth="1.5" />
                    <circle cx="8.5" cy="9.5" r="1.5" className="stroke-current" strokeWidth="1.5" />
                    <path d="M21 15l-5-5-9 9" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-medium">Hero image goes here</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border/60">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
          className="mx-auto grid max-w-6xl  text-center grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8"
        >
          <Stat label="Open tenders" value={statsQuery.data?.total ?? "—"} />
          <Stat label="Closing within 7 days" value={statsQuery.data?.closingSoon ?? "—"} />
          <Stat label="Countries covered" value={countriesCovered || "—"} />
        </motion.div>
      </section>

      {/* Featured tenders */}
      {featuredQuery.data && featuredQuery.data.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Closing soon</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A sample of tenders with approaching deadlines.
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/tenders")}>
              View all
            </Button>
          </div>
          {/* Cards — small/medium screens */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {featuredQuery.data.map((t, idx) => (
              <TenderCard key={t.id} t={t} idx={idx} onClick={() => navigate(`/tender/${t.id}`)} />
            ))}
          </div>

          {/* Table — large screens */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-primary">
                  <TableHead className="h-9 border-b border-border/60 bg-muted/20 px-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                    Tender
                  </TableHead>
                  <TableHead className="h-9 w-[10rem] border-b border-border/60 bg-muted/20 px-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                    Country
                  </TableHead>
                  <TableHead className="h-9 w-[9rem] border-b border-border/60 bg-muted/20 px-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                    Category
                  </TableHead>
                  <TableHead className="h-9 w-[8rem] border-b border-border/60 bg-muted/20 px-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                    Deadline
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featuredQuery.data.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer border-b border-border/50 last:border-0"
                    onClick={() => navigate(`/tender/${t.id}`)}
                  >
                    <TableCell className="max-w-[28rem] px-4 py-3.5 align-middle">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[13.5px] font-medium leading-snug text-foreground line-clamp-1">
                          {displayTitle(t)}
                        </div>
                        {t.procuring_entity && (
                          <div className="text-[11.5px] text-muted-foreground line-clamp-1">
                            {t.procuring_entity}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 align-middle">
                      <CountryCell country={t.country} countryIso2={t.country_iso2} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 align-middle">
                      {t.category ? (
                        <span className="inline-block max-w-[7.5rem] truncate text-[12px] text-foreground/80">
                          {t.category}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                      <DeadlinePill deadline={t.deadline} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.section>
      )}

      {/* Value props */}
      <section className=" bg-background">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"
        >

          {/* Header */}
          <motion.div variants={fadeUp} className="max-w-3xl">

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for modern procurement teams.
            </h2>

            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Everything you need to discover, monitor and respond to procurement
              opportunities across Africa - all from one platform.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Each card has its own pastel identity in light mode and a muted dark equivalent in dark mode — no hardcoded hex, so theme switching just works. */}
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-[280px] sm:min-h-[300px] flex-col rounded-xl p-6 overflow-hidden group border border-transparent bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30"
            >
              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-300/30 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 relative z-10 mb-4">
                <Icon0 className="h-8 w-8" />
              </div>
              {/* Title & Body */}
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-2">{VALUE_PROPS[0].title}</h3>
                <p className="text-base text-amber-900/80 dark:text-amber-100/70">{VALUE_PROPS[0].body}</p>
              </div>
            </motion.div>
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-[280px] sm:min-h-[300px] flex-col rounded-xl p-6 overflow-hidden group border border-transparent bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-300/30 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300 relative z-10 mb-4">
                <Icon1 className="h-8 w-8" />
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-semibold text-blue-800 dark:text-blue-300 mb-2">{VALUE_PROPS[1].title}</h3>
                <p className="text-base text-blue-900/80 dark:text-blue-100/70">{VALUE_PROPS[1].body}</p>
              </div>
            </motion.div>
            <motion.div
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-[280px] sm:min-h-[300px] flex-col rounded-xl p-6 overflow-hidden group border border-transparent bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-300/30 text-purple-800 dark:bg-purple-400/10 dark:text-purple-300 relative z-10 mb-4">
                <Icon2 className="h-8 w-8" />
              </div>
              <div className="mt-auto relative z-10">
                <h3 className="text-2xl font-semibold text-purple-800 dark:text-purple-300 mb-2">{VALUE_PROPS[2].title}</h3>
                <p className="text-base text-purple-900/80 dark:text-purple-100/70">{VALUE_PROPS[2].body}</p>
              </div>
            </motion.div>
          </div>


        </motion.div>
      </section>

      {/* FAQ */}
      <section className=" bg-background">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
          className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Everything you need to know about tender sourcing, how the platform works, and what's free vs. paid.
            </p>
          </div>

          <Accordion type="single" collapsible className="mt-10 w-full">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem key={item.question} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60  mt-10 bg-primary">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8"
        >
          <h2 className="text-3xl font-semibold text-white">Ready to get started?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white">
            Create a free account to bookmark tenders, set up alerts and build your own tracked workspace.
          </p>
          <div className="mt-6">
            <Button size="lg" className="bg-white text-md text-primary hover:bg-mute/30  transition-colors" onClick={() => navigate("/login?mode=signup")}>
              Sign up free
            </Button>

          </div>

          {/* African Flags Infinity Scroll Strip */}
          <div className="mt-12 relative overflow-hidden">
            <div
              className="flex gap-4 animate-scroll-infinite whitespace-nowrap"
              style={{
                animation: "scrollFlags 40s linear infinite",
                willChange: "transform"
              }}
              // Keyframes in global CSS
            >
              {[
                "dz", "ao", "bj", "bw", "bf", "bi", "cm", "cv", "cf", "td", "km", "cg", "cd", "ci",
                "dj", "eg", "gq", "er", "sz", "et", "ga", "gm", "gh", "gn", "gw", "ke", "ls", "lr",
                "ly", "mg", "mw", "ml", "mr", "mu", "ma", "mz", "na", "ne", "ng", "rw", "st", "sn",
                "sc", "sl", "so", "za", "ss", "sd", "tz", "tg", "tn", "ug", "zm", "zw"
              ].concat([
                // Repeat for smooth infinite loop
                "dz", "ao", "bj", "bw", "bf", "bi", "cm", "cv", "cf", "td", "km", "cg", "cd", "ci",
                "dj", "eg", "gq", "er", "sz", "et", "ga", "gm", "gh", "gn", "gw", "ke", "ls", "lr",
                "ly", "mg", "mw", "ml", "mr", "mu", "ma", "mz", "na", "ne", "ng", "rw", "st", "sn",
                "sc", "sl", "so", "za", "ss", "sd", "tz", "tg", "tn", "ug", "zm", "zw"
              ]).map((code, idx) => (
                <img
                  key={`${code}-${idx}`}
                  src={`https://flagcdn.com/h40/${code}.png`}
                  alt={code}
                  title={code.toUpperCase()}
                  className="h-10 w-14 rounded shadow"
                  style={{display: "inline-block"}}
                  loading="lazy"
                />
              ))}
            </div>
            <style>{`
              @keyframes scrollFlags {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              /* Pause on hover */
              .animate-scroll-infinite:hover {
                animation-play-state: paused;
              }
            `}</style>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
