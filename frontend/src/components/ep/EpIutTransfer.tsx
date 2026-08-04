import { useEffect, useMemo, useState } from "react";
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
import { ArrowRight, Search } from "lucide-react";
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
  id: string;
  eqpt_cat: string;
}

interface SubDomainOption {
  id: string;
  sub_domain_name: string;
}

function UnitLookup({
  label,
  search,
  onSearchChange,
  value,
  onValueChange,
  options,
  onSearch,
}: {
  label: string;
  search: string;
  onSearchChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  options: UnitOption[];
  onSearch: () => void;
}) {
  const filteredOptions = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.sus_no.toUpperCase().includes(q) ||
        o.unit_name.toUpperCase().includes(q) ||
        o.display.toUpperCase().includes(q),
    );
  }, [options, search]);

  return (
    <FormRow label={label} required>
      <div className="flex gap-1">
        <div className="flex min-w-0 flex-1 gap-1">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7 shrink-0"
            onClick={onSearch}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="min-w-0 flex-[1.4]">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
              <SelectValue placeholder="--Select Unit--" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredOptions.map((o) => (
                <SelectItem key={o.sus_no} value={o.sus_no}>
                  {o.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormRow>
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

  const handleSearchReceivingUnits = () => {
    api<UnitOption[]>(`/ep/iut/receiving-units?search=${encodeURIComponent(receivingSearch)}`)
      .then((data) => {
        setReceivingUnits(data);
        toast.success(`Found ${data.length} receiving unit(s)`);
      })
      .catch(() => toast.error("Failed to search receiving units"));
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
        const uploadRes = await uploadFileApi(rvFile);
        uploadedRvName = uploadRes.file_name;
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
          <Button type="button" onClick={handleGetRegn}>
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
      <div className="space-y-1">
        <FormSection title="Parent unit details" />
        <UnitLookup
          label="Parent Unit"
          search={parentSearch}
          onSearchChange={setParentSearch}
          value={parentSusNo}
          onValueChange={setParentSusNo}
          options={parentUnits}
          onSearch={() => toast.info("Filter Parent Units using search box")}
        />
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
                  <SelectItem key={d.id} value={d.id}>
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
                  <SelectItem key={s.id} value={s.id}>
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
              onChange={(e) => setRvNo(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
        <UnitLookup
          label="Receiving Unit"
          search={receivingSearch}
          onSearchChange={setReceivingSearch}
          value={receivingSusNo}
          onValueChange={setReceivingSusNo}
          options={receivingUnits}
          onSearch={handleSearchReceivingUnits}
        />

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
                onChange={(e) => setRegnSearch(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
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
