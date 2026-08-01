import { useEffect, useRef, useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
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
  id: string;
  equipment_domain_id: string;
  sub_domain_id: number;
  sub_domain_name: string;
  eqpt_cat?: string | null;
}

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
  inclInAih: string;
  yearOfInduction: string;
  digestCategory: string;
  cost: string;
  manufacturingAgency: string;
  ahspAgency: string;
  natoStockNo: string;
  defCatalogueNo: string;
  remarks: string;
}

const emptyForm: FullForm = {
  subDomainId: "",
  subDomainName: "",
  censusNo: "",
  authLetterNo: "",
  date: "",
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
  remarks: "",
};

export function GenEpCensus() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SubDomainSuggestion[]>([]);
  const [selected, setSelected] = useState<SubDomainSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [form, setForm] = useState<FullForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const blurTimer = useRef<number | null>(null);

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
      const generated = await api<{
        census_no: string;
        sub_domain_id: string;
        sub_domain_name: string;
        domain_id: string;
      }>("/ep/gen-census/generate", {
        method: "POST",
        body: JSON.stringify({ sub_domain_id: selected.id }),
      });
      setForm({
        ...emptyForm,
        subDomainId: generated.sub_domain_id,
        subDomainName: generated.sub_domain_name,
        censusNo: generated.census_no,
      });
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

  if (showFull) {
    return (
      <MlccsEpForm
        form={form}
        setForm={setForm}
        busy={busy}
        onSave={() => void handleSave()}
        onClear={handleClear}
        onCancel={() => setShowFull(false)}
      />
    );
  }

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS) EP"
      footer={
        <>
          <Button disabled={busy} onClick={() => void handleGenerate()}>
            Generate Census No
          </Button>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          <Button variant="destructive" disabled={busy} onClick={handleClear}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="max-w-3xl mx-auto">
        <FormRow label="Sub Domain Name" required>
          <div className="relative">
            <Input
              placeholder="Search..."
              value={query}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                blurTimer.current = window.setTimeout(
                  () => setShowSuggestions(false),
                  150,
                );
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-background shadow-md">
                {suggestions.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (blurTimer.current) window.clearTimeout(blurTimer.current);
                        pickSuggestion(row);
                      }}
                    >
                      <span>{row.sub_domain_name}</span>
                      {row.eqpt_cat ? (
                        <span className="text-xs text-muted-foreground">{row.eqpt_cat}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
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
  busy,
  onSave,
  onClear,
  onCancel,
}: {
  form: FullForm;
  setForm: (f: FullForm) => void;
  busy: boolean;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof FullForm>(k: K, v: FullForm[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS) EP"
      fill
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClear}>
            Clear
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={busy}
            onClick={onSave}
          >
            Save
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-1.5 text-xs">
        <FormGrid cols={4}>
          <FormRow label="Sub Domain Name" required>
            <Input value={form.subDomainName} disabled />
          </FormRow>
          <FormRow label="Census No" required>
            <Input value={form.censusNo} disabled />
          </FormRow>
          <FormRow label="Auth/Letter No" required>
            <Input
              value={form.authLetterNo}
              onChange={(e) => upd("authLetterNo", e.target.value)}
              placeholder="Enter Auth/Letter No.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Date" required className="sm:grid-cols-[52px_minmax(10rem,1fr)]">
            <DateInput
              value={form.date}
              onChange={(v) => upd("date", v)}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Cat/Part No" required>
            <Input
              value={form.catPartNo}
              onChange={(e) => upd("catPartNo", e.target.value)}
              placeholder="Enter Cat/Part No.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Accounting Unit" required>
            <SelectField
              value={form.accountingUnit}
              onChange={(v) => upd("accountingUnit", v)}
              options={["NOS", "KG", "LTR", "MTR"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Item Status" required>
            <SelectField
              value={form.itemStatus}
              onChange={(v) => upd("itemStatus", v)}
              options={["CUR", "OBS", "PHS"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Item Category" required>
            <SelectField
              value={form.itemCategory}
              onChange={(v) => upd("itemCategory", v)}
              options={["Weapon", "Ammo", "Vehicle", "Comms"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Class of Eqpt" required>
            <SelectField
              value={form.classOfEqpt}
              onChange={(v) => upd("classOfEqpt", v)}
              options={["Class I", "Class II", "Class III"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Country of Origin">
            <Input
              value={form.countryOfOrigin}
              onChange={(e) => upd("countryOfOrigin", e.target.value)}
              placeholder="Search.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Nodal Dte">
            <SelectField
              value={form.nodalDte}
              onChange={(v) => upd("nodalDte", v)}
              options={["DGOS", "DGAS", "DGEME"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Eqpt Category">
            <SelectField
              value={form.eqptCategory}
              onChange={(v) => upd("eqptCategory", v)}
              options={["A", "B", "C"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Incl in AIH">
            <SelectField
              value={form.inclInAih}
              onChange={(v) => upd("inclInAih", v)}
              options={["Yes", "No"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Year of Induction">
            <Input
              value={form.yearOfInduction}
              onChange={(e) => upd("yearOfInduction", e.target.value)}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Digest Category">
            <SelectField
              value={form.digestCategory}
              onChange={(v) => upd("digestCategory", v)}
              options={["Cat-I", "Cat-II"]}
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Cost (Rs.)">
            <Input
              value={form.cost}
              onChange={(e) => upd("cost", e.target.value)}
              placeholder="Enter Cost.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Manufacturing Agency">
            <Input
              value={form.manufacturingAgency}
              onChange={(e) => upd("manufacturingAgency", e.target.value)}
              placeholder="Enter Man. Agency.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="AHSP Agency">
            <Input
              value={form.ahspAgency}
              onChange={(e) => upd("ahspAgency", e.target.value)}
              placeholder="Enter AHSP Agency..."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="NATO Stock No(NSN)">
            <Input
              value={form.natoStockNo}
              onChange={(e) => upd("natoStockNo", e.target.value)}
              placeholder="Enter No..."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Def Catalogue No(DCAN)">
            <Input
              value={form.defCatalogueNo}
              onChange={(e) => upd("defCatalogueNo", e.target.value)}
              placeholder="Enter No..."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Brief Description" required className="sm:col-span-2 lg:col-span-2">
            <Textarea
              rows={2}
              value={form.briefDescription}
              onChange={(e) => upd("briefDescription", e.target.value)}
              placeholder="Enter Brief Description.."
              disabled={busy}
            />
          </FormRow>
          <FormRow label="Remarks" className="sm:col-span-2 lg:col-span-2">
            <Textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => upd("remarks", e.target.value)}
              placeholder="Enter Your Remarks..."
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
  options,
  placeholder = "--Select--",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
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
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
