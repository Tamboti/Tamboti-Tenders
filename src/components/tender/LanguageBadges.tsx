import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getLanguageName, isNonEnglishSource } from "@/lib/tenderLanguage";

export const SourceLanguageBadge = ({
  sourceLanguage,
  className,
}: {
  sourceLanguage: string | null | undefined;
  className?: string;
}) => {
  if (!isNonEnglishSource(sourceLanguage)) return null;
  const code = sourceLanguage!.toLowerCase();
  const name = getLanguageName(code);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
            className
          )}
        >
          {code}
        </span>
      </TooltipTrigger>
      <TooltipContent>Originally published in {name}</TooltipContent>
    </Tooltip>
  );
};

export const TranslationStatusBadge = ({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) => {
  if (status !== "pending" && status !== "failed") return null;
  const label = status === "pending" ? "Translation pending" : "Translation unavailable";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80",
        className
      )}
    >
      {label}
    </span>
  );
};
