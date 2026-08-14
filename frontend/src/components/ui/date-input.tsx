import { useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  dmyToIso,
  isoToDmy,
  isFutureDate,
  isFutureMonth,
  isInvalidDateText,
  maskDmyInput,
  toDmyDisplay,
  toIsoDate,
} from "@/lib/date";
import { cn } from "@/lib/utils";

type DateInputProps = {
  value: string;
  /** Emits ISO `yyyy-mm-dd` (or `""` when cleared / incomplete / invalid). */
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  allowFuture?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
};

type MonthInputProps = {
  value: string;
  /** Emits `yyyy-mm` (or `""` when cleared). */
  onChange: (yearMonth: string) => void;
  disabled?: boolean;
  allowFuture?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const YM_RE = /^(\d{4})-(\d{2})$/;
const MY_RE = /^(\d{2})\/(\d{4})$/;

function parseYearMonth(value: string): { year: number; month: number } | null {
  const v = value.trim();
  const iso = YM_RE.exec(v);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
    return null;
  }
  const my = MY_RE.exec(v);
  if (my) {
    const month = Number(my[1]);
    const year = Number(my[2]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  return null;
}

function toYearMonth(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function yearMonthToDisplay(value: string): string {
  const parsed = parseYearMonth(value);
  if (!parsed) return "";
  return `${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
}

function maskMyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  const mm = digits.slice(0, 2);
  const yyyy = digits.slice(2, 6);
  let out = mm;
  if (yyyy) out += `/${yyyy}`;
  return out;
}

function FieldIconButton({
  disabled,
  onOpen,
}: {
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-date-calendar=""
      tabIndex={-1}
      disabled={disabled}
      aria-label="Open calendar"
      className={cn(
        "absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      <CalendarIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
    </button>
  );
}

/**
 * Date field: display/entry as dd/mm/yyyy, calendar icon flush right,
 * click anywhere opens a compact calendar, manual typing allowed.
 */
export function DateInput({
  value,
  onChange,
  disabled = false,
  allowFuture = false,
  className,
  id,
  name,
  placeholder = "dd/mm/yyyy",
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => toDmyDisplay(value));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(toDmyDisplay(value));
  }, [value]);

  const iso = toIsoDate(value);
  const selected = iso !== "" ? parse(iso, "yyyy-MM-dd", new Date()) : undefined;
  const validSelected =
    selected && !Number.isNaN(selected.getTime()) ? selected : undefined;

  const invalid = isInvalidDateText(text, allowFuture);

  const commitText = (raw: string) => {
    const masked = maskDmyInput(raw);
    setText(masked);

    if (masked === "") {
      onChange("");
      return;
    }

    if (masked.length === 10) {
      const next = dmyToIso(masked);
      if (next) {
        if (!allowFuture && isFutureDate(next)) {
          if (value) onChange("");
          return;
        }
        onChange(next);
        setText(isoToDmy(next));
        return;
      }
    }

    if (value) onChange("");
  };

  const openCalendar = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div
          ref={containerRef}
          className={cn("relative w-full min-w-[9.5rem]", className)}
          data-date-invalid={invalid ? "true" : "false"}
          onClick={(e) => {
            if (disabled) return;
            if ((e.target as HTMLElement).closest("[data-date-calendar]")) return;
            setOpen(true);
          }}
        >
          <Input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={text}
            maxLength={10}
            data-date-input=""
            aria-invalid={invalid || undefined}
            className={cn(
              "pr-7",
              className,
              invalid && "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(e) => commitText(e.target.value)}
            onFocus={openCalendar}
            onBlur={() => {
              if (!text) {
                onChange("");
                return;
              }
              if (text.length === 10) {
                const next = dmyToIso(text);
                if (next && (allowFuture || !isFutureDate(next))) {
                  onChange(next);
                  setText(isoToDmy(next));
                  return;
                }
              }
              setText(toDmyDisplay(value));
            }}
            onKeyDown={(e) => {
              if (e.key === "F4" || (e.altKey && e.key === "ArrowDown")) {
                e.preventDefault();
                openCalendar();
              }
            }}
          />
          <FieldIconButton disabled={disabled} onOpen={openCalendar} />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-auto p-0"
        align="end"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          className="p-2 [--cell-size:1.5rem] text-xs"
          selected={validSelected}
          defaultMonth={validSelected}
          startMonth={new Date(1990, 0)}
          endMonth={new Date(new Date().getFullYear() + 10, 11)}
          disabled={
            allowFuture
              ? undefined
              : (date) => {
                  const todayEnd = new Date();
                  todayEnd.setHours(23, 59, 59, 999);
                  return date.getTime() > todayEnd.getTime();
                }
          }
          onSelect={(day) => {
            if (!day) return;
            const next = format(day, "yyyy-MM-dd");
            onChange(next);
            setText(isoToDmy(next));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Month field for reports/period filters.
 * Display/entry as mm/yyyy; value stored as yyyy-mm.
 * Click anywhere opens a compact month picker; icon sits at the right corner.
 */
export function MonthInput({
  value,
  onChange,
  disabled = false,
  allowFuture = false,
  className,
  id,
  name,
  placeholder = "mm/yyyy",
}: MonthInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => yearMonthToDisplay(value));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(yearMonthToDisplay(value));
  }, [value]);

  const selected = parseYearMonth(value);
  const viewYear = selected?.year ?? new Date().getFullYear();
  const [pickerYear, setPickerYear] = useState(viewYear);
  useEffect(() => {
    if (open) setPickerYear(viewYear);
  }, [open, viewYear]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const invalid = (() => {
    const t = text.trim();
    if (!t) return false;
    if (t.length < 7) return true;
    const parsed = parseYearMonth(t);
    if (!parsed) return true;
    if (!allowFuture && isFutureMonth(t)) return true;
    return false;
  })();

  const commitText = (raw: string) => {
    const masked = maskMyInput(raw);
    setText(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    if (masked.length === 7) {
      const parsed = parseYearMonth(masked);
      if (parsed) {
        const ym = toYearMonth(parsed.year, parsed.month);
        if (!allowFuture && isFutureMonth(ym)) {
          if (value) onChange("");
          return;
        }
        onChange(ym);
        setText(yearMonthToDisplay(ym));
        return;
      }
    }
    if (value) onChange("");
  };

  const openPicker = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div
          ref={containerRef}
          className={cn("relative w-full min-w-[8.5rem]", className)}
          data-date-invalid={invalid ? "true" : "false"}
          onClick={(e) => {
            if (disabled) return;
            if ((e.target as HTMLElement).closest("[data-date-calendar]")) return;
            setOpen(true);
          }}
        >
          <Input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={text}
            maxLength={7}
            data-date-input=""
            aria-invalid={invalid || undefined}
            className={cn(
              "pr-7",
              invalid && "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(e) => commitText(e.target.value)}
            onFocus={openPicker}
            onBlur={() => {
              if (!text) {
                onChange("");
                return;
              }
              if (text.length === 7) {
                const parsed = parseYearMonth(text);
                if (parsed) {
                  const next = toYearMonth(parsed.year, parsed.month);
                  if (allowFuture || !isFutureMonth(next)) {
                    onChange(next);
                    setText(yearMonthToDisplay(next));
                    return;
                  }
                }
              }
              setText(yearMonthToDisplay(value));
            }}
          />
          <FieldIconButton disabled={disabled} onOpen={openPicker} />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[16rem] p-2"
        align="end"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            data-date-calendar=""
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setPickerYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <div className="text-sm font-semibold tabular-nums">{pickerYear}</div>
          <button
            type="button"
            data-date-calendar=""
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setPickerYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTH_LABELS.map((label, idx) => {
            const month = idx + 1;
            const active =
              selected?.year === pickerYear && selected?.month === month;
            const isMonthFuture =
              !allowFuture &&
              (pickerYear > currentYear ||
                (pickerYear === currentYear && month > currentMonth));
            return (
              <button
                key={label}
                type="button"
                data-date-calendar=""
                disabled={isMonthFuture}
                className={cn(
                  "h-8 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isMonthFuture && "text-muted-foreground opacity-80 pointer-events-none cursor-not-allowed select-none",
                )}
                onClick={() => {
                  if (isMonthFuture) return;
                  const next = toYearMonth(pickerYear, month);
                  onChange(next);
                  setText(yearMonthToDisplay(next));
                  setOpen(false);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
