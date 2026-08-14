import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { api, uploadFileApi } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnitOption {
  sus_no: string;
  unit_name: string;
  display: string;
}

interface DomainOption {
  id: number | string;
  domain_id?: number | string;
  eqpt_cat: string;
}

interface SubDomainOption {
  id: number | string;
  sub_domain_id?: number | string;
  sub_domain_name: string;
}

function SuggestInput({
  value,
  placeholder,
  disabled,
  suggestions,
  renderItem,
  maxHeightClass = "max-h-52",
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
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  const designMaxHeight = (() => {
    const n = Number(maxHeightClass.match(/max-h-(\d+)/)?.[1]);
    return Number.isFinite(n) && n > 0 ? n * 4 : 200;
  })();

  const updateCoords = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.bottom + 4;
    const footer = el.closest(".mms-panel")?.querySelector(".mms-panel__foot");
    const ceiling = footer ? footer.getBoundingClientRect().top : window.innerHeight;
    setCoords({
      top,
      left: r.left,
      width: r.width,
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
        onFocus={() => {
          setOpen(true);
          updateCoords();
        }}
        onClick={() => {
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
          document.body
        )}
    </div>
  );
}

function RegnListBox({
  items,
  checked,
  onToggle,
  emptyLabel,
}: {
  items: string[];
  checked: Set<string>;
  onToggle: (regn: string, next: boolean) => void;
  emptyLabel: string;
}) {
  return (
    <div className="h-36 overflow-y-auto rounded border border-border bg-background">
      {items.length === 0 ? (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((regn) => (
            <li key={regn}>
              <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[13px] hover:bg-muted/50">
                <Checkbox
                  checked={checked.has(regn)}
                  onCheckedChange={(v) => onToggle(regn, v === true)}
                />
                <span className="truncate font-medium">{regn}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EpIutTransfer() {
  const [parentSearch, setParentSearch] = useState("");
  const [parentSusNo, setParentSusNo] = useState("");
  const [parentUnits, setParentUnits] = useState<UnitOption[]>([]);

  const [domainId, setDomainId] = useState("");
  const [subDomainId, setSubDomainId] = useState("");
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [subDomains, setSubDomains] = useState<SubDomainOption[]>([]);

  const [rvNo, setRvNo] = useState("");
  const [rvDate, setRvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rvFile, setRvFile] = useState<File | null>(null);

  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingSusNo, setReceivingSusNo] = useState("");
  const [receivingUnits, setReceivingUnits] = useState<UnitOption[]>([]);

  const [listLoaded, setListLoaded] = useState(false);
  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Parent Units on Mount
  useEffect(() => {
    api<UnitOption[]>("/ep/iut/parent-units")
      .then((data) => setParentUnits(data))
      .catch(() => toast.error("Failed to load Parent Units"));
  }, []);

  // 2. Fetch Receiving Units on Mount
  useEffect(() => {
    api<UnitOption[]>("/ep/iut/receiving-units")
      .then((data) => setReceivingUnits(data))
      .catch(() => toast.error("Failed to load Receiving Units"));
  }, []);

  // 3. Fetch Domains when Parent Unit changes
  useEffect(() => {
    setDomainId("");
    setSubDomainId("");
    setDomains([]);
    setSubDomains([]);
    resetRegnSelection();

    if (!parentSusNo) return;

    api<DomainOption[]>(`/ep/iut/domains?parent_sus_no=${encodeURIComponent(parentSusNo)}`)
      .then((data) => setDomains(data))
      .catch(() => toast.error("Failed to load EQPT Domains for Parent Unit"));
  }, [parentSusNo]);

  // 4. Fetch SubDomains when Domain changes under Parent Unit
  useEffect(() => {
    setSubDomainId("");
    setSubDomains([]);
    resetRegnSelection();

    if (!parentSusNo || !domainId) return;

    api<SubDomainOption[]>(
      `/ep/iut/sub-domains?parent_sus_no=${encodeURIComponent(parentSusNo)}&domain_id=${encodeURIComponent(domainId)}`,
    )
      .then((data) => setSubDomains(data))
      .catch(() => toast.error("Failed to load EQPT Sub Domains"));
  }, [parentSusNo, domainId]);

  const matchingParentUnits = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return [];
    return parentUnits
      .filter(
        (u) =>
          u.sus_no.toLowerCase().includes(q) ||
          u.unit_name.toLowerCase().includes(q) ||
          u.display.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [parentUnits, parentSearch]);

  const parentSuggestions = useMemo(
    () => matchingParentUnits.map((u) => u.display),
    [matchingParentUnits],
  );

  const pickParentUnit = (idx: number) => {
    const chosen = matchingParentUnits[idx];
    if (!chosen) return;
    setParentSearch(chosen.display);
    setParentSusNo(chosen.sus_no);
  };

  const handleParentSearchChange = (v: string) => {
    const cleaned = v.replace(/[^a-zA-Z0-9\s\-/&]/g, "");
    setParentSearch(cleaned);
    const match = parentUnits.find(
      (u) =>
        u.display.toLowerCase() === cleaned.trim().toLowerCase() ||
        u.sus_no.toLowerCase() === cleaned.trim().toLowerCase() ||
        u.unit_name.toLowerCase() === cleaned.trim().toLowerCase(),
    );
    setParentSusNo(match ? match.sus_no : "");
  };

  const matchingReceivingUnits = useMemo(() => {
    const q = receivingSearch.trim().toLowerCase();
    if (!q) return [];
    return receivingUnits
      .filter(
        (u) =>
          u.sus_no.toLowerCase().includes(q) ||
          u.unit_name.toLowerCase().includes(q) ||
          u.display.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [receivingUnits, receivingSearch]);

  const receivingSuggestions = useMemo(
    () => matchingReceivingUnits.map((u) => u.display),
    [matchingReceivingUnits],
  );

  const pickReceivingUnit = (idx: number) => {
    const chosen = matchingReceivingUnits[idx];
    if (!chosen) return;
    setReceivingSearch(chosen.display);
    setReceivingSusNo(chosen.sus_no);
  };

  const handleReceivingSearchChange = (v: string) => {
    const cleaned = v.replace(/[^a-zA-Z0-9\s\-/&]/g, "");
    setReceivingSearch(cleaned);
    const match = receivingUnits.find(
      (u) =>
        u.display.toLowerCase() === cleaned.trim().toLowerCase() ||
        u.sus_no.toLowerCase() === cleaned.trim().toLowerCase() ||
        u.unit_name.toLowerCase() === cleaned.trim().toLowerCase(),
    );
    setReceivingSusNo(match ? match.sus_no : "");
  };

  const filteredAvailable = useMemo(() => {
    const q = regnSearch.trim().toLowerCase();
    if (!q) return availableRegns;
    return availableRegns.filter((r) => r.toLowerCase().includes(q));
  }, [availableRegns, regnSearch]);

  const allFilteredSelected =
    filteredAvailable.length > 0 && filteredAvailable.every((r) => checkedAvailable.has(r));

  const resetRegnSelection = () => {
    setListLoaded(false);
    setAvailableRegns([]);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
  };

  const handleGetRegn = () => {
    if (pageHasInvalidDateInputs()) {
      return toast.error("Please enter a valid date (dd/mm/yyyy)");
    }
    if (!parentSusNo) {
      return toast.error("Please select Parent Unit");
    }
    if (!domainId) {
      return toast.error("Please select EQPT Domain");
    }
    if (!subDomainId) {
      return toast.error("Please select EQPT Sub Domain");
    }
    if (!rvNo.trim()) {
      return toast.error("Please enter RV No");
    }
    if (!rvDate) {
      return toast.error("Please select RV Date");
    }
    if (!receivingSusNo) {
      return toast.error("Please select Receiving Unit");
    }

    api<string[]>(
      `/ep/iut/regn-list?parent_sus_no=${encodeURIComponent(parentSusNo)}&domain_id=${encodeURIComponent(domainId)}&sub_domain_id=${encodeURIComponent(subDomainId)}`,
    )
      .then((data) => {
        setAvailableRegns(data);
        setTransferRegns([]);
        setCheckedAvailable(new Set());
        setCheckedTransfer(new Set());
        setRegnSearch("");
        setListLoaded(true);
        if (data.length === 0) {
          toast.info("No registration numbers found under selected Parent Unit & Domain");
        } else {
          toast.success(`${data.length} registration number(s) found`);
        }
      })
      .catch(() => toast.error("Failed to fetch registration list"));
  };

  const toggleAvailable = (regn: string, next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const toggleTransfer = (regn: string, next: boolean) => {
    setCheckedTransfer((prev) => {
      const n = new Set(prev);
      if (next) n.add(regn);
      else n.delete(regn);
      return n;
    });
  };

  const handleSelectAll = (next: boolean) => {
    setCheckedAvailable((prev) => {
      const n = new Set(prev);
      for (const r of filteredAvailable) {
        if (next) n.add(r);
        else n.delete(r);
      }
      return n;
    });
  };

  const moveToTransfer = () => {
    const moving = availableRegns.filter((r) => checkedAvailable.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to transfer");
      return;
    }
    setAvailableRegns((prev) => prev.filter((r) => !checkedAvailable.has(r)));
    setTransferRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedAvailable(new Set());
  };

  const moveBackToAvailable = () => {
    const moving = transferRegns.filter((r) => checkedTransfer.has(r));
    if (!moving.length) {
      toast.error("Select registration number(s) to move back");
      return;
    }
    setTransferRegns((prev) => prev.filter((r) => !checkedTransfer.has(r)));
    setAvailableRegns((prev) => [...prev, ...moving.filter((r) => !prev.includes(r))]);
    setCheckedTransfer(new Set());
  };

  const handleSubmit = async () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }
    if (!receivingSusNo) {
      toast.error("Please select Receiving Unit");
      return;
    }

    try {
      setSubmitting(true);
      let uploadedRvName = rvFile ? rvFile.name : null;
      if (rvFile) {
        const uploadRes = await uploadFileApi(rvFile, { module: "ep", screen: "ep-iut-transfer" });
        uploadedRvName = uploadRes.relative_path;
      }
      const res = await api<{ count: number; transferred_regns: string[] }>("/ep/iut/transfer", {
        method: "POST",
        body: JSON.stringify({
          parent_sus_no: parentSusNo,
          receiving_sus_no: receivingSusNo,
          domain_id: domainId,
          sub_domain_id: subDomainId,
          rv_no: rvNo,
          rv_date: rvDate,
          upload_rv: uploadedRvName,
          regn_numbers: transferRegns,
        }),
      });

      toast.success(
        `Inter Unit Transfer completed successfully for ${res.count} registration number(s)`,
      );
      resetRegnSelection();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute Inter Unit Transfer";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPanel
      title="EP IUT : INTER UNIT TRANSFER"
      fill={listLoaded}
      footer={
        <>
          <Button
            type="button"
            onClick={handleGetRegn}
            disabled={
              !parentSusNo ||
              !domainId ||
              !subDomainId ||
              !rvNo.trim() ||
              !rvDate ||
              !receivingSusNo
            }
          >
            Get Regn List
          </Button>
          {listLoaded && (
            <>
              <Button variant="secondary" onClick={resetRegnSelection}>
                Clear List
              </Button>
              <Button onClick={handleSubmit} disabled={transferRegns.length === 0 || submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="Parent unit details" />
        <FormRow label="Parent Unit" required className="mb-5">
          <SuggestInput
            placeholder="Search..."
            value={parentSearch}
            suggestions={parentSuggestions}
            onChange={handleParentSearchChange}
            onPick={pickParentUnit}
          />
        </FormRow>
        <FormGrid cols={2}>
          <FormRow label="EQPT Domain" required>
            <Select
              value={domainId}
              onValueChange={(v) => {
                setDomainId(v);
                resetRegnSelection();
              }}
              disabled={!parentSusNo}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select EQPT Domain--" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {domains.map((d) => (
                  <SelectItem key={d.id} value={String(d.domain_id ?? d.id)}>
                    {d.eqpt_cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="EQPT Sub Domain" required>
            <Select
              value={subDomainId}
              onValueChange={(v) => {
                setSubDomainId(v);
                resetRegnSelection();
              }}
              disabled={!domainId}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select EQPT Sub Domain--" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {subDomains.map((s) => (
                  <SelectItem key={s.id} value={String(s.sub_domain_id ?? s.id)}>
                    {s.sub_domain_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="RV No" required>
            <Input
              placeholder="Enter RV No..."
              value={rvNo}
              onChange={(e) => setRvNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
            />
          </FormRow>
          <FormRow label="RV Date" required>
            <DateInput value={rvDate} onChange={setRvDate} />
          </FormRow>
          <FormRow label="Upload RV" required className="sm:col-span-2">
            <Input
              type="file"
              className="h-auto py-0.5"
              onChange={(e) => setRvFile(e.target.files?.[0] || null)}
            />
          </FormRow>
        </FormGrid>

        <FormSection title="Receiving unit details" />
        <FormRow label="Receiving Unit" required className="mb-5">
          <SuggestInput
            placeholder="Search..."
            value={receivingSearch}
            suggestions={receivingSuggestions}
            onChange={handleReceivingSearchChange}
            onPick={pickReceivingUnit}
          />
        </FormRow>

        {listLoaded && (
          <>
            <FormSection title="Regn no to be transfer" />
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5",
                "bg-[oklch(0.94_0.03_15)]",
              )}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => handleSelectAll(v === true)}
                  disabled={filteredAvailable.length === 0}
                />
                Select all ({filteredAvailable.length})
              </label>
              <Input
                placeholder="Search Regd .."
                value={regnSearch}
                onChange={(e) => setRegnSearch(e.target.value.replace(/[^a-zA-Z0-9\s\-/&]/g, ""))}
                className="ml-auto h-7 max-w-[180px] bg-background"
              />
              <span className="text-[13px] font-semibold text-foreground">
                Selected Regn No-{transferRegns.length}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
              <RegnListBox
                items={filteredAvailable}
                checked={checkedAvailable}
                onToggle={toggleAvailable}
                emptyLabel="No registration numbers"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveToTransfer}
                  title="Move selected to transfer list"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={moveBackToAvailable}
                  title="Move selected back"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <RegnListBox
                items={transferRegns}
                checked={checkedTransfer}
                onToggle={toggleTransfer}
                emptyLabel="No Regn selected"
              />
            </div>
          </>
        )}
      </div>
    </FormPanel>
  );
}
