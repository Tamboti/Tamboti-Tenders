import { cn } from "@/lib/utils";

const GLASS_GRADIENTS = [
  { grad: "radial-gradient(circle at 30% 30%, #6ee7b7, #3b82f6)", fg: "text-white" },
  { grad: "radial-gradient(circle at 70% 30%, #a78bfa, #60a5fa)", fg: "text-white" },
  { grad: "radial-gradient(circle at 30% 70%, #f472b6, #fb923c)", fg: "text-white" },
  { grad: "radial-gradient(circle at 60% 40%, #34d399, #06b6d4)", fg: "text-white" },
  { grad: "radial-gradient(circle at 40% 60%, #818cf8, #c084fc)", fg: "text-white" },
  { grad: "radial-gradient(circle at 70% 70%, #f87171, #fb7185)", fg: "text-white" },
  { grad: "radial-gradient(circle at 20% 50%, #fbbf24, #34d399)", fg: "text-white" },
  { grad: "radial-gradient(circle at 80% 20%, #60a5fa, #a78bfa)", fg: "text-white" },
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
  title,
}: {
  label: string | null | undefined;
  seed?: string;
  className?: string;
  title?: string;
}) => {
  const safe = (label ?? "").trim();
  const initial = (safe[0] ?? "?").toUpperCase();
  const { grad, fg } = GLASS_GRADIENTS[hashString(seed ?? safe ?? "?") % GLASS_GRADIENTS.length];

  return (
    <div
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold relative overflow-hidden",
        fg,
        className
      )}
      style={{ background: grad }}
      title={title}
      aria-hidden="true"
    >
      {/* glass sheen overlay */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 60%)",
        }}
      />
      <span className="relative z-10 drop-shadow-sm">{initial}</span>
    </div>
  );
};