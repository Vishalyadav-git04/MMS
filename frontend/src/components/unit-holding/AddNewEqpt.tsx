import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
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
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

const DEPOT_OPTIONS = [
  "DEP-001 - COD Delhi",
  "DEP-002 - COD Mumbai",
  "DEP-003 - AOD Pathankot",
  "DEP-004 - COD Jabalpur",
];

const HOLDING_TYPES = [
  "Authorised Holding",
  "Temporary Holding",
  "Surplus Holding",
  "Loan Holding",
];

const EQPT_TYPES = [
  "Small Arms",
  "Crew Served Wpn",
  "Optics & NVDs",
  "Comn Eqpt",
];

const PRF_GROUPS = ["PRF-INF-01", "PRF-ARTY-02", "PRF-ARMD-03", "PRF-ASC-04"];

const CENSUS_OPTIONS = [
  "CN-88421 — Carbine 5.56mm Folding Stock",
  "CN-90215 — LMG 7.62mm Belt Fed",
  "CN-77109 — Thermal Imager Hand Held",
  "CN-65033 — VHF Radio Set Manpack 25W",
];

function SelectField({
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
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
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

/** Fields that belong to the individual item, not the IV header — reset after each add. */
const ITEM_FIELDS = [
  "prfSearch",
  "prfGroup",
  "censusNo",
  "materialNo",
  "issuedQty",
  "eqptMake",
  "eqptModel",
  "unitPrice",
  "depreciationRate",
  "lifeOfAsset",
] as const;

interface ItemRow {
  id: string;
  prfGroup: string;
  susNo: string;
  censusNo: string;
  materialNo: string;
  regnNo: string;
  issuedQty: string;
}

const emptyForm = {
  ivNo: "",
  ivDate: "2026-07-24",
  issuingDepot: "",
  toUnitName: "",
  toUnitSus: "",
  typeOfHolding: "",
  typeOfEqpt: "",
  prfSearch: "",
  prfGroup: "",
  censusNo: "",
  materialNo: "",
  issuedQty: "",
  eqptMake: "",
  eqptModel: "",
  unitPrice: "",
  depreciationRate: "",
  lifeOfAsset: "",
  uploadIv: "",
};

export function AddNewEqpt() {
  const [form, setForm] = useState(emptyForm);
  const [filteredPrf, setFilteredPrf] = useState(PRF_GROUPS);
  const [items, setItems] = useState<ItemRow[]>([]);

  const upd = <K extends keyof typeof emptyForm>(
    k: K,
    v: (typeof emptyForm)[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleClear = () => {
    setForm(emptyForm);
    setFilteredPrf(PRF_GROUPS);
  };

  const handleCancel = () => {
    handleClear();
    setItems([]);
  };

  const handlePrfSearch = () => {
    const q = form.prfSearch.trim().toLowerCase();
    const next = q
      ? PRF_GROUPS.filter((g) => g.toLowerCase().includes(q))
      : PRF_GROUPS;
    setFilteredPrf(next);
    if (!next.length) toast.message("No PRF Group matched");
  };

  const handleAddItems = () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (
      !form.ivNo.trim() ||
      !form.ivDate ||
      !form.issuingDepot ||
      !form.toUnitName.trim() ||
      !form.toUnitSus.trim() ||
      !form.typeOfHolding ||
      !form.typeOfEqpt ||
      !form.prfGroup ||
      !form.censusNo ||
      !form.materialNo.trim() ||
      !form.issuedQty.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        prfGroup: form.prfGroup,
        susNo: form.toUnitSus,
        censusNo: form.censusNo,
        materialNo: form.materialNo,
        regnNo: "",
        issuedQty: form.issuedQty,
      },
    ]);
    setForm((prev) => {
      const next = { ...prev };
      for (const k of ITEM_FIELDS) next[k] = emptyForm[k];
      return next;
    });
    setFilteredPrf(PRF_GROUPS);
    toast.success("Item added to list");
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((r) => r.id !== id));

  const handleSubmit = () => {
    if (!items.length) {
      toast.error("Add at least one item before submitting");
      return;
    }
    toast.success(`${items.length} item(s) submitted successfully`);
    setItems([]);
    handleClear();
  };

  return (
    <FormPanel title="ADD DETAILS OF NEW EQPT" fill lockBodyScroll>
      <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden">
        <FormGrid cols={4} className="shrink-0">
          <FormRow label="IV No" required>
            <Input
              placeholder="Enter IV No..."
              value={form.ivNo}
              onChange={(e) => upd("ivNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="IV Date" required>
            <DateInput value={form.ivDate} onChange={(v) => upd("ivDate", v)} />
          </FormRow>
          <FormRow label="Issuing Depot" required className="sm:col-span-2">
            <SelectField
              value={form.issuingDepot}
              onChange={(v) => upd("issuingDepot", v)}
              options={DEPOT_OPTIONS}
            />
          </FormRow>

          <FormRow label="To Unit Name" required>
            <Input
              placeholder="Search..."
              value={form.toUnitName}
              onChange={(e) => upd("toUnitName", e.target.value)}
            />
          </FormRow>
          <FormRow label="To Unit SUS" required>
            <Input
              placeholder="Search..."
              value={form.toUnitSus}
              onChange={(e) => upd("toUnitSus", e.target.value)}
            />
          </FormRow>
          <FormRow label="Type of Holding" required>
            <SelectField
              value={form.typeOfHolding}
              onChange={(v) => upd("typeOfHolding", v)}
              options={HOLDING_TYPES}
            />
          </FormRow>
          <FormRow label="Type of Eqpt" required>
            <SelectField
              value={form.typeOfEqpt}
              onChange={(v) => upd("typeOfEqpt", v)}
              options={EQPT_TYPES}
            />
          </FormRow>

          <FormRow label="PRF Group" required className="sm:col-span-2">
            <div className="flex min-w-0 gap-1">
              <div className="flex min-w-0 flex-1 gap-1">
                <Input
                  placeholder="Search..."
                  value={form.prfSearch}
                  onChange={(e) => upd("prfSearch", e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 shrink-0"
                  onClick={handlePrfSearch}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-w-0 flex-[1.4]">
                <SelectField
                  value={form.prfGroup}
                  onChange={(v) => upd("prfGroup", v)}
                  options={filteredPrf}
                  placeholder="----Select PRF Group----"
                />
              </div>
            </div>
          </FormRow>
          <FormRow label="Census No" required>
            <SelectField
              value={form.censusNo}
              onChange={(v) => upd("censusNo", v)}
              options={CENSUS_OPTIONS}
              placeholder="--Select Item Nomenclature--"
            />
          </FormRow>
          <FormRow label="Material No" required>
            <Input
              placeholder="Enter Material No..."
              value={form.materialNo}
              onChange={(e) => upd("materialNo", e.target.value)}
            />
          </FormRow>

          <FormRow label="Issued Qty" required>
            <Input
              placeholder="Enter Qty..."
              value={form.issuedQty}
              onChange={(e) => upd("issuedQty", e.target.value)}
            />
          </FormRow>
          <FormRow label="Eqpt Make">
            <Input
              placeholder="Enter Make..."
              value={form.eqptMake}
              onChange={(e) => upd("eqptMake", e.target.value)}
            />
          </FormRow>
          <FormRow label="Eqpt Model">
            <Input
              placeholder="Enter Model..."
              value={form.eqptModel}
              onChange={(e) => upd("eqptModel", e.target.value)}
            />
          </FormRow>
          <FormRow label="Unit Price">
            <Input
              placeholder="Enter Unit Price..."
              value={form.unitPrice}
              onChange={(e) => upd("unitPrice", e.target.value)}
            />
          </FormRow>

          <FormRow label="Depreciation %">
            <Input
              placeholder="In %..."
              value={form.depreciationRate}
              onChange={(e) => upd("depreciationRate", e.target.value)}
            />
          </FormRow>
          <FormRow label="Life (Yr)">
            <Input
              placeholder="Enter Life of Assets..."
              value={form.lifeOfAsset}
              onChange={(e) => upd("lifeOfAsset", e.target.value)}
            />
          </FormRow>
          <FormRow label="Upload IV" className="sm:col-span-2">
            <Input
              type="file"
              className="h-auto py-0.5"
              onChange={(e) => upd("uploadIv", e.target.files?.[0]?.name ?? "")}
            />
          </FormRow>
        </FormGrid>

        <div className="-mx-2 flex shrink-0 flex-wrap justify-center gap-2 border-y border-border bg-muted/40 px-3 py-1.5 sm:-mx-3">
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleAddItems}
          >
            Add Items in List
          </Button>
          <Button size="sm" variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" variant="destructive" onClick={handleCancel}>
            Cancel
          </Button>
        </div>

        {items.length > 0 && (
          <ItemsList items={items} onRemove={removeItem} onSubmit={handleSubmit} />
        )}
      </div>
    </FormPanel>
  );
}

const ITEM_COLUMNS = [
  "PRF Group",
  "SUS No",
  "Census No",
  "Material No",
  "Regn No",
  "Issued Qty",
];

function ItemsList({
  items,
  onRemove,
  onSubmit,
}: {
  items: ItemRow[];
  onRemove: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border">
      <div className="shrink-0 border-b border-border bg-secondary/40 px-2 py-1 text-[12px] font-semibold text-foreground">
        Items Added in List — {items.length}
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-full caption-bottom border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary">
              <th className="h-8 w-10 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                #
              </th>
              {ITEM_COLUMNS.map((c) => (
                <th
                  key={c}
                  className="h-8 whitespace-nowrap px-2 py-0 text-left text-xs font-medium text-primary-foreground"
                >
                  {c}
                </th>
              ))}
              <th className="h-8 w-10 px-2 py-0 text-left text-xs font-medium text-primary-foreground" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  "h-8 border-b border-border",
                  idx % 2 === 1 ? "bg-muted/40" : undefined,
                )}
              >
                <td className="px-2 py-0 align-middle text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.prfGroup}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.susNo}
                </td>
                <td className="min-w-[200px] px-2 py-0 align-middle">
                  {row.censusNo}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.materialNo}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.regnNo || "—"}
                </td>
                <td className="px-2 py-0 align-middle">{row.issuedQty}</td>
                <td className="px-2 py-0 align-middle">
                  <button
                    type="button"
                    aria-label={`Remove item ${idx + 1}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    onClick={() => onRemove(row.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={ITEM_COLUMNS.length + 2}
                  className="h-16 text-center text-sm text-muted-foreground"
                >
                  No items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex shrink-0 justify-center border-t border-border bg-muted/40 px-3 py-1.5">
        <Button
          size="sm"
          className="bg-success hover:bg-success/90 text-success-foreground"
          disabled={items.length === 0}
          onClick={onSubmit}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
