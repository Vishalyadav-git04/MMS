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
import { api } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  "UN-1001 - 1 PARA SF",
  "UN-1002 - 4 JAK RIF",
  "UN-1003 - 16 DOGRA",
  "UN-1004 - 7 GRENADIERS",
  "UN-1005 - 21 MARATHA LI",
];

/** Sample regns until EP IUT list API is wired */
const MOCK_REGN_POOL = [
  "EP-REGN-24001",
  "EP-REGN-24002",
  "EP-REGN-24007",
  "EP-REGN-24115",
  "EP-REGN-24128",
  "EP-REGN-24201",
  "EP-REGN-24244",
  "EP-REGN-24309",
];

interface DomainRow {
  id: string;
  domain_id: number;
  eqpt_cat: string;
}

interface SubDomainRow {
  id: string;
  equipment_domain_id: string;
  sub_domain_id: number;
  sub_domain_name: string;
  eqpt_cat?: string | null;
}

function UnitLookup({
  label,
  search,
  onSearchChange,
  unit,
  onUnitChange,
  options,
  onSearch,
}: {
  label: string;
  search: string;
  onSearchChange: (v: string) => void;
  unit: string;
  onUnitChange: (v: string) => void;
  options: string[];
  onSearch: () => void;
}) {
  return (
    <FormRow label={label} required>
      <div className="flex gap-1">
        <div className="flex min-w-0 flex-1 gap-1">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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
          <Select value={unit} onValueChange={onUnitChange}>
            <SelectTrigger>
              <SelectValue placeholder="--Select Unit--" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
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
  const [parentUnit, setParentUnit] = useState("");
  const [domainId, setDomainId] = useState("");
  const [subDomainId, setSubDomainId] = useState("");
  const [rvNo, setRvNo] = useState("");
  const [rvDate, setRvDate] = useState("2026-07-24");
  const [receivingSearch, setReceivingSearch] = useState("");
  const [receivingUnit, setReceivingUnit] = useState("");

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [subDomains, setSubDomains] = useState<SubDomainRow[]>([]);

  const [listLoaded, setListLoaded] = useState(false);
  const [availableRegns, setAvailableRegns] = useState<string[]>([]);
  const [transferRegns, setTransferRegns] = useState<string[]>([]);
  const [checkedAvailable, setCheckedAvailable] = useState<Set<string>>(new Set());
  const [checkedTransfer, setCheckedTransfer] = useState<Set<string>>(new Set());
  const [regnSearch, setRegnSearch] = useState("");

  useEffect(() => {
    api<DomainRow[]>("/ep/domain-master/")
      .then((rows) =>
        setDomains(
          [...rows].sort((a, b) =>
            a.eqpt_cat.localeCompare(b.eqpt_cat, undefined, { sensitivity: "base" }),
          ),
        ),
      )
      .catch(() => toast.error("Failed to load EQPT Domain list"));
  }, []);

  useEffect(() => {
    setSubDomainId("");
    if (!domainId) {
      setSubDomains([]);
      return;
    }
    api<SubDomainRow[]>(
      `/ep/sub-domain-master/search?equipment_domain_id=${encodeURIComponent(domainId)}`,
    )
      .then((rows) =>
        setSubDomains(
          [...rows].sort((a, b) =>
            a.sub_domain_name.localeCompare(b.sub_domain_name, undefined, {
              sensitivity: "base",
            }),
          ),
        ),
      )
      .catch(() => {
        setSubDomains([]);
        toast.error("Failed to load EQPT Sub Domain list");
      });
  }, [domainId]);

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
    if (!parentUnit || !domainId || !subDomainId || !rvNo || !rvDate || !receivingUnit) {
      return toast.error("Please fill all required fields");
    }

    const seed = (parentUnit.length + subDomainId.length) % MOCK_REGN_POOL.length;
    const count = 3 + (seed % 4);
    const fetched = Array.from(
      { length: count },
      (_, i) => MOCK_REGN_POOL[(seed + i) % MOCK_REGN_POOL.length],
    );

    setAvailableRegns(fetched);
    setTransferRegns([]);
    setCheckedAvailable(new Set());
    setCheckedTransfer(new Set());
    setRegnSearch("");
    setListLoaded(true);
    toast.success(`${fetched.length} registration number(s) found`);
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

  const handleSubmit = () => {
    if (!transferRegns.length) {
      toast.error("Move at least one Regn No to the transfer list");
      return;
    }
    toast.message(
      `Submit ${transferRegns.length} Regn No(s) — functionality coming soon`,
    );
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
              <Button
                onClick={handleSubmit}
                disabled={transferRegns.length === 0}
              >
                Submit
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
          unit={parentUnit}
          onUnitChange={setParentUnit}
          options={UNIT_OPTIONS}
          onSearch={() => toast.success("Searching Parent Unit...")}
        />
        <FormGrid cols={2}>
          <FormRow label="EQPT Domain" required>
            <Select
              value={domainId}
              onValueChange={(v) => {
                setDomainId(v);
                resetRegnSelection();
              }}
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
              onChange={(e) => setRvNo(e.target.value)}
            />
          </FormRow>
          <FormRow label="RV Date" required>
            <DateInput value={rvDate} onChange={setRvDate} />
          </FormRow>
          <FormRow label="Upload RV" required className="sm:col-span-2">
            <Input type="file" className="h-auto py-0.5" />
          </FormRow>
        </FormGrid>

        <FormSection title="Receiving unit details" />
        <UnitLookup
          label="Receiving Unit"
          search={receivingSearch}
          onSearchChange={setReceivingSearch}
          unit={receivingUnit}
          onUnitChange={setReceivingUnit}
          options={UNIT_OPTIONS}
          onSearch={() => toast.success("Searching Receiving Unit...")}
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
                onChange={(e) => setRegnSearch(e.target.value)}
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
