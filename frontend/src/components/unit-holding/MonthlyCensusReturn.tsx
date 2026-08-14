import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

interface SummaryItem {
  ser_no: number;
  nomenclature: string;
  type_of_holding: string;
  entitlement: number;
  holding: number;
  surplus: number;
  defi: number;
  update_date?: string | null;
}

interface SummaryGroup {
  prf_group: string;
  items: SummaryItem[];
}

interface TransactionItem {
  prf_group: string;
  census_no?: string | null;
  nomenclature: string;
  type_of_holding: string;
  activity_during_month: string;
  trn_date?: string | null;
}

interface EpHoldingRow {
  ser_no: number;
  unit_name: string;
  sus_no: string;
  domain_name: string;
  sub_domain_name: string;
  regn_no: string;
  total_qty: number;
}

interface McrRegnNoRow {
  ser_no: number;
  census_no?: string | null;
  nomenclature: string;
  type_of_holding: string;
  holding: number;
  registration_nos: string;
  regn_under_rel: number;
}

interface ReportResponse {
  report_type: string;
  report_title: string;
  sus_no: string;
  unit_name: string;
  month_label: string;
  total_records: number;
  rows: ReportRow[];
  last_updated_date?: string | null;
  last_updated_by?: string | null;
  watermark_text?: string | null;
  summary_groups?: SummaryGroup[];
  transactions?: TransactionItem[];
  ep_holding_rows?: EpHoldingRow[];
  mcr_regn_no_rows?: McrRegnNoRow[];
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

  // Search filters inside UE UH Summary result tables
  const [summarySearch, setSummarySearch] = useState("");
  const [trnSearch, setTrnSearch] = useState("");

  // Search and pagination for EP Holding table
  const [epSearch, setEpSearch] = useState("");
  const [epPage, setEpPage] = useState(1);
  const epPageSize = 10;

  // Search and pagination for Get MCR with Regn No table
  const [mcrRegnSearch, setMcrRegnSearch] = useState("");
  const [mcrRegnPage, setMcrRegnPage] = useState(1);
  const mcrRegnPageSize = 10;
  const [mcrTrnSearch, setMcrTrnSearch] = useState("");

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
    const searchTarget = susNo.trim() || unitName.trim();
    if (!searchTarget) {
      toast.error("Please enter or select a valid SUS No / Unit Name");
      return;
    }
    setLoading(true);
    try {
      const res = await api<ReportResponse>(
        `/unit-holding/monthly-census-return/report?sus_no=${encodeURIComponent(searchTarget)}&report_type=${type}&month=${encodeURIComponent(currentMonth)}`
      );
      setActiveReport(res);
      if (res.sus_no) setSusNo(res.sus_no);
      if (res.unit_name) setUnitName(res.unit_name);
      setEpSearch("");
      setEpPage(1);
      setMcrRegnSearch("");
      setMcrRegnPage(1);
      setMcrTrnSearch("");
      toast.success(`${res.report_title} loaded (${res.total_records} records)`);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to fetch census return report");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMcr = async (type: "normal" | "observation") => {
    const searchTarget = susNo.trim() || unitName.trim();
    if (!searchTarget) {
      toast.error("Please select a valid SUS No / Unit Name first");
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        type === "normal"
          ? "/unit-holding/monthly-census-return/update"
          : "/unit-holding/monthly-census-return/update-with-observation";
      const res = await api<{ message: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ sus_no: searchTarget, month: currentMonth }),
      });
      toast.success(res.message || "MCR Update submitted successfully");
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to update MCR");
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered summary items count for UE UH Summary
  const rawSummaryGroups = activeReport?.summary_groups || [
    { prf_group: "NIL", items: [] },
  ];

  const filteredSummaryGroups = rawSummaryGroups.map((g) => {
    const filteredItems = g.items.filter(
      (item) =>
        item.nomenclature.toUpperCase().includes(summarySearch.trim().toUpperCase()) ||
        item.type_of_holding.toUpperCase().includes(summarySearch.trim().toUpperCase())
    );
    return { ...g, items: filteredItems };
  });

  const totalFilteredSummaryCount = filteredSummaryGroups.reduce(
    (acc, g) => acc + g.items.length,
    0
  );

  const rawTransactions = activeReport?.transactions || [];
  const filteredTransactions = rawTransactions.filter(
    (t) =>
      t.prf_group.toUpperCase().includes(trnSearch.trim().toUpperCase()) ||
      (t.census_no && t.census_no.toUpperCase().includes(trnSearch.trim().toUpperCase())) ||
      t.nomenclature.toUpperCase().includes(trnSearch.trim().toUpperCase()) ||
      t.activity_during_month.toUpperCase().includes(trnSearch.trim().toUpperCase())
  );

  // Multi-column filter across all 7 fields for EP Holding
  const rawEpHoldingRows = activeReport?.ep_holding_rows || [];
  const filteredEpHoldingRows = rawEpHoldingRows.filter((r) => {
    if (!epSearch.trim()) return true;
    const q = epSearch.trim().toUpperCase();
    return (
      r.ser_no.toString().includes(q) ||
      (r.unit_name && r.unit_name.toUpperCase().includes(q)) ||
      (r.sus_no && r.sus_no.toUpperCase().includes(q)) ||
      (r.domain_name && r.domain_name.toUpperCase().includes(q)) ||
      (r.sub_domain_name && r.sub_domain_name.toUpperCase().includes(q)) ||
      (r.regn_no && r.regn_no.toUpperCase().includes(q)) ||
      r.total_qty.toString().includes(q)
    );
  });

  const epTotalPages = Math.ceil(filteredEpHoldingRows.length / epPageSize) || 1;
  const epCurrentPage = Math.min(epPage, epTotalPages);
  const epPageStart = filteredEpHoldingRows.length === 0 ? 0 : (epCurrentPage - 1) * epPageSize + 1;
  const epPageEnd = Math.min(epCurrentPage * epPageSize, filteredEpHoldingRows.length);
  const pagedEpHoldingRows = filteredEpHoldingRows.slice(
    (epCurrentPage - 1) * epPageSize,
    epCurrentPage * epPageSize
  );

  const handleExportEpCsv = () => {
    if (!filteredEpHoldingRows.length) {
      toast.error("No data to export");
      return;
    }
    const headers = ["SER NO", "UNIT NAME", "SUS NO", "DOMAIN NAME", "SUBDOMAIN NAME", "REGN NO", "TOTAL QTY"];
    const csvRows = [
      headers.join(","),
      ...filteredEpHoldingRows.map((r) =>
        [
          r.ser_no,
          `"${(r.unit_name || "").replace(/"/g, '""')}"`,
          `"${(r.sus_no || "").replace(/"/g, '""')}"`,
          `"${(r.domain_name || "").replace(/"/g, '""')}"`,
          `"${(r.sub_domain_name || "").replace(/"/g, '""')}"`,
          `"${(r.regn_no || "").replace(/"/g, '""')}"`,
          r.total_qty,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `EP_Holding_${activeReport?.sus_no || "report"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("EP Holding data exported to CSV");
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handlePrintEpReport = () => {
    if (!activeReport) return;
    const existing = document.getElementById("ep-holding-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "ep-holding-print-frame";
    iframe.setAttribute("title", "Print EP Holding Report");
    iframe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      iframe.remove();
      toast.error("Unable to open print view");
      return;
    }

    const tableRowsHtml =
      filteredEpHoldingRows.length === 0
        ? `<tr><td colspan="7" style="text-align:center; padding: 16px; font-weight: bold; color: #64748b;">Data Not Available...</td></tr>`
        : filteredEpHoldingRows
            .map(
              (r) => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${r.ser_no}</td>
            <td style="font-weight: 600;">${escapeHtml(r.unit_name || "—")}</td>
            <td style="font-weight: 600;">${escapeHtml(r.sus_no || "—")}</td>
            <td style="font-weight: 600;">${escapeHtml(r.domain_name || "—")}</td>
            <td style="font-weight: 600;">${escapeHtml(r.sub_domain_name || "—")}</td>
            <td style="font-weight: bold; color: #1d4ed8;">${escapeHtml(r.regn_no || "—")}</td>
            <td style="text-align: center; font-weight: bold; color: #047857;">${r.total_qty}</td>
          </tr>
        `
            )
            .join("");

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>EP Holding Report - ${escapeHtml(activeReport.unit_name)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
    .header { margin-bottom: 14px; border-bottom: 2px solid #70157B; padding-bottom: 6px; }
    .title { font-size: 16px; font-weight: 800; color: #70157B; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px; }
    .meta { font-size: 12px; color: #475569; font-weight: 600; }
    .meta span { color: #0f172a; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: middle; }
    th { background-color: #70157B !important; color: #ffffff !important; font-weight: 700; text-transform: uppercase; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr:nth-child(even) { background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">EP HOLDING REPORT</h1>
    <div class="meta">Unit: <span>${escapeHtml(activeReport.unit_name)}</span> (${escapeHtml(activeReport.sus_no)}) · Total Records: <span>${filteredEpHoldingRows.length}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 60px; text-align: center;">SER NO</th>
        <th>UNIT NAME</th>
        <th>SUS NO</th>
        <th>DOMAIN NAME</th>
        <th>SUBDOMAIN NAME</th>
        <th>REGN NO</th>
        <th style="width: 80px; text-align: center;">TOTAL QTY</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    const cleanup = () => {
      const el = document.getElementById("ep-holding-print-frame");
      if (el) el.remove();
    };

    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        toast.error("Print failed");
      }
      window.setTimeout(cleanup, 1500);
    }, 250);
  };

  // Calculations for Get MCR with Regn No report
  const filteredMcrRegnRows = (activeReport?.mcr_regn_no_rows || []).filter((r) => {
    if (!mcrRegnSearch.trim()) return true;
    const q = mcrRegnSearch.trim().toUpperCase();
    return (
      r.ser_no.toString().includes(q) ||
      (r.nomenclature && r.nomenclature.toUpperCase().includes(q)) ||
      (r.type_of_holding && r.type_of_holding.toUpperCase().includes(q)) ||
      r.holding.toString().includes(q) ||
      (r.registration_nos && r.registration_nos.toUpperCase().includes(q)) ||
      r.regn_under_rel.toString().includes(q)
    );
  });

  const mcrRegnTotalPages = Math.ceil(filteredMcrRegnRows.length / mcrRegnPageSize) || 1;
  const mcrRegnCurrentPage = Math.min(mcrRegnPage, mcrRegnTotalPages);
  const mcrRegnPageStart = filteredMcrRegnRows.length === 0 ? 0 : (mcrRegnCurrentPage - 1) * mcrRegnPageSize + 1;
  const mcrRegnPageEnd = Math.min(mcrRegnCurrentPage * mcrRegnPageSize, filteredMcrRegnRows.length);
  const pagedMcrRegnRows = filteredMcrRegnRows.slice(
    (mcrRegnCurrentPage - 1) * mcrRegnPageSize,
    mcrRegnCurrentPage * mcrRegnPageSize
  );

  const handleExportMcrRegnCsv = () => {
    if (!filteredMcrRegnRows.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "SER NO",
      "NOMENCLATURE",
      "TYPE OF HOLDING",
      "HOLDING",
      "REGISTRATION NO(S)",
      "REGISTRATION NO(UNDER REL)",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredMcrRegnRows.map((r) =>
        [
          r.ser_no,
          `"${(r.nomenclature || "").replace(/"/g, '""')}"`,
          `"${(r.type_of_holding || "").replace(/"/g, '""')}"`,
          r.holding,
          `"${(r.registration_nos || "").replace(/"/g, '""')}"`,
          r.regn_under_rel,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `MCR_With_Regn_No_${activeReport?.sus_no || "report"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("MCR with Regn No data exported to CSV");
  };

  const handlePrintMcrRegnReport = () => {
    if (!activeReport) return;
    const existing = document.getElementById("mcr-regn-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "mcr-regn-print-frame";
    iframe.setAttribute("title", "Print MCR with Regn No Report");
    iframe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      iframe.remove();
      toast.error("Unable to open print view");
      return;
    }

    const tableRowsHtml =
      filteredMcrRegnRows.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding: 16px; font-weight: bold; color: #64748b;">Data Not Available...</td></tr>`
        : filteredMcrRegnRows
            .map(
              (r) => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${r.ser_no}</td>
            <td style="font-weight: 600;">${escapeHtml(r.nomenclature || "—")}</td>
            <td style="text-align: center; font-weight: 600;">${escapeHtml(r.type_of_holding || "—")}</td>
            <td style="text-align: center; font-weight: bold;">${r.holding}</td>
            <td style="font-weight: bold; color: #70157B; max-width: 250px; word-break: break-all;">${escapeHtml(r.registration_nos || "—")}</td>
            <td style="text-align: center; font-weight: bold;">${r.regn_under_rel}</td>
          </tr>
        `
            )
            .join("");

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MCR with Regn No - ${escapeHtml(activeReport.unit_name)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
    .header { margin-bottom: 14px; border-bottom: 2px solid #70157B; padding-bottom: 6px; }
    .title { font-size: 16px; font-weight: 800; color: #70157B; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px; }
    .meta { font-size: 12px; color: #475569; font-weight: 600; }
    .meta span { color: #0f172a; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: middle; }
    th { background-color: #70157B !important; color: #ffffff !important; font-weight: 700; text-transform: uppercase; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr:nth-child(even) { background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section-title { font-size: 14px; font-weight: 800; color: #1A237E; text-align: center; margin-top: 20px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${escapeHtml(activeReport.report_title)}</h1>
    <div class="meta">Unit: <span>${escapeHtml(activeReport.unit_name)}</span> (${escapeHtml(activeReport.sus_no)}) · Total Records: <span>${filteredMcrRegnRows.length}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">SER NO</th>
        <th>NOMENCLATURE</th>
        <th style="width: 140px; text-align: center;">TYPE OF HOLDING</th>
        <th style="width: 80px; text-align: center;">HOLDING</th>
        <th>REGISTRATION NO(S)</th>
        <th style="width: 160px; text-align: center;">REGISTRATION NO(UNDER REL)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    const cleanup = () => {
      const el = document.getElementById("mcr-regn-print-frame");
      if (el) el.remove();
    };

    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        toast.error("Print failed");
      }
      window.setTimeout(cleanup, 1500);
    }, 250);
  };

  const watermarkText =
    activeReport?.watermark_text ||
    `Generated by mms1 [A247108] on 18-06-2026 11:22:11`;

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
          <div className="flex flex-col gap-4 rise-in">
            {/* Standard Header Actions Bar (for non-EP Holding and non-MCR Regn No report types) */}
            {activeReport.report_type !== "ep_holding" && activeReport.report_type !== "mcr_regn_no" && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="font-bold"
                  >
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Report downloaded")}
                    className="font-bold"
                  >
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                </div>
              </div>
            )}

            {/* EP HOLDING CUSTOM RESULT VIEW */}
            {activeReport.report_type === "ep_holding" ? (
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="flex items-center justify-end px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Search in Result({filteredEpHoldingRows.length}) :
                    </span>
                    <Input
                      placeholder="Search..."
                      value={epSearch}
                      onChange={(e) => {
                        setEpSearch(e.target.value);
                        setEpPage(1);
                      }}
                      className="w-56 h-8 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                {/* EP Holding Table with Standard MMS Table Styling */}
                <div className="rounded-md border border-border overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead className="font-bold text-xs">SER NO</TableHead>
                          <TableHead className="font-bold text-xs">UNIT NAME</TableHead>
                          <TableHead className="font-bold text-xs">SUS NO</TableHead>
                          <TableHead className="font-bold text-xs">DOMAIN NAME</TableHead>
                          <TableHead className="font-bold text-xs">SUBDOMAIN NAME</TableHead>
                          <TableHead className="font-bold text-xs">REGN NO</TableHead>
                          <TableHead className="font-bold text-xs text-center">TOTAL QTY</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEpHoldingRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-semibold">
                              Data Not Available...
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedEpHoldingRows.map((r, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="font-bold text-xs">{r.ser_no}</TableCell>
                              <TableCell className="font-semibold text-xs">{r.unit_name || "—"}</TableCell>
                              <TableCell className="font-semibold text-xs">{r.sus_no || "—"}</TableCell>
                              <TableCell className="font-semibold text-xs">{r.domain_name || "—"}</TableCell>
                              <TableCell className="font-semibold text-xs">{r.sub_domain_name || "—"}</TableCell>
                              <TableCell className="font-bold text-xs text-primary max-w-[280px] break-words">{r.regn_no || "—"}</TableCell>
                              <TableCell className="font-bold text-xs text-center text-emerald-700">{r.total_qty}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Standard MMS Pagination Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <div>
                      Showing {epPageStart} to {epPageEnd} of {filteredEpHoldingRows.length} record(s).
                    </div>
                    {epTotalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs font-bold"
                          disabled={epCurrentPage <= 1}
                          onClick={() => setEpPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <span className="px-2 text-xs font-bold text-foreground">
                          Page {epCurrentPage} of {epTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 px-2 text-xs font-bold"
                          disabled={epCurrentPage >= epTotalPages}
                          onClick={() => setEpPage((p) => Math.min(epTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Print & Export Section below the result table */}
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60 mt-1">
                  <div>
                    <h3 className="text-base font-bold text-primary uppercase tracking-wide">
                      {activeReport.report_title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Unit: <span className="text-foreground">{activeReport.unit_name}</span> ({activeReport.sus_no}) · Total Records: {filteredEpHoldingRows.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintEpReport}
                      className="font-bold"
                    >
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportEpCsv}
                      className="font-bold"
                    >
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </div>
            ) : activeReport.report_type === "mcr_regn_no" ? (
              <div className="flex flex-col gap-4">
                {/* Search Bar for Table 1 */}
                <div className="flex items-center justify-end px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Search in Result({filteredMcrRegnRows.length}) :
                    </span>
                    <Input
                      placeholder="Search..."
                      value={mcrRegnSearch}
                      onChange={(e) => {
                        setMcrRegnSearch(e.target.value);
                        setMcrRegnPage(1);
                      }}
                      className="w-56 h-8 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                {/* Table 1 with Standard MMS Table Styling */}
                <div className="rounded-md border border-slate-300 overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#70157B] text-white font-bold text-xs uppercase">
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs border-r border-[#8E24AA]/40 min-w-[60px]">Ser No</th>
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs border-r border-[#8E24AA]/40 min-w-[200px]">Nomenclature</th>
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center border-r border-[#8E24AA]/40 min-w-[140px]">Type of Holding</th>
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center border-r border-[#8E24AA]/40 min-w-[90px]">Holding</th>
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs border-r border-[#8E24AA]/40 min-w-[260px]">Registration No(s)</th>
                          <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center min-w-[160px]">Registration No(Under Rel)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMcrRegnRows.length === 0 ? (
                          <tr className="bg-white border-b border-slate-200">
                            <td colSpan={6} className="py-8 text-center font-bold text-slate-600 text-xs sm:text-sm tracking-wide">
                              Data Not Available...
                            </td>
                          </tr>
                        ) : (
                          pagedMcrRegnRows.map((r, idx) => (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200">{r.ser_no}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">{r.nomenclature || "—"}</td>
                              <td className="px-3 py-2 font-semibold text-center text-slate-800 border-r border-slate-200">{r.type_of_holding || "—"}</td>
                              <td className="px-3 py-2 font-bold text-center text-slate-800 border-r border-slate-200">{r.holding}</td>
                              <td className="px-3 py-2 font-bold text-[#70157B] border-r border-slate-200 max-w-[280px] break-words">{r.registration_nos || "—"}</td>
                              <td className="px-3 py-2 font-bold text-center text-slate-800">{r.regn_under_rel}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Standard MMS Pagination Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <div>
                      Showing {mcrRegnPageStart} to {mcrRegnPageEnd} of {filteredMcrRegnRows.length} record(s).
                    </div>
                    {mcrRegnTotalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs font-bold"
                          disabled={mcrRegnCurrentPage <= 1}
                          onClick={() => setMcrRegnPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <span className="px-2 text-xs font-bold text-foreground">
                          Page {mcrRegnCurrentPage} of {mcrRegnTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 px-2 text-xs font-bold"
                          disabled={mcrRegnCurrentPage >= mcrRegnTotalPages}
                          onClick={() => setMcrRegnPage((p) => Math.min(mcrRegnTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Print & Export Bar (EP Holding Style) */}
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60 mt-1">
                  <div>
                    <h3 className="text-base font-bold text-primary uppercase tracking-wide">
                      {activeReport.report_title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Unit: <span className="text-foreground">{activeReport.unit_name}</span> ({activeReport.sus_no}) · Total Records: {filteredMcrRegnRows.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintMcrRegnReport}
                      className="font-bold"
                    >
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMcrRegnCsv}
                      className="font-bold"
                    >
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>

                {/* Section 2: Transaction since last Update */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <h3 className="text-center w-full sm:w-auto font-extrabold text-[#1A237E] text-lg sm:text-xl underline tracking-wide">
                      Transaction since last Update
                    </h3>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-bold text-slate-700">
                        Search in Result(0) :
                      </span>
                      <Input
                        placeholder="Search..."
                        value={mcrTrnSearch}
                        onChange={(e) => setMcrTrnSearch(e.target.value)}
                        className="w-48 h-7 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>

                  {/* Table 2: Transactions Table */}
                  <div className="rounded-md border border-slate-300 overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#70157B] text-white font-bold text-xs uppercase">
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-left border-r border-[#8E24AA]/40 min-w-[120px]">PRF Group</th>
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-left border-r border-[#8E24AA]/40 min-w-[120px]">Census No</th>
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-left border-r border-[#8E24AA]/40 min-w-[200px]">Nomenclature</th>
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center border-r border-[#8E24AA]/40 min-w-[140px]">Type of Holdings</th>
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center border-r border-[#8E24AA]/40 min-w-[180px]">Activity During Month</th>
                            <th className="px-3 py-2 text-[#FFFFFF] font-bold text-xs text-center min-w-[110px]">Trn Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white border-b border-slate-200">
                            <td
                              colSpan={6}
                              className="py-3 text-center font-bold text-slate-600 text-xs sm:text-sm tracking-wide"
                            >
                              No transaction made
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bottom Update Action & Certification Statements */}
                <div className="flex flex-col items-center justify-center gap-4 py-4 mt-2">
                  <div className="flex flex-col items-center">
                    <Button
                      type="button"
                      variant="default"
                      className="font-bold px-8 py-2 text-sm shadow-md transition-colors"
                      onClick={() => handleUpdateMcr("normal")}
                      disabled={loading}
                    >
                      Update
                    </Button>
                    <p className="text-primary font-bold text-xs sm:text-sm mt-1 text-center">
                      Certified that MCR for the month of {activeReport.month_label || currentMonth} is correct.
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <Button
                      type="button"
                      className="bg-[#D32F2F] hover:bg-[#C62828] text-white font-bold px-8 py-2 text-sm shadow-md transition-colors"
                      onClick={() => handleUpdateMcr("observation")}
                      disabled={loading}
                    >
                      Update with Observation
                    </Button>
                    <p className="text-[#D32F2F] font-bold text-xs sm:text-sm mt-1 text-center">
                      Certified that I have checked MCR for the month of {activeReport.month_label || currentMonth}. Detls of obsn/changes reqd are uploaded.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeReport.report_type === "ue_uh_summary" ? (
              <div className="flex flex-col gap-5">
                {/* Top Info Bar + Search inside Result (1) */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="text-[#6A1B9A] font-bold text-xs sm:text-sm">
                    Last Updated : {activeReport.last_updated_date || "01-11-2023"} by {activeReport.last_updated_by || "ddo1_255armdwksp"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Search in Result({totalFilteredSummaryCount}) :
                    </span>
                    <Input
                      placeholder="Search..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="w-48 h-7 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                {/* Table 1: Entitlement & Holding Summary Table with Watermark */}
                <div className="relative rounded-md border border-slate-300 overflow-hidden bg-white shadow-sm">
                  {/* Faint Background Watermark Overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] select-none overflow-hidden flex flex-wrap gap-x-12 gap-y-10 p-4 text-[11px] font-semibold text-slate-900 rotate-[-12deg] scale-110"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 48 }).map((_, i) => (
                      <span key={i} className="whitespace-nowrap">
                        {watermarkText}
                      </span>
                    ))}
                  </div>

                  <div className="relative z-10 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#70157B] text-white font-bold text-xs uppercase">
                          <th className="px-3 py-2 text-left border-r border-[#8E24AA]/40 min-w-[60px]">Ser No</th>
                          <th className="px-3 py-2 text-left border-r border-[#8E24AA]/40 min-w-[200px]">Nomenclature</th>
                          <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[140px]">Type of Holding</th>
                          <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[100px]">Entitlement</th>
                          <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[90px]">Holding</th>
                          <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[80px]">Surplus</th>
                          <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[80px]">Defi</th>
                          <th className="px-3 py-2 text-center min-w-[110px]">Update Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSummaryGroups.map((group, gIdx) => (
                          <React.Fragment key={gIdx}>
                            {/* PRF Group Header Row */}
                            <tr className="bg-[#E8EAF6]/90 border-y border-[#C5CAE9]">
                              <td
                                colSpan={8}
                                className="px-3 py-1 font-bold text-[#1A237E] text-xs uppercase tracking-wider"
                              >
                                PRF Group : {group.prf_group}
                              </td>
                            </tr>
                            {group.items.length === 0 ? (
                              <tr className="bg-white/90 border-b border-slate-200">
                                <td
                                  colSpan={8}
                                  className="py-3 text-center font-bold text-[#1A237E] text-xs sm:text-sm tracking-wide"
                                >
                                  Data Not Available...
                                </td>
                              </tr>
                            ) : (
                              group.items.map((item, itemIdx) => (
                                <tr
                                  key={itemIdx}
                                  className="border-b border-slate-200 hover:bg-blue-50/40 transition-colors"
                                >
                                  <td className="px-3 py-2 font-bold text-slate-700 border-r border-slate-200">{item.ser_no}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">{item.nomenclature}</td>
                                  <td className="px-3 py-2 font-semibold text-center text-slate-800 border-r border-slate-200">{item.type_of_holding}</td>
                                  <td className="px-3 py-2 font-bold text-center text-slate-800 border-r border-slate-200">{item.entitlement}</td>
                                  <td className="px-3 py-2 font-bold text-center text-slate-800 border-r border-slate-200">{item.holding}</td>
                                  <td className="px-3 py-2 font-bold text-center text-emerald-700 border-r border-slate-200">{item.surplus}</td>
                                  <td className="px-3 py-2 font-bold text-center text-red-600 border-r border-slate-200">{item.defi}</td>
                                  <td className="px-3 py-2 font-semibold text-center text-slate-700">{item.update_date || "—"}</td>
                                </tr>
                              ))
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Transaction since last Update */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <h3 className="text-center w-full sm:w-auto font-extrabold text-[#1A237E] text-lg sm:text-xl underline tracking-wide">
                      Transaction since last Update
                    </h3>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-bold text-slate-700">
                        Search in Result({filteredTransactions.length}) :
                      </span>
                      <Input
                        placeholder="Search..."
                        value={trnSearch}
                        onChange={(e) => setTrnSearch(e.target.value)}
                        className="w-48 h-7 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>

                  {/* Table 2: Transactions Table */}
                  <div className="relative rounded-md border border-slate-300 overflow-hidden bg-white shadow-sm">
                    {/* Watermark overlay */}
                    <div
                      className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] select-none overflow-hidden flex flex-wrap gap-x-12 gap-y-10 p-4 text-[11px] font-semibold text-slate-900 rotate-[-12deg] scale-110"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 32 }).map((_, i) => (
                        <span key={i} className="whitespace-nowrap">
                          {watermarkText}
                        </span>
                      ))}
                    </div>

                    <div className="relative z-10 overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#70157B] text-white font-bold text-xs uppercase">
                            <th className="px-3 py-2 text-left border-r border-[#8E24AA]/40 min-w-[120px]">PRF Group</th>
                            <th className="px-3 py-2 text-left border-r border-[#8E24AA]/40 min-w-[120px]">Census No</th>
                            <th className="px-3 py-2 text-left border-r border-[#8E24AA]/40 min-w-[200px]">Nomenclature</th>
                            <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[140px]">Type of Holdings</th>
                            <th className="px-3 py-2 text-center border-r border-[#8E24AA]/40 min-w-[180px]">Activity During Month</th>
                            <th className="px-3 py-2 text-center min-w-[110px]">Trn Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.length === 0 ? (
                            <tr className="bg-white/90 border-b border-slate-200">
                              <td
                                colSpan={6}
                                className="py-3 text-center font-bold text-slate-600 text-xs sm:text-sm tracking-wide"
                              >
                                No transaction made
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((tx, txIdx) => (
                              <tr key={txIdx} className="border-b border-slate-200 hover:bg-blue-50/40 transition-colors">
                                <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">{tx.prf_group}</td>
                                <td className="px-3 py-2 font-bold text-primary border-r border-slate-200">{tx.census_no || "—"}</td>
                                <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">{tx.nomenclature}</td>
                                <td className="px-3 py-2 font-semibold text-center text-slate-800 border-r border-slate-200">{tx.type_of_holding}</td>
                                <td className="px-3 py-2 font-semibold text-center text-slate-800 border-r border-slate-200">{tx.activity_during_month}</td>
                                <td className="px-3 py-2 font-semibold text-center text-slate-700">{tx.trn_date || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bottom Update Action & Certification Statements */}
                <div className="flex flex-col items-center justify-center gap-4 py-4 mt-2">
                  <div className="flex flex-col items-center">
                    <Button
                      type="button"
                      className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold px-8 py-2 text-sm shadow-md transition-colors"
                      onClick={() => handleUpdateMcr("normal")}
                      disabled={loading}
                    >
                      Update
                    </Button>
                    <p className="text-[#2E7D32] font-bold text-xs sm:text-sm mt-1 text-center">
                      Certified that MCR for the month of {activeReport.month_label || currentMonth} is correct.
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <Button
                      type="button"
                      className="bg-[#D32F2F] hover:bg-[#C62828] text-white font-bold px-8 py-2 text-sm shadow-md transition-colors"
                      onClick={() => handleUpdateMcr("observation")}
                      disabled={loading}
                    >
                      Update with Observation
                    </Button>
                    <p className="text-[#D32F2F] font-bold text-xs sm:text-sm mt-1 text-center">
                      Certified that I have checked MCR for the month of {activeReport.month_label || currentMonth}. Detls of obsn/changes reqd are uploaded.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD REPORT TABLE FOR OTHER REPORT TYPES */
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
            )}
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
