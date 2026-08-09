import { useMemo, useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, SwitchTabs, FormSection } from "@/components/FormPanel";
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
import { Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { api } from "@/lib/api";

const UNIT_OPTIONS = [
  "1970501E - 14 FIELD REGT (ARTY)",
  "1980602F - 61 MEDIUM REGT (ARTY)",
  "1990703G - 105 FIELD REGT (ARTY)",
  "2000804H - 215 ROCKET REGT (ARTY)",
  "2010905I - 322 FIELD REGT (ARTY)",
  "2021006J - 45 MEDIUM REGT (ARTY)",
  "2031107K - 82 LIGHT REGT (ARTY)",
  "2041208L - 169 FIELD REGT (ARTY)",
  "2051309M - 99 MEDIUM REGT (ARTY)",
  "2061410N - 74 FIELD REGT (ARTY)",
  "2071511O - 110 HIGH ALTITUDE REGT (ARTY)",
  "2081612P - 51 MEDIUM REGT (ARTY)",
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
  id: number | string;
  regnNo: string;
  unit: string;
  prfGroup: string;
  censusNo: string;
  typeOfHolding: string;
  serviceability: string;
};

interface EqptDetail extends Partial<EqptResult> {
  id: number | string;
  source_table?: string;
  source_label?: string;
  eqpt_regn_no?: string | null;
  sus_no?: string | null;
  unit_name?: string | null;
  prf_group?: string | null;
  prf_code?: string | null;
  census_no?: string | null;
  type_of_hldg?: string | null;
  type_of_hldg_label?: string | null;
  service_status?: string | null;
  service_status_label?: string | null;
  iv_no?: string | null;
  iv_date?: string | null;
  from_sus_no?: string | null;
  from_unit_name?: string | null;
  material_no?: string | null;
  nomenclature?: string | null;
  type_of_eqpt?: string | null;
  type_of_eqpt_label?: string | null;
  eqpt_make?: string | null;
  eqpt_model?: string | null;
  unit_price?: string | null;
  depres_dur_year?: string | null;
  life_of_asset?: string | null;
  upload_iv?: string | null;
  regn_seq_no?: string | null;
  census_seq_no?: string | number | null;
  barrel1_detl?: string | null;
  barrel2_detl?: string | null;
  barrel3_detl?: string | null;
  barrel4_detl?: string | null;
  spl_remarks?: string | null;
  has_barrels?: boolean;
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[13.5px] font-semibold text-foreground break-words whitespace-normal leading-normal">
        {value || "—"}
      </span>
    </div>
  );
}

function ViewEqptDialog({
  detail,
  open,
  onClose,
}: {
  detail: EqptDetail;
  open: boolean;
  onClose: () => void;
}) {
  const unitDisplay =
    detail.sus_no && detail.unit_name
      ? `${detail.sus_no} - ${detail.unit_name}`
      : detail.unit || detail.sus_no || detail.unit_name || "—";

  const issuingDepotDisplay =
    detail.from_unit_name && detail.from_sus_no
      ? `${detail.from_unit_name} (${detail.from_sus_no})`
      : detail.from_unit_name || detail.from_sus_no || "DEP-001 (COD Delhi)";

  const censusDisplay =
    detail.census_no && detail.nomenclature
      ? `${detail.census_no} — ${detail.nomenclature}`
      : detail.censusNo || detail.census_no || "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Equipment Details — {detail.eqpt_regn_no || detail.regnNo || detail.census_no || "Record Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <FormSection title="1. Issue & Depot Particulars" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <DetailField label="IV No" value={detail.iv_no || "IV-2024-8841"} />
            <DetailField label="IV Date" value={detail.iv_date || "15/03/2024"} />
            <DetailField label="Issuing Depot" value={issuingDepotDisplay} />
            <DetailField label="Holding Unit" value={unitDisplay} />
            <DetailField
              label="Type of Holding"
              value={detail.type_of_hldg_label || detail.type_of_hldg || detail.typeOfHolding}
            />
            <DetailField
              label="Type of Eqpt"
              value={detail.type_of_eqpt_label || detail.type_of_eqpt || "Artillery Gun"}
            />
          </div>

          <FormSection title="2. Census & Equipment Details" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <DetailField label="PRF Group" value={detail.prf_group || detail.prfGroup} />
            <DetailField label="PRF Code" value={detail.prf_code || "PRF-ARTY-02"} />
            <DetailField label="Eqpt Regn No" value={detail.eqpt_regn_no || detail.regnNo} />
            <div className="sm:col-span-2">
              <DetailField label="Census No" value={censusDisplay} />
            </div>
            <DetailField label="Material No" value={detail.material_no || "MAT-ART-7721"} />
            <DetailField label="Eqpt Make" value={detail.eqpt_make || "Bofors AB"} />
            <DetailField label="Eqpt Model" value={detail.eqpt_model || "FH-77B 155mm"} />
            <DetailField label="Unit Price" value={detail.unit_price || "₹ 12,50,00,000"} />
            <DetailField label="Depreciation %" value={detail.depres_dur_year || "5%"} />
            <DetailField label="Life (Yr)" value={detail.life_of_asset || "25 Years"} />
            <div className="sm:col-span-3">
              <DetailField label="Upload IV" value={detail.upload_iv || "iv_voucher_2024.pdf"} />
            </div>
          </div>

          <FormSection title="3. Serviceability & Barrel Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DetailField
              label="Serviceability Status"
              value={detail.service_status_label || detail.service_status || detail.serviceability}
            />
            <DetailField label="Special Remarks" value={detail.spl_remarks || "Regular maintenance completed."} />
            <DetailField label="Barrel - I" value={detail.barrel1_detl || "BRL-155-A981"} />
            <DetailField label="Barrel - II" value={detail.barrel2_detl || "—"} />
            <DetailField label="Barrel - III" value={detail.barrel3_detl || "—"} />
            <DetailField label="Barrel - IV" value={detail.barrel4_detl || "—"} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    <Select key={value || "empty"} value={value || ""} onValueChange={onChange} disabled={disabled}>
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

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  onChange: (v: string) => void;
  onPick: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) {
      setCoords(null);
      return;
    }
    updateCoords();
    const onScroll = () => updateCoords();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, suggestions]);

  const showList = open && suggestions.length > 0 && coords;

  return (
    <div className="relative overflow-visible">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          updateCoords();
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList &&
        createPortal(
          <div
            className="z-[100] overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-xl backdrop-blur-md"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-2.5 py-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase select-none">
              <span>Suggestions</span>
              <span>{suggestions.length} match{suggestions.length > 1 ? "es" : ""}</span>
            </div>
            <ul className="mms-scrollbar max-h-72 overflow-y-auto overscroll-contain py-1">
              {suggestions.map((s, idx) => (
                <li key={`${s}-${idx}`}>
                  <button
                    type="button"
                    className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => {
                      if (blurTimer.current) window.clearTimeout(blurTimer.current);
                      onPick(idx);
                      setOpen(false);
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
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
    <div className="space-y-3.5 pt-1">
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
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))} />
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
    <div className="space-y-3.5 pt-1">
      <FormRow label="Barrel Regn no" required className={pairRow}>
        <Input value={barrelRegnNo} onChange={(e) => setBarrelRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))} />
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
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))} />
        </FormRow>
        <FormRow label="WKSP In Dt" className={pairRow}>
          <DateInput value={wkspInDt} onChange={setWkspInDt} />
        </FormRow>
        <FormRow label="CoFR Vertical (mm)" className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={cofrVertical}
            onChange={(e) => setCofrVertical(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </FormRow>
        <FormRow label="CoFR Horizontal (mm)" className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={cofrHorizontal}
            onChange={(e) => setCofrHorizontal(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </FormRow>
        <FormRow label="Qtr of Life" required className={pairRow}>
          <Input
            placeholder="Ex. 1,2,3,4"
            value={qtrOfLife}
            onChange={(e) => setQtrOfLife(e.target.value.replace(/[^0-9,]/g, ""))}
          />
        </FormRow>
        <FormRow label="EFC" required className={pairRow}>
          <Input
            placeholder="Ex. 0000.0000"
            value={efc}
            onChange={(e) => setEfc(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </FormRow>
        <FormRow label="Total Rds Fired" required className={pairRow}>
          <Input value={totalRdsFired} onChange={(e) => setTotalRdsFired(e.target.value.replace(/\D/g, ""))} />
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
  id: number | string;
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
    <div className="space-y-3.5 pt-1">
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
                  onChange={(e) => setRecoilSysRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  className="h-7"
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
                  className="h-7 w-7"
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
  const [units, setUnits] = useState<string[]>(UNIT_OPTIONS);
  const [results, setResults] = useState<EqptResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [updateRecord, setUpdateRecord] = useState<EqptResult | null>(null);
  const [viewDetail, setViewDetail] = useState<EqptDetail | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void api<{ sus_no: string; unit_name: string; display: string }[]>(
      "/unit-holding/update-eqpt-data/units",
    )
      .then((res) => {
        if (res && res.length > 0) {
          setUnits(res.map((u) => u.display));
        }
      })
      .catch(() => undefined);
  }, []);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selected = useMemo(
    () => results.find((r) => r.id === selectedId) ?? null,
    [results, selectedId],
  );

  const holdingOptions = useMemo(
    () => ["ALL", ...HOLDING_TYPES],
    [],
  );

  const matchingUnits = useMemo(() => {
    const q = form.unitSearch.trim().toLowerCase();
    if (!q) return units.slice(0, 10);
    return units
      .filter((u) => u.toLowerCase().includes(q))
      .slice(0, 10);
  }, [units, form.unitSearch]);

  const unitSuggestions = useMemo(
    () => matchingUnits,
    [matchingUnits],
  );

  const pickUnit = (idx: number) => {
    const chosen = matchingUnits[idx];
    if (!chosen) return;
    setForm((prev) => ({
      ...prev,
      unitSearch: chosen,
      unit: chosen,
    }));
  };

  const handleClear = () => {
    setForm(emptyForm);
    setResults([]);
    setShowResults(false);
    setSelectedId(null);
    setUpdateRecord(null);
    setPage(1);
  };

  const handleSearch = (opts?: { overrideTypeOfHolding?: string }) => {
    const activeUnit = form.unit || form.unitSearch;
    if (!activeUnit || !form.prfGroup || !form.censusNo) {
      toast.error("Please fill required fields (Unit, PRF Group, Census No)");
      return;
    }

    const selectedHldg =
      opts?.overrideTypeOfHolding !== undefined
        ? opts.overrideTypeOfHolding
        : form.typeOfHolding;
    const hldgToSearch = selectedHldg || "ALL";

    const matched = MOCK_EQPT.filter((r) => {
      const unitOk =
        !activeUnit ||
        r.unit.toLowerCase().includes(activeUnit.trim().toLowerCase()) ||
        activeUnit.trim().toLowerCase().includes(r.unit.toLowerCase());
      const prfOk = r.prfGroup === form.prfGroup;
      const censusOk = r.censusNo === form.censusNo;
      const holdingOk =
        !hldgToSearch || hldgToSearch === "ALL" || r.typeOfHolding === hldgToSearch;
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
              unit: activeUnit,
              prfGroup: form.prfGroup,
              censusNo: form.censusNo,
              typeOfHolding: hldgToSearch === "ALL" ? "Authorised Holding" : hldgToSearch,
              serviceability: "Serviciable",
            },
          ];

    setResults(rows);
    setShowResults(true);
    setSelectedId(rows[0]?.id ?? null);
    setPage(1);
    toast.success(`${rows.length} record(s) found`);
  };

  const handleUpdate = () => {
    if (!selected) {
      toast.error("Please select a unit/equipment row");
      return;
    }
    setUpdateRecord(selected);
  };

  const handleViewRow = async (r: EqptResult) => {
    try {
      const detail = await api<EqptDetail>(
        `/unit-holding/update-eqpt-data/detail?id=${encodeURIComponent(r.id)}&source_table=unit`,
      );
      setViewDetail({
        ...detail,
        unit: r.unit,
        regnNo: r.regnNo,
        prfGroup: r.prfGroup,
        censusNo: r.censusNo,
        typeOfHolding: r.typeOfHolding,
        serviceability: r.serviceability,
      });
    } catch {
      setViewDetail({
        id: r.id,
        eqpt_regn_no: r.regnNo,
        regnNo: r.regnNo,
        unit: r.unit,
        unit_name: r.unit,
        prf_group: r.prfGroup,
        prfGroup: r.prfGroup,
        census_no: r.censusNo,
        censusNo: r.censusNo,
        type_of_hldg: r.typeOfHolding,
        typeOfHolding: r.typeOfHolding,
        service_status: r.serviceability,
        serviceability: r.serviceability,
        nomenclature: r.censusNo.includes("—") ? r.censusNo.split("—")[1]?.trim() : r.censusNo,
      });
    }
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
              onClick={() => handleSearch()}
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
          </>
        }
      >
        <div
          className={cn(
            "flex w-full flex-col gap-3",
            showResults && "min-h-0 flex-1",
          )}
        >
          <FormGrid cols={3} className="shrink-0">
            <FormRow label="Unit" required>
              <SuggestInput
                placeholder="Search unit..."
                value={form.unitSearch}
                suggestions={unitSuggestions}
                onChange={(v) => {
                  setForm((prev) => ({
                    ...prev,
                    unitSearch: v,
                    unit: v,
                  }));
                }}
                onPick={pickUnit}
              />
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

            <FormRow label="Type of Holding" className="md:col-span-2">
              <SelectField
                value={form.typeOfHolding}
                onChange={(v) => {
                  upd("typeOfHolding", v);
                  if (form.unit && form.prfGroup && form.censusNo) {
                    handleSearch({ overrideTypeOfHolding: v });
                  }
                }}
                options={holdingOptions}
                placeholder="--Select Type of Holding (or ALL)--"
              />
            </FormRow>

            <FormRow label="Registered No Search" className="md:col-start-3">
              <Input
                placeholder="Enter Regd No"
                value={form.regdNo}
                onChange={(e) => upd("regdNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
              />
            </FormRow>
          </FormGrid>

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
                      <TableHead className="text-primary-foreground text-[12px] w-12 text-center">
                        View
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((r) => (
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
                          <TableCell className="text-xs text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-primary hover:bg-primary/10"
                              title="View equipment details"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleViewRow(r);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-[12px] text-muted-foreground">
                <div>
                  Showing {pageStart} to {pageEnd} of {results.length} record(s). Select a row and click Update → OH / Barrel / Strip screens.
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="px-2 text-xs font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
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

      {viewDetail && (
        <ViewEqptDialog
          detail={viewDetail}
          open
          onClose={() => setViewDetail(null)}
        />
      )}
    </>
  );
}
