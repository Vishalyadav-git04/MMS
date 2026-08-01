import { useMemo, useState } from "react";
import { FormPanel, FormRow, FormGrid, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pageHasInvalidDateInputs } from "@/lib/date";

const UNIT_OPTIONS = [
  "1970501E - 14 FIELD REGT (ARTY)",
  "1980602F - 61 MEDIUM REGT (ARTY)",
];

const PRF_GROUPS = ["PRF-ARTY-02"];

const CENSUS_OPTIONS = [
  "CN-44102 — 155mm Howitzer FH-77B",
  "CN-44118 — 130mm Field Gun M-46",
];

const HOLDING_TYPES = [
  "Authorised Holding",
  "Temporary Holding",
  "Surplus Holding",
  "Loan Holding",
];

const OH_TYPE_OPTIONS = ["Minor OH", "Major OH", "Base OH", "Intermediate OH"];
const OP_CLEARANCE_OPTIONS = ["Cleared", "Not Cleared", "Pending"];

type EqptResult = {
  id: string;
  regnNo: string;
  unit: string;
  prfGroup: string;
  censusNo: string;
  typeOfHolding: string;
  serviceability: string;
};

type ArtilleryTab = "oh" | "barrel" | "strip";

const MOCK_EQPT: EqptResult[] = [
  {
    id: "3",
    regnNo: "21A-L0858",
    unit: "1970501E - 14 FIELD REGT (ARTY)",
    prfGroup: "PRF-ARTY-02",
    censusNo: "CN-44102 — 155mm Howitzer FH-77B",
    typeOfHolding: "Authorised Holding",
    serviceability: "Serviciable",
  },
  {
    id: "4",
    regnNo: "21A-L0921",
    unit: "1980602F - 61 MEDIUM REGT (ARTY)",
    prfGroup: "PRF-ARTY-02",
    censusNo: "CN-44118 — 130mm Field Gun M-46",
    typeOfHolding: "Authorised Holding",
    serviceability: "Under Repair",
  },
];

function shortCode(regnNo: string) {
  const parts = regnNo.split("-");
  return parts.length > 1 ? parts[parts.length - 1] : regnNo;
}

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
          className="bg-success hover:bg-success/90 text-success-foreground"
          onClick={onUpdate}
        >
          {updateLabel}
        </Button>
      )}
    </div>
  );
}

const pairRow = "sm:grid-cols-[120px_minmax(0,1fr)]";

/** OH Details */
function OhDetailsForm({
  record,
  onClose,
}: {
  record: EqptResult;
  onClose: () => void;
}) {
  const [ohType, setOhType] = useState("");
  const [ohDueDt, setOhDueDt] = useState("");
  const [ohDoneDt, setOhDoneDt] = useState("");
  const [wkspName, setWkspName] = useState("");
  const [wkspInDt, setWkspInDt] = useState("");
  const [dispatchDt, setDispatchDt] = useState("");
  const [bohComplDt, setBohComplDt] = useState("");
  const [gunRecdDt, setGunRecdDt] = useState("");
  const [dtOfIntro, setDtOfIntro] = useState("");

  return (
    <div className="space-y-1.5">
      <FormRow label="OH Type" required className={pairRow}>
        <SelectField
          value={ohType}
          onChange={setOhType}
          options={OH_TYPE_OPTIONS}
          placeholder="--Select--"
        />
      </FormRow>
      <FormGrid cols={2}>
        <FormRow label="OH Due Dt" className={pairRow}>
          <DateInput value={ohDueDt} onChange={setOhDueDt} />
        </FormRow>
        <FormRow label="OH Done Dt" className={pairRow}>
          <DateInput value={ohDoneDt} onChange={setOhDoneDt} />
        </FormRow>
        <FormRow label="WKSP Name" className={pairRow}>
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value)} />
        </FormRow>
        <FormRow label="WKSP in Dt" className={pairRow}>
          <DateInput value={wkspInDt} onChange={setWkspInDt} />
        </FormRow>
        <FormRow label="Dispatch dt" className={pairRow}>
          <DateInput value={dispatchDt} onChange={setDispatchDt} />
        </FormRow>
        <FormRow label="BOH Compl Dt" className={pairRow}>
          <DateInput value={bohComplDt} onChange={setBohComplDt} />
        </FormRow>
        <FormRow label="Gun Recd Dt" className={pairRow}>
          <DateInput value={gunRecdDt} onChange={setGunRecdDt} />
        </FormRow>
        <FormRow label="Dt of Intro" className={pairRow}>
          <DateInput value={dtOfIntro} onChange={setDtOfIntro} />
        </FormRow>
      </FormGrid>
      <DialogActions
        onClose={onClose}
        updateLabel="Update OH Data"
        onUpdate={() => {
          if (pageHasInvalidDateInputs()) {
            toast.error("Please enter a valid date (dd/mm/yyyy)");
            return;
          }
          if (!ohType) {
            toast.error("OH Type is required");
            return;
          }
          toast.success(`OH details updated for ${record.regnNo}`);
          onClose();
        }}
      />
    </div>
  );
}

/** Barrel Details */
function BarrelDetailsForm({
  record,
  onClose,
}: {
  record: EqptResult;
  onClose: () => void;
}) {
  const [barrelRegnNo, setBarrelRegnNo] = useState("");
  const [opClearance, setOpClearance] = useState("");
  const [opClearanceDt, setOpClearanceDt] = useState("");
  const [wkspName, setWkspName] = useState("");
  const [wkspInDt, setWkspInDt] = useState("");
  const [cofrVertical, setCofrVertical] = useState("");
  const [cofrHorizontal, setCofrHorizontal] = useState("");
  const [qtrOfLife, setQtrOfLife] = useState("");
  const [efc, setEfc] = useState("");
  const [totalRdsFired, setTotalRdsFired] = useState("");
  const [lastFiredDt, setLastFiredDt] = useState("");

  return (
    <div className="space-y-1.5">
      <FormRow label="Barrel Regn no" required className={pairRow}>
        <Input value={barrelRegnNo} onChange={(e) => setBarrelRegnNo(e.target.value)} />
      </FormRow>
      <FormGrid cols={2}>
        <FormRow label="Op Clearance" className={pairRow}>
          <SelectField
            value={opClearance}
            onChange={setOpClearance}
            options={OP_CLEARANCE_OPTIONS}
            placeholder="--Select--"
          />
        </FormRow>
        <FormRow label="Op Clearance Dt" className={pairRow}>
          <DateInput value={opClearanceDt} onChange={setOpClearanceDt} />
        </FormRow>
        <FormRow label="WKSP Name" className={pairRow}>
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value)} />
        </FormRow>
        <FormRow label="WKSP In Dt" className={pairRow}>
          <DateInput value={wkspInDt} onChange={setWkspInDt} />
        </FormRow>
        <FormRow label="CoFR Vertical (mm)" className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={cofrVertical}
            onChange={(e) => setCofrVertical(e.target.value)}
          />
        </FormRow>
        <FormRow label="CoFR Horizontal (mm)" className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={cofrHorizontal}
            onChange={(e) => setCofrHorizontal(e.target.value)}
          />
        </FormRow>
        <FormRow label="Qtr of Life" required className={pairRow}>
          <Input
            placeholder="Ex. 1,2,3,4"
            value={qtrOfLife}
            onChange={(e) => setQtrOfLife(e.target.value)}
          />
        </FormRow>
        <FormRow label="EFC" required className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={efc}
            onChange={(e) => setEfc(e.target.value)}
          />
        </FormRow>
        <FormRow label="Total Rds Fired" required className={pairRow}>
          <Input value={totalRdsFired} onChange={(e) => setTotalRdsFired(e.target.value)} />
        </FormRow>
        <FormRow label="Last Fired Dt" required className={pairRow}>
          <DateInput value={lastFiredDt} onChange={setLastFiredDt} />
        </FormRow>
      </FormGrid>
      <DialogActions
        onClose={onClose}
        updateLabel="Update Barrel Data"
        onUpdate={() => {
          if (pageHasInvalidDateInputs()) {
            toast.error("Please enter a valid date (dd/mm/yyyy)");
            return;
          }
          if (!barrelRegnNo || !qtrOfLife || !efc || !totalRdsFired || !lastFiredDt) {
            toast.error("Please fill all required fields");
            return;
          }
          toast.success(`Barrel details updated for ${record.regnNo}`);
          onClose();
        }}
      />
    </div>
  );
}

type StripRow = {
  id: string;
  recoilSysRegnNo: string;
  periodicity: string;
  dtOfInsp: string;
  dtOfNextInsp: string;
};

/** Strip Inspection */
function StripInspectionForm({
  record,
  onClose,
}: {
  record: EqptResult;
  onClose: () => void;
}) {
  const [recoilSysRegnNo, setRecoilSysRegnNo] = useState("");
  const [periodicity, setPeriodicity] = useState("");
  const [dtOfInsp, setDtOfInsp] = useState("");
  const [dtOfNextInsp, setDtOfNextInsp] = useState("");
  const [rows, setRows] = useState<StripRow[]>([]);

  const handleAdd = () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!recoilSysRegnNo) {
      toast.error("Recoil Sys Regn No is required");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        recoilSysRegnNo,
        periodicity,
        dtOfInsp,
        dtOfNextInsp,
      },
    ]);
    setRecoilSysRegnNo("");
    setPeriodicity("");
    setDtOfInsp("");
    setDtOfNextInsp("");
    toast.success("Strip inspection row added");
  };

  return (
    <div className="space-y-1.5">
      <div className="overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground text-[12px]">
                <span className="text-destructive mr-0.5">*</span>
                Recoil Sys Regn No
              </TableHead>
              <TableHead className="text-primary-foreground text-[12px]">
                Periodicity (in years)
              </TableHead>
              <TableHead className="text-primary-foreground text-[12px]">Dt of insp</TableHead>
              <TableHead className="text-primary-foreground text-[12px]">Dt of next insp</TableHead>
              <TableHead className="text-primary-foreground text-[12px] w-14">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="p-1">
                <Input
                  className="h-7"
                  value={recoilSysRegnNo}
                  onChange={(e) => setRecoilSysRegnNo(e.target.value)}
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  className="h-7"
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value)}
                />
              </TableCell>
              <TableCell className="p-1">
                <DateInput
                  className="h-7 min-w-[9rem]"
                  value={dtOfInsp}
                  onChange={setDtOfInsp}
                />
              </TableCell>
              <TableCell className="p-1">
                <DateInput
                  className="h-7 min-w-[9rem]"
                  value={dtOfNextInsp}
                  onChange={setDtOfNextInsp}
                />
              </TableCell>
              <TableCell className="p-1">
                <Button
                  type="button"
                  size="icon"
                  className="h-7 w-7 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleAdd}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.recoilSysRegnNo}</TableCell>
                <TableCell className="text-xs">{r.periodicity}</TableCell>
                <TableCell className="text-xs">{r.dtOfInsp}</TableCell>
                <TableCell className="text-xs">{r.dtOfNextInsp}</TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-[12px] text-muted-foreground">Eqpt: {record.regnNo}</p>
      <DialogActions onClose={onClose} />
    </div>
  );
}

function ArtilleryUpdateDialog({
  record,
  open,
  onClose,
}: {
  record: EqptResult;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ArtilleryTab>("oh");
  const code = shortCode(record.regnNo);

  const title =
    tab === "oh"
      ? `OH DETAILS (-${code})`
      : tab === "barrel"
        ? `BARREL DETAILS (-${code})`
        : `Strip Inspection (-${code})`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto gap-2 p-3 sm:p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-center text-sm font-bold uppercase tracking-wide underline underline-offset-2">
            {title}
          </DialogTitle>
          <SwitchTabs<ArtilleryTab>
            tabs={[
              { id: "oh", label: "OH Details" },
              { id: "barrel", label: "Barrel Details" },
              { id: "strip", label: "Strip Inspection" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </DialogHeader>
        {tab === "oh" && <OhDetailsForm record={record} onClose={onClose} />}
        {tab === "barrel" && <BarrelDetailsForm record={record} onClose={onClose} />}
        {tab === "strip" && <StripInspectionForm record={record} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export function UpdateArtyEqptData() {
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
              regnNo: form.regdNo.trim() || "21A-L0858",
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
        title="UPDATION OF ARTY EQPT DATA"
        fill={showResults}
        footer={
          <>
            <Button variant="secondary" onClick={handleClear}>
              Clear
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
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
                            name="arty-eqpt-sel"
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
                        <TableCell className="text-xs">Artillery</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="shrink-0 px-3 py-1 bg-muted/40 text-[12px] text-muted-foreground">
                Showing {results.length} record(s). Select a row and click Update → OH / Barrel /
                Strip screens.
              </div>
            </div>
          )}
        </div>
      </FormPanel>

      {updateRecord && (
        <ArtilleryUpdateDialog
          record={updateRecord}
          open
          onClose={() => setUpdateRecord(null)}
        />
      )}
    </>
  );
}
