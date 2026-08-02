import { useMemo, useState } from "react";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Search } from "lucide-react";
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
}: {
  label: string;
  search: string;
  onSearchChange: (v: string) => void;
  unit: string;
  onUnitChange: (v: string) => void;
  options: string[];
  onSearch: () => void;
}) {
  return (
    <FormRow label={label} required>
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
      <div className="space-y-1">
        <FormSection title="Parent unit details" />
        <UnitLookup
          label={parentLabel}
          search={parentSearch}
          onSearchChange={setParentSearch}
          unit={parentUnit}
          onUnitChange={setParentUnit}
          options={parentOptions}
          onSearch={() => toast.success(`Searching ${parentLabel}...`)}
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

export function InterUnitTransfer() {
  return (
    <TransferForm
      title="INTER UNIT TRANSFER : UNIT TO UNIT"
      parentLabel="Parent Unit"
      receivingLabel="Receiving Unit"
      parentOptions={INTER_UNIT_OPTIONS}
      receivingOptions={INTER_UNIT_OPTIONS}
      showRvFields
      holdingOptions={HOLDING_TYPES}
      eqptOptions={EQPT_TYPES}
      prfOptions={PRF_GROUPS}
      nomenclatureOptions={NOMENCLATURES}
      initialRvDate="2026-07-24"
    />
  );
}

export function DepotToDepotTransfer() {
  return (
    <TransferForm
      title="EQPT TRANSFER : DEPOT TO DEPOT"
      parentLabel="Parent Depot"
      receivingLabel="Receiving Depot"
      parentOptions={DEPOT_OPTIONS}
      receivingOptions={DEPOT_OPTIONS}
    />
  );
}

export function UnitToDepotDeposit() {
  return (
    <TransferForm
      title="DEPOSIT TO DEPOT : UNIT TO DEPOT"
      parentLabel="Parent Unit"
      receivingLabel="Receiving Depot"
      parentOptions={UNIT_OPTIONS}
      receivingOptions={DEPOT_OPTIONS}
      showRvFields
      holdingOptions={HOLDING_TYPES}
      eqptOptions={EQPT_TYPES}
      prfOptions={PRF_GROUPS}
      nomenclatureOptions={NOMENCLATURES}
      initialRvDate="2026-07-24"
    />
  );
}
