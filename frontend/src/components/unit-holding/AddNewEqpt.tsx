import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
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
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiError, uploadFileApi } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface Option {
  value: string;
  label: string;
}

interface OrbatUnit {
  id: number | string;
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
  id: number | string;
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

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getEmptyForm() {
  return {
    ivNo: "",
    ivDate: getTodayIso(),
    issuingDepotSus: "",
    toUnitName: "",
    toUnitSus: "",
    typeOfHolding: "",
    typeOfEqpt: "",
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
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  renderItem,
  maxHeightClass = "max-h-60",
  matchGridWidth = false,
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  renderItem?: (s: string, idx: number) => ReactNode;
  maxHeightClass?: string;
  /** Anchor the dropdown to the full form-grid row instead of just this input,
   *  so it fully covers the rows/labels beneath it (they have differently
   *  sized labels, so covering just the input leaves neighbouring rows peeking out). */
  matchGridWidth?: boolean;
  onChange: (v: string) => void;
  onPick: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<
    { top: number; left: number; width: number; maxHeight: number } | null
  >(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const designMaxHeight = (() => {
    const n = Number(maxHeightClass.match(/max-h-(\d+)/)?.[1]);
    return Number.isFinite(n) && n > 0 ? n * 4 : 240;
  })();

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const wideRect = matchGridWidth ? el.closest(".mms-form-grid")?.getBoundingClientRect() : null;
    const top = r.bottom + 4;
    const footer = el.closest(".mms-panel")?.querySelector(".mms-panel__foot");
    const ceiling = footer ? footer.getBoundingClientRect().top : window.innerHeight;
    setCoords({
      top,
      left: wideRect ? wideRect.left : r.left,
      width: wideRect ? wideRect.width : r.width,
      // Never exceed the design cap, but also never overrun the panel footer
      // (or the viewport bottom if there's no footer in view).
      maxHeight: Math.min(designMaxHeight, Math.max(40, ceiling - top - 8)),
    });
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
          const val = e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, "");
          onChange(val);
          setOpen(Boolean(val.trim()));
        }}
        onFocus={() => updateCoords()}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList &&
        createPortal(
          <ul
            className={cn("overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md", maxHeightClass)}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              zIndex: 100,
            }}
          >
            {suggestions.map((s, idx) => (
              <li key={`${s}-${idx}`}>
                <button
                  type="button"
                  className="relative flex w-full cursor-default select-none items-center rounded-[8px] px-3 py-2 text-left text-[15.5px] outline-none hover:bg-[var(--accent-soft,#e8f2fa)] hover:text-[var(--accent,#14568c)]"
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

export function AddNewEqpt() {
  const [form, setForm] = useState(getEmptyForm);
  const [holdingOpts, setHoldingOpts] = useState<Option[]>([]);
  const [eqptOpts, setEqptOpts] = useState<Option[]>([]);
  const [depotOpts, setDepotOpts] = useState<OrbatUnit[]>([]);
  const [prfOptions, setPrfOptions] = useState<string[]>([]);
  const [censusOptions, setCensusOptions] = useState<CensusItem[]>([]);
  const [toUnitHits, setToUnitHits] = useState<OrbatUnit[]>([]);
  const [toUnitField, setToUnitField] = useState<"name" | "sus" | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [ivFile, setIvFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const ivFileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const upd = <K extends keyof ReturnType<typeof getEmptyForm>>(
    k: K,
    v: ReturnType<typeof getEmptyForm>[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const matchingPrfGroups = useMemo(() => {
    const q = form.prfGroup.trim().toLowerCase();
    if (!q) return prfOptions;
    return prfOptions.filter((g) => g.toLowerCase().includes(q));
  }, [prfOptions, form.prfGroup]);

  const pickPrfGroup = (idx: number) => {
    const chosen = matchingPrfGroups[idx];
    if (!chosen) return;
    setForm((prev) => ({
      ...prev,
      prfGroup: chosen,
      censusNo: "",
      prfCode: "",
      materialNo: "",
    }));
  };

  useEffect(() => {
    let active = true;

    api<{ type_of_hldg: Option[]; type_of_eqpt: Option[] }>(
      "/unit-holding/add-new-eqpt/options",
    )
      .then((res) => {
        if (!active) return;
        setHoldingOpts(res.type_of_hldg ?? []);
        setEqptOpts(res.type_of_eqpt ?? []);
      })
      .catch(() => toast.error("Failed to load holding / eqpt options"));

    api<OrbatUnit[]>("/unit-holding/add-new-eqpt/orbat-units")
      .then((res) => {
        if (!active) return;
        setDepotOpts(res);
      })
      .catch(() => toast.error("Failed to load ORBAT units"));

    api<{ prf_group: string }[]>("/unit-holding/add-new-eqpt/prf-groups")
      .then((rows) => {
        if (!active) return;
        setPrfOptions(rows.map((r) => r.prf_group).filter(Boolean));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
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
    setForm(getEmptyForm());
    setIvFile(null);
    if (ivFileRef.current) ivFileRef.current.value = "";
    setFileKey((k) => k + 1);
    setCensusOptions([]);
    setToUnitHits([]);
    setToUnitField(null);
    setItems([]);
    void api<{ prf_group: string }[]>("/unit-holding/add-new-eqpt/prf-groups")
      .then((rows) => setPrfOptions(rows.map((r) => r.prf_group).filter(Boolean)))
      .catch(() => setPrfOptions([]));
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
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      censusNo,
      prfGroup: row.prf_group || prev.prfGroup,
      prfCode: row.prf_code?.trim() ?? prev.prfCode,
      materialNo: row.material_no?.trim() ?? "",
    }));
  };

  const handleAddItems = async () => {
    if (busy) return;
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
      !form.censusNo ||
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

      // Reset only the per-item fields (PRF Group, Census No, Material No, Qty, ...)
      // so another item can be added under the same header. Header fields (IV No,
      // IV Date, Issuing Depot, To Unit, Type of Holding/Eqpt, Upload IV) and the
      // already-chosen IV file must stay intact — they apply to the whole batch and
      // are re-validated when Submit is finally clicked.
      setForm((prev) => ({
        ...getEmptyForm(),
        ivNo: prev.ivNo,
        ivDate: prev.ivDate,
        issuingDepotSus: prev.issuingDepotSus,
        toUnitName: prev.toUnitName,
        toUnitSus: prev.toUnitSus,
        typeOfHolding: prev.typeOfHolding,
        typeOfEqpt: prev.typeOfEqpt,
        uploadIv: prev.uploadIv,
      }));
      setCensusOptions([]);
      setToUnitHits([]);
      setToUnitField(null);
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

  const removeItem = (id: string | number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (
    id: string | number,
    patch: Partial<Pick<ItemRow, "materialNo" | "eqptRegnNo">>,
  ) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handleSubmit = async () => {
    if (busy) return;
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
    if (!holdingLabel) {
      toast.error("Select a valid Type of Holding");
      return;
    }
    if (items.some((i) => !i.eqptRegnNo.trim())) {
      toast.error("Regn No is required for all list items");
      return;
    }

    setBusy(true);
    try {
      let uploadedIvName = form.uploadIv.trim() || null;
      if (ivFile) {
        const uploadRes = await uploadFileApi(ivFile, { module: "unit-holding" });
        uploadedIvName = uploadRes.relative_path;
      }
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
            upload_iv: uploadedIvName,
            items: items.map((i) => ({
              eqpt_regn_no: i.eqptRegnNo.trim(),
              regn_seq_no: i.regnSeqNo,
              census_seq_no: i.censusSeqNo,
              census_no: i.censusNo,
              material_no: i.materialNo.trim(),
              prf_code: i.prfCode,
              prf_group: i.prfGroup,
            })),
          }),
        },
      );
      toast.success("Item added successfully");
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
      fill={false}
      footer={
        <>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleAddItems()}
            disabled={busy || JSON.stringify(form) === JSON.stringify(getEmptyForm())}
          >
            Add Items in List
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={handleClear} disabled={busy}>
            Clear
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <FormGrid cols={3} className="shrink-0">
          <FormSection title="1. Issue & Depot Particulars" />
          <FormRow label="IV No" required>
            <Input
              placeholder="Enter IV No..."
              value={form.ivNo}
              onChange={(e) => upd("ivNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
            />
          </FormRow>
          <FormRow label="IV Date" required>
            <DateInput value={form.ivDate} onChange={(v) => upd("ivDate", v)} />
          </FormRow>
          <FormRow label="Issuing Depot" required>
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

          <FormSection title="2. Census & Equipment Details" />
          <FormRow label="PRF Group" required className="sm:col-span-3">
            <SuggestInput
              placeholder="Search or select PRF Group..."
              value={form.prfGroup}
              suggestions={matchingPrfGroups}
              maxHeightClass="max-h-72"
              matchGridWidth
              onChange={(v) => {
                upd("prfGroup", v);
                upd("censusNo", "");
                upd("prfCode", "");
                upd("materialNo", "");
              }}
              onPick={pickPrfGroup}
            />
          </FormRow>
          <FormRow label="Census No" required>
            <Select
              value={form.censusNo || undefined}
              onValueChange={pickCensus}
              disabled={!form.prfGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select Census / Item--" />
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
          <FormRow label="Material No">
            <Input
              placeholder="Material No..."
              value={form.materialNo}
              disabled
              readOnly
            />
          </FormRow>

          <FormRow label="Issued Qty" required>
            <Input
              placeholder="Enter Qty..."
              value={form.issuedQty}
              onChange={(e) => upd("issuedQty", e.target.value.replace(/\D/g, ""))}
            />
          </FormRow>
          <FormRow label="Eqpt Make">
            <Input
              placeholder="Enter Make..."
              value={form.eqptMake}
              onChange={(e) => upd("eqptMake", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
            />
          </FormRow>
          <FormRow label="Eqpt Model">
            <Input
              placeholder="Enter Model..."
              value={form.eqptModel}
              onChange={(e) => upd("eqptModel", e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
            />
          </FormRow>
          <FormRow label="Unit Price">
            <Input
              placeholder="Enter Price..."
              value={form.unitPrice}
              onChange={(e) => upd("unitPrice", e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </FormRow>

          <FormRow label="Depreciation %">
            <Input
              placeholder="In %..."
              value={form.depreciationRate}
              onChange={(e) => upd("depreciationRate", e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </FormRow>
          <FormRow label="Life (Yr)">
            <Input
              placeholder="Enter Life (Yr)..."
              value={form.lifeOfAsset}
              onChange={(e) => upd("lifeOfAsset", e.target.value.replace(/\D/g, ""))}
            />
          </FormRow>
          <FormRow label="Upload IV" className="sm:col-span-2">
            <Input
              key={`iv-file-${fileKey}`}
              ref={ivFileRef}
              type="file"
              className="h-auto py-0.5"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                setIvFile(selected);
                upd("uploadIv", selected?.name ?? "");
              }}
            />
          </FormRow>
        </FormGrid>

        {hasItems && (
          <ItemsList
            items={items}
            busy={busy}
            onRemove={removeItem}
            onChange={updateItem}
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
];

function ItemsList({
  items,
  busy,
  onRemove,
  onChange,
  onSubmit,
}: {
  items: ItemRow[];
  busy: boolean;
  onRemove: (id: string | number) => void;
  onChange: (
    id: string | number,
    patch: Partial<Pick<ItemRow, "eqptRegnNo">>,
  ) => void;
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
                <td className="min-w-[170px] px-1 py-0.5 align-middle">
                  <Input
                    value={row.eqptRegnNo}
                    disabled={busy}
                    className="h-7 min-w-[150px] font-mono text-[13px]"
                    aria-label={`Regn No row ${idx + 1}`}
                    onChange={(e) =>
                      onChange(row.id, { eqptRegnNo: e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, "") })
                    }
                  />
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
        <Button type="button" size="sm" disabled={items.length === 0 || busy} onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
