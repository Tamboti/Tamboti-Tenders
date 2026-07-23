// Fixed taxonomy for blog posts — matches the CHECK constraint on
// posts.category (see supabase/migrations/20260722140000_add_posts_category.sql).
export const POST_CATEGORIES = [
  "General",
  "Market Trends",
  "Procurement Tips",
  "Country Spotlight",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];
