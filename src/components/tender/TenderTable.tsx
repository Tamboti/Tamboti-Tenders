import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, Clock, MoreHorizontal, Pencil, Trash2 } from "@/components/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tender } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate, daysUntil } from "@/lib/format";
import { CountryCell } from "./CountryCell";

const MotionRow = motion(TableRow);

const StatusDot = ({ status }: { status: string }) => {
  const v = status.toLowerCase();
  let textTone = "text-muted-foreground";
  let dotClass = "bg-muted-foreground/60";
  if (v.includes("awarded") || v.includes("won") || v.includes("completed")) {
    textTone = "text-emerald-700 dark:text-emerald-400";
    dotClass = "bg-emerald-500";
  } else if (v.includes("review") || v.includes("shortlist") || v.includes("progress")) {
    textTone = "text-sky-700 dark:text-sky-400";
    dotClass = "bg-sky-500";
  } else if (v.includes("draft") || v.includes("new") || v.includes("open")) {
    textTone = "text-violet-700 dark:text-violet-400";
    dotClass = "bg-violet-500";
  } else if (v.includes("submitted") || v.includes("pending")) {
    textTone = "text-amber-700 dark:text-amber-400";
    dotClass = "bg-amber-500";
  } else if (v.includes("cancel") || v.includes("lost") || v.includes("closed")) {
    textTone = "text-rose-700 dark:text-rose-400";
    dotClass = "bg-rose-500";
  }
  return (
    <span className={cn("inline-flex items-center gap-2 text-[12px] font-medium", textTone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      <span className="truncate">{status}</span>
    </span>
  );
};

const DeadlineCell = ({ deadline }: { deadline: string | null }) => {
  const d = daysUntil(deadline);
  if (!deadline) return <span className="text-muted-foreground/40 text-sm">—</span>;
  const tone =
    d == null
      ? "text-muted-foreground"
      : d < 0
      ? "text-destructive"
      : d <= 7
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";
  const rel =
    d == null ? null : d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "today" : `in ${d}d`;
  return (
    <div className="leading-tight">
      <div className="text-[13px] font-medium text-foreground tabular-nums">{formatDate(deadline)}</div>
      {rel && (
        <div className={cn("mt-0.5 inline-flex items-center gap-1 text-[11px] tabular-nums", tone)}>
          <Clock className="h-2.5 w-2.5" /> {rel}
        </div>
      )}
    </div>
  );
};

export type TenderTableAction = {
  type: "bookmark-toggle" | "bookmark-remove";
  isBookmarked: boolean;
};

export type TenderTableProps = {
  tenders: Tender[];
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (t: Tender) => void;
  isSelected?: (t: Tender) => boolean;
  // Leading bookmark column behaviour
  leadingAction: (t: Tender) => TenderTableAction;
  onLeadingAction: (t: Tender, e: React.MouseEvent) => void;
  // Optional admin actions menu
  showActions?: boolean;
  onEdit?: (t: Tender) => void;
  onDelete?: (t: Tender) => void;
};

const HeaderCell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <TableHead
    className={cn(
      "h-9 border-b border-border/60 bg-muted/20 px-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/80",
      className
    )}
  >
    {children}
  </TableHead>
);

const SkeletonRows = ({ cols }: { cols: number }) => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse hover:bg-transparent border-b border-border/40">
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j} className="px-4 py-3.5">
            <div className={cn("h-3.5 rounded bg-muted/70", j === 1 ? "w-3/4" : "w-20")} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export const TenderTable = ({
  tenders,
  loading,
  emptyState,
  onRowClick,
  isSelected,
  leadingAction,
  onLeadingAction,
  showActions,
  onEdit,
  onDelete,
}: TenderTableProps) => {
  const cols = 6 ;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-border/60">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse p-4 space-y-3">
              <div className="h-3.5 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted/70" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-muted/60" />
                <div className="h-5 w-20 rounded-full bg-muted/50" />
              </div>
            </div>
          ))
        ) : tenders.length === 0 ? (
          emptyState ?? (
            <div className="py-16 text-center text-sm text-muted-foreground">No tenders found.</div>
          )
        ) : (
          tenders.map((t) => {
            const action = leadingAction(t);
            const selected = isSelected?.(t) ?? false;
            const d = daysUntil(t.deadline);
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onRowClick?.(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick?.(t);
                  }
                }}
                className={cn(
                  "relative px-4 py-3.5 active:bg-muted/40 transition-colors",
                  selected && "bg-primary/5"
                )}
              >
                {selected && (
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-primary" />
                )}
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[14px] font-medium leading-snug text-foreground line-clamp-2">
                      {t.title}
                    </div>
                    {t.procuring_entity && (
                      <div className="text-[12px] text-muted-foreground line-clamp-1">
                        {t.procuring_entity}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                      <CountryCell country={t.country} compact />
                      {t.category && (
                        <span className="text-[11.5px] text-muted-foreground/80 truncate max-w-[10rem]">
                          {t.category}
                        </span>
                      )}
                      <StatusDot status={t.workflow_status} />
                    </div>
                    {t.deadline && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] tabular-nums pt-0.5",
                          d == null
                            ? "text-muted-foreground"
                            : d < 0
                            ? "text-destructive"
                            : d <= 7
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {formatDate(t.deadline)}
                        {d != null && (
                          <span className="opacity-70">
                            · {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "today" : `in ${d}d`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onLeadingAction(t, e)}
                    className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={action.isBookmarked ? "Remove bookmark" : "Save tender"}
                  >
                    {action.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-foreground" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Table className="border-separate border-spacing-0 hidden md:table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <HeaderCell className="w-10 px-3" />
            <HeaderCell>Tender</HeaderCell>
            <HeaderCell className="w-[10rem]">Country</HeaderCell>
            <HeaderCell className="w-[8rem]">Category</HeaderCell>
            <HeaderCell className="w-[8rem]">Deadline</HeaderCell>
            <HeaderCell className="w-[9rem]">Status</HeaderCell>
           
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <SkeletonRows cols={cols} />
          ) : tenders.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={cols} className="p-0">
                {emptyState ?? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No tenders found.</div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            tenders.map((t, idx) => {
              const action = leadingAction(t);
              const selected = isSelected?.(t) ?? false;
              return (
                <MotionRow
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.012, 0.18) }}
                  tabIndex={0}
                  className={cn(
                    "group cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-primary/5"
                  )}
                  onClick={() => onRowClick?.(t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick?.(t);
                    }
                  }}
                >
                  <TableCell className="relative w-10 px-3 py-3.5 align-middle">
                    {selected && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => onLeadingAction(t, e)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={action.isBookmarked ? "Remove bookmark" : "Save tender"}
                    >
                      {action.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-foreground" />
                      ) : (
                        <Bookmark className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="max-w-[35rem] px-4 py-3.5 align-middle">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[13.5px] font-medium leading-snug text-foreground line-clamp-1">
                        {t.title}
                      </div>
                      {(t.procuring_entity || t.reference_number) && (
                        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                          {t.procuring_entity && (
                            <span className="line-clamp-1">{t.procuring_entity}</span>
                          )}
                          {t.procuring_entity && t.reference_number && (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                          {t.reference_number && (
                            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70 shrink-0">
                              {t.reference_number}
                            </span>
                          )}
                        </div>
                      )}
                      {t.summary_en && (
                      <div className="space-y-2">
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                        {t.summary_en}
                      </p>
                    </div>
                    )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3.5 align-middle">
                    <CountryCell country={t.country} />
                  </TableCell>

                  <TableCell className="px-4 py-3.5 align-middle">
                    {t.category ? (
                      <span className="inline-block max-w-[7.5rem] truncate text-[12px] text-foreground/80">
                        {t.category}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/40">—</span>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <DeadlineCell deadline={t.deadline} />
                  </TableCell>

                  <TableCell className="px-4 py-3.5 align-middle">
                    <StatusDot status={t.workflow_status} />
                  </TableCell>


                </MotionRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
