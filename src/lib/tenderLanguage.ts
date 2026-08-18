import { Tender } from "./types";
import { slugify } from "./slug";

// Columns list views actually render. Deliberately excludes `description`
// and `raw_data` (large, unused off the list) — fetch a full row on demand
// (e.g. the edit dialog, the detail page) instead of widening this.
export const TENDER_LIST_COLUMNS =
  "id, title, title_en, source_language, translation_status, procuring_entity, " +
  "reference_number, country, country_iso2, category, deadline, workflow_status, summary_en";

/**
 * The list/detail views always read English where it exists. `title` is the
 * original-language text and is never overwritten by translation, so this is
 * the one place that decides which of the two to show.
 */
export const displayTitle = (t: Pick<Tender, "title" | "title_en">): string =>
  t.title_en ?? t.title;

/**
 * The tender's detail-page path — a title slug ahead of the id purely for
 * readability/SEO (bookmark counts, click-through, etc). The id is what's
 * actually looked up; the route accepts (and prerender/sitemap emit) both
 * `/tender/:id` and `/tender/:id/:slug`, so any or no slug still resolves.
 */
export const tenderPath = (t: Pick<Tender, "id" | "title" | "title_en">): string => {
  const slug = slugify(displayTitle(t));
  return slug ? `/tender/${t.id}/${slug}` : `/tender/${t.id}`;
};

// Broad ISO 639-1 -> English name lookup, used for the "Originally published
// in X" tooltip. source_language is detected freely at enrichment time and
// isn't limited to the languages translate-tender can output (OUTPUT_LANGUAGES
// below), so this list is deliberately wider than that one.
const LANGUAGE_NAMES: Record<string, string> = {
  af: "Afrikaans",
  am: "Amharic",
  ar: "Arabic",
  bg: "Bulgarian",
  bn: "Bengali",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  ha: "Hausa",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  id: "Indonesian",
  ig: "Igbo",
  it: "Italian",
  ja: "Japanese",
  ka: "Georgian",
  km: "Khmer",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  ms: "Malay",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sq: "Albanian",
  sr: "Serbian",
  sv: "Swedish",
  sw: "Swahili",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  yo: "Yoruba",
  zh: "Chinese",
  zu: "Zulu",
};

/** English name for an ISO 639-1 code, falling back to the uppercase code itself. */
export const getLanguageName = (code: string | null | undefined): string => {
  if (!code) return "Unknown";
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
};

export const isNonEnglishSource = (
  sourceLanguage: string | null | undefined
): boolean => !!sourceLanguage && sourceLanguage.toLowerCase() !== "en";

// Languages the translate-tender edge function can produce, in picker order.
export const OUTPUT_LANGUAGES: { code: string; nativeName: string }[] = [
  { code: "en", nativeName: "English" },
  { code: "cs", nativeName: "Čeština" },
  { code: "fr", nativeName: "Français" },
  { code: "pt", nativeName: "Português" },
  { code: "es", nativeName: "Español" },
  { code: "sw", nativeName: "Kiswahili" },
  { code: "de", nativeName: "Deutsch" },
];
