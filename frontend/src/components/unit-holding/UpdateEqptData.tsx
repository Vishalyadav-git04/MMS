import { useEffect, useMemo, useState } from "react";
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
  id: string;
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
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
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

function DialogActions({
  onClose,
  onUpdate,
  busy,
}: {
  onClose: () => void;
  onUpdate?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-1">
      <Button variant="destructive" onClick={onClose} disabled={busy}>
        Close
      </Button>
      {onUpdate && (
        <Button onClick={onUpdate} disabled={busy}>
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
  const [serviceability, setServiceability] = useState(detail.service_status || "");
  const [barrelI, setBarrelI] = useState(detail.barrel1_detl || "");
  const [barrelII, setBarrelII] = useState(detail.barrel2_detl || "");
  const [barrelIII, setBarrelIII] = useState(detail.barrel3_detl || "");
  const [barrelIV, setBarrelIV] = useState(detail.barrel4_detl || "");
  const [remarks, setRemarks] = useState(detail.spl_remarks || "");
  const [busy, setBusy] = useState(false);

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
    <div className="space-y-1.5">
      <FormRow label="Eqpt Registration No." className={wideRow}>
        <Input value={detail.eqpt_regn_no || ""} readOnly />
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
          className="min-h-[52px] text-xs"
        />
      </FormRow>
      <DialogActions onClose={onClose} onUpdate={handleUpdate} busy={busy} />
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-2 p-3 sm:p-4">
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
  const [busy, setBusy] = useState(false);

  const upd = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selected = useMemo(
    () => results.find((r) => rowKey(r) === selectedKey) ?? null,
    [results, selectedKey],
  );

  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.sus_no, label: u.display })),
    [units],
  );

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

  const holdingOptions = useMemo(
    () => holdingTypes.map((h) => ({ value: h.value, label: h.label })),
    [holdingTypes],
  );

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
    loadUnits();
  };

  const handleUnitSearch = () => {
    loadUnits(form.unitSearch.trim());
  };

  const handleUnitChange = (sus: string) => {
    setForm((prev) => ({
      ...prev,
      susNo: sus,
      prfGroup: "",
      censusNo: "",
      typeOfHolding: "",
    }));
    setResults([]);
    setShowResults(false);
    setSelectedKey(null);
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
  };

  const handleSearch = async (opts?: { silent?: boolean }) => {
    if (!form.susNo || !form.prfGroup || !form.censusNo || !form.typeOfHolding) {
      toast.error("Please fill all required fields");
      return;
    }
    setBusy(true);
    try {
      const rows = await api<EqptRow[]>("/unit-holding/update-eqpt-data/search", {
        method: "POST",
        body: JSON.stringify({
          sus_no: form.susNo,
          prf_group: form.prfGroup,
          census_no: form.censusNo,
          type_of_hldg: form.typeOfHolding,
          regd_no: form.regdNo.trim() || null,
        }),
      });
      setResults(rows);
      setShowResults(true);
      setSelectedKey(rows[0] ? rowKey(rows[0]) : null);
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
            <Button variant="destructive" onClick={handleClear} disabled={busy}>
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
                  onChange={(e) => upd("unitSearch", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUnitSearch();
                    }
                  }}
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
                  value={form.susNo}
                  onChange={handleUnitChange}
                  options={unitOptions}
                  placeholder="--Select Unit--"
                />
              </div>
            </div>
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

          <FormRow label="Type of Holding" required>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="min-w-0 flex-1 basis-[12rem]">
                <SelectField
                  value={form.typeOfHolding}
                  onChange={(v) => upd("typeOfHolding", v)}
                  options={holdingOptions}
                  placeholder="--Select Type of Holding--"
                  disabled={!form.censusNo}
                />
              </div>
              <span className="shrink-0 text-[12px] font-medium text-foreground">
                Registered No Search
              </span>
              <Input
                placeholder="Enter Regd No"
                value={form.regdNo}
                onChange={(e) => upd("regdNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((r) => {
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
                          </TableRow>
                        );
                      })
                    )}
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

      {updateDetail && (
        <ServiceabilityDialog
          detail={updateDetail}
          serviceOpts={serviceOpts}
          open
          onClose={() => setUpdateDetail(null)}
          onSaved={refreshAfterSave}
        />
      )}
    </>
  );
}
