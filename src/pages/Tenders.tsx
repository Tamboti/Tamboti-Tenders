import { ComponentType, Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EditTenderDialog } from "@/components/tender/EditTenderDialog";
import { TenderQuickView } from "@/components/Tenderquickview";
import { getAnonUserId } from "@/lib/anonUser";
import { formatDate, daysUntil } from "@/lib/format";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  Globe,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  Layers,
  Circle,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";

const PAGE_SIZE = 20;
type DeadlineScope = "active" | "past" | "all";

const MotionTableRow = motion(TableRow);

const COUNTRY_TO_ISO2: Record<string, string> = {
  afghanistan: "af",
  albania: "al",
  algeria: "dz",
  andorra: "ad",
  angola: "ao",
  antiguaandbarbuda: "ag",
  "antigua and barbuda": "ag",
  argentina: "ar",
  armenia: "am",
  australia: "au",
  austria: "at",
  azerbaijan: "az",

  bahamas: "bs",
  bahrain: "bh",
  bangladesh: "bd",
  barbados: "bb",
  belarus: "by",
  belgium: "be",
  belize: "bz",
  benin: "bj",
  bhutan: "bt",
  bolivia: "bo",
  bosniaandherzegovina: "ba",
  "bosnia and herzegovina": "ba",
  botswana: "bw",
  brazil: "br",
  brunei: "bn",
  bulgaria: "bg",
  burkinafaso: "bf",
  "burkina faso": "bf",
  burundi: "bi",

  cambodia: "kh",
  cameroon: "cm",
  canada: "ca",
  capeverde: "cv",
  "cape verde": "cv",
  centralafricanrepublic: "cf",
  "central african republic": "cf",
  chad: "td",
  chile: "cl",
  china: "cn",
  colombia: "co",
  comoros: "km",
  congo: "cg",
  "republic of the congo": "cg",
  costarica: "cr",
  "costa rica": "cr",
  croatia: "hr",
  cuba: "cu",
  cyprus: "cy",
  czechia: "cz",
  "czech republic": "cz",

  denmark: "dk",
  djibouti: "dj",
  dominica: "dm",
  dominicanrepublic: "do",
  "dominican republic": "do",

  ecuador: "ec",
  egypt: "eg",
  elsalvador: "sv",
  "el salvador": "sv",
  equatorialguinea: "gq",
  "equatorial guinea": "gq",
  eritrea: "er",
  estonia: "ee",
  eswatini: "sz",
  swaziland: "sz",
  ethiopia: "et",

  fiji: "fj",
  finland: "fi",
  france: "fr",

  gabon: "ga",
  gambia: "gm",
  georgia: "ge",
  germany: "de",
  ghana: "gh",
  greece: "gr",
  grenada: "gd",
  guatemala: "gt",
  guinea: "gn",
  guineabissau: "gw",
  "guinea-bissau": "gw",
  guyana: "gy",

  haiti: "ht",
  honduras: "hn",
  hungary: "hu",

  iceland: "is",
  india: "in",
  indonesia: "id",
  iran: "ir",
  iraq: "iq",
  ireland: "ie",
  israel: "il",
  italy: "it",

  jamaica: "jm",
  japan: "jp",
  jordan: "jo",

  kazakhstan: "kz",
  kenya: "ke",
  kiribati: "ki",
  kuwait: "kw",
  kyrgyzstan: "kg",

  laos: "la",
  latvia: "lv",
  lebanon: "lb",
  lesotho: "ls",
  liberia: "lr",
  libya: "ly",
  liechtenstein: "li",
  lithuania: "lt",
  luxembourg: "lu",

  madagascar: "mg",
  malawi: "mw",
  malaysia: "my",
  maldives: "mv",
  mali: "ml",
  malta: "mt",
  marshallislands: "mh",
  "marshall islands": "mh",
  mauritania: "mr",
  mauritius: "mu",
  mexico: "mx",
  micronesia: "fm",
  moldova: "md",
  monaco: "mc",
  mongolia: "mn",
  montenegro: "me",
  morocco: "ma",
  mozambique: "mz",
  myanmar: "mm",

  namibia: "na",
  nauru: "nr",
  nepal: "np",
  netherlands: "nl",
  newzealand: "nz",
  "new zealand": "nz",
  nicaragua: "ni",
  niger: "ne",
  nigeria: "ng",
  northkorea: "kp",
  "north korea": "kp",
  northmacedonia: "mk",
  "north macedonia": "mk",
  norway: "no",

  oman: "om",

  pakistan: "pk",
  palau: "pw",
  palestine: "ps",
  panama: "pa",
  papuanewguinea: "pg",
  "papua new guinea": "pg",
  paraguay: "py",
  peru: "pe",
  philippines: "ph",
  poland: "pl",
  portugal: "pt",

  qatar: "qa",

  romania: "ro",
  russia: "ru",
  rwanda: "rw",

  saintkittsandnevis: "kn",
  "saint kitts and nevis": "kn",
  saintlucia: "lc",
  "saint lucia": "lc",
  saintvincentandthegrenadines: "vc",
  "saint vincent and the grenadines": "vc",
  samoa: "ws",
  sanmarino: "sm",
  "san marino": "sm",
  saotomeandprincipe: "st",
  "sao tome and principe": "st",
  saudiarabia: "sa",
  "saudi arabia": "sa",
  senegal: "sn",
  serbia: "rs",
  seychelles: "sc",
  sierraleone: "sl",
  "sierra leone": "sl",
  singapore: "sg",
  slovakia: "sk",
  slovenia: "si",
  solomonislands: "sb",
  "solomon islands": "sb",
  somalia: "so",
  southafrica: "za",
  "south africa": "za",
  southkorea: "kr",
  "south korea": "kr",
  southsudan: "ss",
  "south sudan": "ss",
  spain: "es",
  srilanka: "lk",
  "sri lanka": "lk",
  sudan: "sd",
  suriname: "sr",
  sweden: "se",
  switzerland: "ch",
  syria: "sy",

  taiwan: "tw",
  tajikistan: "tj",
  tanzania: "tz",
  thailand: "th",
  timorleste: "tl",
  "timor-leste": "tl",
  togo: "tg",
  tonga: "to",
  trinidadandtobago: "tt",
  "trinidad and tobago": "tt",
  tunisia: "tn",
  turkey: "tr",
  turkmenistan: "tm",
  tuvalu: "tv",

  uganda: "ug",
  ukraine: "ua",
  unitedarabemirates: "ae",
  "united arab emirates": "ae",
  unitedkingdom: "gb",
  "united kingdom": "gb",
  uk: "gb",
  unitedstates: "us",
  "united states": "us",
  usa: "us",
  uruguay: "uy",
  uzbekistan: "uz",

  vanuatu: "vu",
  vaticancity: "va",
  "vatican city": "va",
  venezuela: "ve",
  vietnam: "vn",

  yemen: "ye",

  zambia: "zm",
  zimbabwe: "zw",
};

const getCountryIso2 = (country: string | null | undefined): string | null => {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "global" || normalized === "international") return null;

  if (/^[a-z]{2}$/.test(normalized)) return normalized;

  const simplified = normalized.replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const collapsed = simplified.replace(/\s+/g, "");
  return COUNTRY_TO_ISO2[simplified] ?? COUNTRY_TO_ISO2[collapsed] ?? null;
};

const getDisplayCountry = (country: string | null | undefined): string => {
  if (!country) return "";
  const normalized = country.trim();
  if (!normalized) return "";

  const slashParts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate = slashParts.length > 1 ? slashParts[slashParts.length - 1] : normalized;
  return candidate.trim();
};

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStatusTone = (status: string) => {
  const value = status.toLowerCase();

  if (value.includes("awarded") || value.includes("won") || value.includes("completed")) {
    return "text-emerald-700 dark:text-emerald-400";
  }

  if (value.includes("review") || value.includes("shortlist") || value.includes("progress")) {
    return "text-sky-700 dark:text-sky-300";
  }

  if (value.includes("draft") || value.includes("new") || value.includes("open")) {
    return "text-violet-700 dark:text-violet-300";
  }

  if (value.includes("submitted") || value.includes("pending")) {
    return "text-amber-700 dark:text-amber-300";
  }

  if (value.includes("cancel") || value.includes("lost") || value.includes("closed")) {
    return "text-rose-700 dark:text-rose-300";
  }

  return "text-muted-foreground";
};

const TenderStatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center gap-1.5 rounded-full  px-2.5 py-1 text-[11px] font-semibold leading-none",
      getStatusTone(status)
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    <span className="truncate">{status}</span>
  </span>
);

const CountryChip = ({
  country,
  compact = false,
}: {
  country: string | null | undefined;
  compact?: boolean;
}) => {
  const displayCountry = getDisplayCountry(country);
  if (!displayCountry) {
    return <span className="text-sm text-muted-foreground/35">—</span>;
  }
  const iso2 = getCountryIso2(displayCountry);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full   text-muted-foreground",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      )}
    >
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{displayCountry}</span>
    </span>
  );
};

/* ── Deadline pill ───────────────────────────────────────────────── */
const DeadlinePill = ({ deadline }: { deadline: string | null }) => {
  const d = daysUntil(deadline);
  if (d == null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        d < 0 && "bg-destructive/10 text-destructive",
        d === 0 && "bg-destructive/20 text-destructive font-semibold",
        d >= 1 && d <= 7 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        d > 7 && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="h-2.5 w-2.5 shrink-0" />
      {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : `${d}d`}
    </span>
  );
};

const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <div>
    <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>}
  </div>
);

type FilterOption = {
  value: string;
  label: string;
};

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  icon,
  compact = false,
  searchable = false,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  compact?: boolean;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Icon = icon;
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className={cn("relative", compact ? "w-full" : "min-w-[162px]")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl border px-3 transition-all",
          "bg-gradient-to-b from-background to-muted/30 hover:from-muted/40 hover:to-muted/70",
          "border-border/70 shadow-sm hover:border-primary/35",
          compact ? "h-10" : "h-10"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-xs font-medium text-foreground/90">{selectedLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button
            aria-label="Close filter options"
            type="button"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl">
            {searchable && (
              <div className="border-b border-border/70 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {visibleOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      selected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <span className="line-clamp-1">{option.label}</span>
                    {selected ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
              {visibleOptions.length === 0 && (
                <div className="px-2.5 py-2 text-xs text-muted-foreground">No matches found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Skeleton rows (desktop) ─────────────────────────────────────── */
const SkeletonTableBody = ({ showAdminCol }: { showAdminCol: boolean }) => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse border-border/40 hover:bg-transparent">
        <TableCell className="w-11 px-3 py-3">
          <div className="mx-auto h-4 w-4 rounded-md bg-muted" />
        </TableCell>
        <TableCell className="py-3 pr-4">
          <div className="space-y-2">
            <div className="h-3.5 max-w-[min(72%,22rem)] rounded-md bg-muted" />
            <div className="h-3 max-w-[min(48%,14rem)] rounded-md bg-muted/70" />
          </div>
        </TableCell>
        <TableCell className="hidden py-3 sm:table-cell">
          <div className="h-4 max-w-[5rem] rounded-md bg-muted/70" />
        </TableCell>
        <TableCell className="hidden py-3 md:table-cell">
          <div className="h-6 max-w-[7rem] rounded-full bg-muted/60" />
        </TableCell>
        <TableCell className="py-3">
          <div className="h-6 w-[4.25rem] rounded-full bg-muted/70" />
        </TableCell>
        <TableCell className="py-3">
          <div className="h-6 w-[5.5rem] rounded-full bg-muted/60" />
        </TableCell>
        {showAdminCol && (
          <TableCell className="w-11 px-2 py-3">
            <div className="mx-auto h-6 w-6 rounded-md bg-muted/50" />
          </TableCell>
        )}
      </TableRow>
    ))}
  </>
);

/* ── Skeleton cards (mobile) ─────────────────────────────────────── */
const SkeletonCards = () => (
  <div className="divide-y divide-border/50">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-muted" />
            <div className="h-3 w-3/5 rounded-md bg-muted/70" />
          </div>
          <div className="h-4 w-4 rounded bg-muted shrink-0 mt-0.5" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/60" />
          <div className="h-5 w-20 rounded-full bg-muted/50" />
          <div className="h-5 w-14 rounded-full bg-muted/40" />
        </div>
      </div>
    ))}
  </div>
);

/* ── Mobile tender card ──────────────────────────────────────────── */
const TenderCard = ({
  t,
  isBookmarked,
  isAdmin,
  onBookmark,
  onEdit,
  onDelete,
  onClick,
  idx,
}: {
  t: Tender;
  isBookmarked: boolean;
  isAdmin: boolean;
  onBookmark: (id: string, e: React.MouseEvent) => void;
  onEdit: (t: Tender) => void;
  onDelete: (t: Tender) => void;
  onClick: () => void;
  idx: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.25) }}
      className="relative py-4 cursor-pointer active:bg-muted/40 transition-colors border-b  "
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
    >
      <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary/0 transition-colors" />

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBookmark(t.id, e); }}
          className="shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isBookmarked ? "Remove bookmark" : "Save tender"}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-foreground" />
          ) : (
            <Bookmark className="h-4 w-4 opacity-50" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
            {t.title}
          </p>

          {(t.procuring_entity || t.reference_number) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {t.procuring_entity && (
                <span className="line-clamp-1">{t.procuring_entity}</span>
              )}
              {t.reference_number && (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                  {t.reference_number}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <TenderStatusBadge status={t.workflow_status} />
            <DeadlinePill deadline={t.deadline} />
            {t.country && (
              <CountryChip country={t.country} compact />
            )}
            {t.category && (
              <span className="inline-flex max-w-[9rem] rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground">
                <span className="truncate">{t.category}</span>
              </span>
            )}
          </div>

          {t.summary_en && (
            <p className="text-[11px] text-muted-foreground/75 line-clamp-2 mt-1">
              {t.summary_en}
            </p>
          )}
        </div>

        {isAdmin && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Tender actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-sm">
                <DropdownMenuItem onClick={() => onEdit(t)}>
                  <Pencil className="mr-2 h-3 w-3" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(t)}>
                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Main page ───────────────────────────────────────────────────── */
const Tenders = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [deadlineScope, setDeadlineScope] = useState<DeadlineScope>("active");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [editing, setEditing] = useState<Tender | null>(null);
  const [deleting, setDeleting] = useState<Tender | null>(null);

  // Quick view state
  const [quickViewTender, setQuickViewTender] = useState<Tender | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const isAdmin = role === "admin";
  const uid = user?.id ?? getAnonUserId();

  const openQuickView = (t: Tender) => {
    setQuickViewTender(t);
    setQuickViewOpen(true);
  };

  useEffect(() => {
    const tendersChannel = supabase
      .channel("rt:tenders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tenders",
          filter: "enrichment_status=eq.enriched",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tenders-list"] });
          queryClient.invalidateQueries({ queryKey: ["tenders-facets"] });
        }
      )
      .subscribe();

    const bookmarksChannel = supabase
      .channel(`rt:tender_bookmarks:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tender_bookmarks",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tender-bookmarks", uid] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(tendersChannel);
      void supabase.removeChannel(bookmarksChannel);
    };
  }, [queryClient, uid]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const closingSoonMaxIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const applyCommonFilters = (query: any) => {
    let next = query.eq("enrichment_status", "enriched");
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim().replace(/,/g, " ");
      next = next.or(
        `title.ilike.%${s}%,procuring_entity.ilike.%${s}%,reference_number.ilike.%${s}%`
      );
    }
    if (country !== "all") next = next.eq("country", country);
    if (category !== "all") next = next.eq("category", category);
    if (status !== "all") next = next.eq("workflow_status", status);
    if (deadlineScope === "active") next = next.gte("deadline", todayIso);
    if (deadlineScope === "past") next = next.lt("deadline", todayIso);
    return next;
  };

  const tendersQuery = useQuery({
    queryKey: ["tenders-list", page, debouncedSearch, country, category, status, deadlineScope],
    queryFn: async () => {
      let query = applyCommonFilters(
        supabase
        .from("tenders")
        .select("*", { count: "exact" })
        .order("deadline", { ascending: true, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      );

      const { data, error, count } = await query;
      if (error) throw new Error(handleDbError(error));
      return { items: (data as Tender[]) ?? [], total: count ?? 0 };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const facetsQuery = useQuery({
    queryKey: ["tenders-facets", debouncedSearch, country, category, status, deadlineScope],
    queryFn: async () => {
      const s = debouncedSearch.trim().replace(/,/g, " ");

      let countriesQuery = supabase
        .from("tenders")
        .select("country")
        .eq("enrichment_status", "enriched");
      if (s) {
        countriesQuery = countriesQuery.or(
          `title.ilike.%${s}%,procuring_entity.ilike.%${s}%,reference_number.ilike.%${s}%`
        );
      }
      if (category !== "all") countriesQuery = countriesQuery.eq("category", category);
      if (status !== "all") countriesQuery = countriesQuery.eq("workflow_status", status);
      if (deadlineScope === "active") countriesQuery = countriesQuery.gte("deadline", todayIso);
      if (deadlineScope === "past") countriesQuery = countriesQuery.lt("deadline", todayIso);

      let categoriesQuery = supabase
        .from("tenders")
        .select("category")
        .eq("enrichment_status", "enriched");
      if (s) {
        categoriesQuery = categoriesQuery.or(
          `title.ilike.%${s}%,procuring_entity.ilike.%${s}%,reference_number.ilike.%${s}%`
        );
      }
      if (country !== "all") categoriesQuery = categoriesQuery.eq("country", country);
      if (status !== "all") categoriesQuery = categoriesQuery.eq("workflow_status", status);
      if (deadlineScope === "active") categoriesQuery = categoriesQuery.gte("deadline", todayIso);
      if (deadlineScope === "past") categoriesQuery = categoriesQuery.lt("deadline", todayIso);

      const [
        { data: countriesData, error: countriesError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([countriesQuery, categoriesQuery]);

      if (countriesError) throw new Error(handleDbError(countriesError));
      if (categoriesError) throw new Error(handleDbError(categoriesError));

      const countries = [
        ...new Set((countriesData ?? []).map((d) => d.country).filter(Boolean) as string[]),
      ].sort();
      const categories = [
        ...new Set((categoriesData ?? []).map((d) => d.category).filter(Boolean) as string[]),
      ].sort();
      return { countries, categories };
    },
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const bookmarksQuery = useQuery({
    queryKey: ["tender-bookmarks", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_bookmarks")
        .select("tender_id")
        .eq("user_id", uid);
      if (error) throw new Error(handleDbError(error));
      return new Set((data ?? []).map((d) => d.tender_id));
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (bookmarksQuery.data) setBookmarks(bookmarksQuery.data);
  }, [bookmarksQuery.data]);

  useEffect(() => {
    if (tendersQuery.error instanceof Error) toast.error(tendersQuery.error.message);
  }, [tendersQuery.error]);

  useEffect(() => {
    if (facetsQuery.error instanceof Error) toast.error(facetsQuery.error.message);
  }, [facetsQuery.error]);

  useEffect(() => {
    if (bookmarksQuery.error instanceof Error) toast.error(bookmarksQuery.error.message);
  }, [bookmarksQuery.error]);

  useEffect(() => { setPage(0); }, [search, country, category, status, deadlineScope]);

  const statsQuery = useQuery({
    queryKey: ["tenders-stats", debouncedSearch, country, category, status, deadlineScope],
    queryFn: async () => {
      const totalQuery = applyCommonFilters(
        supabase.from("tenders").select("id", { count: "exact", head: true })
      );
      const closingSoonQuery = applyCommonFilters(
        supabase
          .from("tenders")
          .select("id", { count: "exact", head: true })
          .gte("deadline", todayIso)
          .lte("deadline", closingSoonMaxIso)
      );

      const [{ count: totalCount, error: totalError }, { count: soonCount, error: soonError }] =
        await Promise.all([totalQuery, closingSoonQuery]);

      if (totalError) throw new Error(handleDbError(totalError));
      if (soonError) throw new Error(handleDbError(soonError));

      return {
        total: totalCount ?? 0,
        closingSoon: soonCount ?? 0,
      };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const toggleBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const has = bookmarks.has(tenderId);
    if (has) {
      const { error } = await supabase
        .from("tender_bookmarks").delete().eq("user_id", uid).eq("tender_id", tenderId);
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => {
        const n = new Set(b);
        n.delete(tenderId);
        queryClient.setQueryData(["tender-bookmarks", uid], n);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks").insert({ user_id: uid, tender_id: tenderId });
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => {
        const n = new Set(b).add(tenderId);
        queryClient.setQueryData(["tender-bookmarks", uid], n);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("tenders").delete().eq("id", deleting.id);
    if (error) { toast.error(handleDbError(error)); return; }
    toast.success("Tender deleted");
    setDeleting(null);
    queryClient.invalidateQueries({ queryKey: ["tenders-list"] });
  };

  const tenders = tendersQuery.data?.items ?? [];
  const total = tendersQuery.data?.total ?? 0;
  const countries = facetsQuery.data?.countries ?? [];
  const categories = facetsQuery.data?.categories ?? [];
  const loading = tendersQuery.isLoading;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statsTotal = statsQuery.data?.total ?? total;
  const urgentCount = statsQuery.data?.closingSoon ?? 0;

  const activeFilters = [
    country !== "all" && country,
    category !== "all" && category,
    status !== "all" && status,
    deadlineScope !== "active" && (deadlineScope === "past" ? "Past deadline" : "All deadlines"),
  ].filter(Boolean) as string[];

  const countryOptions: FilterOption[] = [
    { value: "all", label: "All countries" },
    ...countries.map((c) => ({ value: c, label: getDisplayCountry(c) })),
  ];

  const categoryOptions: FilterOption[] = [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  const statusOptions: FilterOption[] = [
    { value: "all", label: "All statuses" },
    ...WORKFLOW_STATUSES.map((s) => ({ value: s, label: s })),
  ];

  const deadlineOptions: FilterOption[] = [
    { value: "active", label: "Active deadlines" },
    { value: "past", label: "Past deadlines" },
    { value: "all", label: "All deadlines" },
  ];

  /* ── Shared filter controls ── */
  const FilterControls = ({ compact = false }: { compact?: boolean }) => (
    <>
      <FilterDropdown
        label="Country"
        value={country}
        options={countryOptions}
        onChange={setCountry}
        icon={Globe}
        compact={compact}
        searchable
      />
      <FilterDropdown
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={setCategory}
        icon={Layers}
        compact={compact}
        searchable
      />
      <FilterDropdown
        label="Status"
        value={status}
        options={statusOptions}
        onChange={setStatus}
        icon={Circle}
        compact={compact}
      />
      <FilterDropdown
        label="Deadline"
        value={deadlineScope}
        options={deadlineOptions}
        onChange={(value) => setDeadlineScope(value as DeadlineScope)}
        icon={Calendar}
        compact={compact}
      />
    </>
  );

  return (
    <div className="w-full min-h-0">
      <PageContainer className="space-y-6 sm:space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="page-title">Tenders</h1>
            <p className="text-sm text-muted-foreground">
              Browse and triage live procurement opportunities.
            </p>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto pb-0.5 scrollbar-none">
            <Stat label="Total" value={statsTotal.toLocaleString()} />
            <div className="pl-5 sm:pl-8">
              <Stat label="Closing soon" value={urgentCount} />
            </div>
            <div className="pl-5 sm:pl-8">
              <Stat label="Saved" value={bookmarks.size} />
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/85 backdrop-blur-md border-y border-border/60">
          {/* Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 max-w-[250px] rounded-lg border border-border bg-background">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search title, reference…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm bg-transparent"
              />
            </div>
            <FilterControls />
          </div>

          {/* Mobile */}
          <div className="flex md:hidden gap-2 items-center">
            <div className="relative flex-1 rounded-lg border border-border bg-background">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tenders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-10 text-sm bg-transparent"
              />
            </div>

            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 gap-2 rounded-lg border border-border text-sm shrink-0",
                    activeFilters.length > 0 && "border-primary/60 text-primary bg-primary/5"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilters.length > 0 && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFilters.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
                <SheetHeader className="mb-5">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
                  </div>
                </SheetHeader>
                <div className="space-y-3">
                  <FilterControls compact />
                </div>
                <Button className="mt-6 w-full" onClick={() => setFilterSheetOpen(false)}>
                  Show results
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {(country !== "all" || category !== "all" || status !== "all" || deadlineScope !== "active") && (
            <div className="flex gap-2 flex-wrap mt-3">
              {country !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {getDisplayCountry(country)}
                  <button onClick={() => setCountry("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove country filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {category !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {category}
                  <button onClick={() => setCategory("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove category filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {status !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {status}
                  <button onClick={() => setStatus("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove status filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {deadlineScope !== "active" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {deadlineScope === "past" ? "Past deadline" : "All deadlines"}
                  <button onClick={() => setDeadlineScope("active")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove deadline filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop table (md+) ── */}
        <div className="hidden md:block overflow-hidden bg-background">
          <Table className="z-0 border-separate border-spacing-0">
            <TableHeader className="overflow-hidden bg-muted/35">
              <TableRow className="border-0">
                <TableHead className="sticky top-0 z-10 w-11 border-b border-border/70 bg-muted/55 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-muted/45" />
                <TableHead className="sticky top-0 z-10 min-w-[11rem] border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/45">
                  Tender
                </TableHead>
                <TableHead className="sticky top-0 z-10 hidden w-[7.5rem] border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur sm:table-cell supports-[backdrop-filter]:bg-muted/45">
                  Country
                </TableHead>
                <TableHead className="sticky top-0 z-10 hidden min-w-[4rem] border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur md:table-cell supports-[backdrop-filter]:bg-muted/45">
                  Category
                </TableHead>
                <TableHead className="sticky top-0 z-10 w-[7.75rem] whitespace-nowrap border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/45">
                  Deadline
                </TableHead>
                <TableHead className="sticky top-0 z-10 w-[8.25rem] border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/45">
                  Status
                </TableHead>
                
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <SkeletonTableBody showAdminCol={isAdmin} />
              ) : tenders.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={isAdmin ? 7 : 6} className="h-auto py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                        <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">No tenders found</p>
                        <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                          Try adjusting your search or filters to find what you're looking for.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenders.map((t, idx) => {
                  const isSelected = quickViewTender?.id === t.id && quickViewOpen;
                  const dDays = daysUntil(t.deadline);

                  return (
                    <Fragment key={t.id}>
                      <MotionTableRow
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.012, 0.2) }}
                        tabIndex={0}
                        className={cn(
                          "group cursor-pointer border-b border-border/80 transition-all hover:bg-muted/45",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          idx % 2 === 0 ? "bg-muted/30" : "bg-background",
                          isSelected && "bg-primary/[0.07] border-l-2 border-l-primary"
                        )}
                        onClick={() => openQuickView(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQuickView(t); }
                        }}
                      >
                        <TableCell className="relative w-11 px-3 py-3.5 align-middle">
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary/0 transition-colors group-hover:bg-primary/60" />
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(t.id, e)}
                            className="relative z-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={bookmarks.has(t.id) ? "Remove bookmark" : "Save tender"}
                          >
                            {bookmarks.has(t.id) ? (
                              <BookmarkCheck className="h-4 w-4 text-foreground" />
                            ) : (
                              <Bookmark className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="max-w-[min(48vw,28rem)] py-3.5 pr-4 align-middle lg:max-w-md">
                          <div className="min-w-0 space-y-1">
                            <span className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2 sm:line-clamp-1">
                              {t.title}
                            </span>
                            {(t.procuring_entity || t.reference_number) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                                {t.procuring_entity && (
                                  <span className="line-clamp-1">{t.procuring_entity}</span>
                                )}
                                {t.reference_number && (
                                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                                    {t.reference_number}
                                  </span>
                                )}
                              </div>
                            )}
                           
                          </div>
                        </TableCell>

                        <TableCell className="hidden py-3.5 align-middle text-[13px] text-muted-foreground sm:table-cell">
                          <CountryChip country={t.country} />
                        </TableCell>

                        <TableCell className="hidden py-3.5 align-middle md:table-cell">
                          {t.category ? (
                          <span className="inline-flex max-w-full rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold leading-none text-muted-foreground overflow-hidden">
                          <span className="truncate max-w-[90px] block">
                            {t.category}
                          </span>
                        </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/35">—</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3.5 text-sm">
                          <div className="text-[13px] font-semibold leading-snug text-foreground">{formatDate(t.deadline)}</div>
                          {dDays != null && (
                            <div className={cn(
                              "text-[10px]",
                              dDays < 0 ? "text-destructive" : dDays < 7 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {dDays < 0 ? `${Math.abs(dDays)}d ago` : `in ${dDays}d`}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 align-middle">
                          <TenderStatusBadge status={t.workflow_status} />
                        </TableCell>

                        
                      </MotionTableRow>
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination */}
          <div className="flex items-center justify-between bg-muted/20 px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "No results"
                : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Mobile card list (< md) ── */}
        <div className="md:hidden overflow-hidden ring-1 ring-border/50">
          {loading ? (
            <SkeletonCards />
          ) : tenders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No tenders found</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/50 bg-background">
              {tenders.map((t, idx) => (
                <TenderCard
                  key={t.id}
                  t={t}
                  idx={idx}
                  isBookmarked={bookmarks.has(t.id)}
                  isAdmin={isAdmin}
                  onBookmark={toggleBookmark}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onClick={() => openQuickView(t)}
                />
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          <div className="flex items-center justify-between bg-muted/25 px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "No results"
                : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </PageContainer>

      {/* ── Quick view panel ── */}
      <TenderQuickView
        tender={quickViewTender}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onTenderChanged={() => queryClient.invalidateQueries({ queryKey: ["tenders-list"] })}
      />

      {/* ── Edit dialog ── */}
      <EditTenderDialog
        tender={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["tenders-list"] })}
      />

      {/* ── Delete dialog ── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tender?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tenders;