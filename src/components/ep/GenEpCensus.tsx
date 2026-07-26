import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
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
import { toast } from "sonner";

interface FullForm {
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
  const [subDomainName, setSubDomainName] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [form, setForm] = useState<FullForm>(emptyForm);

  const handleGenerate = () => {
    if (!subDomainName.trim()) {
      toast.error("Sub Domain Name is required");
      return;
    }
    const generated = `EP-${Date.now().toString().slice(-6)}`;
    setForm({
      ...emptyForm,
      subDomainName,
      censusNo: generated,
    });
    setShowFull(true);
    toast.success(`Census No ${generated} generated`);
  };

  const handleClear = () => {
    setSubDomainName("");
    setShowFull(false);
    setForm(emptyForm);
  };

  if (showFull) {
    return (
      <MlccsEpForm
        form={form}
        setForm={setForm}
        onSave={() => toast.success("EP Census saved successfully")}
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
          <Button onClick={handleGenerate}>Generate Census No</Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button variant="destructive" onClick={() => toast("Cancelled")}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="max-w-3xl mx-auto">
        <FormRow label="Sub Domain Name" required>
          <Input
            placeholder="Search..."
            value={subDomainName}
            onChange={(e) => setSubDomainName(e.target.value)}
          />
        </FormRow>
      </div>
    </FormPanel>
  );
}

function MlccsEpForm({
  form,
  setForm,
  onSave,
  onClear,
  onCancel,
}: {
  form: FullForm;
  setForm: (f: FullForm) => void;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof FullForm>(k: K, v: FullForm[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <FormPanel
      title="Master List of Controlled and Census Stores (MLCCS) EP"
      footer={
        <>
          <Button variant="secondary" onClick={onClear}>
            Clear
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={onSave}
          >
            Save
          </Button>
          <Button variant="destructive" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-xs">
        <FormRow label="Sub Domain Name" required>
          <Select
            value={form.subDomainName}
            onValueChange={(v) => upd("subDomainName", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              {[form.subDomainName, "Optics", "Radar", "Sensors"]
                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                .map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="Census No" required>
          <Input value={form.censusNo} disabled />
        </FormRow>

        <FormGrid>
          <FormRow label="Auth/Letter No" required>
            <Input
              value={form.authLetterNo}
              onChange={(e) => upd("authLetterNo", e.target.value)}
              placeholder="Enter Auth/Letter No.."
            />
          </FormRow>
          <FormRow label="Date" required>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => upd("date", e.target.value)}
            />
          </FormRow>
          <FormRow label="Cat/Part No" required>
            <Input
              value={form.catPartNo}
              onChange={(e) => upd("catPartNo", e.target.value)}
              placeholder="Enter Cat/Part No.."
            />
          </FormRow>
          <FormRow label="Accounting Unit" required>
            <SelectField
              value={form.accountingUnit}
              onChange={(v) => upd("accountingUnit", v)}
              options={["NOS", "KG", "LTR", "MTR"]}
            />
          </FormRow>
        </FormGrid>

        <FormRow label="Brief Description" required>
          <Textarea
            rows={2}
            value={form.briefDescription}
            onChange={(e) => upd("briefDescription", e.target.value)}
            placeholder="Enter Brief Description.."
          />
        </FormRow>

        <FormGrid>
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
              placeholder="Search.."
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
              placeholder="Enter Cost.."
            />
          </FormRow>
          <FormRow label="Manufacturing Agency">
            <Input
              value={form.manufacturingAgency}
              onChange={(e) => upd("manufacturingAgency", e.target.value)}
              placeholder="Enter Man. Agency.."
            />
          </FormRow>
          <FormRow label="AHSP Agency">
            <Input
              value={form.ahspAgency}
              onChange={(e) => upd("ahspAgency", e.target.value)}
              placeholder="Enter AHSP Agency..."
            />
          </FormRow>
          <FormRow label="NATO Stock No(NSN)">
            <Input
              value={form.natoStockNo}
              onChange={(e) => upd("natoStockNo", e.target.value)}
              placeholder="Enter No..."
            />
          </FormRow>
          <FormRow label="Def Catalogue No(DCAN)">
            <Input
              value={form.defCatalogueNo}
              onChange={(e) => upd("defCatalogueNo", e.target.value)}
              placeholder="Enter No..."
            />
          </FormRow>
        </FormGrid>

        <FormRow label="Remarks">
          <Textarea
            rows={2}
            value={form.remarks}
            onChange={(e) => upd("remarks", e.target.value)}
            placeholder="Enter Your Remarks..."
          />
        </FormRow>
      </div>
    </FormPanel>
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
