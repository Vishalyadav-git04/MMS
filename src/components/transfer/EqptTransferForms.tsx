import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="-mx-3 sm:-mx-4 mb-2 border-y border-border bg-muted/60 px-3 sm:px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-foreground">
      {title}
    </div>
  );
}

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
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-[160px] flex-1 gap-1">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={onSearch}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="min-w-[200px] flex-[2]">
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

  return (
    <FormPanel
      title={title}
      footer={
        <Button
          onClick={() => {
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
            toast.success("Fetching registration list...");
          }}
        >
          Get Regn List
        </Button>
      }
    >
      <div className="space-y-3">
        <SectionHeader title="PARENT UNIT DETAILS" />
        <UnitLookup
          label={parentLabel}
          search={parentSearch}
          onSearchChange={setParentSearch}
          unit={parentUnit}
          onUnitChange={setParentUnit}
          options={parentOptions}
          onSearch={() => toast.success(`Searching ${parentLabel}...`)}
        />
        <FormGrid>
          <FormRow label="Type of Holding" required>
            <SelectField
              value={parentHolding}
              onChange={setParentHolding}
              options={holdingOptions}
              placeholder="--Select Type of Holding--"
            />
          </FormRow>
          <FormRow label="Type of Eqpt" required>
            <SelectField
              value={parentEqpt}
              onChange={setParentEqpt}
              options={eqptOptions}
            />
          </FormRow>
        </FormGrid>
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
            <FormGrid>
              <FormRow label="RV No" required>
                <Input
                  placeholder="Enter RV No..."
                  value={rvNo}
                  onChange={(e) => setRvNo(e.target.value)}
                />
              </FormRow>
              <FormRow label="RV Date" required>
                <Input
                  type="date"
                  value={rvDate}
                  onChange={(e) => setRvDate(e.target.value)}
                />
              </FormRow>
            </FormGrid>
            <FormRow label="Upload RV" required>
              <Input type="file" className="h-auto py-1" />
            </FormRow>
          </>
        )}

        <SectionHeader title="RECEIVING UNIT DETAILS" />
        <UnitLookup
          label={receivingLabel}
          search={receivingSearch}
          onSearchChange={setReceivingSearch}
          unit={receivingUnit}
          onUnitChange={setReceivingUnit}
          options={receivingOptions}
          onSearch={() => toast.success(`Searching ${receivingLabel}...`)}
        />
        <FormGrid>
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
    />
  );
}
