import { Globe } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getCountryIso2, getDisplayCountry } from "@/lib/countries";

export const CountryCell = ({
  country,
  compact = false,
}: {
  country: string | null | undefined;
  compact?: boolean;
}) => {
  const display = getDisplayCountry(country);
  if (!display) {
    return <span className="text-sm text-muted-foreground/40">—</span>;
  }
  const iso2 = getCountryIso2(display);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground/90",
        compact ? "text-[12px]" : "text-[13px]"
      )}
    >
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm shrink-0", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      )}
      <span className="truncate">{display}</span>
    </span>
  );
};
