import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface CensusSuggestion {
  census_no: string;
  nomenclature?: string | null;
  cat_part_no?: string | null;
  prf_group?: string | null;
  item_code?: string | null;
  cos_section?: string | null;
}

interface LinkDetails {
  id?: number | string | null;
  census_no?: string | null;
  nomenclature?: string | null;
  item_code?: string | null;
  cat_part_no?: string | null;
  prf_group?: string | null;
  cos_section?: string | null;
}

interface ItemOption {
  value: string;
  label: string;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export function LinkEqptUe() {
  const [censusNo, setCensusNo] = useState("");
  const [nomenclature, setNomenclature] = useState("");
  const [censusSuggestions, setCensusSuggestions] = useState<CensusSuggestion[]>([]);
  const [nomSuggestions, setNomSuggestions] = useState<CensusSuggestion[]>([]);
  const suppressCensusSuggestRef = useRef(false);
  const suppressNomSuggestRef = useRef(false);
  const [fetched, setFetched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [itemCode, setItemCode] = useState("");
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [details, setDetails] = useState({
    catPartNo: "",
    prfGroup: "",
    cosSection: "",
  });

  // Census No typeahead — from MMS_MLCCS_EQUIPMENT_MASTER
  useEffect(() => {
    if (fetched) return;
    if (suppressCensusSuggestRef.current) {
      suppressCensusSuggestRef.current = false;
      setCensusSuggestions([]);
      return;
    }
    const q = censusNo.trim();
    if (q.length < 1) {
      setCensusSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<CensusSuggestion[]>(
        `/admin/link-census-no-with-item-code/suggest-census?q=${encodeURIComponent(q)}`,
      )
        .then((rows) => {
          const exact = rows.find((r) => r.census_no.toUpperCase() === q.toUpperCase());
          if (exact) {
            suppressNomSuggestRef.current = true;
            setNomenclature(exact.nomenclature ?? "");
            setCensusSuggestions([]);
            setNomSuggestions([]);
            return;
          }
          setCensusSuggestions(rows.slice(0, 50));
        })
        .catch(() => setCensusSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [censusNo, fetched]);

  // Nomenclature typeahead — from MMS_MLCCS_EQUIPMENT_MASTER
  useEffect(() => {
    if (fetched) return;
    if (suppressNomSuggestRef.current) {
      suppressNomSuggestRef.current = false;
      setNomSuggestions([]);
      return;
    }
    const q = nomenclature.trim();
    if (q.length < 1) {
      setNomSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void api<CensusSuggestion[]>(
        `/admin/link-census-no-with-item-code/suggest-census?q=${encodeURIComponent(q)}`,
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
            setCensusNo(exact[0]!.census_no);
            setNomSuggestions([]);
            setCensusSuggestions([]);
            return;
          }
          setNomSuggestions(matched.slice(0, 50));
        })
        .catch(() => setNomSuggestions([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [nomenclature, fetched]);

  // Load Linked Item Code options for the fetched PRF from MMS_PRF_GRP_MSTR
  useEffect(() => {
    if (!fetched) {
      setItemOptions([]);
      return;
    }
    const grp = details.prfGroup.trim();
    if (!grp) {
      setItemOptions([]);
      return;
    }
    const cos = details.cosSection.trim();
    const params = new URLSearchParams({ prf_group: grp });
    if (cos) params.set("cos_section", cos);

    let cancelled = false;
    void api<ItemOption[]>(
      `/admin/link-census-no-with-item-code/item-codes?${params.toString()}`,
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
  }, [fetched, details.prfGroup, details.cosSection]);

  const pickCensusSuggestion = (row: CensusSuggestion) => {
    suppressNomSuggestRef.current = true;
    setCensusNo(row.census_no);
    setNomenclature(row.nomenclature ?? "");
    setCensusSuggestions([]);
    setNomSuggestions([]);
  };

  const pickNomSuggestion = (row: CensusSuggestion) => {
    suppressCensusSuggestRef.current = true;
    setCensusNo(row.census_no);
    setNomenclature(row.nomenclature ?? "");
    setCensusSuggestions([]);
    setNomSuggestions([]);
  };

  const resetLookup = () => {
    setCensusNo("");
    setNomenclature("");
    setCensusSuggestions([]);
    setNomSuggestions([]);
    setFetched(false);
    setItemCode("");
    setItemOptions([]);
    setDetails({ catPartNo: "", prfGroup: "", cosSection: "" });
  };

  const handleFetch = async () => {
    if (!censusNo.trim()) {
      toast.error("Census No is required");
      return;
    }
    setBusy(true);
    try {
      const rec = await api<LinkDetails>("/admin/capture-mlccs-details/lookup", {
        method: "POST",
        body: JSON.stringify({
          census_no: censusNo.trim(),
          nomenclature: nomenclature.trim() || null,
        }),
      });
      setCensusNo(rec.census_no ?? censusNo.trim());
      setNomenclature(rec.nomenclature ?? "");
      setDetails({
        catPartNo: rec.cat_part_no ?? "",
        prfGroup: rec.prf_group ?? "",
        cosSection: rec.cos_section ?? "",
      });
      setItemCode(rec.item_code ?? "");
      setFetched(true);
      setCensusSuggestions([]);
      setNomSuggestions([]);
      toast.success("Details fetched");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!itemCode.trim()) {
      toast.error("Linked Item Code is required");
      return;
    }
    setBusy(true);
    try {
      await api<LinkDetails>("/admin/link-census-no-with-item-code/link", {
        method: "POST",
        body: JSON.stringify({
          census_no: censusNo.trim(),
          item_code: itemCode.trim(),
        }),
      });
      toast.success("Item code linked");
      resetLookup();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // Ensure current linked code appears in the list even if not under PRF
  const selectOptions =
    itemCode && !itemOptions.some((o) => o.value === itemCode)
      ? [{ value: itemCode, label: itemCode }, ...itemOptions]
      : itemOptions;

  return (
    <FormPanel
      title="Linking of Census No with Item Code"
      footer={
        !fetched ? (
          <>
            <Button
              onClick={() => void handleFetch()}
              disabled={busy}
              className="bg-primary hover:bg-primary/90"
            >
              {busy ? "Fetching…" : "Fetch Details"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={resetLookup}>
              Clear
            </Button>
            <Button variant="destructive" disabled={busy} onClick={resetLookup}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void handleUpdate()} disabled={busy}>
              {busy ? "Updating…" : "Update"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setItemCode("")}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                setFetched(false);
                setItemCode("");
                setItemOptions([]);
                setDetails({ catPartNo: "", prfGroup: "", cosSection: "" });
              }}
            >
              Cancel
            </Button>
          </>
        )
      }
    >
      {!fetched ? (
        <div className="mx-auto max-w-3xl space-y-4 overflow-visible pt-2">
          <FormRow label="Census No" required>
            <SuggestInput
              value={censusNo}
              placeholder="Search..."
              suggestions={censusSuggestions.map((r) => r.census_no)}
              renderItem={(s, idx) => {
                const row = censusSuggestions[idx];
                return (
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{s}</span>
                    {row?.nomenclature && (
                      <span className="text-xs text-muted-foreground truncate">
                        {row.nomenclature}
                      </span>
                    )}
                  </span>
                );
              }}
              onChange={(v) => {
                setNomSuggestions([]);
                setCensusNo(v);
                setNomenclature("");
              }}
              onPick={(idx) => {
                const row = censusSuggestions[idx];
                if (row) pickCensusSuggestion(row);
              }}
            />
          </FormRow>
          <FormRow label="Nomenclature" required>
            <SuggestInput
              value={nomenclature}
              placeholder="Search..."
              disabled={busy}
              suggestions={nomSuggestions.map((r) => r.nomenclature ?? r.census_no)}
              renderItem={(s, idx) => {
                const row = nomSuggestions[idx];
                return (
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium truncate">{s}</span>
                    {row?.census_no && (
                      <span className="text-xs text-muted-foreground">{row.census_no}</span>
                    )}
                  </span>
                );
              }}
              onChange={(v) => {
                setCensusSuggestions([]);
                setNomenclature(v);
                setCensusNo("");
              }}
              onPick={(idx) => {
                const row = nomSuggestions[idx];
                if (row) pickNomSuggestion(row);
              }}
            />
          </FormRow>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-3 pt-2">
          <FormGrid>
            <FormRow label="Census No" required>
              <Input value={censusNo} disabled />
            </FormRow>
            <FormRow label="Cat/Part No" required>
              <Input value={details.catPartNo} disabled />
            </FormRow>
          </FormGrid>
          <FormRow label="Nomenclature" required>
            <Textarea rows={1} value={nomenclature} disabled />
          </FormRow>
          <FormRow label="PRF Group" required>
            <Input value={details.prfGroup} disabled />
          </FormRow>
          <FormRow label="Linked Item Code" required>
            <Select
              value={itemCode || undefined}
              onValueChange={setItemCode}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !details.prfGroup
                      ? "No PRF Group on record"
                      : selectOptions.length
                        ? "-- Select Item Code --"
                        : "No item codes for this PRF"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </div>
      )}
    </FormPanel>
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
