import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { api, ApiError } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface Option {
  value: string;
  label: string;
}

interface OrbatUnit {
  id: string;
  unit_name: string;
  sus_no: string;
  form_code: string | null;
  status: string;
}

interface CensusItem {
  census_no: string;
  nomenclature: string | null;
  prf_group: string | null;
  prf_code: string | null;
  material_no: string | null;
}

interface ItemRow {
  id: string;
  issuingDepotName: string;
  toUnitName: string;
  prfGroup: string;
  prfCode: string;
  susNo: string;
  censusNo: string;
  materialNo: string;
  eqptRegnNo: string;
  regnSeqNo: string;
  censusSeqNo: number;
}

const emptyForm = {
  ivNo: "",
  ivDate: "",
  issuingDepotSus: "",
  toUnitName: "",
  toUnitSus: "",
  typeOfHolding: "",
  typeOfEqpt: "",
  prfSearch: "",
  prfGroup: "",
  prfCode: "",
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

/** Cleared after each Add Items — IV / units / holding / depreciation stay. */
const ITEM_FIELDS = [
  "prfSearch",
  "prfGroup",
  "prfCode",
  "censusNo",
  "materialNo",
  "issuedQty",
  "eqptMake",
  "eqptModel",
  "unitPrice",
  "lifeOfAsset",
] as const;

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
  const blurTimer = useRef<number | null>(null);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
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
        </ul>
      )}
    </div>
  );
}

export function AddNewEqpt() {
  const [form, setForm] = useState(emptyForm);
  const [holdingOpts, setHoldingOpts] = useState<Option[]>([]);
  const [eqptOpts, setEqptOpts] = useState<Option[]>([]);
  const [depotOpts, setDepotOpts] = useState<OrbatUnit[]>([]);
  const [prfOptions, setPrfOptions] = useState<string[]>([]);
  const [censusOptions, setCensusOptions] = useState<CensusItem[]>([]);
  const [toUnitHits, setToUnitHits] = useState<OrbatUnit[]>([]);
  const [toUnitField, setToUnitField] = useState<"name" | "sus" | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [busy, setBusy] = useState(false);

  const upd = <K extends keyof typeof emptyForm>(
    k: K,
    v: (typeof emptyForm)[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    api<{ type_of_hldg: Option[]; type_of_eqpt: Option[] }>(
      "/unit-holding/add-new-eqpt/options",
    )
      .then((res) => {
        setHoldingOpts(res.type_of_hldg ?? []);
        setEqptOpts(res.type_of_eqpt ?? []);
      })
      .catch(() => toast.error("Failed to load holding / eqpt options"));

    api<OrbatUnit[]>("/unit-holding/add-new-eqpt/orbat-units")
      .then(setDepotOpts)
      .catch(() => toast.error("Failed to load ORBAT units"));

    api<{ prf_group: string }[]>("/unit-holding/add-new-eqpt/prf-groups")
      .then((rows) => setPrfOptions(rows.map((r) => r.prf_group).filter(Boolean)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toUnitField) return;
    const q =
      toUnitField === "name" ? form.toUnitName.trim() : form.toUnitSus.trim();
    if (q.length < 1) {
      setToUnitHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<OrbatUnit[]>(
        `/unit-holding/add-new-eqpt/orbat-units?q=${encodeURIComponent(q)}`,
      )
        .then(setToUnitHits)
        .catch(() => setToUnitHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [form.toUnitName, form.toUnitSus, toUnitField]);

  useEffect(() => {
    if (!form.prfGroup) {
      setCensusOptions([]);
      return;
    }
    void api<CensusItem[]>(
      `/unit-holding/add-new-eqpt/census-items?prf_group=${encodeURIComponent(form.prfGroup)}`,
    )
      .then(setCensusOptions)
      .catch(() => setCensusOptions([]));
  }, [form.prfGroup]);

  const handleClear = () => {
    setForm(emptyForm);
    setCensusOptions([]);
    setToUnitHits([]);
    setToUnitField(null);
    void api<{ prf_group: string }[]>("/unit-holding/add-new-eqpt/prf-groups")
      .then((rows) => setPrfOptions(rows.map((r) => r.prf_group).filter(Boolean)))
      .catch(() => setPrfOptions([]));
  };

  const handleCancel = () => {
    handleClear();
    setItems([]);
  };

  const handlePrfSearch = async () => {
    try {
      const rows = await api<{ prf_group: string }[]>(
        `/unit-holding/add-new-eqpt/prf-groups?q=${encodeURIComponent(form.prfSearch.trim())}`,
      );
      const groups = rows.map((r) => r.prf_group).filter(Boolean);
      setPrfOptions(groups);
      if (!groups.length) toast.message("No PRF Group matched");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "PRF search failed");
    }
  };

  const pickToUnit = (idx: number) => {
    const row = toUnitHits[idx];
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      toUnitName: row.unit_name,
      toUnitSus: row.sus_no,
    }));
    setToUnitHits([]);
    setToUnitField(null);
  };

  const pickCensus = (censusNo: string) => {
    const row = censusOptions.find((c) => c.census_no === censusNo);
    setForm((prev) => ({
      ...prev,
      censusNo,
      prfCode: row?.prf_code?.trim() ?? prev.prfCode,
      materialNo:
        prev.materialNo.trim() || row?.material_no?.trim() || prev.materialNo,
    }));
  };

  const handleAddItems = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (
      !form.ivNo.trim() ||
      !form.ivDate ||
      !form.issuingDepotSus ||
      !form.toUnitName.trim() ||
      !form.toUnitSus.trim() ||
      !form.typeOfHolding ||
      !form.typeOfEqpt ||
      !form.prfGroup ||
      !form.prfCode.trim() ||
      !form.censusNo ||
      !form.materialNo.trim() ||
      !form.issuedQty.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    const qty = Number(form.issuedQty);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Issued Qty must be a positive whole number");
      return;
    }

    setBusy(true);
    try {
      const generated = await api<
        {
          issuing_depot_name: string;
          to_unit_name: string;
          prf_group: string;
          prf_code: string;
          sus_no: string;
          census_no: string;
          material_no: string;
          eqpt_regn_no: string;
          regn_seq_no: string;
          census_seq_no: number;
        }[]
      >("/unit-holding/add-new-eqpt/build-items", {
        method: "POST",
        body: JSON.stringify({
          iv_no: form.ivNo.trim(),
          iv_date: form.ivDate,
          issuing_depot_sus: form.issuingDepotSus,
          to_unit_sus: form.toUnitSus.trim(),
          type_of_hldg: form.typeOfHolding,
          type_of_eqpt: form.typeOfEqpt,
          prf_group: form.prfGroup,
          prf_code: form.prfCode.trim(),
          census_no: form.censusNo,
          material_no: form.materialNo.trim(),
          issued_qty: qty,
          pending_eqpt_regn_nos: items.map((i) => i.eqptRegnNo),
          pending_regn_seq_nos: items.map((i) => i.regnSeqNo),
          pending_census_seq_nos: items.map((i) => i.censusSeqNo),
        }),
      });

      setItems((prev) => [
        ...prev,
        ...generated.map((g, idx) => ({
          id: `${Date.now()}-${prev.length + idx}`,
          issuingDepotName: g.issuing_depot_name,
          toUnitName: g.to_unit_name,
          prfGroup: g.prf_group,
          prfCode: g.prf_code,
          susNo: g.sus_no,
          censusNo: g.census_no,
          materialNo: g.material_no,
          eqptRegnNo: g.eqpt_regn_no,
          regnSeqNo: g.regn_seq_no,
          censusSeqNo: g.census_seq_no,
        })),
      ]);

      setForm((prev) => {
        const next = { ...prev };
        for (const k of ITEM_FIELDS) next[k] = emptyForm[k];
        return next;
      });
      setCensusOptions([]);
      toast.success(`${generated.length} registration(s) added to list`);
      // Scroll list into view after layout paints (body scroll is enabled).
      window.setTimeout(() => {
        document
          .getElementById("add-new-eqpt-items")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to build items");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((r) => r.id !== id));

  const handleSubmit = async () => {
    if (!items.length) {
      toast.error("Add at least one item before submitting");
      return;
    }
    if (
      !form.ivNo.trim() ||
      !form.ivDate ||
      !form.typeOfHolding ||
      !form.typeOfEqpt ||
      !form.issuingDepotSus ||
      !form.toUnitSus
    ) {
      toast.error("Header fields are required to submit");
      return;
    }

    const holdingLabel =
      holdingOpts.find((o) => o.value === form.typeOfHolding)?.label ?? "";
    const holdingUpper = holdingLabel.toUpperCase();
    const othHoldings = new Set([
      "SECTOR STORE",
      "LOAN STORE",
      "ACSFP STORE",
    ]);
    if (othHoldings.has(holdingUpper)) {
      toast.error(
        "SECTOR / LOAN / ACSFP STORE save mapping is not configured yet.",
      );
      return;
    }

    setBusy(true);
    try {
      const res = await api<{ count: number; target_table: string }>(
        "/unit-holding/add-new-eqpt/submit",
        {
          method: "POST",
          body: JSON.stringify({
            iv_no: form.ivNo.trim(),
            iv_date: form.ivDate,
            issuing_depot_sus: form.issuingDepotSus,
            to_unit_sus: form.toUnitSus.trim(),
            type_of_hldg: form.typeOfHolding,
            type_of_eqpt: form.typeOfEqpt,
            depres_dur_year: form.depreciationRate.trim() || null,
            upload_iv: form.uploadIv.trim() || null,
            items: items.map((i) => ({
              eqpt_regn_no: i.eqptRegnNo,
              regn_seq_no: i.regnSeqNo,
              census_seq_no: i.censusSeqNo,
              census_no: i.censusNo,
              material_no: i.materialNo,
              prf_code: i.prfCode,
              prf_group: i.prfGroup,
            })),
          }),
        },
      );
      toast.success(`${res.count} item(s) saved to ${res.target_table}`);
      setItems([]);
      handleClear();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const hasItems = items.length > 0;
  const toUnitSuggestions = toUnitHits.map((u) =>
    toUnitField === "sus"
      ? `${u.sus_no} — ${u.unit_name}`
      : `${u.unit_name} (${u.sus_no})`,
  );

  return (
    <FormPanel
      title="ADD DETAILS OF NEW EQPT"
      fill={hasItems}
      footer={
        <>
          <Button size="sm" onClick={() => void handleAddItems()} disabled={busy}>
            Add Items in List
          </Button>
          <Button size="sm" variant="secondary" onClick={handleClear} disabled={busy}>
            Clear
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
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
            <Select
              value={form.issuingDepotSus || undefined}
              onValueChange={(v) => upd("issuingDepotSus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {depotOpts.map((d) => (
                  <SelectItem key={d.id} value={d.sus_no}>
                    {d.unit_name} ({d.sus_no})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="To Unit Name" required>
            <SuggestInput
              placeholder="Search..."
              value={form.toUnitName}
              suggestions={toUnitField === "name" ? toUnitSuggestions : []}
              onChange={(v) => {
                setToUnitField("name");
                upd("toUnitName", v);
              }}
              onPick={pickToUnit}
            />
          </FormRow>
          <FormRow label="To Unit SUS" required>
            <SuggestInput
              placeholder="Search..."
              value={form.toUnitSus}
              suggestions={toUnitField === "sus" ? toUnitSuggestions : []}
              onChange={(v) => {
                setToUnitField("sus");
                upd("toUnitSus", v);
              }}
              onPick={pickToUnit}
            />
          </FormRow>
          <FormRow label="Type of Holding" required>
            <Select
              value={form.typeOfHolding || undefined}
              onValueChange={(v) => upd("typeOfHolding", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {holdingOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Type of Eqpt" required>
            <Select
              value={form.typeOfEqpt || undefined}
              onValueChange={(v) => upd("typeOfEqpt", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {eqptOpts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  onClick={() => void handlePrfSearch()}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-w-0 flex-[1.4]">
                <Select
                  value={form.prfGroup || undefined}
                  onValueChange={(v) => {
                    upd("prfGroup", v);
                    upd("censusNo", "");
                    upd("prfCode", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="----Select PRF Group----" />
                  </SelectTrigger>
                  <SelectContent>
                    {prfOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormRow>
          <FormRow label="Census No" required className="sm:col-span-2">
            <Select
              value={form.censusNo || undefined}
              onValueChange={pickCensus}
              disabled={!form.prfGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select Item Nomenclature--" />
              </SelectTrigger>
              <SelectContent>
                {censusOptions.map((c) => (
                  <SelectItem key={c.census_no} value={c.census_no}>
                    {c.census_no}
                    {c.nomenclature ? ` — ${c.nomenclature}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {hasItems && (
          <ItemsList
            items={items}
            busy={busy}
            onRemove={removeItem}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </div>
    </FormPanel>
  );
}

const ITEM_COLUMNS = [
  "Issuing Depot",
  "Unit Name",
  "PRF Group",
  "SUS No",
  "Census No",
  "Material No",
  "Regn No",
  "Reg Seq No",
];

function ItemsList({
  items,
  busy,
  onRemove,
  onSubmit,
}: {
  items: ItemRow[];
  busy: boolean;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      id="add-new-eqpt-items"
      className="flex min-h-[220px] max-h-[min(420px,50vh)] flex-col overflow-hidden rounded border border-border"
    >
      <div className="shrink-0 border-b border-border bg-secondary/40 px-2 py-1 text-[12px] font-semibold text-foreground">
        Items Added in List — {items.length}
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-full caption-bottom border-collapse text-[14px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 text-left">#</th>
              {ITEM_COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap text-left">
                  {c}
                </th>
              ))}
              <th className="w-10 text-left" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-[var(--line-soft,#dfe9f4)]",
                  idx % 2 === 1 ? "bg-[var(--surface-alt,#eff5fb)]" : undefined,
                )}
              >
                <td className="px-2 py-0 align-middle text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.issuingDepotName}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.toUnitName}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.prfGroup}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.susNo}
                </td>
                <td className="min-w-[160px] px-2 py-0 align-middle">
                  {row.censusNo}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.materialNo}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.eqptRegnNo}
                </td>
                <td className="whitespace-nowrap px-2 py-0 align-middle">
                  {row.regnSeqNo}
                </td>
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
          </tbody>
        </table>
      </div>
      <div className="flex shrink-0 justify-center border-t border-border bg-muted/40 px-3 py-1.5">
        <Button size="sm" disabled={items.length === 0 || busy} onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
