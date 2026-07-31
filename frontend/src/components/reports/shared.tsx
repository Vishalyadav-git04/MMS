import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const PRF_GROUPS = [
  "PRF-INF-01",
  "PRF-ARTY-02",
  "PRF-ARMD-03",
  "PRF-ASC-04",
  "PRF-ENGR-05",
];

export const HOLDING_TYPES = [
  "Authorised Holding",
  "Temporary Holding",
  "Surplus Holding",
  "Loan Holding",
];

export const ARMS = ["Infantry", "Artillery", "Armoured", "ASC", "Engineers", "Signals"];

export const COMMANDS = [
  "Northern Command",
  "Western Command",
  "Eastern Command",
  "Southern Command",
  "Central Command",
  "South Western Command",
];

export const CORPS = ["I Corps", "II Corps", "III Corps", "IV Corps", "IX Corps", "X Corps"];

export const DIVS = ["Div-1", "Div-2", "Div-3", "Div-4", "Div-9", "Div-10"];

export const BDES = ["Bde-1", "Bde-2", "Bde-3", "Bde-4", "Bde-5"];

export const WPN_CATS = ["Small Arms", "Crew Served Wpn", "Artillery", "Optics & NVDs", "Comn Eqpt"];

export const WPN_SUB_CATS = ["Rifle", "Carbine", "LMG", "MMG", "Mortars", "Radio Sets"];

export const LINE_DTES = ["DGMI", "DGMF", "DGQA", "DGOS", "DG EME"];

export const NODAL_DTES = ["Nodal Dte Inf", "Nodal Dte Arty", "Nodal Dte Armd", "Nodal Dte ASC"];

export const SAMPLE_UNITS = [
  "1 PARA SF",
  "4 JAK RIF",
  "16 DOGRA",
  "7 GRENADIERS",
  "21 MARATHA LI",
  "3 RAJ RIF",
];

export const SAMPLE_ITEMS = [
  "Carbine 5.56mm Folding Stock",
  "LMG 7.62mm Belt Fed",
  "Thermal Imager Hand Held",
  "VHF Radio Set Manpack 25W",
  "Rifle 5.56mm INSAS",
  "MMG 7.62mm MAG",
];

export const DEFAULT_MONTH = "2026-07";

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "--Select--",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** PRF Group: search input + magnifier + dropdown (matches legacy report forms). */
export function PrfGroupField({
  search,
  onSearchChange,
  value,
  onChange,
  options = PRF_GROUPS,
  placeholder = "--All PRF Groups --",
}: {
  search: string;
  onSearchChange: (v: string) => void;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  placeholder?: string;
}) {
  const [filtered, setFiltered] = useState(options);

  const handleSearch = () => {
    const q = search.trim().toLowerCase();
    const next = q ? options.filter((g) => g.toLowerCase().includes(q)) : options;
    setFiltered(next);
    if (!next.length) toast.message("No PRF Group matched");
  };

  return (
    <div className="flex min-w-0 gap-1">
      <div className="flex min-w-0 flex-1 gap-1">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7 shrink-0"
          onClick={handleSearch}
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-w-0 flex-[1.6]">
        <SelectField
          value={value}
          onChange={onChange}
          options={filtered}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

/** Dual list: left = available, right = selected. Click left to add, right to remove. */
export function DualSelectPane({
  available,
  selected,
  onChange,
  searchPlaceholder,
  selectedLabel,
  className,
}: {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder: string;
  selectedLabel: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const remaining = useMemo(
    () => available.filter((a) => !selected.includes(a)),
    [available, selected],
  );

  const matchingAvailable = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((a) => a.toLowerCase().includes(q));
  }, [available, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return remaining;
    return remaining.filter((a) => a.toLowerCase().includes(q));
  }, [remaining, query]);

  const allSelected =
    matchingAvailable.length > 0 && matchingAvailable.every((a) => selected.includes(a));

  const handleSelectAll = (next: boolean) => {
    if (next) {
      const merged = [...selected];
      for (const item of matchingAvailable) {
        if (!merged.includes(item)) merged.push(item);
      }
      onChange(merged);
    } else {
      const remove = new Set(matchingAvailable);
      onChange(selected.filter((s) => !remove.has(s)));
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-hidden", className)}>
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5",
          "bg-[oklch(0.94_0.03_15)]",
        )}
      >
        <label className="flex items-center gap-1.5 text-[13px] font-medium">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => handleSelectAll(v === true)}
            disabled={filtered.length === 0 && selected.length === 0}
          />
          Select all ({matchingAvailable.length})
        </label>
        <Input
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 max-w-[220px] bg-background"
        />
        <span className="ml-auto text-[13px] font-semibold text-foreground">
          {selectedLabel} - {selected.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:flex-row">
        <ListBox
          items={filtered}
          emptyLabel="No items available"
          renderItem={(item) => (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1 text-left text-[13px] hover:bg-muted/50"
              onClick={() => onChange([...selected, item])}
            >
              <span className="truncate">{item}</span>
            </button>
          )}
        />
        <ListBox
          items={selected}
          emptyLabel="No items selected"
          renderItem={(item) => (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1 text-left text-[13px] hover:bg-muted/50"
              onClick={() => onChange(selected.filter((s) => s !== item))}
              title="Click to remove"
            >
              <span className="truncate font-medium">{item}</span>
            </button>
          )}
        />
      </div>
    </div>
  );
}

function ListBox({
  items,
  emptyLabel,
  renderItem,
}: {
  items: string[];
  emptyLabel: string;
  renderItem: (item: string) => ReactNode;
}) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded border border-border bg-background">
      {items.length === 0 ? (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
