import { cn } from "@/lib/utils";

const COLOR_PAIRS = [
  { bg: "bg-indigo-500/15", fg: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-emerald-500/15", fg: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-sky-500/15", fg: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-amber-500/15", fg: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-fuchsia-500/15", fg: "text-fuchsia-700 dark:text-fuchsia-300" },
  { bg: "bg-rose-500/15", fg: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-teal-500/15", fg: "text-teal-700 dark:text-teal-300" },
];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const AvatarInitial = ({
  label,
  seed,
  className,
}: {
  label: string | null | undefined;
  seed?: string;
  className?: string;
}) => {
  const safe = (label ?? "").trim();
  const initial = (safe[0] ?? "?").toUpperCase();
  const colors = COLOR_PAIRS[hashString(seed ?? safe ?? "?") % COLOR_PAIRS.length];

  return (
    <div
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-[12px] font-semibold",
        colors.bg,
        colors.fg,
        className
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
};

