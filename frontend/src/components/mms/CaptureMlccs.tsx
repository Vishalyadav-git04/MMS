import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

type Mode = "add" | "modify";

interface CensusSuggestion {
  census_no: string;
  nomenclature?: string | null;
  cos_section?: string | null;
}

interface FullForm {
  cosSection: string;
  censusNo: string;
  nomenclature: string;
  authLetterNo: string;
  date: string;
  prfGroup: string;
  itemCode: string;
  catPartNo: string;
  accountingUnit: string;
  briefDescription: string;
  itemStatus: string;
  itemCategory: string;
  classOfEqpt: string;
  countryOfOrigin: string;
  nodalDte: string;
  eqptCategory: string;
  inclInAih: string;
  yearOfInduction: string;
  digestCategory: string;
  cost: string;
  manufacturingAgency: string;
  ahspAgency: string;
  natoStockNo: string;
  defCatalogueNo: string;
  materialNo: string;
  remarks: string;
}

interface MlccsRecord {
  id?: string | null;
  cos_section?: string | null;
  census_no?: string | null;
  nomenclature?: string | null;
  auth_letter_no?: string | null;
  auth_date?: string | null;
  prf_group?: string | null;
  item_code?: string | null;
  cat_part_no?: string | null;
  accounting_unit?: string | null;
  brief_description?: string | null;
  item_status?: string | null;
  item_category?: string | null;
  class_of_eqpt?: string | null;
  country_of_origin?: string | null;
  nodal_dte?: string | null;
  eqpt_category?: string | null;
  incl_in_aih?: string | null;
  year_of_induction?: string | null;
  digest_category?: string | null;
  cost_rs?: string | null;
  manufacturing_agency?: string | null;
  ahsp_agency?: string | null;
  nato_stock_no?: string | null;
  def_catalogue_no?: string | null;
  material_no?: string | null;
  remarks?: string | null;
}

type OptionsMap = Record<string, { value: string; label: string }[]>;

const emptyForm: FullForm = {
  cosSection: "",
  censusNo: "",
  nomenclature: "",
  authLetterNo: "",
  date: "",
  prfGroup: "",
  itemCode: "",
  catPartNo: "",
  accountingUnit: "NOS",
  briefDescription: "",
  itemStatus: "CUR",
  itemCategory: "",
  classOfEqpt: "",
  countryOfOrigin: "",
  nodalDte: "",
  eqptCategory: "",
  inclInAih: "",
  yearOfInduction: "2026",
  digestCategory: "",
  cost: "",
  manufacturingAgency: "",
  ahspAgency: "",
  natoStockNo: "",
  defCatalogueNo: "",
  materialNo: "",
  remarks: "",
};

function recordToForm(r: MlccsRecord): FullForm {
  return {
    cosSection: r.cos_section ?? "",
    censusNo: r.census_no ?? "",
    nomenclature: r.nomenclature ?? "",
    authLetterNo: r.auth_letter_no ?? "",
    date: r.auth_date ?? "",
    prfGroup: r.prf_group ?? "",
    itemCode: r.item_code ?? "",
    catPartNo: r.cat_part_no ?? "",
    accountingUnit: r.accounting_unit ?? "NOS",
    briefDescription: r.brief_description ?? "",
    itemStatus: r.item_status ?? "CUR",
    itemCategory: r.item_category ?? "",
    classOfEqpt: r.class_of_eqpt ?? "",
    countryOfOrigin: r.country_of_origin ?? "",
    nodalDte: r.nodal_dte ?? "",
    eqptCategory: r.eqpt_category ?? "",
    inclInAih: r.incl_in_aih ?? "",
    yearOfInduction: r.year_of_induction ?? "",
    digestCategory: r.digest_category ?? "",
    cost: r.cost_rs ?? "",
    manufacturingAgency: r.manufacturing_agency ?? "",
    ahspAgency: r.ahsp_agency ?? "",
    natoStockNo: r.nato_stock_no ?? "",
    defCatalogueNo: r.def_catalogue_no ?? "",
    materialNo: r.material_no ?? "",
    remarks: r.remarks ?? "",
  };
}

function formToBody(form: FullForm): MlccsRecord {
  return {
    cos_section: form.cosSection,
    census_no: form.censusNo,
    nomenclature: form.nomenclature,
    auth_letter_no: form.authLetterNo || null,
    auth_date: form.date || null,
    prf_group: form.prfGroup || null,
    item_code: form.itemCode || null,
    cat_part_no: form.catPartNo || null,
    accounting_unit: form.accountingUnit || null,
    brief_description: form.briefDescription || null,
    item_status: form.itemStatus || null,
    item_category: form.itemCategory || null,
    class_of_eqpt: form.classOfEqpt || null,
    country_of_origin: form.countryOfOrigin || null,
    nodal_dte: form.nodalDte || null,
    eqpt_category: form.eqptCategory || null,
    incl_in_aih: form.inclInAih || null,
    year_of_induction: form.yearOfInduction || null,
    digest_category: form.digestCategory || null,
    cost_rs: form.cost || null,
    manufacturing_agency: form.manufacturingAgency || null,
    ahsp_agency: form.ahspAgency || null,
    nato_stock_no: form.natoStockNo || null,
    def_catalogue_no: form.defCatalogueNo || null,
    material_no: form.materialNo || null,
    remarks: form.remarks || null,
  };
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Request failed";
}

function ActionButtons({
  primaryLabel,
  onPrimary,
  onClear,
  onCancel,
  busy,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onClear: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <>
      <Button
        size="sm"
        disabled={busy}
        onClick={onPrimary}
        className="bg-success hover:bg-success/90 text-success-foreground"
      >
        {primaryLabel}
      </Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={onClear}>
        Clear
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
    </>
  );
}

type CaptureMlccsProps = {
  /** When set (e.g. from View MLCCS), open Modify tab and auto-load the record. */
  initialModify?: { censusNo: string; nomenclature: string } | null;
  /** Optional back handler when launched from another screen. */
  onBack?: () => void;
};

export function CaptureMlccs({ initialModify, onBack }: CaptureMlccsProps = {}) {
  const seeded = Boolean(initialModify?.censusNo);
  const [mode, setMode] = useState<Mode>(seeded ? "modify" : "add");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<OptionsMap>({});

  const [addCos, setAddCos] = useState("");
  const [addNom, setAddNom] = useState("");
  const [cosSuggestions, setCosSuggestions] = useState<string[]>([]);
  const [showAddFull, setShowAddFull] = useState(false);
  const [addForm, setAddForm] = useState<FullForm>(emptyForm);

  const [modCensus, setModCensus] = useState(initialModify?.censusNo ?? "");
  const [modNom, setModNom] = useState(initialModify?.nomenclature ?? "");
  const [censusSuggestions, setCensusSuggestions] = useState<CensusSuggestion[]>([]);
  const [nomSuggestions, setNomSuggestions] = useState<CensusSuggestion[]>([]);
  const suppressCensusSuggestRef = useRef(false);
  const suppressNomSuggestRef = useRef(false);
  const [showModFull, setShowModFull] = useState(false);
  const [modForm, setModForm] = useState<FullForm>(emptyForm);

  useEffect(() => {
    api<OptionsMap>("/admin/capture-mlccs-details/options")
      .then(setOptions)
      .catch(() => {
        /* keep hardcoded fallbacks in SelectField */
      });
  }, []);

  // COS Section typeahead — prefer local options list, fall back to API
  useEffect(() => {
    if (mode !== "add" || showAddFull) return;
    const q = addCos.trim().toUpperCase();
    const fromOptions =
      options.cos_section?.map((o) => o.value).filter(Boolean) ?? [];

    const applyLocal = (all: string[]) => {
      const matched = q
        ? all.filter((v) => v.toUpperCase().includes(q) && v.toUpperCase() !== q)
        : all;
      setCosSuggestions(matched.slice(0, 50));
    };

    if (fromOptions.length > 0) {
      applyLocal(fromOptions);
      return;
    }

    const handle = window.setTimeout(() => {
      void api<string[]>(
        `/admin/capture-mlccs-details/suggest-cos?q=${encodeURIComponent(addCos.trim())}`,
      )
        .then((rows) => applyLocal(rows))
        .catch(() => setCosSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [addCos, mode, showAddFull, options]);

  // Census No typeahead (Modify Census) — autofills nomenclature on exact match / pick
  useEffect(() => {
    if (mode !== "modify" || showModFull) return;
    if (suppressCensusSuggestRef.current) {
      suppressCensusSuggestRef.current = false;
      setCensusSuggestions([]);
      return;
    }
    const q = modCensus.trim();
    if (q.length < 1) {
      setCensusSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<CensusSuggestion[]>(
        `/admin/capture-mlccs-details/suggest-census?q=${encodeURIComponent(q)}`,
      )
        .then((rows) => {
          const exact = rows.find((r) => r.census_no.toUpperCase() === q.toUpperCase());
          if (exact) {
            suppressNomSuggestRef.current = true;
            setModNom(exact.nomenclature ?? "");
            setCensusSuggestions([]);
            setNomSuggestions([]);
            return;
          }
          setCensusSuggestions(rows.slice(0, 50));
        })
        .catch(() => setCensusSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [modCensus, mode, showModFull]);

  // Nomenclature typeahead (Modify Census) — autofills census no on unique exact match / pick
  useEffect(() => {
    if (mode !== "modify" || showModFull) return;
    if (suppressNomSuggestRef.current) {
      suppressNomSuggestRef.current = false;
      setNomSuggestions([]);
      return;
    }
    const q = modNom.trim();
    if (q.length < 1) {
      setNomSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<CensusSuggestion[]>(
        `/admin/capture-mlccs-details/suggest-census?q=${encodeURIComponent(q)}`,
      )
        .then((rows) => {
          const matched = rows.filter((r) =>
            (r.nomenclature ?? "").toUpperCase().includes(q.toUpperCase()),
          );
          const exact = matched.filter(
            (r) => (r.nomenclature ?? "").toUpperCase() === q.toUpperCase(),
          );
          if (exact.length === 1) {
            suppressCensusSuggestRef.current = true;
            setModCensus(exact[0]!.census_no);
            setNomSuggestions([]);
            setCensusSuggestions([]);
            return;
          }
          setNomSuggestions(matched.slice(0, 50));
        })
        .catch(() => setNomSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [modNom, mode, showModFull]);

  useEffect(() => {
    if (!initialModify?.censusNo) return;
    let cancelled = false;
    const load = async () => {
      setBusy(true);
      setMode("modify");
      setModCensus(initialModify.censusNo);
      setModNom(initialModify.nomenclature);
      try {
        const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/lookup", {
          method: "POST",
          body: JSON.stringify({
            census_no: initialModify.censusNo,
            nomenclature: initialModify.nomenclature || null,
          }),
        });
        if (cancelled) return;
        setModForm(recordToForm(rec));
        setShowModFull(true);
        toast.success("Record loaded from database");
      } catch (e) {
        if (!cancelled) toast.error(errMsg(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialModify?.censusNo, initialModify?.nomenclature]);

  const pickCosSuggestion = (value: string) => {
    setAddCos(value);
    setCosSuggestions([]);
  };

  const pickCensusSuggestion = (row: CensusSuggestion) => {
    suppressNomSuggestRef.current = true;
    setModCensus(row.census_no);
    setModNom(row.nomenclature ?? "");
    setCensusSuggestions([]);
    setNomSuggestions([]);
  };

  const pickNomSuggestion = (row: CensusSuggestion) => {
    suppressCensusSuggestRef.current = true;
    setModCensus(row.census_no);
    setModNom(row.nomenclature ?? "");
    setCensusSuggestions([]);
    setNomSuggestions([]);
  };

  const handleGenerate = async () => {
    if (!addCos.trim() || !addNom.trim()) {
      toast.error("COS Section and Nomenclature are required");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/generate", {
        method: "POST",
        body: JSON.stringify({
          cos_section: addCos.trim(),
          nomenclature: addNom.trim(),
        }),
      });
      setAddForm(recordToForm(rec));
      setShowAddFull(true);
      setCosSuggestions([]);
      toast.success(`Census No ${rec.census_no} generated`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleModify = async () => {
    if (!modCensus.trim()) {
      toast.error("Census No is required");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/lookup", {
        method: "POST",
        body: JSON.stringify({
          census_no: modCensus.trim(),
          nomenclature: modNom.trim() || null,
        }),
      });
      setModForm(recordToForm(rec));
      setModNom(rec.nomenclature ?? "");
      setShowModFull(true);
      setCensusSuggestions([]);
      setNomSuggestions([]);
      toast.success("Record loaded from database");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (form: FullForm, isUpdate: boolean) => {
    setBusy(true);
    try {
      await api<MlccsRecord>("/admin/capture-mlccs-details/", {
        method: "POST",
        body: JSON.stringify(formToBody(form)),
      });
      toast.success(isUpdate ? "Record updated successfully" : "Equipment saved successfully");
      if (isUpdate && onBack) onBack();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  let footer: ReactNode = undefined;
  if (mode === "add" && showAddFull) {
    footer = (
      <ActionButtons
        primaryLabel="Save"
        busy={busy}
        onPrimary={() => void handleSave(addForm, false)}
        onClear={() => {
          setShowAddFull(false);
          setAddCos("");
          setAddNom("");
          setCosSuggestions([]);
          setAddForm(emptyForm);
        }}
        onCancel={() => setShowAddFull(false)}
      />
    );
  } else if (mode === "modify" && showModFull) {
    footer = (
      <ActionButtons
        primaryLabel="Update"
        busy={busy}
        onPrimary={() => void handleSave(modForm, true)}
        onClear={() => {
          setShowModFull(false);
          setModCensus("");
          setModNom("");
          setCensusSuggestions([]);
          setNomSuggestions([]);
          setModForm(emptyForm);
          onBack?.();
        }}
        onCancel={() => {
          setShowModFull(false);
          onBack?.();
        }}
      />
    );
  }

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS)"
      fill={Boolean(
        (mode === "add" && showAddFull) || (mode === "modify" && showModFull),
      )}
      tabs={
        seeded ? undefined : (
          <SwitchTabs<Mode>
            tabs={[
              { id: "add", label: "Add New Eqpt" },
              { id: "modify", label: "Modify Census" },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v);
              setCosSuggestions([]);
              setCensusSuggestions([]);
              setNomSuggestions([]);
            }}
          />
        )
      }
      footer={footer}
    >
      {mode === "add" ? (
        showAddFull ? (
          <FullEqptForm form={addForm} setForm={setAddForm} lockedFields={["cosSection", "censusNo"]} options={options} />
        ) : (
          <MiniLookup
            fields={
              <>
                <FormRow label="COS Section" required>
                  <SuggestInput
                    placeholder="Search..."
                    value={addCos}
                    disabled={busy}
                    suggestions={cosSuggestions}
                    onChange={setAddCos}
                    onPick={(idx) => pickCosSuggestion(cosSuggestions[idx]!)}
                  />
                </FormRow>
                <FormRow label="Nomenclature" required>
                  <Input
                    placeholder="Enter Nomenclature"
                    value={addNom}
                    disabled={busy}
                    onChange={(e) => setAddNom(e.target.value)}
                  />
                </FormRow>
              </>
            }
            actions={
              <>
                <Button disabled={busy} onClick={() => void handleGenerate()} className="bg-primary hover:bg-primary/90">
                  Generate Census No
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setAddCos("");
                    setAddNom("");
                    setCosSuggestions([]);
                  }}
                >
                  Clear
                </Button>
                <Button variant="destructive" disabled={busy} onClick={() => toast("Cancelled")}>
                  Cancel
                </Button>
              </>
            }
          />
        )
      ) : showModFull ? (
        <FullEqptForm form={modForm} setForm={setModForm} lockedFields={["cosSection", "censusNo"]} options={options} />
      ) : (
        <MiniLookup
          fields={
            <>
              <FormRow label="Census No" required>
                <SuggestInput
                  placeholder="Search..."
                  value={modCensus}
                  disabled={busy}
                  suggestions={censusSuggestions.map((r) => r.census_no)}
                  renderItem={(censusNo, idx) => {
                    const row = censusSuggestions[idx];
                    return (
                      <span className="flex w-full items-center justify-between gap-2">
                        <span>{censusNo}</span>
                        {row?.nomenclature ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {row.nomenclature}
                          </span>
                        ) : null}
                      </span>
                    );
                  }}
                  onChange={(v) => {
                    setNomSuggestions([]);
                    setModCensus(v);
                    setModNom("");
                  }}
                  onPick={(idx) => {
                    const row = censusSuggestions[idx];
                    if (row) pickCensusSuggestion(row);
                  }}
                />
              </FormRow>
              <FormRow label="Nomenclature" required>
                <SuggestInput
                  placeholder="Search..."
                  value={modNom}
                  disabled={busy}
                  suggestions={nomSuggestions.map((r) => r.nomenclature ?? r.census_no)}
                  renderItem={(nomenclature, idx) => {
                    const row = nomSuggestions[idx];
                    return (
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{nomenclature}</span>
                        {row?.census_no ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {row.census_no}
                          </span>
                        ) : null}
                      </span>
                    );
                  }}
                  onChange={(v) => {
                    setCensusSuggestions([]);
                    setModNom(v);
                    setModCensus("");
                  }}
                  onPick={(idx) => {
                    const row = nomSuggestions[idx];
                    if (row) pickNomSuggestion(row);
                  }}
                />
              </FormRow>
            </>
          }
          actions={
            <>
              <Button disabled={busy} onClick={() => void handleModify()} className="bg-primary hover:bg-primary/90">
                Modify
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setModCensus("");
                  setModNom("");
                  setCensusSuggestions([]);
                  setNomSuggestions([]);
                }}
              >
                Clear
              </Button>
              <Button variant="destructive" disabled={busy} onClick={() => toast("Cancelled")}>
                Cancel
              </Button>
            </>
          }
        />
      )}
    </FormPanel>
  );
}

function MiniLookup({ fields, actions }: { fields: ReactNode; actions: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 overflow-visible pt-2">
      {fields}
      <div className="flex flex-wrap justify-center gap-2 pt-2">{actions}</div>
    </div>
  );
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  renderItem,
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  renderItem?: (s: string, idx: number) => ReactNode;
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
          onChange(e.target.value);
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
          <ul
            className="z-[100] max-h-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-background shadow-md"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
          >
            {suggestions.map((s, idx) => (
              <li key={`${s}-${idx}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (blurTimer.current) window.clearTimeout(blurTimer.current);
                    onPick(idx);
                    setOpen(false);
                  }}
                >
                  {renderItem ? renderItem(s, idx) : s}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

function optionValues(options: OptionsMap, key: string, fallback: string[]): string[] {
  const fromApi = options[key]?.map((o) => o.value).filter(Boolean) ?? [];
  return fromApi.length > 0 ? fromApi : fallback;
}

function FullEqptForm({
  form,
  setForm,
  lockedFields,
  options,
}: {
  form: FullForm;
  setForm: (f: FullForm) => void;
  lockedFields: (keyof FullForm)[];
  options: OptionsMap;
}) {
  const upd = <K extends keyof FullForm>(k: K, v: FullForm[K]) => setForm({ ...form, [k]: v });
  const isLocked = (k: keyof FullForm) => lockedFields.includes(k);

  return (
    <div className="space-y-1.5">
      <FormGrid cols={4}>
        <FormRow label="COS Section" required>
          <Input value={form.cosSection} disabled={isLocked("cosSection")} />
        </FormRow>
        <FormRow label="Census No" required>
          <Input value={form.censusNo} disabled={isLocked("censusNo")} />
        </FormRow>
        <FormRow label="Nomenclature" required>
          <Input
            value={form.nomenclature}
            onChange={(e) => upd("nomenclature", e.target.value)}
            placeholder="Enter Nomenclature"
          />
        </FormRow>
        <FormRow label="Auth/Letter No" required>
          <Input
            value={form.authLetterNo}
            onChange={(e) => upd("authLetterNo", e.target.value)}
            placeholder="Enter Auth/Letter No"
          />
        </FormRow>
        <FormRow label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => upd("date", e.target.value)} />
        </FormRow>
        <FormRow label="PRF Group" required>
          <SelectField
            value={form.prfGroup}
            onChange={(v) => upd("prfGroup", v)}
            options={optionValues(options, "prf_group", ["GROUP-0", "GROUP-1", "GROUP-2"])}
          />
        </FormRow>
        <FormRow label="Item Code" required>
          <SelectField
            value={form.itemCode}
            onChange={(v) => upd("itemCode", v)}
            options={optionValues(options, "item_code", ["ITEMCODE-1", "ITEMCODE-2", "ITEMCODE-3"])}
          />
        </FormRow>
        <FormRow label="Cat/Part No" required>
          <Input
            value={form.catPartNo}
            onChange={(e) => upd("catPartNo", e.target.value)}
            placeholder="Enter Cat/Part No"
          />
        </FormRow>
        <FormRow label="Accounting Unit" required>
          <SelectField
            value={form.accountingUnit}
            onChange={(v) => upd("accountingUnit", v)}
            options={optionValues(options, "accounting_unit", ["NOS", "EA", "KG", "LTR"])}
          />
        </FormRow>
        <FormRow label="Item Status" required>
          <SelectField
            value={form.itemStatus}
            onChange={(v) => upd("itemStatus", v)}
            options={optionValues(options, "item_status", ["CUR", "ACT", "OBS"])}
          />
        </FormRow>
        <FormRow label="Item Category" required>
          <SelectField
            value={form.itemCategory}
            onChange={(v) => upd("itemCategory", v)}
            options={optionValues(options, "item_category", ["Weapon", "Ammunition", "Vehicle"])}
          />
        </FormRow>
        <FormRow label="Class of Eqpt" required>
          <SelectField
            value={form.classOfEqpt}
            onChange={(v) => upd("classOfEqpt", v)}
            options={optionValues(options, "class_of_eqpt", ["Class I", "Class II", "Class III"])}
          />
        </FormRow>
        <FormRow label="Country of Origin">
          <Input
            value={form.countryOfOrigin}
            onChange={(e) => upd("countryOfOrigin", e.target.value)}
            placeholder="Search..."
          />
        </FormRow>
        <FormRow label="Nodal Dte">
          <SelectField
            value={form.nodalDte}
            onChange={(v) => upd("nodalDte", v)}
            options={optionValues(options, "nodal_dte", ["DGOS", "DGAS", "DGEME"])}
          />
        </FormRow>
        <FormRow label="Eqpt Category">
          <SelectField
            value={form.eqptCategory}
            onChange={(v) => upd("eqptCategory", v)}
            options={optionValues(options, "eqpt_category", ["A", "B", "C"])}
          />
        </FormRow>
        <FormRow label="Incl in AIH">
          <SelectField
            value={form.inclInAih}
            onChange={(v) => upd("inclInAih", v)}
            options={optionValues(options, "incl_in_aih", ["Y", "N"])}
          />
        </FormRow>
        <FormRow label="Year of Induction">
          <Input
            value={form.yearOfInduction}
            onChange={(e) => upd("yearOfInduction", e.target.value)}
          />
        </FormRow>
        <FormRow label="Digest Category">
          <SelectField
            value={form.digestCategory}
            onChange={(v) => upd("digestCategory", v)}
            options={optionValues(options, "digest_category", ["Cat-I", "Cat-II"])}
          />
        </FormRow>
        <FormRow label="Cost (Rs.)">
          <Input
            value={form.cost}
            onChange={(e) => upd("cost", e.target.value)}
            placeholder="Enter Cost..."
          />
        </FormRow>
        <FormRow label="Manufacturing Agency">
          <Input
            value={form.manufacturingAgency}
            onChange={(e) => upd("manufacturingAgency", e.target.value)}
            placeholder="Enter Man. Agency..."
          />
        </FormRow>
        <FormRow label="AHSP Agency">
          <Input
            value={form.ahspAgency}
            onChange={(e) => upd("ahspAgency", e.target.value)}
            placeholder="Enter AHSP Agency..."
          />
        </FormRow>
        <FormRow label="NATO Stock No (NSN)">
          <Input
            value={form.natoStockNo}
            onChange={(e) => upd("natoStockNo", e.target.value)}
            placeholder="Enter No..."
          />
        </FormRow>
        <FormRow label="Def Catalogue No (DCAN)">
          <Input
            value={form.defCatalogueNo}
            onChange={(e) => upd("defCatalogueNo", e.target.value)}
            placeholder="Enter No..."
          />
        </FormRow>
        <FormRow label="Material No">
          <Input
            value={form.materialNo}
            onChange={(e) => upd("materialNo", e.target.value)}
            placeholder="Enter Material No..."
            maxLength={15}
          />
        </FormRow>
        <FormRow label="Brief Description" required>
          <Input
            value={form.briefDescription}
            onChange={(e) => upd("briefDescription", e.target.value)}
            placeholder="Enter Brief Description..."
          />
        </FormRow>
        <FormRow label="Remarks">
          <Input
            value={form.remarks}
            onChange={(e) => upd("remarks", e.target.value)}
            placeholder="Enter Your Remarks..."
          />
        </FormRow>
      </FormGrid>
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
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
