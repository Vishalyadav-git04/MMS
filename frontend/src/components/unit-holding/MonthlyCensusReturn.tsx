import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Download, Printer, Search, Loader2 } from "lucide-react";

interface OrbatUnit {
  id: number | string;
  unit_name: string;
  sus_no: string;
  form_code: string | null;
  status: string;
}

interface ReportRow {
  sl_no: number;
  sus_no?: string | null;
  unit_name?: string | null;
  prf_group?: string | null;
  census_no?: string | null;
  nomenclature?: string | null;
  material_no?: string | null;
  eqpt_regn_no?: string | null;
  regn_seq_no?: string | null;
  ue_qty: number;
  uh_qty: number;
  variance: number;
  srv_qty: number;
  us_qty: number;
  eqpt_make?: string | null;
  eqpt_model?: string | null;
  service_status_label?: string | null;
  type_of_hldg_label?: string | null;
  iv_no?: string | null;
  iv_date?: string | null;
  remarks?: string | null;
}

interface ReportResponse {
  report_type: string;
  report_title: string;
  sus_no: string;
  unit_name: string;
  month_label: string;
  total_records: number;
  rows: ReportRow[];
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  renderItem,
  maxHeightClass = "max-h-60",
  onChange,
  onPick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  suggestions: string[];
  renderItem?: (s: string, idx: number) => ReactNode;
  maxHeightClass?: string;
  onChange: (v: string) => void;
  onPick: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.bottom + 4;
    setCoords({
      top,
      left: r.left,
      width: r.width,
      maxHeight: 240,
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
    <div className="relative overflow-visible w-full">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        className="font-bold placeholder:font-bold"
        onChange={(e) => {
          const val = e.target.value;
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
            className={cn("overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-[100]", maxHeightClass)}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
          >
            {suggestions.map((s, idx) => (
              <li key={`${s}-${idx}`}>
                <button
                  type="button"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2.5 py-1.5 text-left text-sm font-semibold outline-none hover:bg-accent hover:text-accent-foreground"
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

export function MonthlyCensusReturn() {
  const currentMonth = new Date().toLocaleString("en-US", { month: "long" }).toUpperCase();
  const [susNo, setSusNo] = useState("");
  const [unitName, setUnitName] = useState("");
  const [orbatUnits, setOrbatUnits] = useState<OrbatUnit[]>([]);
  const [activeReport, setActiveReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api<OrbatUnit[]>("/unit-holding/monthly-census-return/orbat-units")
      .then((res) => {
        if (!active) return;
        setOrbatUnits(res ?? []);
      })
      .catch(() => toast.error("Failed to load ORBAT units list"));
    return () => {
      active = false;
    };
  }, []);

  const susSuggestions = orbatUnits
    .filter((u) => u.sus_no.toUpperCase().includes(susNo.trim().toUpperCase()))
    .map((u) => `${u.sus_no} — ${u.unit_name}`);

  const nameSuggestions = orbatUnits
    .filter((u) => u.unit_name.toUpperCase().includes(unitName.trim().toUpperCase()))
    .map((u) => `${u.unit_name} (${u.sus_no})`);

  const pickSus = (idx: number) => {
    const filtered = orbatUnits.filter((u) =>
      u.sus_no.toUpperCase().includes(susNo.trim().toUpperCase())
    );
    const chosen = filtered[idx];
    if (chosen) {
      setSusNo(chosen.sus_no);
      setUnitName(chosen.unit_name);
    }
  };

  const pickName = (idx: number) => {
    const filtered = orbatUnits.filter((u) =>
      u.unit_name.toUpperCase().includes(unitName.trim().toUpperCase())
    );
    const chosen = filtered[idx];
    if (chosen) {
      setSusNo(chosen.sus_no);
      setUnitName(chosen.unit_name);
    }
  };

  const handleFetchReport = async (type: string) => {
    const cleanSus = susNo.trim();
    if (!cleanSus) {
      toast.error("Please enter or select a valid SUS No / Unit Name");
      return;
    }
    setLoading(true);
    try {
      const res = await api<ReportResponse>(
        `/unit-holding/monthly-census-return/report?sus_no=${encodeURIComponent(cleanSus)}&report_type=${type}&month=${encodeURIComponent(currentMonth)}`
      );
      setActiveReport(res);
      toast.success(`${res.report_title} loaded (${res.total_records} records)`);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to fetch census return report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPanel
      title={`MONTHLY CENSUS RETURN : ${currentMonth}`}
      note="View Unit Holding vs Entitlement, Monthly Census Return, and EP Holding details by unit."
    >
      <div className="flex flex-col gap-5 p-1">
        {/* Form Inputs Grid */}
        <FormGrid cols={2} className="items-center">
          <FormRow label="* SUS No" className="sm:grid-cols-[110px_minmax(0,1fr)]">
            <SuggestInput
              value={susNo}
              placeholder="Search..."
              suggestions={susSuggestions}
              onChange={(v) => {
                setSusNo(v);
                const exact = orbatUnits.find((u) => u.sus_no.toUpperCase() === v.trim().toUpperCase());
                if (exact) setUnitName(exact.unit_name);
              }}
              onPick={pickSus}
            />
          </FormRow>
          <FormRow label="* Unit Name" className="sm:grid-cols-[110px_minmax(0,1fr)]">
            <SuggestInput
              value={unitName}
              placeholder="Search..."
              suggestions={nameSuggestions}
              onChange={(v) => {
                setUnitName(v);
                const exact = orbatUnits.find((u) => u.unit_name.toUpperCase() === v.trim().toUpperCase());
                if (exact) setSusNo(exact.sus_no);
              }}
              onPick={pickName}
            />
          </FormRow>
        </FormGrid>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-border/60">
          <Button
            type="button"
            onClick={() => handleFetchReport("ue_uh_summary")}
            disabled={loading}
          >
            UE UH Summary
          </Button>
          <Button
            type="button"
            onClick={() => handleFetchReport("mcr")}
            disabled={loading}
          >
            Get MCR
          </Button>
          <Button
            type="button"
            onClick={() => handleFetchReport("mcr_regn_no")}
            disabled={loading}
          >
            Get MCR with Regn No
          </Button>
          <Button
            type="button"
            onClick={() => handleFetchReport("ue_summary")}
            disabled={loading}
          >
            UE Summary
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleFetchReport("ep_holding")}
            disabled={loading}
          >
            EP Holding
          </Button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground font-semibold">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Fetching report records...</span>
          </div>
        )}

        {/* Report Output Display */}
        {!loading && activeReport && (
          <div className="flex flex-col gap-3 rise-in">
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60">
              <div>
                <h3 className="text-base font-bold text-primary uppercase tracking-wide">
                  {activeReport.report_title}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  Unit: <span className="text-foreground">{activeReport.unit_name}</span> ({activeReport.sus_no}) · Total Records: {activeReport.total_records}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold">
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Report downloaded")} className="font-bold">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border/80 overflow-x-auto shadow-sm">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="font-bold text-xs">SL NO</TableHead>
                    <TableHead className="font-bold text-xs">SUS NO</TableHead>
                    <TableHead className="font-bold text-xs">UNIT NAME</TableHead>
                    <TableHead className="font-bold text-xs">PRF GROUP</TableHead>
                    <TableHead className="font-bold text-xs">CENSUS NO</TableHead>
                    <TableHead className="font-bold text-xs">NOMENCLATURE</TableHead>
                    {activeReport.report_type === "mcr_regn_no" && (
                      <TableHead className="font-bold text-xs">REGN NO</TableHead>
                    )}
                    <TableHead className="font-bold text-xs text-center">UE QTY</TableHead>
                    <TableHead className="font-bold text-xs text-center">UH QTY</TableHead>
                    <TableHead className="font-bold text-xs text-center">VARIANCE</TableHead>
                    <TableHead className="font-bold text-xs text-center">SRV QTY</TableHead>
                    <TableHead className="font-bold text-xs text-center">US QTY</TableHead>
                    <TableHead className="font-bold text-xs">HOLDING TYPE</TableHead>
                    <TableHead className="font-bold text-xs">REMARKS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReport.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8 text-muted-foreground font-semibold">
                        No records found for the selected SUS No ({activeReport.sus_no}).
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeReport.rows.map((r, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-xs">{r.sl_no}</TableCell>
                        <TableCell className="font-semibold text-xs">{r.sus_no || "—"}</TableCell>
                        <TableCell className="font-semibold text-xs">{r.unit_name || "—"}</TableCell>
                        <TableCell className="font-semibold text-xs">{r.prf_group || "—"}</TableCell>
                        <TableCell className="font-bold text-xs text-primary">{r.census_no || "—"}</TableCell>
                        <TableCell className="font-semibold text-xs max-w-[200px] truncate">{r.nomenclature || "—"}</TableCell>
                        {activeReport.report_type === "mcr_regn_no" && (
                          <TableCell className="font-bold text-xs text-blue-600">{r.eqpt_regn_no || "—"}</TableCell>
                        )}
                        <TableCell className="font-bold text-xs text-center">{r.ue_qty}</TableCell>
                        <TableCell className="font-bold text-xs text-center text-emerald-700">{r.uh_qty}</TableCell>
                        <TableCell className={cn("font-bold text-xs text-center", r.variance < 0 ? "text-red-600" : "text-foreground")}>
                          {r.variance}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-center text-green-600">{r.srv_qty}</TableCell>
                        <TableCell className="font-bold text-xs text-center text-red-500">{r.us_qty}</TableCell>
                        <TableCell className="font-semibold text-xs">{r.type_of_hldg_label || "UNIT HOLDING"}</TableCell>
                        <TableCell className="font-semibold text-xs text-muted-foreground">{r.remarks || "OK"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !activeReport && (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-dashed border-border/80 bg-muted/20 text-center">
            <Search className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <h4 className="text-sm font-bold text-foreground">Monthly Census Return Search</h4>
            <p className="text-xs text-muted-foreground max-w-md mt-1 font-semibold">
              Enter or select a SUS No / Unit Name above, then click any of the 5 report buttons to view Monthly Census Return details.
            </p>
          </div>
        )}
      </div>
    </FormPanel>
  );
}
