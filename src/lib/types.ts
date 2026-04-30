export type WorkflowStatus = "New" | "Reviewing" | "Bidding" | "Submitted" | "Won" | "Lost" | "Ignored";

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "New",
  "Reviewing",
  "Bidding",
  "Submitted",
  "Won",
  "Lost",
  "Ignored",
];

export const STATUS_COLORS: Record<string, string> = {
  New: "bg-accent/10 text-accent border-accent/20",
  Reviewing: "bg-warning/10 text-warning border-warning/20",
  Bidding: "bg-primary/10 text-primary border-primary/20",
  Submitted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Won: "bg-success/10 text-success border-success/20",
  Lost: "bg-destructive/10 text-destructive border-destructive/20",
  Ignored: "bg-muted text-muted-foreground border-border",
};

export type Tender = {
  id: string;
  source: string;
  source_id: string;
  source_url: string | null;
  reference_number: string | null;
  title: string;
  title_cs: string | null;
  description: string | null;
  summary_en: string | null;
  summary_cs: string | null;
  procuring_entity: string | null;
  country: string | null;
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
  scraped_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  raw_data: unknown;
};
