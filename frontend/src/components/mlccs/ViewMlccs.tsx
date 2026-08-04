import { useEffect, useRef, useState } from "react";
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

interface MlccsSearchResponse {
  items: MlccsListItem[];
  total: number;
  page: number;
  page_size: number;
}

const ALL_CLASS = "__all__";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 5000;

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
  const [debouncedResultFilter, setDebouncedResultFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<MlccsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [modifyTarget, setModifyTarget] = useState<{
    censusNo: string;
    nomenclature: string;
  } | null>(null);

  // Applied search criteria (updated on Search click / initial load)
  const [appliedText, setAppliedText] = useState("");
  const [appliedField, setAppliedField] = useState<SearchField>("Nomenclature");
  const [appliedClass, setAppliedClass] = useState(ALL_CLASS);
  const [reloadToken, setReloadToken] = useState(0);

  const requestIdRef = useRef(0);
  const toastOnLoadRef = useRef(false);

  useEffect(() => {
    api<{ class_of_eqpt?: { value: string; label: string }[] }>("/mlccs/options")
      .then((opts) => {
        setClassOptions((opts.class_of_eqpt ?? []).map((o) => o.value).filter(Boolean));
      })
      .catch(() => {
        setClassOptions(["Class I", "Class II", "Class III"]);
      });
  }, []);

  // Debounce "Search in Result" so we don't hit the API on every keystroke
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedResultFilter(resultFilter.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [resultFilter]);

  const fetchPage = async (opts: {
    page: number;
    pageSize: number;
    text: string;
    field: SearchField;
    classOfEqpt: string;
    resultQ: string;
  }) => {
    const reqId = ++requestIdRef.current;
    const showToast = toastOnLoadRef.current;
    toastOnLoadRef.current = false;
    setBusy(true);
    setSelectedId("");
    try {
      const data = await api<MlccsSearchResponse>("/mlccs/search", {
        method: "POST",
        body: JSON.stringify({
          text: opts.text || null,
          field: opts.field,
          class_of_eqpt: opts.classOfEqpt === ALL_CLASS ? null : opts.classOfEqpt,
          result_q: opts.resultQ || null,
          page: opts.page,
          page_size: opts.pageSize,
        }),
      });
      if (reqId !== requestIdRef.current) return;
      setRows(data.items.map(mapRow));
      setTotal(data.total);
      if (showToast) toast.success(`${data.total} record(s) found`);
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      setRows([]);
      setTotal(0);
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      if (reqId === requestIdRef.current) setBusy(false);
    }
  };

  // Load current page whenever page / size / applied filters / result filter change
  useEffect(() => {
    void fetchPage({
      page,
      pageSize,
      text: appliedText,
      field: appliedField,
      classOfEqpt: appliedClass,
      resultQ: debouncedResultFilter,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    appliedText,
    appliedField,
    appliedClass,
    debouncedResultFilter,
    reloadToken,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);

  const handleSearch = () => {
    toastOnLoadRef.current = true;
    setAppliedText(searchText.trim());
    setAppliedField(searchIn);
    setAppliedClass(classOfEqpt);
    setPage(1);
    setReloadToken((n) => n + 1);
  };

  const fetchAllMatching = async (): Promise<MlccsRow[]> => {
    const data = await api<MlccsSearchResponse>("/mlccs/search", {
      method: "POST",
      body: JSON.stringify({
        text: appliedText || null,
        field: appliedField,
        class_of_eqpt: appliedClass === ALL_CLASS ? null : appliedClass,
        result_q: debouncedResultFilter || null,
        page: 1,
        page_size: Math.min(Math.max(total, 1), EXPORT_PAGE_SIZE),
      }),
    });
    return data.items.map(mapRow);
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

  const handleExport = async () => {
    if (total === 0) {
      toast.error("No records to export");
      return;
    }
    setBusy(true);
    try {
      const all = await fetchAllMatching();
      exportCsv(all);
      toast.success(`Exported ${all.length} record(s)`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (total === 0) {
      toast.error("No records to print");
      return;
    }
    setBusy(true);
    try {
      const all = await fetchAllMatching();
      await printResults(all);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Print failed");
    } finally {
      setBusy(false);
    }
  };

  if (modifyTarget) {
    return (
      <CaptureMlccs
        initialModify={modifyTarget}
        onBack={() => {
          setModifyTarget(null);
          setReloadToken((n) => n + 1);
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
            disabled={busy || total === 0}
            onClick={() => void handleExport()}
          >
            Export
          </Button>
          <Button
            size="sm"
            disabled={busy || total === 0}
            onClick={() => void handlePrint()}
          >
            Print Page
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={handleModify}
          >
            Modify Census Details
          </Button>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 rounded-[10px] border border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            <span className="text-[12px] font-semibold text-[var(--ink-soft,#54606c)]">in</span>
            <Select value={searchIn} onValueChange={(v) => setSearchIn(v as SearchField)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nomenclature">Nomenclature</SelectItem>
                <SelectItem value="Census No">Census No</SelectItem>
                <SelectItem value="Material No">Material No</SelectItem>
                <SelectItem value="Cat Part No">Cat Part No</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[12px] font-semibold text-[var(--ink-soft,#54606c)]">
              Class of Eqpt
            </span>
            <Select value={classOfEqpt} onValueChange={setClassOfEqpt}>
              <SelectTrigger className="w-[180px]">
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
            <Button disabled={busy} onClick={handleSearch}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-[var(--accent,#14568c)]">
            Select a Census No to Modify Data
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-soft,#54606c)]">
              Show
              <select
                className="h-[38px] rounded-[8px] border border-[var(--line,#cddcec)] bg-[var(--surface,#fff)] px-2 text-[14px] text-[var(--ink,#15202b)] shadow-[var(--shadow-sm)]"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
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
              <span className="text-[12px] text-[var(--ink-soft,#54606c)]">
                Search in Result({pageSize}):
              </span>
              <Input
                className="w-40"
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[var(--line,#cddcec)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <table className="w-full caption-bottom border-collapse text-[14px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 text-left" />
                  <th className="text-left">Material No</th>
                  <th className="text-left">Census No</th>
                  <th className="text-left">Nomenclature</th>
                  <th className="text-left">Class of Eqpt</th>
                  <th className="text-left">Cat Part No</th>
                  <th className="text-left">A/U</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const selected = selectedId === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--line-soft,#dfe9f4)]",
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
                {!busy && total === 0 && (
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
              Showing {pageStart} to {pageEnd} of {total} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[12px]"
                disabled={currentPage <= 1 || busy}
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
                      disabled={busy}
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
                disabled={currentPage >= totalPages || total === 0 || busy}
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
