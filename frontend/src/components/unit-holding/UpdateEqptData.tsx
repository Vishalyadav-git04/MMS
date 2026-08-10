import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
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
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

        <div className="space-y-4 pt-1">
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

function DialogActions({
  onClear,
  onUpdate,
  busy,
  updateDisabled,
}: {
  onClear: () => void;
  onUpdate?: () => void;
  busy?: boolean;
  updateDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-3 mt-2 border-t border-border/50">
      <Button variant="secondary" onClick={onClear} disabled={busy}>
        Clear
      </Button>
      {onUpdate && (
        <Button onClick={onUpdate} disabled={busy || updateDisabled}>
          {busy ? "Updating…" : "Update Data"}
        </Button>
      )}
    </div>
  );
}

const wideRow = "sm:grid-cols-[140px_minmax(0,1fr)]";

function ServiceabilityStateForm({
  detail,
  serviceOpts,
  onClose,
  onSaved,
}: {
  detail: EqptDetail;
  serviceOpts: Option[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialServiceability = useMemo(() => {
    if (!detail.service_status && !detail.service_status_label) return "";
    const rawSvc = (detail.service_status || "").trim().toUpperCase();
    const labelSvc = (detail.service_status_label || "").trim().toUpperCase();
    const matched = serviceOpts.find(
      (o) =>
        o.value.toUpperCase() === rawSvc ||
        o.value.toUpperCase() === labelSvc ||
        o.label.toUpperCase() === rawSvc ||
        o.label.toUpperCase() === labelSvc,
    );
    return matched ? matched.value : detail.service_status || "";
  }, [detail, serviceOpts]);

  const initialBarrelI = detail.barrel1_detl || "";
  const initialBarrelII = detail.barrel2_detl || "";
  const initialBarrelIII = detail.barrel3_detl || "";
  const initialBarrelIV = detail.barrel4_detl || "";
  const initialRemarks = detail.spl_remarks || "";

  const [serviceability, setServiceability] = useState(initialServiceability);
  const [barrelI, setBarrelI] = useState(initialBarrelI);
  const [barrelII, setBarrelII] = useState(initialBarrelII);
  const [barrelIII, setBarrelIII] = useState(initialBarrelIII);
  const [barrelIV, setBarrelIV] = useState(initialBarrelIV);
  const [remarks, setRemarks] = useState(initialRemarks);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setServiceability(initialServiceability);
  }, [initialServiceability]);

  const isModified = useMemo(
    () =>
      serviceability !== initialServiceability ||
      barrelI !== initialBarrelI ||
      barrelII !== initialBarrelII ||
      barrelIII !== initialBarrelIII ||
      barrelIV !== initialBarrelIV ||
      remarks !== initialRemarks,
    [
      serviceability,
      initialServiceability,
      barrelI,
      initialBarrelI,
      barrelII,
      initialBarrelII,
      barrelIII,
      initialBarrelIII,
      barrelIV,
      initialBarrelIV,
      remarks,
      initialRemarks,
    ],
  );

  const handleClear = () => {
    setServiceability(initialServiceability);
    setBarrelI("");
    setBarrelII("");
    setBarrelIII("");
    setBarrelIV("");
    setRemarks("");
  };

  const handleUpdate = async () => {
    if (!serviceability) {
      toast.error("Please select Serviceability");
      return;
    }
    setBusy(true);
    try {
      await api("/unit-holding/update-eqpt-data/update", {
        method: "PUT",
        body: JSON.stringify({
          id: detail.id,
          source_table: detail.source_table,
          service_status: serviceability,
          barrel1_detl: barrelI || null,
          barrel2_detl: barrelII || null,
          barrel3_detl: barrelIII || null,
          barrel4_detl: barrelIV || null,
          spl_remarks: remarks || null,
        }),
      });
      toast.success("Serviceability data updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3.5 pt-2 pb-1">
      <FormRow label="Eqpt Registration No." className={wideRow}>
        <Input
          value={detail.eqpt_regn_no || ""}
          readOnly
          tabIndex={-1}
          onFocus={(e) => e.target.blur()}
        />
      </FormRow>
      <FormRow label="Serviceability" required className={wideRow}>
        <SelectField
          value={serviceability}
          onChange={setServiceability}
          options={serviceOpts}
        />
      </FormRow>
      <FormRow label="Barrel - I" className={wideRow}>
        <Input
          value={barrelI}
          onChange={(e) => setBarrelI(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
          placeholder="null"
        />
      </FormRow>
      <FormRow label="Barrel - II" className={wideRow}>
        <Input
          value={barrelII}
          onChange={(e) => setBarrelII(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
          placeholder="null"
        />
      </FormRow>
      <FormRow label="Barrel - III" className={wideRow}>
        <Input
          value={barrelIII}
          onChange={(e) => setBarrelIII(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
          placeholder="null"
        />
      </FormRow>
      <FormRow label="Barrel - IV" className={wideRow}>
        <Input
          value={barrelIV}
          onChange={(e) => setBarrelIV(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
          placeholder="null"
        />
      </FormRow>
      <FormRow label="Remarks" className={wideRow}>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="null"
          className="min-h-[56px] text-xs"
        />
      </FormRow>
      <DialogActions
        onClear={handleClear}
        onUpdate={handleUpdate}
        busy={busy}
        updateDisabled={!isModified}
      />
    </div>
  );
}

function ServiceabilityDialog({
  detail,
  serviceOpts,
  open,
  onClose,
  onSaved,
}: {
  detail: EqptDetail;
  serviceOpts: Option[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-3 p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-center text-sm font-bold uppercase tracking-wide underline underline-offset-2">
            SERVICEABILITY STATE
          </DialogTitle>
        </DialogHeader>
        <ServiceabilityStateForm
          detail={detail}
          serviceOpts={serviceOpts}
          onClose={onClose}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function rowKey(r: EqptRow) {
  return `${r.source_table}:${r.id}`;
}

export function UpdateEqptData() {
  const [form, setForm] = useState(emptyForm);
  const [units, setUnits] = useState<HoldingUnit[]>([]);
  const [prfGroups, setPrfGroups] = useState<PrfGroup[]>([]);
  const [censusItems, setCensusItems] = useState<CensusItem[]>([]);
  const [holdingTypes, setHoldingTypes] = useState<HoldingType[]>([]);
  const [serviceOpts, setServiceOpts] = useState<Option[]>([]);
  const [results, setResults] = useState<EqptRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [updateDetail, setUpdateDetail] = useState<EqptDetail | null>(null);
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
        label: c.nomenclature
          ? `${c.census_no} — ${c.nomenclature}`
          : c.census_no,
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

  useEffect(() => {
    void api<{ service_status: Option[] }>("/unit-holding/update-eqpt-data/options")
      .then((res) => setServiceOpts(res.service_status ?? []))
      .catch(() => toast.error("Failed to load serviceability options"));
  }, []);

  const loadUnits = (q = "") => {
    void api<HoldingUnit[]>(
      `/unit-holding/update-eqpt-data/units?q=${encodeURIComponent(q)}`,
    )
      .then(setUnits)
      .catch(() => {
        setUnits([]);
        toast.error("Failed to load units");
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
      `/unit-holding/update-eqpt-data/prf-groups?sus_no=${encodeURIComponent(form.susNo)}`,
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
      `/unit-holding/update-eqpt-data/census-items?sus_no=${encodeURIComponent(form.susNo)}&prf_group=${encodeURIComponent(form.prfGroup)}`,
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
      `/unit-holding/update-eqpt-data/holding-types?sus_no=${encodeURIComponent(form.susNo)}&prf_group=${encodeURIComponent(form.prfGroup)}&census_no=${encodeURIComponent(form.censusNo)}`,
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
    setUpdateDetail(null);
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
      const rows = await api<EqptRow[]>("/unit-holding/update-eqpt-data/search", {
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

  const handleUpdate = async () => {
    if (!selected) {
      toast.error("Please select a unit/equipment row");
      return;
    }
    setBusy(true);
    try {
      const detail = await api<EqptDetail>(
        `/unit-holding/update-eqpt-data/detail?id=${encodeURIComponent(selected.id)}&source_table=${encodeURIComponent(selected.source_table)}`,
      );
      setUpdateDetail(detail);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load equipment detail");
    } finally {
      setBusy(false);
    }
  };

  const handleViewRow = async (r: EqptRow) => {
    setBusy(true);
    try {
      const detail = await api<EqptDetail>(
        `/unit-holding/update-eqpt-data/detail?id=${encodeURIComponent(r.id)}&source_table=${encodeURIComponent(r.source_table)}`,
      );
      setViewDetail(detail);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load equipment detail");
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterSave = () => {
    void handleSearch({ silent: true });
  };

  return (
    <>
      <FormPanel
        title="UPDATION OF EQPT SERVICEABILITY STATUS"
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
                placeholder="Search unit by SUS or name..."
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
                                name="eqpt-sel"
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
                  click Update → Serviceability State. For artillery equipment use UPDATE ARTY EQPT DATA.
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

      {updateDetail && (
        <ServiceabilityDialog
          detail={updateDetail}
          serviceOpts={serviceOpts}
          open
          onClose={() => setUpdateDetail(null)}
          onSaved={refreshAfterSave}
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
