import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isoToDmyDash, pageHasInvalidDateInputs } from "@/lib/date";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface SubDomainSuggestion {
  id: number | string;
  equipment_domain_id: number | string;
  sub_domain_id: number | string;
  sub_domain_name: string;
  eqpt_cat?: string | null;
}

interface OptionItem {
  value: string;
  label: string;
}

interface CensusOptions {
  accounting_unit: OptionItem[];
  item_status: OptionItem[];
  item_category: OptionItem[];
  class_of_equipment: OptionItem[];
  nodal_directorate: OptionItem[];
  digest_category: OptionItem[];
  equipment_category: OptionItem[];
}

const emptyOptions: CensusOptions = {
  accounting_unit: [],
  item_status: [],
  item_category: [],
  class_of_equipment: [],
  nodal_directorate: [],
  digest_category: [],
  equipment_category: [],
};

interface FullForm {
  subDomainId: string;
  subDomainName: string;
  censusNo: string;
  authLetterNo: string;
  date: string;
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
  remarks: string;
}

const getTodayIso = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const emptyForm: FullForm = {
  subDomainId: "",
  subDomainName: "",
  censusNo: "",
  authLetterNo: "",
  date: getTodayIso(),
  catPartNo: "",
  accountingUnit: "",
  briefDescription: "",
  itemStatus: "",
  itemCategory: "",
  classOfEqpt: "",
  countryOfOrigin: "",
  nodalDte: "",
  eqptCategory: "",
  yearOfInduction: String(new Date().getFullYear()),
  digestCategory: "",
  cost: "",
  manufacturingAgency: "",
  ahspAgency: "",
  natoStockNo: "",
  defCatalogueNo: "",
  remarks: "",
};

export function GenEpCensus() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SubDomainSuggestion[]>([]);
  const [selected, setSelected] = useState<SubDomainSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [form, setForm] = useState<FullForm>(emptyForm);
  const [options, setOptions] = useState<CensusOptions>(emptyOptions);
  const [busy, setBusy] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!showSuggestions || suggestions.length === 0) {
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
  }, [showSuggestions, suggestions]);

  useEffect(() => {
    if (selected && query === selected.sub_domain_name) {
      setSuggestions([]);
      return;
    }
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<SubDomainSuggestion[]>(
        `/ep/sub-domain-master/search?sub_domain_name=${encodeURIComponent(q)}`,
      )
        .then((rows) => setSuggestions(rows.slice(0, 50)))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, selected]);

  const handleClear = () => {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setShowFull(false);
    setForm(emptyForm);
  };

  const pickSuggestion = (row: SubDomainSuggestion) => {
    setSelected(row);
    setQuery(row.sub_domain_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGenerate = async () => {
    if (!selected) {
      toast.error("Select a Sub Domain from the suggestions");
      return;
    }
    setBusy(true);
    try {
      const [generated, fetchedOptions] = await Promise.all([
        api<{
          census_no: string;
          sub_domain_id: number | string;
          sub_domain_name: string;
          domain_id: number | string;
        }>("/ep/gen-census/generate", {
          method: "POST",
          body: JSON.stringify({ sub_domain_id: String(selected.sub_domain_id ?? selected.id) }),
        }),
        api<CensusOptions>("/ep/gen-census/options"),
      ]);
      setForm({
        ...emptyForm,
        subDomainId: String(generated.sub_domain_id),
        subDomainName: generated.sub_domain_name,
        censusNo: generated.census_no,
        date: getTodayIso(),
      });
      setOptions(fetchedOptions);
      setShowFull(true);
      toast.success(`Census No ${generated.census_no} generated`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (
      !form.subDomainId ||
      !form.censusNo ||
      !form.authLetterNo.trim() ||
      !form.date ||
      !form.catPartNo.trim() ||
      !form.accountingUnit ||
      !form.briefDescription.trim() ||
      !form.itemStatus ||
      !form.itemCategory ||
      !form.classOfEqpt
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setBusy(true);
    try {
      await api("/ep/gen-census/", {
        method: "POST",
        body: JSON.stringify({
          sub_domain_id: form.subDomainId,
          census_no: form.censusNo,
          auth_letter_no: form.authLetterNo,
          auth_date: isoToDmyDash(form.date) || form.date,
          cat_part_no: form.catPartNo,
          accounting_unit: form.accountingUnit,
          brief_description: form.briefDescription,
          item_status: form.itemStatus,
          item_category: form.itemCategory,
          class_of_equipment: form.classOfEqpt,
          country: form.countryOfOrigin || null,
          nodal_directorate: form.nodalDte || null,
          equipment_category: form.eqptCategory || null,
          year_of_induction: form.yearOfInduction || null,
          digest_category: form.digestCategory || null,
          cost: form.cost || null,
          manufacturing_agency: form.manufacturingAgency || null,
          ahsp_agency: form.ahspAgency || null,
          nato_stock_no: form.natoStockNo || null,
          defence_catalogue_no: form.defCatalogueNo || null,
          remarks: form.remarks || null,
        }),
      });
      toast.success("EP Census saved successfully");
      handleClear();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClearForm = () => {
    setForm({
      ...emptyForm,
      subDomainId: form.subDomainId,
      subDomainName: form.subDomainName,
      censusNo: form.censusNo,
      date: getTodayIso(),
      yearOfInduction: String(new Date().getFullYear()),
    });
  };

  if (showFull) {
    return (
      <MlccsEpForm
        form={form}
        setForm={setForm}
        options={options}
        busy={busy}
        onSave={() => void handleSave()}
        onClear={handleClearForm}
        onCancel={() => setShowFull(false)}
      />
    );
  }

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS) EP"
      footer={
        <>
          <Button disabled={busy || !selected} onClick={() => void handleGenerate()}>
            Generate Census No
          </Button>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
        </>
      }
    >
      <div className="w-full overflow-visible">
        <FormRow label="Sub Domain Name" required>
          <div className="relative overflow-visible">
            <Input
              ref={inputRef}
              placeholder="Search..."
              value={query}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\s\-/&]/g, "");
                setQuery(val);
                setSelected(null);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setShowSuggestions(true);
                updateCoords();
              }}
              onBlur={() => {
                blurTimer.current = window.setTimeout(
                  () => setShowSuggestions(false),
                  150,
                );
              }}
            />
            {showSuggestions &&
              suggestions.length > 0 &&
              coords &&
              createPortal(
                <ul
                  className="z-[100] max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  style={{
                    position: "fixed",
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                  }}
                >
                  {suggestions.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="relative flex w-full cursor-default select-none items-center justify-between rounded-[8px] px-3 py-2 text-left text-[15.5px] outline-none hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (blurTimer.current) window.clearTimeout(blurTimer.current);
                          pickSuggestion(row);
                        }}
                      >
                        <span>{row.sub_domain_name}</span>
                        {row.eqpt_cat ? (
                          <span className="text-xs text-muted-foreground">
                            {row.eqpt_cat}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>,
                document.body,
              )}
          </div>
        </FormRow>
      </div>
    </FormPanel>
  );
}

function MlccsEpForm({
  form,
  setForm,
  options,
  busy,
  onSave,
  onClear,
  onCancel,
}: {
  form: FullForm;
  setForm: (f: FullForm) => void;
  options: CensusOptions;
  busy: boolean;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof FullForm>(k: K, v: FullForm[K]) =>
    setForm({ ...form, [k]: v });

  const requiredFilled =
    form.authLetterNo.trim() &&
    form.catPartNo.trim() &&
    form.accountingUnit &&
    form.briefDescription.trim() &&
    form.itemStatus &&
    form.itemCategory &&
    form.classOfEqpt;

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS) EP"
      footer={
        <>
          <Button disabled={busy || !requiredFilled} onClick={onSave}>
            Save
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClear}>
            Clear
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2 pb-1">
        <FormGrid cols={3}>
          <FormSection title="1. Basic & Authorisation Particulars" />
          <FormRow label="Sub Domain Name" required>
            <Input value={form.subDomainName} disabled />
          </FormRow>
          <FormRow label="Census No" required>
            <Input value={form.censusNo} disabled />
          </FormRow>
          <FormRow label="Auth/Letter No" required>
            <Input
              value={form.authLetterNo}
              onChange={(e) => upd("authLetterNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter Auth/Letter No"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Date" required>
            <DateInput
              value={form.date}
              onChange={(v) => upd("date", v)}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Cat/Part No" required>
            <Input
              value={form.catPartNo}
              onChange={(e) => upd("catPartNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter Cat/Part No"
              disabled={busy}
            />
          </FormRow>

          <FormSection title="2. Classification & Domain References" />
          <FormRow label="Accounting Unit" required>
            <SelectField
              value={form.accountingUnit}
              onChange={(v) => upd("accountingUnit", v)}
              options={options.accounting_unit}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Item Status" required>
            <SelectField
              value={form.itemStatus}
              onChange={(v) => upd("itemStatus", v)}
              options={options.item_status}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Item Category" required>
            <SelectField
              value={form.itemCategory}
              onChange={(v) => upd("itemCategory", v)}
              options={options.item_category}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Class of Eqpt" required>
            <SelectField
              value={form.classOfEqpt}
              onChange={(v) => upd("classOfEqpt", v)}
              options={options.class_of_equipment}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Country of Origin">
            <Input
              value={form.countryOfOrigin}
              onChange={(e) => upd("countryOfOrigin", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Search..."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Nodal Dte">
            <SelectField
              value={form.nodalDte}
              onChange={(v) => upd("nodalDte", v)}
              options={options.nodal_directorate}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Eqpt Category">
            <SelectField
              value={form.eqptCategory}
              onChange={(v) => upd("eqptCategory", v)}
              options={options.equipment_category}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Digest Category">
            <SelectField
              value={form.digestCategory}
              onChange={(v) => upd("digestCategory", v)}
              options={options.digest_category}
              disabled={busy}
            />
          </FormRow>

          <FormSection title="3. Financial, Technical & Agency Details" />
          <FormRow label="Year of Induction">
            <Input
              value={form.yearOfInduction}
              onChange={(e) => upd("yearOfInduction", e.target.value)}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Cost (Rs.)">
            <Input
              value={form.cost}
              onChange={(e) => upd("cost", e.target.value)}
              placeholder="Enter Cost"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Manufacturing Agency">
            <Input
              value={form.manufacturingAgency}
              onChange={(e) => upd("manufacturingAgency", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter Man. Agency"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="AHSP Agency">
            <Input
              value={form.ahspAgency}
              onChange={(e) => upd("ahspAgency", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter AHSP Agency"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="NATO Stock No (NSN)">
            <Input
              value={form.natoStockNo}
              onChange={(e) => upd("natoStockNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter NSN"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Def Catalogue No (DCAN)">
            <Input
              value={form.defCatalogueNo}
              onChange={(e) => upd("defCatalogueNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter DCAN"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Brief Description" required className="mms-span-full">
            <Input
              value={form.briefDescription}
              onChange={(e) => upd("briefDescription", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter Description"
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Remarks" className="mms-span-full">
            <Input
              value={form.remarks}
              onChange={(e) => upd("remarks", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
              placeholder="Enter Remarks"
              disabled={busy}
            />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}

function SelectField({
  value,
  onChange,
  options = [],
  placeholder = "--Select--",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
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

