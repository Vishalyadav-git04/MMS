import { useState, type ReactNode } from "react";
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

function ActionButtons({
  primaryLabel,
  onPrimary,
  onClear,
  onCancel,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Button size="sm" onClick={onPrimary} className="bg-success hover:bg-success/90 text-success-foreground">
        {primaryLabel}
      </Button>
      <Button size="sm" variant="secondary" onClick={onClear}>
        Clear
      </Button>
      <Button size="sm" variant="destructive" onClick={onCancel}>
        Cancel
      </Button>
    </>
  );
}

export function CaptureMlccs() {
  const [mode, setMode] = useState<Mode>("add");

  const [addCos, setAddCos] = useState("");
  const [addNom, setAddNom] = useState("");
  const [showAddFull, setShowAddFull] = useState(false);
  const [addForm, setAddForm] = useState<FullForm>(emptyForm);

  const [modCensus, setModCensus] = useState("");
  const [modNom, setModNom] = useState("");
  const [showModFull, setShowModFull] = useState(false);
  const [modForm, setModForm] = useState<FullForm>(emptyForm);

  const handleGenerate = () => {
    if (!addCos || !addNom) {
      toast.error("COS Section and Nomenclature are required");
      return;
    }
    const generated = `CN-${Date.now().toString().slice(-6)}`;
    setAddForm({
      ...emptyForm,
      cosSection: addCos,
      nomenclature: addNom,
      censusNo: generated,
    });
    setShowAddFull(true);
    toast.success(`Census No ${generated} generated`);
  };

  const handleModify = () => {
    if (!modCensus || !modNom) {
      toast.error("Census No and Nomenclature are required");
      return;
    }
    setModForm({
      ...emptyForm,
      cosSection: "ARTY-01",
      censusNo: modCensus,
      nomenclature: modNom,
      catPartNo: "CP-2451",
      authLetterNo: "AL-98/2025",
      date: "12-05-2025",
      briefDescription: "Existing equipment record loaded for modification.",
      cost: "125000",
    });
    setShowModFull(true);
    toast.success("Record loaded");
  };

  let footer: ReactNode = undefined;
  if (mode === "add" && showAddFull) {
    footer = (
      <ActionButtons
        primaryLabel="Save"
        onPrimary={() => toast.success("Equipment saved successfully")}
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
        onPrimary={() => toast.success("Record updated successfully")}
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
          <FullEqptForm form={addForm} setForm={setAddForm} lockedFields={["cosSection", "censusNo"]} />
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
                <Button onClick={handleGenerate} className="bg-primary hover:bg-primary/90">
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
        <FullEqptForm form={modForm} setForm={setModForm} lockedFields={["cosSection", "censusNo"]} />
      ) : (
        <MiniLookup
          fields={
            <>
              <FormRow label="Census No" required>
                <Input
                  placeholder="Search..."
                  value={modCensus}
                  onChange={(e) => setModCensus(e.target.value)}
                />
              </FormRow>
              <FormRow label="Nomenclature" required>
                <Input
                  placeholder="Search..."
                  value={modNom}
                  onChange={(e) => setModNom(e.target.value)}
                />
              </FormRow>
            </>
          }
          actions={
            <>
              <Button onClick={handleModify} className="bg-primary hover:bg-primary/90">
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
  // Top-aligned short form (same layout as before — not vertically centered)
  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-2">
      {fields}
      <div className="flex flex-wrap justify-center gap-2 pt-2">{actions}</div>
    </div>
  );
}

function FullEqptForm({
  form,
  setForm,
  lockedFields,
}: {
  form: FullForm;
  setForm: (f: FullForm) => void;
  lockedFields: (keyof FullForm)[];
}) {
  const upd = <K extends keyof FullForm>(k: K, v: FullForm[K]) => setForm({ ...form, [k]: v });
  const isLocked = (k: keyof FullForm) => lockedFields.includes(k);

  return (
    <div className="h-full min-h-0 space-y-1.5 overflow-hidden">
      {/* 4 columns so all fields + description fit above the footer */}
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
            options={["Group A", "Group B", "Group C"]}
          />
        </FormRow>
        <FormRow label="Item Code" required>
          <SelectField
            value={form.itemCode}
            onChange={(v) => upd("itemCode", v)}
            options={["IC-001", "IC-002", "IC-003"]}
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
            options={["NOS", "KG", "LTR", "MTR"]}
          />
        </FormRow>
        <FormRow label="Item Status" required>
          <SelectField
            value={form.itemStatus}
            onChange={(v) => upd("itemStatus", v)}
            options={["CUR", "OBS", "PHS"]}
          />
        </FormRow>
        <FormRow label="Item Category" required>
          <SelectField
            value={form.itemCategory}
            onChange={(v) => upd("itemCategory", v)}
            options={["Weapon", "Ammunition", "Vehicle", "Communication"]}
          />
        </FormRow>
        <FormRow label="Class of Eqpt" required>
          <SelectField
            value={form.classOfEqpt}
            onChange={(v) => upd("classOfEqpt", v)}
            options={["Class I", "Class II", "Class III"]}
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
            options={["DGOS", "DGAS", "DGEME"]}
          />
        </FormRow>
        <FormRow label="Eqpt Category">
          <SelectField
            value={form.eqptCategory}
            onChange={(v) => upd("eqptCategory", v)}
            options={["A", "B", "C"]}
          />
        </FormRow>
        <FormRow label="Incl in AIH">
          <SelectField
            value={form.inclInAih}
            onChange={(v) => upd("inclInAih", v)}
            options={["Yes", "No"]}
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
            options={["Cat-I", "Cat-II"]}
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
  return (
    <Select value={value} onValueChange={onChange}>
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
