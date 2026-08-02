import { useMemo, useState } from "react";
import { FormPanel, FormRow } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  "1941005A - 13 PUNJAB",
  "1942103B - 5 SIKH",
  "1950012C - 2 RAJPUT",
  "1960408D - 9 GARH RIF",
];

const PRF_GROUPS = ["PRF-INF-01", "PRF-ARMD-03", "PRF-ASC-04"];

const CENSUS_OPTIONS = [
  "CN-88421 — Carbine 5.56mm Folding Stock",
  "CN-90215 — LMG 7.62mm Belt Fed",
  "CN-77109 — Thermal Imager Hand Held",
  "CN-65033 — VHF Radio Set Manpack 25W",
];

const HOLDING_TYPES = [
  "Authorised Holding",
  "Temporary Holding",
  "Surplus Holding",
  "Loan Holding",
];

const SERVICEABILITY_OPTIONS = [
  "Serviciable",
  "Repairable",
  "BER",
  "Under Repair",
];

type EqptResult = {
  id: string;
  regnNo: string;
  unit: string;
  prfGroup: string;
  censusNo: string;
  typeOfHolding: string;
  serviceability: string;
};

const MOCK_EQPT: EqptResult[] = [
  {
    id: "1",
    regnNo: "22P-081815",
    unit: "1941005A - 13 PUNJAB",
    prfGroup: "PRF-INF-01",
    censusNo: "CN-88421 — Carbine 5.56mm Folding Stock",
    typeOfHolding: "Authorised Holding",
    serviceability: "Serviciable",
  },
  {
    id: "2",
    regnNo: "22P-091204",
    unit: "1942103B - 5 SIKH",
    prfGroup: "PRF-INF-01",
    censusNo: "CN-90215 — LMG 7.62mm Belt Fed",
    typeOfHolding: "Authorised Holding",
    serviceability: "Repairable",
  },
  {
    id: "5",
    regnNo: "22P-070311",
    unit: "1950012C - 2 RAJPUT",
    prfGroup: "PRF-INF-01",
    censusNo: "CN-77109 — Thermal Imager Hand Held",
    typeOfHolding: "Temporary Holding",
    serviceability: "Serviciable",
  },
];

function SelectField({
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

const emptyForm = {
  unitSearch: "",
  unit: "",
  prfGroup: "",
  censusNo: "",
  typeOfHolding: "",
  regdNo: "",
};

function DialogActions({
  onClose,
  onUpdate,
  updateLabel,
}: {
  onClose: () => void;
  onUpdate?: () => void;
  updateLabel?: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-1">
      <Button variant="destructive" onClick={onClose}>
        Close
      </Button>
      {onUpdate && updateLabel && (
        <Button
          onClick={onUpdate}
        >
          {updateLabel}
        </Button>
      )}
    </div>
  );
}

const wideRow = "sm:grid-cols-[140px_minmax(0,1fr)]";

/** Non-artillery serviceability update */
function ServiceabilityStateForm({
  record,
  onClose,
}: {
  record: EqptResult;
  onClose: () => void;
}) {
  const [regnNo, setRegnNo] = useState(record.regnNo);
  const [serviceability, setServiceability] = useState(record.serviceability);
  const [barrelI, setBarrelI] = useState("");
  const [barrelII, setBarrelII] = useState("");
  const [barrelIII, setBarrelIII] = useState("");
  const [barrelIV, setBarrelIV] = useState("");
  const [remarks, setRemarks] = useState("");

  return (
    <div className="space-y-1.5">
      <FormRow label="Eqpt Registration No." required className={wideRow}>
        <Input value={regnNo} onChange={(e) => setRegnNo(e.target.value)} />
      </FormRow>
      <FormRow label="Serviceability" required className={wideRow}>
        <SelectField
          value={serviceability}
          onChange={setServiceability}
          options={SERVICEABILITY_OPTIONS}
        />
      </FormRow>
      <FormRow label="Barrel - I" className={wideRow}>
        <Input value={barrelI} onChange={(e) => setBarrelI(e.target.value)} placeholder="null" />
      </FormRow>
      <FormRow label="Barrel - II" className={wideRow}>
        <Input value={barrelII} onChange={(e) => setBarrelII(e.target.value)} placeholder="null" />
      </FormRow>
      <FormRow label="Barrel - III" className={wideRow}>
        <Input value={barrelIII} onChange={(e) => setBarrelIII(e.target.value)} placeholder="null" />
      </FormRow>
      <FormRow label="Barrel - IV" className={wideRow}>
        <Input value={barrelIV} onChange={(e) => setBarrelIV(e.target.value)} placeholder="null" />
      </FormRow>
      <FormRow label="Remarks" className={wideRow}>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="null"
          className="min-h-[52px] text-xs"
        />
      </FormRow>
      <DialogActions
        onClose={onClose}
        updateLabel="Update Data"
        onUpdate={() => {
          if (!regnNo || !serviceability) {
            toast.error("Please fill all required fields");
            return;
          }
          toast.success("Serviceability data updated");
          onClose();
        }}
      />
    </div>
  );
}

function ServiceabilityDialog({
  record,
  open,
  onClose,
}: {
  record: EqptResult;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-2 p-3 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-sm font-bold uppercase tracking-wide underline underline-offset-2">
            SERVICEABILITY STATE
          </DialogTitle>
        </DialogHeader>
        <ServiceabilityStateForm record={record} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

export function UpdateEqptData() {
  const [form, setForm] = useState(emptyForm);
  const [filteredUnits, setFilteredUnits] = useState(UNIT_OPTIONS);
  const [results, setResults] = useState<EqptResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updateRecord, setUpdateRecord] = useState<EqptResult | null>(null);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selected = useMemo(
    () => results.find((r) => r.id === selectedId) ?? null,
    [results, selectedId],
  );

  const handleClear = () => {
    setForm(emptyForm);
    setFilteredUnits(UNIT_OPTIONS);
    setResults([]);
    setShowResults(false);
    setSelectedId(null);
    setUpdateRecord(null);
  };

  const handleUnitSearch = () => {
    const q = form.unitSearch.trim().toLowerCase();
    const next = q
      ? UNIT_OPTIONS.filter((u) => u.toLowerCase().includes(q))
      : UNIT_OPTIONS;
    setFilteredUnits(next);
    if (!next.length) toast.message("No unit matched");
  };

  const handleSearch = () => {
    if (!form.unit || !form.prfGroup || !form.censusNo || !form.typeOfHolding) {
      toast.error("Please fill all required fields");
      return;
    }

    const matched = MOCK_EQPT.filter((r) => {
      const unitOk = r.unit === form.unit;
      const prfOk = r.prfGroup === form.prfGroup;
      const censusOk = r.censusNo === form.censusNo;
      const holdingOk = r.typeOfHolding === form.typeOfHolding;
      const regdOk =
        !form.regdNo.trim() ||
        r.regnNo.toLowerCase().includes(form.regdNo.trim().toLowerCase());
      return unitOk && prfOk && censusOk && holdingOk && regdOk;
    });

    const rows =
      matched.length > 0
        ? matched
        : [
            {
              id: `demo-${Date.now()}`,
              regnNo: form.regdNo.trim() || "22P-081815",
              unit: form.unit,
              prfGroup: form.prfGroup,
              censusNo: form.censusNo,
              typeOfHolding: form.typeOfHolding,
              serviceability: "Serviciable",
            },
          ];

    setResults(rows);
    setShowResults(true);
    setSelectedId(rows[0]?.id ?? null);
    toast.success(`${rows.length} record(s) found`);
  };

  const handleUpdate = () => {
    if (!selected) {
      toast.error("Please select a unit/equipment row");
      return;
    }
    setUpdateRecord(selected);
  };

  return (
    <>
      <FormPanel
        title="UPDATION OF EQPT SERVICEABILITY STATUS"
        fill={showResults}
        footer={
          <>
            <Button variant="secondary" onClick={handleClear}>
              Clear
            </Button>
            <Button
              onClick={handleSearch}
            >
              Search
            </Button>
            {showResults && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleUpdate}
                disabled={!selected}
              >
                Update
              </Button>
            )}
            <Button variant="destructive" onClick={handleClear}>
              Cancel
            </Button>
          </>
        }
      >
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-1.5",
            showResults ? "max-w-5xl min-h-0 flex-1" : "max-w-2xl",
          )}
        >
          <FormRow label="Unit" required>
            <div className="flex gap-1">
              <div className="flex min-w-0 flex-1 gap-1">
                <Input
                  placeholder="Search..."
                  value={form.unitSearch}
                  onChange={(e) => upd("unitSearch", e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 shrink-0"
                  onClick={handleUnitSearch}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-w-0 flex-[1.6]">
                <SelectField
                  value={form.unit}
                  onChange={(v) => upd("unit", v)}
                  options={filteredUnits}
                  placeholder="--Select Unit--"
                />
              </div>
            </div>
          </FormRow>

          <FormRow label="PRF Group" required>
            <SelectField
              value={form.prfGroup}
              onChange={(v) => upd("prfGroup", v)}
              options={PRF_GROUPS}
              placeholder="--Select--"
            />
          </FormRow>

          <FormRow label="Census No" required>
            <SelectField
              value={form.censusNo}
              onChange={(v) => upd("censusNo", v)}
              options={CENSUS_OPTIONS}
              placeholder="--Select--"
            />
          </FormRow>

          <FormRow label="Type of Holding" required>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="min-w-0 flex-1 basis-[12rem]">
                <SelectField
                  value={form.typeOfHolding}
                  onChange={(v) => upd("typeOfHolding", v)}
                  options={HOLDING_TYPES}
                  placeholder="--Select Type of Holding--"
                />
              </div>
              <span className="shrink-0 text-[12px] font-medium text-foreground">
                Registered No Search
              </span>
              <Input
                placeholder="Enter Regd No"
                value={form.regdNo}
                onChange={(e) => upd("regdNo", e.target.value)}
                className="min-w-0 flex-1 basis-[10rem]"
              />
            </div>
          </FormRow>

          {showResults && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="text-primary-foreground text-[12px] w-10">
                        Sel
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">
                        Regn No
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">Unit</TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">
                        PRF Group
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">
                        Census No
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">
                        Holding
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">
                        Serviceability
                      </TableHead>
                      <TableHead className="text-primary-foreground text-[12px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn(
                          "cursor-pointer",
                          selectedId === r.id && "bg-accent/50",
                        )}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <TableCell className="text-xs">
                          <input
                            type="radio"
                            name="eqpt-sel"
                            checked={selectedId === r.id}
                            onChange={() => setSelectedId(r.id)}
                            className="accent-primary"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium">{r.regnNo}</TableCell>
                        <TableCell className="text-xs">{r.unit}</TableCell>
                        <TableCell className="text-xs">{r.prfGroup}</TableCell>
                        <TableCell className="text-xs">{r.censusNo}</TableCell>
                        <TableCell className="text-xs">{r.typeOfHolding}</TableCell>
                        <TableCell className="text-xs">{r.serviceability}</TableCell>
                        <TableCell className="text-xs">Other</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="shrink-0 px-3 py-1 bg-muted/40 text-[12px] text-muted-foreground">
                Showing {results.length} record(s). Select a row and click Update → Serviceability
                State. For artillery equipment use UPDATE ARTY EQPT DATA.
              </div>
            </div>
          )}
        </div>
      </FormPanel>

      {updateRecord && (
        <ServiceabilityDialog
          record={updateRecord}
          open
          onClose={() => setUpdateRecord(null)}
        />
      )}
    </>
  );
}
