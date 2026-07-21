import { Globe } from "@/components/icons";
import { cn } from "@/lib/utils";
import { resolveCountryDisplay } from "@/lib/countries";
import { useCountryReference } from "@/hooks/use-country-reference";

export const CountryCell = ({
  country,
  countryIso2,
  compact = false,
}: {
  country: string | null | undefined;
  countryIso2?: string | null;
  compact?: boolean;
}) => {
  const { byIso2 } = useCountryReference();
  const { name, iso2 } = resolveCountryDisplay(country, countryIso2, byIso2);
  if (!name) {
    return <span className="text-sm text-muted-foreground/40">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground/90  truncate ",
        compact ? "text-[12px]" : "text-[13px]"
      )}
    >
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm shrink-0", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      )}
      <span className="truncate max-w-[100px] block">{name}</span>
    </span>
  );
};
