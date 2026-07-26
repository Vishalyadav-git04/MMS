import { useEffect, useState, type ReactNode } from "react";
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

export function CaptureMlccs() {
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<OptionsMap>({});

  const [addCos, setAddCos] = useState("");
  const [addNom, setAddNom] = useState("");
  const [showAddFull, setShowAddFull] = useState(false);
  const [addForm, setAddForm] = useState<FullForm>(emptyForm);

  const [modCensus, setModCensus] = useState("");
  const [modNom, setModNom] = useState("");
  const [showModFull, setShowModFull] = useState(false);
  const [modForm, setModForm] = useState<FullForm>(emptyForm);

  useEffect(() => {
    api<OptionsMap>("/admin/capture-mlccs-details/options")
      .then(setOptions)
      .catch(() => {
        /* keep hardcoded fallbacks in SelectField */
      });
  }, []);

  const handleGenerate = async () => {
    if (!addCos || !addNom) {
      toast.error("COS Section and Nomenclature are required");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/generate", {
        method: "POST",
        body: JSON.stringify({ cos_section: addCos, nomenclature: addNom }),
      });
      setAddForm(recordToForm(rec));
      setShowAddFull(true);
      toast.success(`Census No ${rec.census_no} generated`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleModify = async () => {
    if (!modCensus || !modNom) {
      toast.error("Census No and Nomenclature are required");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<MlccsRecord>("/admin/capture-mlccs-details/lookup", {
        method: "POST",
        body: JSON.stringify({ census_no: modCensus, nomenclature: modNom }),
      });
      setModForm(recordToForm(rec));
      setShowModFull(true);
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
          setModForm(emptyForm);
        }}
        onCancel={() => setShowModFull(false)}
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
        <SwitchTabs<Mode>
          tabs={[
            { id: "add", label: "Add New Eqpt" },
            { id: "modify", label: "Modify Census" },
          ]}
          value={mode}
          onChange={(v) => setMode(v)}
        />
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
                  <Input
                    placeholder="Search..."
                    value={addCos}
                    onChange={(e) => setAddCos(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Nomenclature" required>
                  <Input
                    placeholder="Enter Nomenclature"
                    value={addNom}
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
                  onClick={() => {
                    setAddCos("");
                    setAddNom("");
                  }}
                >
                  Clear
                </Button>
                <Button variant="destructive" onClick={() => toast("Cancelled")}>
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
                <Input
                  placeholder="e.g. C900000"
                  value={modCensus}
                  onChange={(e) => setModCensus(e.target.value)}
                />
              </FormRow>
              <FormRow label="Nomenclature" required>
                <Input
                  placeholder="e.g. Nomenclature 1"
                  value={modNom}
                  onChange={(e) => setModNom(e.target.value)}
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
                onClick={() => {
                  setModCensus("");
                  setModNom("");
                }}
              >
                Clear
              </Button>
              <Button variant="destructive" onClick={() => toast("Cancelled")}>
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
    <div className="mx-auto max-w-3xl space-y-4 pt-2">
      {fields}
      <div className="flex flex-wrap justify-center gap-2 pt-2">{actions}</div>
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
