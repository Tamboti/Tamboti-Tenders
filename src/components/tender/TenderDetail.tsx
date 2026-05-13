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
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { User } from "iconoir-react";
import { Bookmark, BookmarkCheck } from "lucide-react";

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

const LanguageTag = ({ label }: { label: string }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
    {label}
  </span>
);

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

const CountryChip = ({ country }: { country: string | null | undefined }) => {
  const displayCountry = getDisplayCountry(country);
  if (!displayCountry) return null;
  const iso2 = getCountryIso2(displayCountry);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{displayCountry}</span>
    </span>
  );
};

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
    tender.country && {
      icon: Globe,
      label: "Country",
      value: <CountryChip country={tender.country} />,
    },
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
    tender.participation_fee && {
      label: "Participation fee",
      value: `${tender.participation_fee} ${tender.original_currency}`,
    },
    (tender.location_region || tender.location_district) && {
      icon: MapPin,
      label: "Location",
      value: [tender.location_region, tender.location_district]
        .filter(Boolean)
        .join(", "),
    },
    tender.contact_information && {
      icon: User,
      label: "Contact information",
      value: tender.contact_information,
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
        <div className="flex justify-between items-center gap-2">
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

          {tender.source_url && tender.source !== "tanzania" && (
           <a
           href={tender.source_url}
           target="_blank"
           rel="noreferrer"
           className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
         >
           <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
           View source
         </a>
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
          <div className="space-y-3 ">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                
                <h3 className="text-xs font-semibold tracking-wide text-foreground">
                  AI summary
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {tender.summary_en && <LanguageTag label="English (EN)" />}
                {tender.summary_cs && <LanguageTag label="Czech (CS)" />}
              </div>
            </div>

            <div className="rounded-r-md border-l-4 border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-muted/30 px-4 py-3.5 shadow-sm">
              <div className="space-y-3">
                {tender.summary_en && (
                  <div className="space-y-1.5">
                    {tender.summary_cs && (
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        English (EN)
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {tender.summary_en}
                    </p>
                  </div>
                )}

                {tender.summary_en && tender.summary_cs && (
                  <hr className="border-border/60" />
                )}

                {tender.summary_cs && (
                  <div className="space-y-1.5">
                    {tender.summary_en && (
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Czech (CS)
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {tender.summary_cs}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
