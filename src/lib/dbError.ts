// Sanitises Supabase/Postgres errors so internal schema, constraint names,
// and RLS policy names aren't leaked to end users via toasts.
export function handleDbError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (import.meta.env.DEV) {
    // Keep full detail in dev for debugging.
    // eslint-disable-next-line no-console
    console.error("[db error]", error);
  }
  const code = (error as any)?.code as string | undefined;
  switch (code) {
    case "23505":
      return "This item already exists.";
    case "23503":
      return "Related record is missing.";
    case "23514":
      return "Some values are invalid.";
    case "42501":
    case "PGRST301":
      return "You don't have permission to do that.";
    default:
      return fallback;
  }
}
