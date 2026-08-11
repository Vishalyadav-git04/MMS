import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection, SwitchTabs } from "@/components/FormPanel";
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
import { pageHasInvalidDateInputs, toIsoDate } from "@/lib/date";
import { api, ApiError } from "@/lib/api";

interface Option {
  value: string;
  label: string;
}

interface HoldingUnit {
  sus_no: string;
  unit_name: string;
  display: string;
}

interface PrfGroup {
  prf_group: string;
  prf_codes: string[];
}

interface CensusItem {
  census_no: string;
  nomenclature: string | null;
}

interface HoldingType {
  value: string;
  label: string;
}

interface EqptRow {
  id: number | string;
  source_table: string;
  source_label: string;
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
}

interface EqptDetail extends EqptRow {
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
  has_barrels: boolean;
}

const OH_TYPE_OPTIONS = ["Minor OH", "Major OH", "Base OH", "Intermediate OH"];
const OP_CLEARANCE_OPTIONS = ["Cleared", "Not Cleared", "Pending"];

const emptyForm = {
  unitSearch: "",
  susNo: "",
  prfGroup: "",
  censusNo: "",
  typeOfHolding: "",
  regdNo: "",
};

function SelectField({
  value,
  onChange,
  options,
  placeholder = "--Select--",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SimpleSelectField({
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
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5",
        className,
      )}
    >
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
      : detail.sus_no || detail.unit_name || "—";

  const issuingDepotDisplay =
    detail.from_unit_name && detail.from_sus_no
      ? `${detail.from_unit_name} (${detail.from_sus_no})`
      : detail.from_unit_name || detail.from_sus_no || "—";

  const censusDisplay =
    detail.census_no && detail.nomenclature
      ? `${detail.census_no} — ${detail.nomenclature}`
      : detail.census_no || "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Equipment Details — {detail.eqpt_regn_no || detail.census_no || "Record Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          <FormSection title="1. Issue & Depot Particulars" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <DetailField label="IV No" value={detail.iv_no} />
            <DetailField label="IV Date" value={detail.iv_date} />
            <DetailField label="Issuing Depot" value={issuingDepotDisplay} />
            <DetailField label="Holding Unit" value={unitDisplay} />
            <DetailField
              label="Type of Holding"
              value={detail.type_of_hldg_label || detail.type_of_hldg}
            />
            <DetailField
              label="Type of Eqpt"
              value={detail.type_of_eqpt_label || detail.type_of_eqpt}
            />
          </div>

          <FormSection title="2. Census & Equipment Details" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <DetailField label="PRF Group" value={detail.prf_group} />
            <DetailField label="PRF Code" value={detail.prf_code} />
            <DetailField label="Eqpt Regn No" value={detail.eqpt_regn_no} />
            <div className="sm:col-span-2">
              <DetailField label="Census No" value={censusDisplay} />
            </div>
            <DetailField label="Material No" value={detail.material_no} />
            <DetailField label="Eqpt Make" value={detail.eqpt_make} />
            <DetailField label="Eqpt Model" value={detail.eqpt_model} />
            <DetailField label="Unit Price" value={detail.unit_price} />
            <DetailField label="Depreciation %" value={detail.depres_dur_year} />
            <DetailField label="Life (Yr)" value={detail.life_of_asset} />
            <div className="sm:col-span-3">
              <DetailField label="Upload IV" value={detail.upload_iv} />
            </div>
          </div>

          <FormSection title="3. Serviceability & Barrel Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DetailField
              label="Serviceability Status"
              value={detail.service_status_label || detail.service_status}
            />
            <DetailField label="Special Remarks" value={detail.spl_remarks} />
            <DetailField label="Barrel - I" value={detail.barrel1_detl} />
            <DetailField label="Barrel - II" value={detail.barrel2_detl} />
            <DetailField label="Barrel - III" value={detail.barrel3_detl} />
            <DetailField label="Barrel - IV" value={detail.barrel4_detl} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
          onChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""));
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
            className="z-[100] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <ul className="mms-scrollbar max-h-72 overflow-y-auto overscroll-contain">
              {suggestions.map((s, idx) => (
                <li key={`${s}-${idx}`}>
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center rounded-[8px] px-3 py-2 text-left text-[15.5px] outline-none hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)]"
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

function DialogActions({
  onClose,
  onUpdate,
  updateLabel,
  updateDisabled,
  busy,
}: {
  onClose: () => void;
  onUpdate?: () => void;
  updateLabel?: string;
  updateDisabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-1">
      <Button variant="destructive" onClick={onClose} disabled={busy}>
        Close
      </Button>
      {onUpdate && updateLabel && (
        <Button onClick={onUpdate} disabled={updateDisabled || busy}>
          {busy ? "Saving…" : updateLabel}
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
  record: EqptRow;
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
  const [busy, setBusy] = useState(false);

  const isDirty =
    ohType ||
    ohDueDt ||
    ohDoneDt ||
    wkspName ||
    wkspInDt ||
    dispatchDt ||
    bohComplDt ||
    gunRecdDt ||
    dtOfIntro;

  const handleUpdate = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!ohType) {
      toast.error("OH Type is required");
      return;
    }
    if (!record.eqpt_regn_no) {
      toast.error("Missing equipment registration number");
      return;
    }
    setBusy(true);
    try {
      await api("/unit-holding/update-arty-eqpt-data/oh-detail", {
        method: "POST",
        body: JSON.stringify({
          eqpt_regn_no: record.eqpt_regn_no,
          sus_no: record.sus_no || null,
          oh_type: ohType,
          oh_due_dt: toIsoDate(ohDueDt) || null,
          oh_done_dt: toIsoDate(ohDoneDt) || null,
          wksp_name: wkspName || null,
          wksp_in_dt: toIsoDate(wkspInDt) || null,
          dispatch_dt: toIsoDate(dispatchDt) || null,
          boh_compl_dt: toIsoDate(bohComplDt) || null,
          gun_recd_dt: toIsoDate(gunRecdDt) || null,
          dt_of_intro: toIsoDate(dtOfIntro) || null,
        }),
      });
      toast.success(`OH details updated for ${record.eqpt_regn_no}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save OH details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 pt-1">
      <FormRow label="OH Type" required className={pairRow}>
        <SimpleSelectField
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
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))} />
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
        updateDisabled={!isDirty}
        busy={busy}
        onUpdate={() => void handleUpdate()}
      />
    </div>
  );
}

/** Barrel Details */
function BarrelDetailsForm({
  record,
  onClose,
}: {
  record: EqptRow;
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
  const [busy, setBusy] = useState(false);

  const isDirty =
    barrelRegnNo ||
    opClearance ||
    opClearanceDt ||
    wkspName ||
    wkspInDt ||
    cofrVertical ||
    cofrHorizontal ||
    qtrOfLife ||
    efc ||
    totalRdsFired ||
    lastFiredDt;

  const handleUpdate = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!barrelRegnNo || !qtrOfLife || !efc || !totalRdsFired || !lastFiredDt) {
      toast.error("Please fill all required fields");
      return;
    }
    const lastFiredIso = toIsoDate(lastFiredDt);
    if (!lastFiredIso) {
      toast.error("Please enter a valid Last Fired Dt");
      return;
    }
    if (!record.eqpt_regn_no) {
      toast.error("Missing equipment registration number");
      return;
    }
    setBusy(true);
    try {
      await api("/unit-holding/update-arty-eqpt-data/barrel-detail", {
        method: "POST",
        body: JSON.stringify({
          eqpt_regn_no: record.eqpt_regn_no,
          sus_no: record.sus_no || null,
          barrel_regn_no: barrelRegnNo,
          op_clear: opClearance || null,
          op_clear_dt: toIsoDate(opClearanceDt) || null,
          wksp_name: wkspName || null,
          wksp_in_dt: toIsoDate(wkspInDt) || null,
          cofr_vertical: cofrVertical || null,
          cofr_horizontal: cofrHorizontal || null,
          qtr_of_life: qtrOfLife,
          efc,
          total_rds_fired: totalRdsFired,
          last_fired_dt: lastFiredIso,
        }),
      });
      toast.success(`Barrel details updated for ${record.eqpt_regn_no}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save barrel details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 pt-1">
      <FormRow label="Barrel Regn no" required className={pairRow}>
        <Input value={barrelRegnNo} onChange={(e) => setBarrelRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))} />
      </FormRow>
      <FormGrid cols={2}>
        <FormRow label="Op Clearance" className={pairRow}>
          <SimpleSelectField
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
          <Input value={wkspName} onChange={(e) => setWkspName(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))} />
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
        updateDisabled={!isDirty}
        busy={busy}
        onUpdate={() => void handleUpdate()}
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
  record: EqptRow;
  onClose: () => void;
}) {
  const [recoilSysRegnNo, setRecoilSysRegnNo] = useState("");
  const [periodicity, setPeriodicity] = useState("");
  const [dtOfInsp, setDtOfInsp] = useState("");
  const [dtOfNextInsp, setDtOfNextInsp] = useState("");
  const [rows, setRows] = useState<StripRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!record.eqpt_regn_no) return;
    setLoading(true);
    void api<
      {
        id: string | number;
        recoil_sys_regd_no: string;
        periodicity: string | null;
        dt_of_insp: string | null;
        dt_of_next_insp: string | null;
      }[]
    >(`/unit-holding/update-arty-eqpt-data/strip-detail?eqpt_regn_no=${encodeURIComponent(record.eqpt_regn_no)}`)
      .then((res) =>
        setRows(
          res.map((r) => ({
            id: r.id,
            recoilSysRegnNo: r.recoil_sys_regd_no,
            periodicity: r.periodicity || "",
            dtOfInsp: r.dt_of_insp || "",
            dtOfNextInsp: r.dt_of_next_insp || "",
          })),
        ),
      )
      .catch(() => toast.error("Failed to load strip inspection history"))
      .finally(() => setLoading(false));
  }, [record.eqpt_regn_no]);

  const handleAdd = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (!recoilSysRegnNo.trim()) {
      toast.error("Recoil Sys Regn No is required");
      return;
    }
    if (!record.eqpt_regn_no) {
      toast.error("Missing equipment registration number");
      return;
    }
    setAdding(true);
    try {
      const saved = await api<{
        id: string | number;
        recoil_sys_regd_no: string;
        periodicity: string | null;
        dt_of_insp: string | null;
        dt_of_next_insp: string | null;
      }>("/unit-holding/update-arty-eqpt-data/strip-detail", {
        method: "POST",
        body: JSON.stringify({
          eqpt_regn_no: record.eqpt_regn_no,
          recoil_sys_regd_no: recoilSysRegnNo,
          periodicity: periodicity || null,
          dt_of_insp: toIsoDate(dtOfInsp) || null,
          dt_of_next_insp: toIsoDate(dtOfNextInsp) || null,
        }),
      });
      setRows((prev) => [
        ...prev,
        {
          id: saved.id,
          recoilSysRegnNo: saved.recoil_sys_regd_no,
          periodicity: saved.periodicity || "",
          dtOfInsp: saved.dt_of_insp || "",
          dtOfNextInsp: saved.dt_of_next_insp || "",
        },
      ]);
      setRecoilSysRegnNo("");
      setPeriodicity("");
      setDtOfInsp("");
      setDtOfNextInsp("");
      toast.success("Strip inspection row added");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to add strip inspection row");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 pt-1">
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
                  onChange={(e) => setRecoilSysRegnNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  className="h-7"
                  value={periodicity}
                  onChange={(e) => setPeriodicity(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
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
                  onClick={() => void handleAdd()}
                  disabled={!recoilSysRegnNo.trim() || adding}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.recoilSysRegnNo}</TableCell>
                  <TableCell className="text-xs">{r.periodicity}</TableCell>
                  <TableCell className="text-xs">{r.dtOfInsp}</TableCell>
                  <TableCell className="text-xs">{r.dtOfNextInsp}</TableCell>
                  <TableCell />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-[12px] text-muted-foreground">Eqpt: {record.eqpt_regn_no}</p>
      <DialogActions onClose={onClose} />
    </div>
  );
}

function shortCode(regnNo?: string | null) {
  if (!regnNo) return "";
  const parts = regnNo.split("-");
  return parts.length > 1 ? parts[parts.length - 1] : regnNo;
}

type ArtilleryTab = "oh" | "barrel" | "strip";

function ArtilleryUpdateDialog({
  record,
  open,
  onClose,
}: {
  record: EqptRow;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ArtilleryTab>("oh");
  const code = shortCode(record.eqpt_regn_no);

  const title =
    tab === "oh"
      ? `OH DETAILS (-${code})`
      : tab === "barrel"
        ? `BARREL DETAILS (-${code})`
        : `Strip Inspection (-${code})`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto gap-2 p-3 sm:p-4">
        <DialogHeader className="flex flex-col gap-1">
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

function rowKey(r: EqptRow) {
  return `${r.source_table}:${r.id}`;
}

export function UpdateArtyEqptData() {
  const [form, setForm] = useState(emptyForm);
  const [units, setUnits] = useState<HoldingUnit[]>([]);
  const [prfGroups, setPrfGroups] = useState<PrfGroup[]>([]);
  const [censusItems, setCensusItems] = useState<CensusItem[]>([]);
  const [holdingTypes, setHoldingTypes] = useState<HoldingType[]>([]);
  const [results, setResults] = useState<EqptRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [updateRecord, setUpdateRecord] = useState<EqptRow | null>(null);
  const [viewDetail, setViewDetail] = useState<EqptDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, results.length);
  const pageRows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selected = useMemo(
    () => results.find((r) => rowKey(r) === selectedKey) ?? null,
    [results, selectedKey],
  );

  const matchingUnits = useMemo(() => {
    const q = form.unitSearch.trim().toLowerCase();
    if (!q) return units.slice(0, 10);
    return units
      .filter(
        (u) =>
          u.sus_no.toLowerCase().includes(q) ||
          u.unit_name.toLowerCase().includes(q) ||
          u.display.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [units, form.unitSearch]);

  const unitSuggestions = useMemo(
    () => matchingUnits.map((u) => u.display),
    [matchingUnits],
  );

  const pickUnit = (idx: number) => {
    const chosen = matchingUnits[idx];
    if (!chosen) return;
    setForm((prev) => ({
      ...prev,
      unitSearch: chosen.display,
      susNo: chosen.sus_no,
      prfGroup: "",
      censusNo: "",
      typeOfHolding: "",
    }));
    setPrfGroups([]);
    setCensusItems([]);
    setHoldingTypes([]);
    setResults([]);
    setShowResults(false);
    setSelectedKey(null);
  };

  const prfOptions = useMemo(
    () => prfGroups.map((p) => ({ value: p.prf_group, label: p.prf_group })),
    [prfGroups],
  );

  const censusOptions = useMemo(
    () =>
      censusItems.map((c) => ({
        value: c.census_no,
        label: c.nomenclature ? `${c.census_no} — ${c.nomenclature}` : c.census_no,
      })),
    [censusItems],
  );

  const holdingOptions = useMemo(() => {
    const list = holdingTypes.map((h) => ({ value: h.value, label: h.label }));
    if (list.length > 0) {
      return [{ value: "ALL", label: "ALL" }, ...list];
    }
    return list;
  }, [holdingTypes]);

  const loadUnits = (q = "") => {
    void api<HoldingUnit[]>(
      `/unit-holding/update-arty-eqpt-data/units?q=${encodeURIComponent(q)}`,
    )
      .then(setUnits)
      .catch(() => {
        setUnits([]);
        toast.error("Failed to load artillery units");
      });
  };

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    if (!form.susNo) {
      setPrfGroups([]);
      return;
    }
    void api<PrfGroup[]>(
      `/unit-holding/update-arty-eqpt-data/prf-groups?sus_no=${encodeURIComponent(form.susNo)}`,
    )
      .then(setPrfGroups)
      .catch(() => {
        setPrfGroups([]);
        toast.error("Failed to load PRF groups");
      });
  }, [form.susNo]);

  useEffect(() => {
    if (!form.susNo || !form.prfGroup) {
      setCensusItems([]);
      return;
    }
    void api<CensusItem[]>(
      `/unit-holding/update-arty-eqpt-data/census-items?sus_no=${encodeURIComponent(form.susNo)}&prf_group=${encodeURIComponent(form.prfGroup)}`,
    )
      .then(setCensusItems)
      .catch(() => {
        setCensusItems([]);
        toast.error("Failed to load census items");
      });
  }, [form.susNo, form.prfGroup]);

  useEffect(() => {
    if (!form.susNo || !form.prfGroup || !form.censusNo) {
      setHoldingTypes([]);
      return;
    }
    void api<HoldingType[]>(
      `/unit-holding/update-arty-eqpt-data/holding-types?sus_no=${encodeURIComponent(form.susNo)}&prf_group=${encodeURIComponent(form.prfGroup)}&census_no=${encodeURIComponent(form.censusNo)}`,
    )
      .then(setHoldingTypes)
      .catch(() => {
        setHoldingTypes([]);
        toast.error("Failed to load holding types");
      });
  }, [form.susNo, form.prfGroup, form.censusNo]);

  const handleClear = () => {
    setForm(emptyForm);
    setPrfGroups([]);
    setCensusItems([]);
    setHoldingTypes([]);
    setResults([]);
    setShowResults(false);
    setSelectedKey(null);
    setUpdateRecord(null);
    setViewDetail(null);
    setPage(1);
    loadUnits();
  };

  const handlePrfChange = (prf: string) => {
    setForm((prev) => ({
      ...prev,
      prfGroup: prf,
      censusNo: "",
      typeOfHolding: "",
    }));
    setResults([]);
    setShowResults(false);
    setSelectedKey(null);
    setPage(1);
  };

  const handleCensusChange = (census: string) => {
    setForm((prev) => ({
      ...prev,
      censusNo: census,
      typeOfHolding: "",
    }));
    setResults([]);
    setShowResults(false);
    setSelectedKey(null);
    setPage(1);
  };

  const handleSearch = async (opts?: { silent?: boolean; overrideTypeOfHolding?: string }) => {
    if (!form.susNo || !form.prfGroup || !form.censusNo) {
      toast.error("Please fill required fields (Unit, PRF Group, Census No)");
      return;
    }
    const selectedHldg =
      opts?.overrideTypeOfHolding !== undefined
        ? opts.overrideTypeOfHolding
        : form.typeOfHolding;
    const hldgToSearch = selectedHldg || "ALL";

    setBusy(true);
    try {
      const rows = await api<EqptRow[]>("/unit-holding/update-arty-eqpt-data/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: form.susNo,
          prf_group: form.prfGroup,
          census_no: form.censusNo,
          type_of_hldg: hldgToSearch,
          regd_no: form.regdNo.trim() || null,
        }),
      });
      setResults(rows);
      setShowResults(true);
      setSelectedKey(rows[0] ? rowKey(rows[0]) : null);
      setPage(1);
      if (!opts?.silent) {
        toast.success(`${rows.length} record(s) found`);
      }
    } catch (e) {
      setResults([]);
      setShowResults(false);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = () => {
    if (!selected) {
      toast.error("Please select a unit/equipment row");
      return;
    }
    setUpdateRecord(selected);
  };

  const handleViewRow = async (r: EqptRow) => {
    setBusy(true);
    try {
      const detail = await api<EqptDetail>(
        `/unit-holding/update-arty-eqpt-data/detail?id=${encodeURIComponent(r.id)}&source_table=${encodeURIComponent(r.source_table)}`,
      );
      setViewDetail(detail);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load equipment detail");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FormPanel
        title="UPDATION OF ARTY EQPT DATA"
        fill={showResults}
        footer={
          <>
            <Button variant="secondary" onClick={handleClear} disabled={busy}>
              Clear
            </Button>
            <Button onClick={() => void handleSearch()} disabled={busy}>
              {busy ? "Searching…" : "Search"}
            </Button>
            {showResults && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleUpdate}
                disabled={!selected || busy}
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
                placeholder="Search artillery unit by SUS or name..."
                value={form.unitSearch}
                suggestions={unitSuggestions}
                onChange={(v) => {
                  const match = units.find(
                    (u) =>
                      u.display.toLowerCase() === v.trim().toLowerCase() ||
                      u.sus_no.toLowerCase() === v.trim().toLowerCase(),
                  );
                  setForm((prev) => ({
                    ...prev,
                    unitSearch: v,
                    susNo: match ? match.sus_no : "",
                    prfGroup: match ? prev.prfGroup : "",
                    censusNo: match ? prev.censusNo : "",
                    typeOfHolding: match ? prev.typeOfHolding : "",
                  }));
                }}
                onPick={pickUnit}
              />
            </FormRow>

            <FormRow label="PRF Group" required>
              <SelectField
                value={form.prfGroup}
                onChange={handlePrfChange}
                options={prfOptions}
                placeholder="--Select--"
                disabled={!form.susNo}
              />
            </FormRow>

            <FormRow label="Census No" required>
              <SelectField
                value={form.censusNo}
                onChange={handleCensusChange}
                options={censusOptions}
                placeholder="--Select--"
                disabled={!form.prfGroup}
              />
            </FormRow>

            <FormRow label="Type of Holding" className="md:col-span-2">
              <SelectField
                value={form.typeOfHolding}
                onChange={(v) => upd("typeOfHolding", v)}
                options={holdingOptions}
                placeholder="--Select Type of Holding (or ALL)--"
                disabled={!form.censusNo}
              />
            </FormRow>

            <FormRow label="Registered No Search" className="md:col-start-3">
              <Input
                placeholder="Enter Regd No"
                value={form.regdNo}
                onChange={(e) => upd("regdNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
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
                      <TableHead className="text-primary-foreground text-[12px] w-12 text-center">
                        View
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((r) => {
                        const key = rowKey(r);
                        const unitDisplay =
                          r.sus_no && r.unit_name
                            ? `${r.sus_no} - ${r.unit_name}`
                            : r.sus_no || r.unit_name || "";
                        return (
                          <TableRow
                            key={key}
                            className={cn(
                              "cursor-pointer",
                              selectedKey === key && "bg-accent/50",
                            )}
                            onClick={() => setSelectedKey(key)}
                          >
                            <TableCell className="text-xs">
                              <input
                                type="radio"
                                name="arty-eqpt-sel"
                                checked={selectedKey === key}
                                onChange={() => setSelectedKey(key)}
                                className="accent-primary"
                              />
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {r.eqpt_regn_no || "—"}
                            </TableCell>
                            <TableCell className="text-xs">{unitDisplay}</TableCell>
                            <TableCell className="text-xs">{r.prf_group || "—"}</TableCell>
                            <TableCell className="text-xs">{r.census_no || "—"}</TableCell>
                            <TableCell className="text-xs">
                              {r.type_of_hldg_label || r.type_of_hldg || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.service_status_label || r.service_status || "—"}
                            </TableCell>
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
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-[12px] text-muted-foreground">
                <div>
                  Showing {pageStart} to {pageEnd} of {results.length} record(s). Select a row and
                  click Update → OH / Barrel / Strip screens.
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
                      variant="default"
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
