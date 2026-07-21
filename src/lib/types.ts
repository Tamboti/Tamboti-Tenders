// Must match the set validated by the set_workflow_status() RPC exactly —
// that function rejects anything else with a 22023 error.
export type WorkflowStatus = "New" | "Review" | "Submitted" | "Awarded" | "Lost" | "Declined";

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "New",
  "Review",
  "Submitted",
  "Awarded",
  "Lost",
  "Declined",
];

export const STATUS_COLORS: Record<string, string> = {
  New: "bg-accent/10 text-accent border-accent/20",
  Review: "bg-warning/10 text-warning border-warning/20",
  Submitted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Awarded: "bg-success/10 text-success border-success/20",
  Lost: "bg-destructive/10 text-destructive border-destructive/20",
  Declined: "bg-muted text-muted-foreground border-border",
};

export type Tender = {
  id: string;
  source: string;
  source_id: string;
  source_url: string | null;
  reference_number: string | null;
  title: string;
  description: string | null;
  // Multilingual fields. title/description are the ORIGINAL text, never
  // overwritten by translation. title_en/description_en are populated by the
  // enrichment pipeline and are null when source_language is already 'en'.
  // title_cs/summary_cs are legacy and intentionally excluded here — read
  // per-language text from tender_translations instead.
  source_language: string | null;
  title_en: string | null;
  description_en: string | null;
  translation_status: string;
  translation_error: string | null;
  translated_at: string | null;
  summary_en: string | null;
  procuring_entity: string | null;
  country: string | null;
  // Resolved by a backend trigger off `country` via country_reference.
  // continent/country_iso2 are null for spellings not yet in that table —
  // that's a data-quality gap, not an out-of-scope signal.
  continent: string | null;
  country_iso2: string | null;
  subregion: string | null;
  category: string | null;
  procurement_type: string | null;
  deadline: string | null;
  publication_date: string | null;
  workflow_status: string;
  enrichment_status: string;
  estimated_value_usd: number | null;
  original_currency: string | null;
  participation_fee: number | null;
  location_region: string | null;
  location_district: string | null;
  lot_count: number | null;
  contract_duration_days: number | null;
  contact_information: string | null;
  scraped_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  raw_data: unknown;
};
