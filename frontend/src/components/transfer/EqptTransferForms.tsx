import { useEffect, useMemo, useRef, useState } from "react";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Search } from "lucide-react";
import { api, uploadFileApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pageHasInvalidDateInputs } from "@/lib/date";

const UNIT_OPTIONS = [
  "1941005A - 13 PUNJAB",
  "1942103B - 5 SIKH",
  "1950012C - 2 RAJPUT",
  "1960408D - 9 GARH RIF",
];

const INTER_UNIT_OPTIONS = [
  "UN-1001 - 1 PARA SF",
  "UN-1002 - 4 JAK RIF",
  "UN-1003 - 16 DOGRA",
  "UN-1004 - 7 GRENADIERS",
  "UN-1005 - 21 MARATHA LI",
];

const DEPOT_OPTIONS = [
  "DEP-001 - COD Delhi",
  "DEP-002 - COD Mumbai",
  "DEP-003 - AOD Pathankot",
  "DEP-004 - COD Jabalpur",
];

const HOLDING_TYPES = ["Authorised Holding", "Temporary Holding", "Surplus Holding", "Loan Holding"];
const EQPT_TYPES = ["Small Arms", "Crew Served Wpn", "Optics & NVDs", "Comn Eqpt"];
const PRF_GROUPS = ["PRF-INF-01", "PRF-ARTY-02", "PRF-ARMD-03", "PRF-ASC-04"];
const NOMENCLATURES = [
  "CN-88421 — Carbine 5.56mm Folding Stock",
  "CN-90215 — LMG 7.62mm Belt Fed",
  "CN-77109 — Thermal Imager Hand Held",
  "CN-65033 — VHF Radio Set Manpack 25W",
];

/** Sample regns until transfer list API is wired */
const MOCK_REGN_POOL = [
  "REGN-IN-24001",
  "REGN-IN-24002",
  "REGN-IN-24007",
  "REGN-IN-24115",
  "REGN-IN-24128",
  "REGN-IN-24201",
  "REGN-IN-24244",
  "REGN-IN-24309",
];

function SelectField({
  value,
  onChange,
  options,
  placeholder = "--Select--",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
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

function UnitLookup({
  label,
  search,
  onSearchChange,
  unit,
  onUnitChange,
  options,
  onSearch,
  className,
}: {
  label: string;
  search: string;
  onSearchChange: (v: string) => void;
  unit: string;
  onUnitChange: (v: string) => void;
  options: string[];
  onSearch: () => void;
  className?: string;
}) {
  return (
    <FormRow label={label} required className={className}>
      <div className="flex gap-1">
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
            onClick={onSearch}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="min-w-0 flex-[1.4]">
          <SelectField
            value={unit}
            onChange={onUnitChange}
            options={options}
            placeholder="--Select Unit--"
          />
        </div>
      </div>
    </FormRow>
  );
}

function RegnListBox({
  items,
  checked,
  onToggle,
  emptyLabel,
}: {
  items: string[];
  checked: Set<string>;
  onToggle: (regn: string, next: boolean) => void;
  emptyLabel: string;
}) {
  return (
    <div className="h-36 overflow-y-auto rounded border border-border bg-background">
      {items.length === 0 ? (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((regn) => (
            <li key={regn}>
              <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[13px] hover:bg-muted/50">
                <Checkbox
                  checked={checked.has(regn)}
                  onCheckedChange={(v) => onToggle(regn, v === true)}
                />
                <span className="truncate font-medium">{regn}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Single-field unit/depot picker: type to filter, pick from up to 10 live
 * suggestions. Replaces the old "search box + search button + separate
 * select dropdown" combo everywhere a Parent/Receiving Unit is chosen.
 *
 * Filtering itself is always local (against sus_no / unit_name / display in
 * `options`), so it works immediately even for screens that only ever load
 * one full list. Pass `onQueryChange` when the screen also wants to refresh
 * `options` from the server as the user types (e.g. Receiving Unit, which
 * re-queries `?search=`) — it's called debounced, 300ms after the user stops
 * typing.
 */
function UnitAutocomplete<T extends { sus_no: string; unit_name: string; display: string }>({
  value,
  onChange,
  options,
  onQueryChange,
  placeholder = "Search unit...",
  disabled = false,
}: {
  value: string;
  onChange: (susNo: string) => void;
  options: T[];
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Right after picking a suggestion the box keeps focus, and without this
  // guard that focus (plus Radix returning focus on close) briefly reopens
  // the popover a beat after it closes — a visible open/close "flicker".
  const suppressReopenRef = useRef(false);

  const selected = useMemo(() => options.find((o) => o.sus_no === value), [options, value]);

  // Reflect the selected unit's label whenever it changes from outside
  // (a fresh pick, or the parent clearing it) as long as the user isn't
  // mid-edit in this box.
  useEffect(() => {
    if (!open) setText(selected ? selected.display : "");
  }, [selected, open]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const suggestions = useMemo(() => {
    const q = text.trim().toUpperCase();
    const isSelectedText = selected && q === selected.display.trim().toUpperCase();
    const matches = !q || isSelectedText
      ? options
      : options.filter(
          (o) =>
            o.sus_no.toUpperCase().includes(q) ||
            o.unit_name.toUpperCase().includes(q) ||
            o.display.toUpperCase().includes(q),
        );
    return matches.slice(0, 10);
  }, [options, text, selected]);

  return (
    // Popover renders its content in a portal on document.body (same as the
    // date-picker calendar), so the suggestion list floats above the panel
    // and its footer instead of getting clipped by the panel's own
    // `overflow: hidden` — a plain absolutely-positioned <div> here would
    // still get cut off at the panel edge no matter what z-index it has.
    <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div ref={containerRef} className="relative w-full">
          <Input
            placeholder={placeholder}
            value={text}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              setOpen(true);
              if (value) onChange("");
              if (onQueryChange) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => onQueryChange(next), 300);
              }
            }}
            onFocus={() => {
              if (suppressReopenRef.current) return;
              setOpen(true);
            }}
            onClick={() => {
              if (suppressReopenRef.current) return;
              setOpen(true);
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
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
        {suggestions.length === 0 ? (
          <p className="px-2.5 py-2 text-[12px] text-muted-foreground">No matching units</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto py-1">
            {suggestions.map((o) => (
              <li key={o.sus_no}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center px-2.5 py-1.5 text-left text-[13px] hover:bg-muted",
                    o.sus_no === value && "bg-muted font-medium",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.sus_no);
                    setText(o.display);
                    setOpen(false);
                    suppressReopenRef.current = true;
                    setTimeout(() => {
                      suppressReopenRef.current = false;
                    }, 250);
                  }}
                >
                  <span className="truncate">{o.display}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface TransferFormProps {
  title: string;
  parentLabel: string;
  receivingLabel: string;
  parentOptions: string[];
  receivingOptions: string[];
  showRvFields?: boolean;
  holdingOptions?: string[];
  eqptOptions?: string[];
  prfOptions?: string[];
  nomenclatureOptions?: string[];
  initialRvDate?: string;
}

function TransferForm({
  title,
  parentLabel,
  receivingLabel,
  parentOptions,
  receivingOptions,
  showRvFields = false,
  holdingOptions = ["Authorised", "Surplus", "Deficit", "Loan"],
  eqptOptions = ["Weapon", "Vehicle", "Communication", "Optics"],
  prfOptions = ["Group A", "Group B", "Group C"],
  nomenclatureOptions = [
    "Rifle 5.56mm Assault",
    "Machine Gun 7.62mm Light",
    "Night Vision Sight Gen III",
    "Radio Set VHF Manpack",
  ],
  initialRvDate = "2026-07-24",
}: TransferFormProps) {
  const [parentSearch, setParentSearch] = useState("");
  const [parentUnit, setParentUnit] = useState("");
  const [parentHolding, setParentHolding] = useState("");
  const [parentEqpt, setParentEqpt] = useState("");
  const [prfGroup, setPrfGroup] = useState("");
  const [nomenclature, setNomenclature] = useState("");
  const [rvNo, setRvNo] = useState("");
  const [rvDate, setRvDate] = useState(initialRvDate);
  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingUnit, setReceivingUnit] = useState("");
  const [receivingHolding, setReceivingHolding] = useState("");
  const [receivingEqpt, setReceivingEqpt] = useState("");

  const [listLoaded, setListLoaded] = useState(false);
  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");

  const filteredAvailable = useMemo(() => {
    const q = regnSearch.trim().toLowerCase();
    if (!q) return availableRegns;
    return availableRegns.filter((r) => r.toLowerCase().includes(q));
  }, [availableRegns, regnSearch]);

  const allFilteredSelected =
    filteredAvailable.length > 0 && filteredAvailable.every((r) => checkedAvailable.has(r));

  const resetRegnSelection = () => {
    setListLoaded(false);
    setAvailableRegns([]);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
  };

  const handleGetRegn = () => {
    if (pageHasInvalidDateInputs()) {
      return toast.error("Please enter a valid date (dd/mm/yyyy)");
    }
    if (
      !parentUnit ||
      !parentHolding ||
      !parentEqpt ||
      !prfGroup ||
      !nomenclature ||
      !receivingUnit ||
      !receivingHolding ||
      !receivingEqpt ||
      (showRvFields && (!rvNo || !rvDate))
    ) {
      return toast.error("Please fill all required fields");
    }

    // UI placeholder — mock regns until backend list API is wired
    const seed = (parentUnit.length + nomenclature.length) % MOCK_REGN_POOL.length;
    const count = 3 + (seed % 4);
    const fetched = Array.from({ length: count }, (_, i) => MOCK_REGN_POOL[(seed + i) % MOCK_REGN_POOL.length]);

    setAvailableRegns(fetched);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
    setListLoaded(true);
    toast.success(`${fetched.length} registration number(s) found`);
  };

  const toggleAvailable = (regn: string, next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const toggleTransfer = (regn: string, next: boolean) => {
    setCheckedTransfer((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const handleSelectAll = (next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      for (const r of filteredAvailable) {
        if (next) n.add(r);
        else n.delete(r);
      }
      return n;
    });
  };

  const moveToTransfer = () => {
    const moving = availableRegns.filter((r) => checkedAvailable.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to transfer");
      return;
    }
    setAvailableRegns((prev) => prev.filter((r) => !checkedAvailable.has(r)));
    setTransferRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedAvailable(new Set());
  };

  const moveBackToAvailable = () => {
    const moving = transferRegns.filter((r) => checkedTransfer.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to move back");
      return;
    }
    setTransferRegns((prev) => prev.filter((r) => !checkedTransfer.has(r)));
    setAvailableRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedTransfer(new Set());
  };

  const handleSubmit = () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }
    toast.message(
      `Submit ${transferRegns.length} Regn No(s) — functionality coming soon`,
    );
  };

  return (
    <FormPanel
      title={title}
      fill
      footer={
        <>
          <Button type="button" onClick={handleGetRegn}>
            Get Regn List
          </Button>
          {listLoaded && (
            <>
              <Button variant="secondary" onClick={resetRegnSelection}>
                Clear List
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={transferRegns.length === 0}
              >
                Submit
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <FormSection title="Parent unit details" />
        <UnitLookup
          label={parentLabel}
          search={parentSearch}
          onSearchChange={setParentSearch}
          unit={parentUnit}
          onUnitChange={setParentUnit}
          options={parentOptions}
          onSearch={() => toast.success(`Searching ${parentLabel}...`)}
          className="mb-5"
        />
        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <SelectField
              value={parentHolding}
              onChange={setParentHolding}
              options={holdingOptions}
              placeholder="--Select Type of Holding--"
            />
          </FormRow>
          <FormRow label="Type of Eqpt" required>
            <SelectField value={parentEqpt} onChange={setParentEqpt} options={eqptOptions} />
          </FormRow>
          <FormRow label="PRF Group" required>
            <SelectField
              value={prfGroup}
              onChange={setPrfGroup}
              options={prfOptions}
              placeholder="--Select PRF Group--"
            />
          </FormRow>
          <FormRow label="Nomenclature" required>
            <SelectField
              value={nomenclature}
              onChange={setNomenclature}
              options={nomenclatureOptions}
              placeholder="--Select Census--"
            />
          </FormRow>
          {showRvFields && (
            <>
              <FormRow label="RV No" required>
                <Input
                  placeholder="Enter RV No..."
                  value={rvNo}
                  onChange={(e) => setRvNo(e.target.value)}
                />
              </FormRow>
              <FormRow label="RV Date" required>
                <DateInput value={rvDate} onChange={setRvDate} />
              </FormRow>
              <FormRow label="Upload RV" required className="sm:col-span-2">
                <Input type="file" className="h-auto py-0.5" />
              </FormRow>
            </>
          )}
        </FormGrid>

        <FormSection title="Receiving unit details" />
        <UnitLookup
          label={receivingLabel}
          search={receivingSearch}
          onSearchChange={setReceivingSearch}
          unit={receivingUnit}
          onUnitChange={setReceivingUnit}
          options={receivingOptions}
          onSearch={() => toast.success(`Searching ${receivingLabel}...`)}
          className="mb-5"
        />
        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <SelectField
              value={receivingHolding}
              onChange={setReceivingHolding}
              options={holdingOptions}
            />
          </FormRow>
          <FormRow label="Type of Eqpt" required>
            <SelectField
              value={receivingEqpt}
              onChange={setReceivingEqpt}
              options={eqptOptions}
            />
          </FormRow>
        </FormGrid>

        {listLoaded && (
          <>
            <FormSection title="Regn no to be transfer" />
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5",
                "bg-[oklch(0.94_0.03_15)]",
              )}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => handleSelectAll(v === true)}
                  disabled={filteredAvailable.length === 0}
                />
                Select all ({filteredAvailable.length})
              </label>
              <Input
                placeholder="Search Regd .."
                value={regnSearch}
                onChange={(e) => setRegnSearch(e.target.value)}
                className="ml-auto h-7 max-w-[180px] bg-background"
              />
              <span className="text-[13px] font-semibold text-foreground">
                Selected Regn No-{transferRegns.length}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
              <RegnListBox
                items={filteredAvailable}
                checked={checkedAvailable}
                onToggle={toggleAvailable}
                emptyLabel="No registration numbers"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveToTransfer}
                  title="Move selected to transfer list"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveBackToAvailable}
                  title="Move selected back"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <RegnListBox
                items={transferRegns}
                checked={checkedTransfer}
                onToggle={toggleTransfer}
                emptyLabel="No Regn selected"
              />
            </div>
          </>
        )}
      </div>
    </FormPanel>
  );
}

interface ParentUnitOption {
  sus_no: string;
  unit_name: string;
  display: string;
}

interface OptionItem {
  value: string;
  label: string;
}

interface PrfGroupOption {
  prf_code: string;
  prf_group: string;
}

interface CensusOption {
  census_no: string;
  nomenclature: string;
}

interface ReceivingUnitOption {
  sus_no: string;
  unit_name: string;
  form_code?: string | null;
  display: string;
}

export function InterUnitTransfer() {
  const [parentSusNo, setParentSusNo] = useState("");
  const [parentUnits, setParentUnits] = useState<ParentUnitOption[]>([]);

  const [parentHolding, setParentHolding] = useState("");
  const [holdingOptions, setHoldingOptions] = useState<OptionItem[]>([]);

  const [parentEqpt, setParentEqpt] = useState("");
  const [eqptOptions, setEqptOptions] = useState<OptionItem[]>([]);

  const [prfCode, setPrfCode] = useState("");
  const [prfOptions, setPrfOptions] = useState<PrfGroupOption[]>([]);

  const [censusNo, setCensusNo] = useState("");
  const [nomenclatureOptions, setNomenclatureOptions] = useState<CensusOption[]>([]);

  const [rvNo, setRvNo] = useState("");
  const [rvDate, setRvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadingRv, setUploadingRv] = useState(false);
  const [uploadedRvPath, setUploadedRvPath] = useState("");
  const [fileName, setFileName] = useState("");

  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingSusNo, setReceivingSusNo] = useState("");
  const [receivingUnits, setReceivingUnits] = useState<ReceivingUnitOption[]>([]);

  const [receivingHolding, setReceivingHolding] = useState("");
  const [receivingHoldingOptions, setReceivingHoldingOptions] = useState<OptionItem[]>([]);

  const [receivingEqpt, setReceivingEqpt] = useState("");
  const [receivingEqptOptions, setReceivingEqptOptions] = useState<OptionItem[]>([]);

  const [listLoaded, setListLoaded] = useState(false);
  const [loadingRegn, setLoadingRegn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");

  const resetRegnSelection = () => {
    setListLoaded(false);
    setAvailableRegns([]);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
  };

  // Initial reference options load
  useEffect(() => {
    let unmounted = false;
    async function initData() {
      try {
        const [parents, receivings, recHoldings, recEqpts] = await Promise.all([
          api<ParentUnitOption[]>("/transfer/inter-unit/parent-units"),
          api<ReceivingUnitOption[]>("/transfer/inter-unit/receiving-units"),
          api<OptionItem[]>("/transfer/inter-unit/receiving-holding-types"),
          api<OptionItem[]>("/transfer/inter-unit/receiving-eqpt-types"),
        ]);
        if (!unmounted) {
          setParentUnits(parents || []);
          setReceivingUnits(receivings || []);
          setReceivingHoldingOptions(recHoldings || []);
          setReceivingEqptOptions(recEqpts || []);
        }
      } catch {
        if (!unmounted) {
          toast.error("Failed to load unit transfer reference options");
        }
      }
    }
    initData();
    return () => {
      unmounted = true;
    };
  }, []);

  // When parentSusNo changes -> load holding types
  useEffect(() => {
    setParentHolding("");
    setHoldingOptions([]);
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo) return;
    api<OptionItem[]>(`/transfer/inter-unit/holding-types?parent_sus_no=${encodeURIComponent(parentSusNo)}`)
      .then(setHoldingOptions)
      .catch(() => toast.error("Failed to load holding types for parent unit"));
  }, [parentSusNo]);

  // When parentHolding changes -> load eqpt types
  useEffect(() => {
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding) return;
    api<OptionItem[]>(
      `/transfer/inter-unit/eqpt-types?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}`
    )
      .then(setEqptOptions)
      .catch(() => toast.error("Failed to load equipment types"));
  }, [parentSusNo, parentHolding]);

  // When parentEqpt changes -> load prf groups
  useEffect(() => {
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt) return;
    api<PrfGroupOption[]>(
      `/transfer/inter-unit/prf-groups?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}`
    )
      .then(setPrfOptions)
      .catch(() => toast.error("Failed to load PRF groups"));
  }, [parentSusNo, parentHolding, parentEqpt]);

  // When prfCode changes -> load nomenclatures
  useEffect(() => {
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt || !prfCode) return;
    api<CensusOption[]>(
      `/transfer/inter-unit/nomenclatures?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}`
    )
      .then(setNomenclatureOptions)
      .catch(() => toast.error("Failed to load nomenclatures"));
  }, [parentSusNo, parentHolding, parentEqpt, prfCode]);

  const handleReceivingSearch = async () => {
    try {
      const res = await api<ReceivingUnitOption[]>(
        `/transfer/inter-unit/receiving-units?search=${encodeURIComponent(receivingSearch)}`
      );
      setReceivingUnits(res || []);
    } catch {
      toast.error("Failed to search receiving units");
    }
  };

  // Re-query the server as the user types in the Receiving Unit box (debounced
  // by the input itself firing this on a 300ms delay) so suggestions stay
  // fresh beyond whatever was loaded on mount.
  useEffect(() => {
    if (!receivingSearch) return;
    void handleReceivingSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRv(true);
    try {
      const res = await uploadFileApi(file);
      setUploadedRvPath(res.relative_path || res.absolute_path);
      setFileName(file.name);
      toast.success("RV document uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload RV file");
    } finally {
      setUploadingRv(false);
    }
  };

  const filteredAvailable = useMemo(() => {
    const q = regnSearch.trim().toLowerCase();
    if (!q) return availableRegns;
    return availableRegns.filter((r) => r.toLowerCase().includes(q));
  }, [availableRegns, regnSearch]);

  const allFilteredSelected =
    filteredAvailable.length > 0 && filteredAvailable.every((r) => checkedAvailable.has(r));

  const handleGetRegn = async () => {
    if (pageHasInvalidDateInputs()) {
      return toast.error("Please enter a valid date (dd/mm/yyyy)");
    }
    if (
      !parentSusNo ||
      !parentHolding ||
      !parentEqpt ||
      !prfCode ||
      !censusNo ||
      !receivingSusNo ||
      !receivingHolding ||
      !receivingEqpt ||
      !rvNo ||
      !rvDate
    ) {
      return toast.error("Please fill all required fields");
    }

    setLoadingRegn(true);
    try {
      const url = `/transfer/inter-unit/regn-list?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}&census_no=${encodeURIComponent(censusNo)}`;
      const regns = await api<string[]>(url);
      setAvailableRegns(regns || []);
      setTransferRegns([]);
      setCheckedAvailable(new Set());
      setCheckedTransfer(new Set());
      setRegnSearch("");
      setListLoaded(true);
      toast.success(`${(regns || []).length} registration number(s) found`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch registration list");
    } finally {
      setLoadingRegn(false);
    }
  };

  const toggleAvailable = (regn: string, next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const toggleTransfer = (regn: string, next: boolean) => {
    setCheckedTransfer((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const handleSelectAll = (next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      for (const r of filteredAvailable) {
        if (next) n.add(r);
        else n.delete(r);
      }
      return n;
    });
  };

  const moveToTransfer = () => {
    const moving = availableRegns.filter((r) => checkedAvailable.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to transfer");
      return;
    }
    setAvailableRegns((prev) => prev.filter((r) => !checkedAvailable.has(r)));
    setTransferRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedAvailable(new Set());
  };

  const moveBackToAvailable = () => {
    const moving = transferRegns.filter((r) => checkedTransfer.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to move back");
      return;
    }
    setTransferRegns((prev) => prev.filter((r) => !checkedTransfer.has(r)));
    setAvailableRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedTransfer(new Set());
  };

  const handleSubmit = async () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        parent_sus_no: parentSusNo,
        type_of_hldg: parentHolding,
        type_of_eqpt: parentEqpt,
        prf_code: prfCode,
        census_no: censusNo,
        receiving_sus_no: receivingSusNo,
        receiving_type_of_hldg: receivingHolding,
        receiving_type_of_eqpt: receivingEqpt,
        rv_no: rvNo,
        rv_date: rvDate,
        upload_rv: uploadedRvPath || null,
        regn_numbers: transferRegns,
      };

      const res = await api<{ count: number; transferred_regns: string[] }>(
        "/transfer/inter-unit/transfer",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      toast.success(
        `Inter Unit Transfer completed successfully for ${res.count} registration number(s)`
      );
      resetRegnSelection();
      const parents = await api<ParentUnitOption[]>("/transfer/inter-unit/parent-units");
      setParentUnits(parents || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute Inter Unit Transfer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPanel
      title="INTER UNIT TRANSFER : UNIT TO UNIT"
      fill={listLoaded}
      footer={
        <>
          <Button type="button" onClick={handleGetRegn} disabled={loadingRegn}>
            {loadingRegn ? "Loading..." : "Get Regn List"}
          </Button>
          {listLoaded && (
            <>
              <Button variant="secondary" onClick={resetRegnSelection} disabled={submitting}>
                Clear List
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={transferRegns.length === 0 || submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <FormSection title="Parent unit details" />
        <FormRow label="Parent Unit" required className="mb-5">
          <UnitAutocomplete
            value={parentSusNo}
            onChange={setParentSusNo}
            options={parentUnits}
            placeholder="Search parent unit..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={parentHolding} onValueChange={setParentHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Type of Holding--" />
              </SelectTrigger>
              <SelectContent>
                {holdingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={parentEqpt} onValueChange={setParentEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {eqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="PRF Group" required>
            <Select value={prfCode} onValueChange={setPrfCode}>
              <SelectTrigger>
                <SelectValue placeholder="--Select PRF Group--" />
              </SelectTrigger>
              <SelectContent>
                {prfOptions.map((o) => (
                  <SelectItem key={o.prf_code} value={o.prf_code}>
                    {o.prf_group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Nomenclature" required>
            <Select value={censusNo} onValueChange={setCensusNo}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Census--" />
              </SelectTrigger>
              <SelectContent>
                {nomenclatureOptions.map((o) => (
                  <SelectItem key={o.census_no} value={o.census_no}>
                    {o.nomenclature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="RV No" required>
            <Input
              placeholder="Enter RV No..."
              value={rvNo}
              onChange={(e) => setRvNo(e.target.value)}
            />
          </FormRow>

          <FormRow label="RV Date" required>
            <DateInput value={rvDate} onChange={setRvDate} />
          </FormRow>

          <FormRow label="Upload RV" required className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                className="h-auto py-0.5"
                onChange={handleFileUpload}
                disabled={uploadingRv}
              />
              {fileName && (
                <span className="text-xs text-muted-foreground truncate">{fileName}</span>
              )}
            </div>
          </FormRow>
        </FormGrid>

        <FormSection title="Receiving unit details" />
        <FormRow label="Receiving Unit" required className="mb-5">
          <UnitAutocomplete
            value={receivingSusNo}
            onChange={setReceivingSusNo}
            options={receivingUnits}
            onQueryChange={setReceivingSearch}
            placeholder="Search receiving unit..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={receivingHolding} onValueChange={setReceivingHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Type of Holding--" />
              </SelectTrigger>
              <SelectContent>
                {receivingHoldingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={receivingEqpt} onValueChange={setReceivingEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {receivingEqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {listLoaded && (
          <>
            <FormSection title="Regn no to be transfer" />
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5",
                "bg-[oklch(0.94_0.03_15)]"
              )}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => handleSelectAll(v === true)}
                  disabled={filteredAvailable.length === 0}
                />
                Select all ({filteredAvailable.length})
              </label>
              <Input
                placeholder="Search Regd .."
                value={regnSearch}
                onChange={(e) => setRegnSearch(e.target.value)}
                className="ml-auto h-7 max-w-[180px] bg-background"
              />
              <span className="text-[13px] font-semibold text-foreground">
                Selected Regn No-{transferRegns.length}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
              <RegnListBox
                items={filteredAvailable}
                checked={checkedAvailable}
                onToggle={toggleAvailable}
                emptyLabel="No registration numbers"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveToTransfer}
                  title="Move selected to transfer list"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveBackToAvailable}
                  title="Move selected back"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <RegnListBox
                items={transferRegns}
                checked={checkedTransfer}
                onToggle={toggleTransfer}
                emptyLabel="No Regn selected"
              />
            </div>
          </>
        )}
      </div>
    </FormPanel>
  );
}

export function DepotToDepotTransfer() {
  const [parentSusNo, setParentSusNo] = useState("");
  const [parentUnits, setParentUnits] = useState<ParentUnitOption[]>([]);

  const [parentHolding, setParentHolding] = useState("");
  const [holdingOptions, setHoldingOptions] = useState<OptionItem[]>([]);

  const [parentEqpt, setParentEqpt] = useState("");
  const [eqptOptions, setEqptOptions] = useState<OptionItem[]>([]);

  const [prfCode, setPrfCode] = useState("");
  const [prfOptions, setPrfOptions] = useState<PrfGroupOption[]>([]);

  const [censusNo, setCensusNo] = useState("");
  const [nomenclatureOptions, setNomenclatureOptions] = useState<CensusOption[]>([]);

  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingSusNo, setReceivingSusNo] = useState("");
  const [receivingUnits, setReceivingUnits] = useState<ReceivingUnitOption[]>([]);

  const [receivingHolding, setReceivingHolding] = useState("");
  const [receivingHoldingOptions, setReceivingHoldingOptions] = useState<OptionItem[]>([]);

  const [receivingEqpt, setReceivingEqpt] = useState("");
  const [receivingEqptOptions, setReceivingEqptOptions] = useState<OptionItem[]>([]);

  const [listLoaded, setListLoaded] = useState(false);
  const [loadingRegn, setLoadingRegn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");

  const resetRegnSelection = () => {
    setListLoaded(false);
    setAvailableRegns([]);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
  };

  // Initial reference options load
  useEffect(() => {
    let unmounted = false;
    async function initData() {
      try {
        const [parents, receivings, recHoldings, recEqpts] = await Promise.all([
          api<ParentUnitOption[]>("/transfer/depot-to-depot/parent-units"),
          api<ReceivingUnitOption[]>("/transfer/depot-to-depot/receiving-units"),
          api<OptionItem[]>("/transfer/depot-to-depot/receiving-holding-types"),
          api<OptionItem[]>("/transfer/depot-to-depot/receiving-eqpt-types"),
        ]);
        if (!unmounted) {
          setParentUnits(parents || []);
          setReceivingUnits(receivings || []);
          setReceivingHoldingOptions(recHoldings || []);
          setReceivingEqptOptions(recEqpts || []);
        }
      } catch {
        if (!unmounted) {
          toast.error("Failed to load depot transfer reference options");
        }
      }
    }
    initData();
    return () => {
      unmounted = true;
    };
  }, []);

  // When parentSusNo changes -> load holding types
  useEffect(() => {
    setParentHolding("");
    setHoldingOptions([]);
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo) return;
    api<OptionItem[]>(`/transfer/depot-to-depot/holding-types?parent_sus_no=${encodeURIComponent(parentSusNo)}`)
      .then(setHoldingOptions)
      .catch(() => toast.error("Failed to load holding types for parent depot"));
  }, [parentSusNo]);

  // When parentHolding changes -> load eqpt types
  useEffect(() => {
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding) return;
    api<OptionItem[]>(
      `/transfer/depot-to-depot/eqpt-types?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}`
    )
      .then(setEqptOptions)
      .catch(() => toast.error("Failed to load equipment types"));
  }, [parentSusNo, parentHolding]);

  // When parentEqpt changes -> load prf groups
  useEffect(() => {
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt) return;
    api<PrfGroupOption[]>(
      `/transfer/depot-to-depot/prf-groups?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}`
    )
      .then(setPrfOptions)
      .catch(() => toast.error("Failed to load PRF groups"));
  }, [parentSusNo, parentHolding, parentEqpt]);

  // When prfCode changes -> load nomenclatures
  useEffect(() => {
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt || !prfCode) return;
    api<CensusOption[]>(
      `/transfer/depot-to-depot/nomenclatures?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}`
    )
      .then(setNomenclatureOptions)
      .catch(() => toast.error("Failed to load nomenclatures"));
  }, [parentSusNo, parentHolding, parentEqpt, prfCode]);

  const handleReceivingSearch = async () => {
    try {
      const res = await api<ReceivingUnitOption[]>(
        `/transfer/depot-to-depot/receiving-units?search=${encodeURIComponent(receivingSearch)}`
      );
      setReceivingUnits(res || []);
    } catch {
      toast.error("Failed to search receiving depots");
    }
  };

  // Re-query the server as the user types in the Receiving Depot box.
  useEffect(() => {
    if (!receivingSearch) return;
    void handleReceivingSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingSearch]);

  const filteredAvailable = useMemo(() => {
    const q = regnSearch.trim().toLowerCase();
    if (!q) return availableRegns;
    return availableRegns.filter((r) => r.toLowerCase().includes(q));
  }, [availableRegns, regnSearch]);

  const allFilteredSelected =
    filteredAvailable.length > 0 && filteredAvailable.every((r) => checkedAvailable.has(r));

  const handleGetRegn = async () => {
    if (
      !parentSusNo ||
      !parentHolding ||
      !parentEqpt ||
      !prfCode ||
      !censusNo ||
      !receivingSusNo ||
      !receivingHolding ||
      !receivingEqpt
    ) {
      return toast.error("Please fill all required fields");
    }

    setLoadingRegn(true);
    try {
      const url = `/transfer/depot-to-depot/regn-list?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}&census_no=${encodeURIComponent(censusNo)}`;
      const regns = await api<string[]>(url);
      setAvailableRegns(regns || []);
      setTransferRegns([]);
      setCheckedAvailable(new Set());
      setCheckedTransfer(new Set());
      setRegnSearch("");
      setListLoaded(true);
      if (regns && regns.length > 0) {
        toast.success(`${regns.length} approved registration number(s) found`);
      } else {
        toast.info("No registration numbers found for the selected criteria");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load registration list");
    } finally {
      setLoadingRegn(false);
    }
  };

  const toggleAvailable = (regn: string, next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const toggleTransfer = (regn: string, next: boolean) => {
    setCheckedTransfer((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const handleSelectAll = (next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      for (const r of filteredAvailable) {
        if (next) n.add(r);
        else n.delete(r);
      }
      return n;
    });
  };

  const moveToTransfer = () => {
    const moving = availableRegns.filter((r) => checkedAvailable.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to transfer");
      return;
    }
    setAvailableRegns((prev) => prev.filter((r) => !checkedAvailable.has(r)));
    setTransferRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedAvailable(new Set());
  };

  const moveBackToAvailable = () => {
    const moving = transferRegns.filter((r) => checkedTransfer.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to move back");
      return;
    }
    setTransferRegns((prev) => prev.filter((r) => !checkedTransfer.has(r)));
    setAvailableRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedTransfer(new Set());
  };

  const handleSubmit = async () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        parent_sus_no: parentSusNo,
        parent_type_of_hldg: parentHolding,
        parent_type_of_eqpt: parentEqpt,
        prf_code: prfCode,
        census_no: censusNo,
        receiving_sus_no: receivingSusNo,
        receiving_type_of_hldg: receivingHolding,
        receiving_type_of_eqpt: receivingEqpt,
        regn_numbers: transferRegns,
      };

      const res = await api<{ count: number; transferred_regns: string[] }>("/transfer/depot-to-depot/transfer", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`Successfully transferred ${res.count} equipment registration(s)!`);
      resetRegnSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPanel
      title="EQPT TRANSFER : DEPOT TO DEPOT"
      fill={listLoaded}
      footer={
        <>
          <Button type="button" onClick={handleGetRegn} disabled={loadingRegn}>
            {loadingRegn ? "Loading..." : "Get Regn List"}
          </Button>
          {listLoaded && (
            <>
              <Button variant="secondary" onClick={resetRegnSelection} disabled={submitting}>
                Clear List
              </Button>
              <Button onClick={handleSubmit} disabled={transferRegns.length === 0 || submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <FormSection title="PARENT UNIT DETAILS" />
        <FormRow label="Parent Depot" required className="mb-5">
          <UnitAutocomplete
            value={parentSusNo}
            onChange={setParentSusNo}
            options={parentUnits}
            placeholder="Search parent depot..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={parentHolding} onValueChange={setParentHolding} disabled={!parentSusNo}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Type of Holding--" />
              </SelectTrigger>
              <SelectContent>
                {holdingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={parentEqpt} onValueChange={setParentEqpt} disabled={!parentHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {eqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="PRF Group" required>
            <Select value={prfCode} onValueChange={setPrfCode} disabled={!parentEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select PRF Group--" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {prfOptions.map((o) => (
                  <SelectItem key={o.prf_code} value={o.prf_code}>
                    {o.prf_group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Nomenclature" required>
            <Select value={censusNo} onValueChange={setCensusNo} disabled={!prfCode}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Census--" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {nomenclatureOptions.map((o) => (
                  <SelectItem key={o.census_no} value={o.census_no}>
                    {o.nomenclature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        <FormSection title="RECEIVING UNIT DETAILS" />
        <FormRow label="Receiving Depot" required className="mb-5">
          <UnitAutocomplete
            value={receivingSusNo}
            onChange={setReceivingSusNo}
            options={receivingUnits}
            onQueryChange={setReceivingSearch}
            placeholder="Search receiving depot..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={receivingHolding} onValueChange={setReceivingHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {receivingHoldingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={receivingEqpt} onValueChange={setReceivingEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {receivingEqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {listLoaded && (
          <>
            <FormSection title="Regn no to be transfer" />
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5",
                "bg-[oklch(0.94_0.03_15)]"
              )}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => handleSelectAll(v === true)}
                  disabled={filteredAvailable.length === 0}
                />
                Select all ({filteredAvailable.length})
              </label>
              <Input
                placeholder="Search Regd .."
                value={regnSearch}
                onChange={(e) => setRegnSearch(e.target.value)}
                className="ml-auto h-7 max-w-[180px] bg-background"
              />
              <span className="text-[13px] font-semibold text-foreground">
                Selected Regn No-{transferRegns.length}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
              <RegnListBox
                items={filteredAvailable}
                checked={checkedAvailable}
                onToggle={toggleAvailable}
                emptyLabel="No registration numbers"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveToTransfer}
                  title="Move selected to transfer list"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveBackToAvailable}
                  title="Move selected back"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <RegnListBox
                items={transferRegns}
                checked={checkedTransfer}
                onToggle={toggleTransfer}
                emptyLabel="No Regn selected"
              />
            </div>
          </>
        )}
      </div>
    </FormPanel>
  );
}

export function UnitToDepotDeposit() {
  const [parentSusNo, setParentSusNo] = useState("");
  const [parentUnits, setParentUnits] = useState<ParentUnitOption[]>([]);

  const [parentHolding, setParentHolding] = useState("");
  const [holdingOptions, setHoldingOptions] = useState<OptionItem[]>([]);

  const [parentEqpt, setParentEqpt] = useState("");
  const [eqptOptions, setEqptOptions] = useState<OptionItem[]>([]);

  const [prfCode, setPrfCode] = useState("");
  const [prfOptions, setPrfOptions] = useState<PrfGroupOption[]>([]);

  const [censusNo, setCensusNo] = useState("");
  const [nomenclatureOptions, setNomenclatureOptions] = useState<CensusOption[]>([]);

  const [rvNo, setRvNo] = useState("");
  const [rvDate, setRvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadingRv, setUploadingRv] = useState(false);
  const [uploadedRvPath, setUploadedRvPath] = useState("");
  const [fileName, setFileName] = useState("");

  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingSusNo, setReceivingSusNo] = useState("");
  const [receivingUnits, setReceivingUnits] = useState<ReceivingUnitOption[]>([]);

  const [receivingHolding, setReceivingHolding] = useState("");
  const [receivingHoldingOptions, setReceivingHoldingOptions] = useState<OptionItem[]>([]);

  const [receivingEqpt, setReceivingEqpt] = useState("");
  const [receivingEqptOptions, setReceivingEqptOptions] = useState<OptionItem[]>([]);

  const [listLoaded, setListLoaded] = useState(false);
  const [loadingRegn, setLoadingRegn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");

  const resetRegnSelection = () => {
    setListLoaded(false);
    setAvailableRegns([]);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
  };

  // Initial reference options load
  useEffect(() => {
    let unmounted = false;
    async function initData() {
      try {
        const [parents, receivings, recHoldings, recEqpts] = await Promise.all([
          api<ParentUnitOption[]>("/transfer/unit-to-depot/parent-units"),
          api<ReceivingUnitOption[]>("/transfer/unit-to-depot/receiving-units"),
          api<OptionItem[]>("/transfer/unit-to-depot/receiving-holding-types"),
          api<OptionItem[]>("/transfer/unit-to-depot/receiving-eqpt-types"),
        ]);
        if (!unmounted) {
          setParentUnits(parents || []);
          setReceivingUnits(receivings || []);
          setReceivingHoldingOptions(recHoldings || []);
          setReceivingEqptOptions(recEqpts || []);
        }
      } catch {
        if (!unmounted) {
          toast.error("Failed to load unit deposit reference options");
        }
      }
    }
    initData();
    return () => {
      unmounted = true;
    };
  }, []);

  // When parentSusNo changes -> load holding types
  useEffect(() => {
    setParentHolding("");
    setHoldingOptions([]);
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo) return;
    api<OptionItem[]>(
      `/transfer/unit-to-depot/holding-types?parent_sus_no=${encodeURIComponent(parentSusNo)}`
    )
      .then(setHoldingOptions)
      .catch(() => toast.error("Failed to load holding types for parent unit"));
  }, [parentSusNo]);

  // When parentHolding changes -> load eqpt types
  useEffect(() => {
    setParentEqpt("");
    setEqptOptions([]);
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding) return;
    api<OptionItem[]>(
      `/transfer/unit-to-depot/eqpt-types?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}`
    )
      .then(setEqptOptions)
      .catch(() => toast.error("Failed to load equipment types"));
  }, [parentSusNo, parentHolding]);

  // When parentEqpt changes -> load prf groups
  useEffect(() => {
    setPrfCode("");
    setPrfOptions([]);
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt) return;
    api<PrfGroupOption[]>(
      `/transfer/unit-to-depot/prf-groups?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}`
    )
      .then(setPrfOptions)
      .catch(() => toast.error("Failed to load PRF groups"));
  }, [parentSusNo, parentHolding, parentEqpt]);

  // When prfCode changes -> load nomenclatures
  useEffect(() => {
    setCensusNo("");
    setNomenclatureOptions([]);
    resetRegnSelection();

    if (!parentSusNo || !parentHolding || !parentEqpt || !prfCode) return;
    api<CensusOption[]>(
      `/transfer/unit-to-depot/nomenclatures?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}`
    )
      .then(setNomenclatureOptions)
      .catch(() => toast.error("Failed to load nomenclatures"));
  }, [parentSusNo, parentHolding, parentEqpt, prfCode]);

  const handleReceivingSearch = async () => {
    try {
      const res = await api<ReceivingUnitOption[]>(
        `/transfer/unit-to-depot/receiving-units?search=${encodeURIComponent(receivingSearch)}`
      );
      setReceivingUnits(res || []);
    } catch {
      toast.error("Failed to search receiving depots");
    }
  };

  // Re-query the server as the user types in the Receiving Depot box.
  useEffect(() => {
    if (!receivingSearch) return;
    void handleReceivingSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRv(true);
    try {
      const res = await uploadFileApi(file);
      setUploadedRvPath(res.relative_path || res.absolute_path);
      setFileName(file.name);
      toast.success("RV document uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload RV file");
    } finally {
      setUploadingRv(false);
    }
  };

  const filteredAvailable = useMemo(() => {
    const q = regnSearch.trim().toLowerCase();
    if (!q) return availableRegns;
    return availableRegns.filter((r) => r.toLowerCase().includes(q));
  }, [availableRegns, regnSearch]);

  const allFilteredSelected =
    filteredAvailable.length > 0 && filteredAvailable.every((r) => checkedAvailable.has(r));

  const handleGetRegn = async () => {
    if (pageHasInvalidDateInputs()) {
      return toast.error("Please enter a valid date (dd/mm/yyyy)");
    }
    if (
      !parentSusNo ||
      !parentHolding ||
      !parentEqpt ||
      !prfCode ||
      !censusNo ||
      !receivingSusNo ||
      !receivingHolding ||
      !receivingEqpt ||
      !rvNo ||
      !rvDate
    ) {
      return toast.error("Please fill all required fields");
    }

    setLoadingRegn(true);
    try {
      const url = `/transfer/unit-to-depot/regn-list?parent_sus_no=${encodeURIComponent(parentSusNo)}&holding_type=${encodeURIComponent(parentHolding)}&eqpt_type=${encodeURIComponent(parentEqpt)}&prf_code=${encodeURIComponent(prfCode)}&census_no=${encodeURIComponent(censusNo)}`;
      const regns = await api<string[]>(url);
      setAvailableRegns(regns || []);
      setTransferRegns([]);
      setCheckedAvailable(new Set());
      setCheckedTransfer(new Set());
      setRegnSearch("");
      setListLoaded(true);
      toast.success(`${(regns || []).length} registration number(s) found`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch registration list");
    } finally {
      setLoadingRegn(false);
    }
  };

  const toggleAvailable = (regn: string, next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const toggleTransfer = (regn: string, next: boolean) => {
    setCheckedTransfer((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const handleSelectAll = (next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      for (const r of filteredAvailable) {
        if (next) n.add(r);
        else n.delete(r);
      }
      return n;
    });
  };

  const moveToTransfer = () => {
    const moving = availableRegns.filter((r) => checkedAvailable.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to transfer");
      return;
    }
    setAvailableRegns((prev) => prev.filter((r) => !checkedAvailable.has(r)));
    setTransferRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedAvailable(new Set());
  };

  const moveBackToAvailable = () => {
    const moving = transferRegns.filter((r) => checkedTransfer.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to move back");
      return;
    }
    setTransferRegns((prev) => prev.filter((r) => !checkedTransfer.has(r)));
    setAvailableRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedTransfer(new Set());
  };

  const handleSubmit = async () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        parent_sus_no: parentSusNo,
        type_of_hldg: parentHolding,
        type_of_eqpt: parentEqpt,
        prf_code: prfCode,
        census_no: censusNo,
        receiving_sus_no: receivingSusNo,
        receiving_type_of_hldg: receivingHolding,
        receiving_type_of_eqpt: receivingEqpt,
        rv_no: rvNo,
        rv_date: rvDate,
        upload_rv: uploadedRvPath || null,
        regn_numbers: transferRegns,
      };

      const res = await api<{ count: number; transferred_regns: string[] }>(
        "/transfer/unit-to-depot/transfer",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      toast.success(
        `EQPT Deposit completed successfully for ${res.count} registration number(s)`
      );
      resetRegnSelection();
      const parents = await api<ParentUnitOption[]>("/transfer/unit-to-depot/parent-units");
      setParentUnits(parents || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute Unit to Depot Deposit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPanel
      title="DEPOSIT TO DEPOT : UNIT TO DEPOT"
      fill={listLoaded}
      footer={
        <>
          <Button type="button" onClick={handleGetRegn} disabled={loadingRegn}>
            {loadingRegn ? "Loading..." : "Get Regn List"}
          </Button>
          {listLoaded && (
            <>
              <Button variant="secondary" onClick={resetRegnSelection} disabled={submitting}>
                Clear List
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={transferRegns.length === 0 || submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <FormSection title="Parent unit details" />
        <FormRow label="Parent Unit" required className="mb-5">
          <UnitAutocomplete
            value={parentSusNo}
            onChange={setParentSusNo}
            options={parentUnits}
            placeholder="Search parent unit..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={parentHolding} onValueChange={setParentHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Type of Holding--" />
              </SelectTrigger>
              <SelectContent>
                {holdingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={parentEqpt} onValueChange={setParentEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {eqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="PRF Group" required>
            <Select value={prfCode} onValueChange={setPrfCode}>
              <SelectTrigger>
                <SelectValue placeholder="--Select PRF Group--" />
              </SelectTrigger>
              <SelectContent>
                {prfOptions.map((o) => (
                  <SelectItem key={o.prf_code} value={o.prf_code}>
                    {o.prf_group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Nomenclature" required>
            <Select value={censusNo} onValueChange={setCensusNo}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Census--" />
              </SelectTrigger>
              <SelectContent>
                {nomenclatureOptions.map((o) => (
                  <SelectItem key={o.census_no} value={o.census_no}>
                    {o.nomenclature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="RV No" required>
            <Input
              placeholder="Enter RV No..."
              value={rvNo}
              onChange={(e) => setRvNo(e.target.value)}
            />
          </FormRow>

          <FormRow label="RV Date" required>
            <DateInput value={rvDate} onChange={setRvDate} />
          </FormRow>

          <FormRow label="Upload RV" required className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                className="h-auto py-0.5"
                onChange={handleFileUpload}
                disabled={uploadingRv}
              />
              {fileName && (
                <span className="text-xs text-muted-foreground truncate">{fileName}</span>
              )}
            </div>
          </FormRow>
        </FormGrid>

        <FormSection title="Receiving unit details" />
        <FormRow label="Receiving Depot" required className="mb-5">
          <UnitAutocomplete
            value={receivingSusNo}
            onChange={setReceivingSusNo}
            options={receivingUnits}
            onQueryChange={setReceivingSearch}
            placeholder="Search receiving depot..."
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" required>
            <Select value={receivingHolding} onValueChange={setReceivingHolding}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {receivingHoldingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Type of Eqpt" required>
            <Select value={receivingEqpt} onValueChange={setReceivingEqpt}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {receivingEqptOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {listLoaded && (
          <>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold uppercase text-sky-800">
                EQPT Registration List
              </span>
              <Input
                placeholder="Search Regn No..."
                className="h-7 w-48 text-xs"
                value={regnSearch}
                onChange={(e) => setRegnSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 rounded bg-muted/60 px-2 py-1 text-xs">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                  />
                  <span>Select All ({filteredAvailable.length})</span>
                </div>
                <RegnListBox
                  items={filteredAvailable}
                  checked={checkedAvailable}
                  onToggle={toggleAvailable}
                  emptyLabel="No Regn available"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveToTransfer}
                  title="Move selected to transfer list"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveBackToAvailable}
                  title="Move selected back"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <RegnListBox
                items={transferRegns}
                checked={checkedTransfer}
                onToggle={toggleTransfer}
                emptyLabel="No Regn selected"
              />
            </div>
          </>
        )}
      </div>
    </FormPanel>
  );
}
