import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/auth";
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
  id: number | string;
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
const DEFAULT_PAGE_SIZE = 10;
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

export function ViewMlccs({ onBack }: { onBack?: () => void } = {}) {
  const { user } = useAuth();
  const admin = isAdmin(user);
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
  const [addingNew, setAddingNew] = useState(false);
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

  const displayedRows = useMemo(() => {
    if (!resultFilter.trim()) return rows;
    const terms = resultFilter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      const rowText = `${r.materialNo} ${r.censusNo} ${r.nomenclature} ${r.classOfEqpt} ${r.catPartNo} ${r.au} ${r.status}`.toLowerCase();
      return terms.every((term) => rowText.includes(term));
    });
  }, [rows, resultFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);

  const handleClassChange = (val: string) => {
    setClassOfEqpt(val);
    setAppliedClass(val);
    setPage(1);
    setReloadToken((n) => n + 1);
  };

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
      toast.error("Please select a Census record from the table first");
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

  if (addingNew) {
    return (
      <CaptureMlccs
        initialMode="add"
        onBack={() => {
          setAddingNew(false);
          setReloadToken((n) => n + 1);
        }}
      />
    );
  }

  if (modifyTarget) {
    return (
      <CaptureMlccs
        initialMode="modify"
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
      fill={false}
      footer={
        <>
          {admin && (
            <Button
              className="h-9.5 px-4 font-semibold bg-primary hover:bg-primary/90"
              disabled={busy}
              onClick={() => setAddingNew(true)}
            >
              Add New Eqpt
            </Button>
          )}
          <Button
            className="h-9.5 px-4 font-semibold"
            disabled={busy || total === 0}
            onClick={() => void handleExport()}
          >
            Export
          </Button>
          <Button
            className="h-9.5 px-4 font-semibold"
            disabled={busy || total === 0}
            onClick={() => void handlePrint()}
          >
            Print Page
          </Button>
          {admin && (
            <Button
              className="h-9.5 px-4 font-semibold"
              disabled={busy}
              onClick={handleModify}
            >
              Modify Census Details
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 overflow-hidden p-3.5">
        <div className="shrink-0 rounded-[10px] border border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="h-9.5 flex-1 min-w-[220px]"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            <span className="shrink-0 font-semibold text-[var(--ink-soft,#54606c)]">in</span>
            <Select value={searchIn} onValueChange={(v) => setSearchIn(v as SearchField)}>
              <SelectTrigger className="h-9.5 w-[180px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="py-2" value="Nomenclature">Nomenclature</SelectItem>
                <SelectItem className="py-2" value="Census No">Census No</SelectItem>
                <SelectItem className="py-2" value="Material No">Material No</SelectItem>
                <SelectItem className="py-2" value="Cat Part No">Cat Part No</SelectItem>
              </SelectContent>
            </Select>
            <span className="shrink-0 font-semibold text-[var(--ink-soft,#54606c)]">
              Class of Eqpt
            </span>
            <Select value={classOfEqpt} onValueChange={handleClassChange}>
              <SelectTrigger className="h-9.5 w-[200px] shrink-0">
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="py-2" value={ALL_CLASS}>--Select--</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem className="py-2" key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-9.5 px-6 font-semibold shrink-0" disabled={busy} onClick={handleSearch}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="font-bold text-[var(--accent,#14568c)]">
            {admin ? "Select a Census No to Modify Data" : "Master List of Census Records"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--ink-soft,#54606c)]">
                Search in Result({total}):
              </span>
              <Input
                className="h-9.5 w-56 rounded-md border border-[var(--line,#cddcec)] bg-background px-3 shadow-xs placeholder:text-muted-foreground focus-visible:ring-1"
                placeholder="Type to filter..."
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[var(--line,#cddcec)] bg-card shadow-xs">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <table className="w-full caption-bottom border-collapse">
              <thead className="sticky top-0 z-10 border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)]">
                <tr>
                  <th className="w-10 border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]" />
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Material No</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Census No</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Nomenclature</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Class of Eqpt</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Cat Part No</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">A/U</th>
                  <th className="border-b border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2.5 text-left font-bold uppercase tracking-wider text-[var(--ink-soft,#54606c)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => {
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
                      <td className="w-10 px-3.5 py-2 align-middle">
                        <span
                          role="radio"
                          aria-checked={selected}
                          aria-label={`Select ${row.censusNo || row.id}`}
                          className={cn(
                            "inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-card shadow-sm",
                            selected && "border-primary bg-primary/10",
                          )}
                        >
                          {selected && (
                            <span className="block h-2 w-2 rounded-full bg-primary" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 align-middle">{row.materialNo}</td>
                      <td className="whitespace-nowrap px-3.5 py-2 align-middle font-semibold">{row.censusNo}</td>
                      <td className="min-w-[220px] px-3.5 py-2 align-middle">{row.nomenclature}</td>
                      <td className="whitespace-nowrap px-3.5 py-2 align-middle">{row.classOfEqpt}</td>
                      <td className="whitespace-nowrap px-3.5 py-2 align-middle">{row.catPartNo}</td>
                      <td className="px-3.5 py-2 align-middle">{row.au}</td>
                      <td className="px-3.5 py-2 align-middle">{row.status}</td>
                    </tr>
                  );
                })}
                {!busy && displayedRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="h-16 text-center text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--line,#cddcec)] bg-[var(--surface-alt,#eff5fb)] px-3.5 py-2 font-medium text-[var(--ink-soft,#54606c)]">
            <div>
              Showing {pageStart} to {pageEnd} of {total} entries
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3.5 font-semibold"
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
                      className="h-9 min-w-9 px-3.5 font-semibold"
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
                className="h-9 px-3.5 font-semibold"
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
