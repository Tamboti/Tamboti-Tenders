import { useState } from "react";
import { Calendar as CalendarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string | null; // ISO string, or null for "not set"
  onChange: (iso: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// react-day-picker only picks a day — this pairs it with a plain time input
// (there's no shadcn time picker) inside one popover, so the whole
// date+time selection reads as one shadcn-styled control instead of a bare
// native <input type="datetime-local">.
export const DateTimePicker = ({ value, onChange, placeholder = "Pick a date & time", disabled, className }: DateTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const timeValue = date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "09:00";

  const applyDate = (day: Date | undefined) => {
    if (!day) return;
    const [h, m] = timeValue.split(":").map(Number);
    const next = new Date(day);
    next.setHours(h, m, 0, 0);
    onChange(next.toISOString());
  };

  const applyTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const next = date ? new Date(date) : new Date();
    next.setHours(h, m, 0, 0);
    onChange(next.toISOString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date
            ? date.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={applyDate}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
          initialFocus
        />
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => applyTime(e.target.value)}
            disabled={!date}
            className="h-8 w-auto"
          />
          {date && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
