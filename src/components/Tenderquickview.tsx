import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tender } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { daysUntil, formatDate } from "@/lib/format";
import { ArrowRight, Building2, Globe, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenderQuickViewProps {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenderChanged: () => void;
}

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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[12px] text-muted-foreground">
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{displayCountry}</span>
    </span>
  );
};

const DeadlinePill = ({ deadline }: { deadline: string | null }) => {
  const d = daysUntil(deadline);
  if (d == null) return null;
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
      {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : `${d}d left`}
    </span>
  );
};

export const TenderQuickView = ({
  tender,
  open,
  onOpenChange,
}: TenderQuickViewProps) => {
  const navigate = useNavigate();

  const goToFullPage = () => {
    onOpenChange(false);
    navigate(`/tender/${tender?.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md border-l border-border/60"
      >
        {tender && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Quick view
              </span>
              
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Status + deadline */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tender.workflow_status} />
                <DeadlinePill deadline={tender.deadline} />
                {tender.deadline && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(tender.deadline)}
                  </span>
                )}
              </div>

              {/* Title + translation */}
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {tender.title}
                </h2>
                {tender.title_cs && (
                  <p className="text-[13px] leading-snug text-muted-foreground">
                    {tender.title_cs}
                  </p>
                )}
              </div>

              {/* Entity + country */}
              <div className="space-y-3">
                {tender.procuring_entity && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
                    <span className="text-[13px] text-foreground leading-snug">
                      {tender.procuring_entity}
                    </span>
                  </div>
                )}
                {tender.country && (
                  <div className="flex items-center gap-2.5">
                    <CountryChip country={tender.country} />
                  </div>
                )}
              </div>

              {/* Summaries */}
              {(tender.summary_en || tender.summary_cs) && (
                <>
                  <div className="border-t border-border/40" />
                  <div className="space-y-4">
                    {tender.summary_en && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Summary (EN)
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {tender.summary_en}
                        </p>
                      </div>
                    )}
                    {tender.summary_cs && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Summary (CS)
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {tender.summary_cs}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-6 py-5 border-t border-border/50">
              <Button className="w-full gap-2 h-10" onClick={goToFullPage}>
                View full details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};