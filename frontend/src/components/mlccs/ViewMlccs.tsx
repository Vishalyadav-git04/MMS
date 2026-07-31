import { useEffect, useMemo, useState } from "react";
import { FormPanel } from "@/components/FormPanel";
import { CaptureMlccs } from "@/components/mms/CaptureMlccs";
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
import { buildPrintWatermarkParts, resolveClientIp } from "@/lib/session-watermark";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SearchField = "Nomenclature" | "Census No" | "Material No" | "Cat Part No";

interface MlccsRow {
  id: string;
  materialNo: string;
  censusNo: string;
  nomenclature: string;
  classOfEqpt: string;
  catPartNo: string;
  au: string;
  status: string;
}

interface MlccsListItem {
  id: string;
  material_no?: string | null;
  census_no?: string | null;
  nomenclature?: string | null;
  class_of_eqpt?: string | null;
  cat_part_no?: string | null;
  au?: string | null;
  status?: string | null;
}

const ALL_CLASS = "__all__";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

function mapRow(r: MlccsListItem): MlccsRow {
  return {
    id: String(r.id),
    materialNo: r.material_no ?? "",
    censusNo: r.census_no ?? "",
    nomenclature: r.nomenclature ?? "",
    classOfEqpt: r.class_of_eqpt ?? "",
    catPartNo: r.cat_part_no ?? "",
    au: r.au ?? "",
    status: r.status ?? "",
  };
}

function exportCsv(rows: MlccsRow[]) {
  const headers = [
    "Material No",
    "Census No",
    "Nomenclature",
    "Class of Eqpt",
    "Cat Part No",
    "A/U",
    "Status",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.materialNo,
        r.censusNo,
        r.nomenclature,
        r.classOfEqpt,
        r.catPartNo,
        r.au,
        r.status,
      ]
        .map(escape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mlccs-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(rows: MlccsRow[]) {
  const bodyRows = rows
    .map(
      (r, i) => `
      <tr class="${i % 2 === 1 ? "alt" : ""}">
        <td>${escapeHtml(r.materialNo)}</td>
        <td>${escapeHtml(r.censusNo)}</td>
        <td>${escapeHtml(r.nomenclature)}</td>
        <td>${escapeHtml(r.classOfEqpt)}</td>
        <td>${escapeHtml(r.catPartNo)}</td>
        <td>${escapeHtml(r.au)}</td>
        <td>${escapeHtml(r.status)}</td>
      </tr>`,
    )
    .join("");

  const watermark = buildPrintWatermarkParts();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>View MLCCS — Results</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 12px; position: relative; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #444; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #2f4f2f; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr.alt td { background: #f3f3f3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${watermark.styles}
  </style>
</head>
<body>
  ${watermark.html}
  <h1>VIEW MLCCS — Search Results</h1>
  <div class="meta">${rows.length} record(s) · Printed ${new Date().toLocaleString()}</div>
  <table>
    <thead>
      <tr>
        <th>Material No</th>
        <th>Census No</th>
        <th>Nomenclature</th>
        <th>Class of Eqpt</th>
        <th>Cat Part No</th>
        <th>A/U</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="7" style="text-align:center">No records found</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
}

async function printResults(rows: MlccsRow[]) {
  await resolveClientIp();

  const existing = document.getElementById("mlccs-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "mlccs-print-frame";
  iframe.setAttribute("title", "Print MLCCS results");
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

  frameDoc.open();
  frameDoc.write(buildPrintHtml(rows));
  frameDoc.close();

  const cleanup = () => {
    const el = document.getElementById("mlccs-print-frame");
    if (el) el.remove();
  };

  // Allow the iframe document to finish layout before invoking print
  window.setTimeout(() => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      toast.error("Print failed");
    }
    window.setTimeout(cleanup, 1500);
  }, 250);
}

export function ViewMlccs() {
  const [searchText, setSearchText] = useState("");
  const [searchIn, setSearchIn] = useState<SearchField>("Nomenclature");
  const [classOfEqpt, setClassOfEqpt] = useState(ALL_CLASS);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [resultFilter, setResultFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<MlccsRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [modifyTarget, setModifyTarget] = useState<{
    censusNo: string;
    nomenclature: string;
  } | null>(null);

  useEffect(() => {
    api<{ class_of_eqpt?: { value: string; label: string }[] }>("/mlccs/options")
      .then((opts) => {
        setClassOptions((opts.class_of_eqpt ?? []).map((o) => o.value).filter(Boolean));
      })
      .catch(() => {
        setClassOptions(["Class I", "Class II", "Class III"]);
      });
  }, []);

  useEffect(() => {
    void handleSearch(true);
    // Initial load of all records
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!resultFilter.trim()) return rows;
    const q = resultFilter.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.materialNo.toLowerCase().includes(q) ||
        row.censusNo.toLowerCase().includes(q) ||
        row.nomenclature.toLowerCase().includes(q) ||
        row.classOfEqpt.toLowerCase().includes(q) ||
        row.catPartNo.toLowerCase().includes(q) ||
        row.au.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }, [rows, resultFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [resultFilter, rows, pageSize]);

  const handleSearch = async (silent = false) => {
    setBusy(true);
    setSelectedId("");
    setPage(1);
    try {
      const data = await api<MlccsListItem[]>("/mlccs/search", {
        method: "POST",
        body: JSON.stringify({
          text: searchText.trim() || null,
          field: searchIn,
          class_of_eqpt: classOfEqpt === ALL_CLASS ? null : classOfEqpt,
        }),
      });
      const mapped = data.map(mapRow);
      setRows(mapped);
      if (!silent) toast.success(`${mapped.length} record(s) found`);
    } catch (e) {
      setRows([]);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const handleModify = () => {
    if (!selectedId) {
      toast.error("Select a Census No first");
      return;
    }
    const row = rows.find((r) => r.id === selectedId);
    if (!row?.censusNo) {
      toast.error("Selected row has no Census No");
      return;
    }
    setModifyTarget({ censusNo: row.censusNo, nomenclature: row.nomenclature });
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No records to export");
      return;
    }
    exportCsv(filtered);
    toast.success(`Exported ${filtered.length} record(s)`);
  };

  const handlePrint = () => {
    if (filtered.length === 0) {
      toast.error("No records to print");
      return;
    }
    printResults(filtered);
  };

  if (modifyTarget) {
    return (
      <CaptureMlccs
        initialModify={modifyTarget}
        onBack={() => {
          setModifyTarget(null);
          void handleSearch(true);
        }}
      />
    );
  }

  return (
    <FormPanel
      title="VIEW MLCCS"
      fill
      footer={
        <>
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={busy || filtered.length === 0}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            size="sm"
            disabled={busy || filtered.length === 0}
            onClick={handlePrint}
          >
            Print Page
          </Button>
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={busy}
            onClick={handleModify}
          >
            Modify Census Details
          </Button>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col gap-1.5 overflow-hidden bg-card p-2 sm:p-3">
        <div className="shrink-0 rounded border border-border bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 max-w-xs"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
            />
            <span className="text-xs text-muted-foreground">in</span>
            <Select value={searchIn} onValueChange={(v) => setSearchIn(v as SearchField)}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nomenclature">Nomenclature</SelectItem>
                <SelectItem value="Census No">Census No</SelectItem>
                <SelectItem value="Material No">Material No</SelectItem>
                <SelectItem value="Cat Part No">Cat Part No</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs font-medium text-foreground">Class of Eqpt</span>
            <Select value={classOfEqpt} onValueChange={setClassOfEqpt}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASS}>--Select--</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" disabled={busy} onClick={() => void handleSearch()}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-primary">
            Select a Census No to Modify Data
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Show
              <select
                className="h-7 rounded border border-border bg-card px-1.5 text-xs text-foreground"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Search in Result({pageSize}):
              </span>
              <Input
                className="h-7 w-40"
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <table className="w-full caption-bottom border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary">
                  <th className="h-8 w-10 px-2 py-0 text-left text-xs font-medium text-primary-foreground" />
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Material No
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Census No
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Nomenclature
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Class of Eqpt
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Cat Part No
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    A/U
                  </th>
                  <th className="h-8 px-2 py-0 text-left text-xs font-medium text-primary-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row, idx) => {
                  const selected = selectedId === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "h-8 cursor-pointer border-b border-border",
                        selected ? "bg-primary/15" : idx % 2 === 1 ? "bg-muted/40" : undefined,
                      )}
                    >
                      <td className="w-10 px-2 py-0 align-middle">
                        <span
                          role="radio"
                          aria-checked={selected}
                          aria-label={`Select ${row.censusNo || row.id}`}
                          className={cn(
                            "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-primary bg-card shadow-sm",
                            selected && "border-primary bg-primary/10",
                          )}
                        >
                          {selected && (
                            <span className="block h-2 w-2 rounded-full bg-primary" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-0 align-middle">{row.materialNo}</td>
                      <td className="whitespace-nowrap px-2 py-0 align-middle">{row.censusNo}</td>
                      <td className="min-w-[220px] px-2 py-0 align-middle">{row.nomenclature}</td>
                      <td className="whitespace-nowrap px-2 py-0 align-middle">{row.classOfEqpt}</td>
                      <td className="whitespace-nowrap px-2 py-0 align-middle">{row.catPartNo}</td>
                      <td className="px-2 py-0 align-middle">{row.au}</td>
                      <td className="px-2 py-0 align-middle">{row.status}</td>
                    </tr>
                  );
                })}
                {!busy && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="h-16 text-center text-sm text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1 text-[12px] text-muted-foreground">
            <div>
              Showing {pageStart} to {pageEnd} of {filtered.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[12px]"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => {
                  if (totalPages <= 7) return true;
                  if (n === 1 || n === totalPages) return true;
                  return Math.abs(n - currentPage) <= 1;
                })
                .reduce<number[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1]! > 1) acc.push(-n);
                  acc.push(n);
                  return acc;
                }, [])
                .map((n) =>
                  n < 0 ? (
                    <span key={`e${n}`} className="px-1">
                      …
                    </span>
                  ) : (
                    <Button
                      key={n}
                      type="button"
                      variant={n === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-7 min-w-7 px-2 text-[12px]"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ),
                )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[12px]"
                disabled={currentPage >= totalPages || filtered.length === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FormPanel>
  );
}
