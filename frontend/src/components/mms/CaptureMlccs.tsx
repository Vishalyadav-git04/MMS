import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { pageHasInvalidDateInputs } from "@/lib/date";
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
  accountingUnit: "",
  briefDescription: "",
  itemStatus: "",
  itemCategory: "",
  classOfEqpt: "",
  countryOfOrigin: "",
  nodalDte: "",
  eqptCategory: "",
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
    accountingUnit: r.accounting_unit ?? "",
    briefDescription: r.brief_description ?? "",
    itemStatus: r.item_status ?? "",
    itemCategory: r.item_category ?? "",
    classOfEqpt: r.class_of_eqpt ?? "",
    countryOfOrigin: r.country_of_origin ?? "",
    nodalDte: r.nodal_dte ?? "",
    eqptCategory: r.eqpt_category ?? "",
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

/** Full COS Section: A-01 … Z-99 (letter, hyphen, 01–99). */
const COS_SEC_RE = /^[A-Z]-(0[1-9]|[1-9][0-9])$/;

/** Restrict typing to progressive A / A- / A-0 / A-01 shape (max 4 chars). */
function sanitizeCosSection(raw: string): string {
  const up = raw.toUpperCase();
  let out = "";
  for (let i = 0; i < up.length && out.length < 4; i++) {
    const ch = up[i]!;
    if (out.length === 0) {
      if (/[A-Z]/.test(ch)) out += ch;
    } else if (out.length === 1) {
      if (ch === "-") out += ch;
    } else if (/[0-9]/.test(ch)) {
      out += ch;
    }
  }
  return out;
}

function isValidCosSection(value: string): boolean {
  return COS_SEC_RE.test(value.trim().toUpperCase());
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
      .then((opts) => {
        setOptions(opts);
        // Replace any label defaults (NOS/CUR) with CODE_VALUE once options load
        const fix = (f: FullForm): FullForm => ({
          ...f,
          accountingUnit: resolveOptionCode(
            opts.accounting_unit,
            f.accountingUnit,
            "NOS",
          ),
          itemStatus: resolveOptionCode(opts.item_status, f.itemStatus, "CUR"),
        });
        setAddForm((f) => fix(f));
        setModForm((f) => fix(f));
      })
      .catch(() => {
        /* keep hardcoded fallbacks in SelectField */
      });
  }, []);

  // COS Section typeahead from MMS_PRF_GRP_MSTR (options first, then API)
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
    if (!isValidCosSection(addCos)) {
      toast.error("COS Section must be like A-01 (letter A–Z, hyphen, 01–99)");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/generate", {
        method: "POST",
        body: JSON.stringify({
          cos_section: addCos.trim().toUpperCase(),
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
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
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
                    placeholder="e.g. A-01"
                    value={addCos}
                    disabled={busy}
                    suggestions={cosSuggestions}
                    onChange={(v) => setAddCos(sanitizeCosSection(v))}
                    onPick={(idx) =>
                      pickCosSuggestion(sanitizeCosSection(cosSuggestions[idx]!))
                    }
                  />
                  {addCos.length > 0 && !isValidCosSection(addCos) ? (
                    <p className="mt-1 text-xs text-destructive">
                      Format: A-01 to Z-99 (letter, hyphen, 01–99)
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Format: A-01 to Z-99
                    </p>
                  )}
                </FormRow>
                <FormRow label="Nomenclature" required>
                  <Input
                    placeholder="Enter Nomenclature"
                    value={addNom}
                    disabled={busy}
                    onChange={(e) => setAddNom(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
                    setModCensus(v.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
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
                    setModNom(v.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
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

type SelectOption = { value: string; label: string };

/** Prefer CODE_VALUE; if current text is a LABEL_NAME, map it to the matching code. */
function resolveOptionCode(
  options: SelectOption[] | undefined,
  current: string,
  preferredLabel?: string,
): string {
  const list = options ?? [];
  const cur = current.trim();
  if (cur && list.some((o) => o.value === cur)) return cur;
  if (cur) {
    const byLabel = list.find(
      (o) => o.label.trim().toUpperCase() === cur.toUpperCase(),
    );
    if (byLabel) return byLabel.value;
  }
  if (preferredLabel) {
    const want = preferredLabel.trim().toUpperCase();
    const byPref = list.find(
      (o) =>
        o.label.trim().toUpperCase() === want ||
        o.value.trim().toUpperCase() === want,
    );
    if (byPref) return byPref.value;
  }
  return cur;
}

function optionValues(options: OptionsMap, key: string, fallback: string[]): SelectOption[] {
  const fromApi = options[key]?.filter((o) => o.value) ?? [];
  if (fromApi.length > 0) return fromApi;
  return fallback.map((v) => ({ value: v, label: v }));
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

  const [prfOptions, setPrfOptions] = useState<SelectOption[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);

  // Load PRF groups for the filled COS Section (from MMS_PRF_GRP_MSTR)
  useEffect(() => {
    const cos = form.cosSection.trim().toUpperCase();
    if (!isValidCosSection(cos)) {
      setPrfOptions([]);
      return;
    }
    let cancelled = false;
    void api<SelectOption[]>(
      `/admin/capture-mlccs-details/prf-groups?cos_section=${encodeURIComponent(cos)}`,
    )
      .then((rows) => {
        if (!cancelled) setPrfOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setPrfOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.cosSection]);

  // Load item codes for selected PRF Group under that COS
  useEffect(() => {
    const cos = form.cosSection.trim().toUpperCase();
    const grp = form.prfGroup.trim();
    if (!isValidCosSection(cos) || !grp) {
      setItemOptions([]);
      return;
    }
    let cancelled = false;
    void api<SelectOption[]>(
      `/admin/capture-mlccs-details/item-codes?cos_section=${encodeURIComponent(cos)}&prf_group=${encodeURIComponent(grp)}`,
    )
      .then((rows) => {
        if (!cancelled) setItemOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setItemOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.cosSection, form.prfGroup]);

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
            onChange={(e) => upd("nomenclature", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter Nomenclature"
          />
        </FormRow>
        <FormRow label="Auth/Letter No" required>
          <Input
            value={form.authLetterNo}
            onChange={(e) => upd("authLetterNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter Auth/Letter No"
          />
        </FormRow>
        <FormRow label="Date" required>
          <DateInput value={form.date} onChange={(v) => upd("date", v)} />
        </FormRow>
        <FormRow label="PRF Group" required>
          <SelectField
            value={form.prfGroup}
            onChange={(v) => setForm({ ...form, prfGroup: v, itemCode: "" })}
            options={prfOptions}
            placeholder={
              prfOptions.length ? "--Select PRF Group--" : "No PRF groups for this COS"
            }
          />
        </FormRow>
        <FormRow label="Item Code" required>
          <SelectField
            value={form.itemCode}
            onChange={(v) => upd("itemCode", v)}
            options={itemOptions}
            placeholder={
              !form.prfGroup
                ? "Select PRF Group first"
                : itemOptions.length
                  ? "--Select Item Code--"
                  : "No item codes for this PRF"
            }
            disabled={!form.prfGroup}
          />
        </FormRow>
        <FormRow label="Cat/Part No" required>
          <Input
            value={form.catPartNo}
            onChange={(e) => upd("catPartNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter Cat/Part No"
          />
        </FormRow>
        <FormRow label="Accounting Unit" required>
          <SelectField
            value={form.accountingUnit}
            onChange={(v) => upd("accountingUnit", v)}
            options={optionValues(options, "accounting_unit", [])}
          />
        </FormRow>
        <FormRow label="Item Status" required>
          <SelectField
            value={form.itemStatus}
            onChange={(v) => upd("itemStatus", v)}
            options={optionValues(options, "item_status", [])}
          />
        </FormRow>
        <FormRow label="Item Category" required>
          <SelectField
            value={form.itemCategory}
            onChange={(v) => upd("itemCategory", v)}
            options={optionValues(options, "item_category", [])}
          />
        </FormRow>
        <FormRow label="Class of Eqpt" required>
          <SelectField
            value={form.classOfEqpt}
            onChange={(v) => upd("classOfEqpt", v)}
            options={optionValues(options, "class_of_eqpt", [])}
          />
        </FormRow>
        <FormRow label="Country of Origin">
          <Input
            value={form.countryOfOrigin}
            onChange={(e) => upd("countryOfOrigin", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Search..."
          />
        </FormRow>
        <FormRow label="Nodal Dte">
          <SelectField
            value={form.nodalDte}
            onChange={(v) => upd("nodalDte", v)}
            options={optionValues(options, "nodal_dte", [])}
          />
        </FormRow>
        <FormRow label="Eqpt Category">
          <SelectField
            value={form.eqptCategory}
            onChange={(v) => upd("eqptCategory", v)}
            options={optionValues(options, "eqpt_category", [])}
          />
        </FormRow>
        <FormRow label="Year of Induction">
          <Input
            value={form.yearOfInduction}
            onChange={(e) => upd("yearOfInduction", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
          />
        </FormRow>
        <FormRow label="Digest Category">
          <SelectField
            value={form.digestCategory}
            onChange={(v) => upd("digestCategory", v)}
            options={optionValues(options, "digest_category", [])}
          />
        </FormRow>
        <FormRow label="Cost (Rs.)">
          <Input
            value={form.cost}
            onChange={(e) => upd("cost", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Enter Cost..."
          />
        </FormRow>
        <FormRow label="Manufacturing Agency">
          <Input
            value={form.manufacturingAgency}
            onChange={(e) => upd("manufacturingAgency", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter Man. Agency..."
          />
        </FormRow>
        <FormRow label="AHSP Agency">
          <Input
            value={form.ahspAgency}
            onChange={(e) => upd("ahspAgency", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter AHSP Agency..."
          />
        </FormRow>
        <FormRow label="NATO Stock No (NSN)">
          <Input
            value={form.natoStockNo}
            onChange={(e) => upd("natoStockNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter No..."
          />
        </FormRow>
        <FormRow label="Def Catalogue No (DCAN)">
          <Input
            value={form.defCatalogueNo}
            onChange={(e) => upd("defCatalogueNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter No..."
          />
        </FormRow>
        <FormRow label="Material No">
          <Input
            value={form.materialNo}
            onChange={(e) => upd("materialNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            placeholder="Enter Material No..."
            maxLength={15}
          />
        </FormRow>
        <FormRow label="Brief Description" required>
          <Input
            value={form.briefDescription}
            onChange={(e) => upd("briefDescription", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<string | SelectOption>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const normalized: SelectOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  // If form holds a label (legacy), bind Select to the matching CODE_VALUE
  const resolved = resolveOptionCode(normalized, value);
  const hasValue =
    Boolean(resolved) && !normalized.some((o) => o.value === resolved);
  const all = hasValue
    ? [{ value: resolved, label: resolved }, ...normalized]
    : normalized;
  return (
    <Select
      value={resolved || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
