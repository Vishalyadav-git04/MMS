import { useEffect, useRef, useState, type ReactNode } from "react";
import { FormPanel, FormRow, FormGrid, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError, uploadFileApi } from "@/lib/api";
import { pageHasInvalidDateInputs } from "@/lib/date";
import { toast } from "sonner";

interface DomainOption {
  code_value: string;
  label_name: string;
}

interface EquipRow {
  regdNo: string;
  serviceability: string;
}

interface DomainRow {
  id: number | string;
  eqpt_cat: string;
}

interface SubDomainRow {
  id: number | string;
  equipment_domain_id: number | string;
  sub_domain_name: string;
}

interface IssuerUnit {
  id: number | string;
  sanctioning_auth: string;
  unit_name: string;
  sus_no: string;
  form_code?: string | null;
}

interface HoldingUnit {
  id: number | string;
  unit_name: string;
  sus_no: string;
  form_code?: string | null;
}

const getTodayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const createEmptyIssuer = () => ({
  sanctioningAuth: "",
  issuingAuthority: "",
  issueSusNo: "",
  authLetterNo: "",
  date: getTodayIso(),
  authLetterFile: "",
});

const createEmptyHolding = () => ({
  unitName: "",
  susNo: "",
  ivNo: "",
  ivDate: getTodayIso(),
  domainId: "",
  subDomainId: "",
  regnNoAvl: "yes",
  qty: "",
  voucherFile: "",
  remarks: "",
});

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
  const blurTimer = useRef<number | null>(null);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""));
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
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
        </ul>
      )}
    </div>
  );
}

export function CaptureEpStores() {
  const [issuer, setIssuer] = useState(createEmptyIssuer);
  const [holding, setHolding] = useState(createEmptyHolding);
  const [authLetterFileObj, setAuthLetterFileObj] = useState<File | null>(null);
  const [voucherFileObj, setVoucherFileObj] = useState<File | null>(null);
  const [equipRows, setEquipRows] = useState<EquipRow[]>([
    { regdNo: "", serviceability: "SR" },
  ]);
  const [busy, setBusy] = useState(false);

  const [sanctionAuths, setSanctionAuths] = useState<DomainOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<DomainOption[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [subDomains, setSubDomains] = useState<SubDomainRow[]>([]);

  const [issuerUnits, setIssuerUnits] = useState<IssuerUnit[]>([]);
  const [holdingUnits, setHoldingUnits] = useState<HoldingUnit[]>([]);
  const [issuerQueryField, setIssuerQueryField] = useState<"name" | "sus" | null>(null);
  const [holdingQueryField, setHoldingQueryField] = useState<"name" | "sus" | null>(null);

  useEffect(() => {
    api<DomainOption[]>("/ep/capture/sanctioning-auths")
      .then((rows) => {
        setSanctionAuths(rows);
        if (rows.length && !issuer.sanctioningAuth) {
          setIssuer((prev) => ({ ...prev, sanctioningAuth: rows[0].code_value }));
        }
      })
      .catch(() => undefined);

    api<DomainOption[]>("/ep/capture/serviceability-options")
      .then((rows) => {
        setServiceOptions(rows);
        if (rows.length) {
          const defaultCode = rows[0].code_value;
          setEquipRows((prev) =>
            prev.map((r) => ({
              ...r,
              serviceability: r.serviceability === "Serviceable" ? defaultCode : r.serviceability,
            })),
          );
        }
      })
      .catch(() => undefined);

    api<DomainRow[]>("/ep/domain-master/")
      .then(setDomains)
      .catch(() => toast.error("Failed to load domains"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!holding.domainId) {
      setSubDomains([]);
      return;
    }
    api<SubDomainRow[]>(
      `/ep/sub-domain-master/search?equipment_domain_id=${encodeURIComponent(holding.domainId)}`,
    )
      .then(setSubDomains)
      .catch(() => setSubDomains([]));
  }, [holding.domainId]);

  useEffect(() => {
    if (!issuerQueryField) return;
    const q =
      issuerQueryField === "name" ? issuer.issuingAuthority.trim() : issuer.issueSusNo.trim();
    if (q.length < 1) {
      setIssuerUnits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({
        q,
        by: issuerQueryField,
      });
      if (issuer.sanctioningAuth) params.set("sanctioning_auth", issuer.sanctioningAuth);
      void api<IssuerUnit[]>(`/ep/capture/issuer-units?${params}`)
        .then(setIssuerUnits)
        .catch(() => setIssuerUnits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [issuer.issuingAuthority, issuer.issueSusNo, issuer.sanctioningAuth, issuerQueryField]);

  useEffect(() => {
    if (!holdingQueryField) return;
    const q = holdingQueryField === "name" ? holding.unitName.trim() : holding.susNo.trim();
    if (q.length < 1) {
      setHoldingUnits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({
        q,
        by: holdingQueryField,
      });
      void api<HoldingUnit[]>(`/ep/capture/holding-units?${params}`)
        .then(setHoldingUnits)
        .catch(() => setHoldingUnits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [holding.unitName, holding.susNo, holdingQueryField]);

  const updIssuer = <K extends keyof ReturnType<typeof createEmptyIssuer>>(
    k: K,
    v: ReturnType<typeof createEmptyIssuer>[K],
  ) => setIssuer({ ...issuer, [k]: v });
  const updHolding = <K extends keyof ReturnType<typeof createEmptyHolding>>(
    k: K,
    v: ReturnType<typeof createEmptyHolding>[K],
  ) => setHolding({ ...holding, [k]: v });

  const handleClear = () => {
    setIssuer({
      ...createEmptyIssuer(),
      sanctioningAuth: sanctionAuths[0]?.code_value ?? "",
    });
    setHolding(createEmptyHolding());
    setAuthLetterFileObj(null);
    setVoucherFileObj(null);
    setEquipRows([{ regdNo: "", serviceability: serviceOptions[0]?.code_value ?? "SR" }]);
    setIssuerUnits([]);
    setHoldingUnits([]);
    setSubDomains([]);
  };

  const handleQtyChange = (qty: string) => {
    const cleaned = qty.replace(/\D/g, "").slice(0, 4);
    updHolding("qty", cleaned);
    const n = Math.max(1, Math.min(Number(cleaned) || 1, 20));
    const defaultSvc = serviceOptions[0]?.code_value ?? "SR";
    setEquipRows((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ regdNo: "", serviceability: defaultSvc });
      return next.slice(0, n);
    });
  };

  const handleSubmit = async () => {
    if (pageHasInvalidDateInputs()) {
      toast.error("Please enter a valid date (dd/mm/yyyy)");
      return;
    }
    if (
      !issuer.sanctioningAuth ||
      !issuer.issuingAuthority ||
      !issuer.issueSusNo ||
      !issuer.authLetterNo ||
      !issuer.date ||
      !holding.unitName ||
      !holding.susNo ||
      !holding.ivNo ||
      !holding.ivDate ||
      !holding.domainId ||
      !holding.subDomainId ||
      !holding.qty
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const today = getTodayIso();
    if (issuer.date > today) {
      toast.error("Auth Letter Date cannot be a future date");
      return;
    }
    if (holding.ivDate > today) {
      toast.error("IV Date cannot be a future date");
      return;
    }

    if (holding.regnNoAvl === "yes") {
      const emptyIdx = equipRows.findIndex((r) => !r.regdNo || !r.regdNo.trim());
      if (emptyIdx !== -1) {
        toast.error(`Registration Number is required for equipment row ${emptyIdx + 1}`);
        return;
      }

      const seenRegn = new Set<string>();
      for (let i = 0; i < equipRows.length; i++) {
        const cleanReg = equipRows[i].regdNo.trim().toUpperCase();
        if (seenRegn.has(cleanReg)) {
          toast.error(
            `Duplicate registration number '${equipRows[i].regdNo.trim()}' entered in row ${i + 1}`,
          );
          return;
        }
        seenRegn.add(cleanReg);
      }
    }

    setBusy(true);
    try {
      const ivCheck = await api<{ exists: boolean }>(
        `/ep/capture/check-iv?iv_no=${encodeURIComponent(holding.ivNo.trim())}`,
      );
      if (ivCheck.exists) {
        const confirmed = window.confirm(
          `IV No '${holding.ivNo.trim()}' already exists in previous transactions. Are you sure you want to proceed?`,
        );
        if (!confirmed) {
          setBusy(false);
          return;
        }
      }

      let uploadedAuthLetter = issuer.authLetterFile || null;
      if (authLetterFileObj) {
        const uploadRes = await uploadFileApi(authLetterFileObj);
        uploadedAuthLetter = uploadRes.file_name;
      }
      let uploadedVoucher = holding.voucherFile || null;
      if (voucherFileObj) {
        const uploadRes = await uploadFileApi(voucherFileObj);
        uploadedVoucher = uploadRes.file_name;
      }

      const result = await api<{ ids: string[]; count: number }>("/ep/capture/", {
        method: "POST",
        body: JSON.stringify({
          sanctioning_auth: issuer.sanctioningAuth,
          issuing_authority: issuer.issuingAuthority,
          issue_sus_no: issuer.issueSusNo,
          auth_letter_no: issuer.authLetterNo,
          auth_date: issuer.date,
          upload_auth_letter: uploadedAuthLetter,
          unit_name: holding.unitName,
          sus_no: holding.susNo,
          iv_no: holding.ivNo,
          iv_date: holding.ivDate,
          domain_id: holding.domainId,
          sub_domain_id: holding.subDomainId,
          regn_no_avl: holding.regnNoAvl,
          qty: Number(holding.qty),
          upload_voucher: uploadedVoucher,
          remarks: holding.remarks || null,
          equipment: equipRows.map((r) => ({
            regd_no: r.regdNo || null,
            serviceability: r.serviceability,
          })),
        }),
      });
      toast.success(`EP Store submitted (${result.count} record(s))`);
      handleClear();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel
      title="EP STORES"
      fill
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={handleClear}>
            Clear
          </Button>
          <Button
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormSection title="Issuer details" />
        <FormGrid>
          <FormRow label="Sanctioning Auth" required>
            <Select
              value={issuer.sanctioningAuth}
              onValueChange={(v) => {
                updIssuer("sanctioningAuth", v);
                setIssuer((prev) => ({
                  ...prev,
                  sanctioningAuth: v,
                  issuingAuthority: "",
                  issueSusNo: "",
                }));
                setIssuerUnits([]);
              }}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {sanctionAuths.map((a) => (
                  <SelectItem key={a.code_value} value={a.code_value}>
                    {a.label_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Issuing Authority" required>
            <SuggestInput
              value={issuer.issuingAuthority}
              placeholder="Search Issuing Auth Unit Name..."
              disabled={busy}
              suggestions={
                issuerQueryField === "name"
                  ? issuerUnits.map((u) => `${u.unit_name} (${u.sus_no})`)
                  : []
              }
              onChange={(v) => {
                setIssuerQueryField("name");
                setIssuer({ ...issuer, issuingAuthority: v, issueSusNo: "" });
              }}
              onPick={(idx) => {
                const u = issuerUnits[idx];
                if (!u) return;
                setIssuer({
                  ...issuer,
                  issuingAuthority: u.unit_name,
                  issueSusNo: u.sus_no,
                  sanctioningAuth: u.sanctioning_auth || issuer.sanctioningAuth,
                });
                setIssuerUnits([]);
                setIssuerQueryField(null);
              }}
            />
          </FormRow>
          <FormRow label="Issue SUS No" required>
            <SuggestInput
              value={issuer.issueSusNo}
              placeholder="Search Issuing Auth SUS No..."
              disabled={busy}
              suggestions={
                issuerQueryField === "sus"
                  ? issuerUnits.map((u) => `${u.sus_no} — ${u.unit_name}`)
                  : []
              }
              onChange={(v) => {
                setIssuerQueryField("sus");
                setIssuer({ ...issuer, issueSusNo: v, issuingAuthority: "" });
              }}
              onPick={(idx) => {
                const u = issuerUnits[idx];
                if (!u) return;
                setIssuer({
                  ...issuer,
                  issuingAuthority: u.unit_name,
                  issueSusNo: u.sus_no,
                  sanctioningAuth: u.sanctioning_auth || issuer.sanctioningAuth,
                });
                setIssuerUnits([]);
                setIssuerQueryField(null);
              }}
            />
          </FormRow>
          <FormRow label="Auth Letter No" required>
            <Input
              placeholder="Enter Auth Letter No..."
              value={issuer.authLetterNo}
              disabled={busy}
              onChange={(e) => updIssuer("authLetterNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            />
          </FormRow>
          <FormRow label="Date" required>
            <DateInput
              value={issuer.date}
              disabled={busy}
              onChange={(v) => updIssuer("date", v)}
            />
          </FormRow>
          <FormRow label="Upload Auth Letter">
            <Input
              type="file"
              className="h-auto py-1"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAuthLetterFileObj(f);
                updIssuer("authLetterFile", f?.name ?? "");
              }}
            />
          </FormRow>
        </FormGrid>

        <FormSection title="EP holding details" />
        <FormGrid>
          <FormRow label="Unit Name" required>
            <SuggestInput
              value={holding.unitName}
              placeholder="Search..."
              disabled={busy}
              suggestions={
                holdingQueryField === "name"
                  ? holdingUnits.map((u) => `${u.unit_name} (${u.sus_no})`)
                  : []
              }
              onChange={(v) => {
                setHoldingQueryField("name");
                setHolding({ ...holding, unitName: v, susNo: "" });
              }}
              onPick={(idx) => {
                const u = holdingUnits[idx];
                if (!u) return;
                setHolding({ ...holding, unitName: u.unit_name, susNo: u.sus_no });
                setHoldingUnits([]);
                setHoldingQueryField(null);
              }}
            />
          </FormRow>
          <FormRow label="SUS No" required>
            <SuggestInput
              value={holding.susNo}
              placeholder="Search..."
              disabled={busy}
              suggestions={
                holdingQueryField === "sus"
                  ? holdingUnits.map((u) => `${u.sus_no} — ${u.unit_name}`)
                  : []
              }
              onChange={(v) => {
                setHoldingQueryField("sus");
                setHolding({ ...holding, susNo: v, unitName: "" });
              }}
              onPick={(idx) => {
                const u = holdingUnits[idx];
                if (!u) return;
                setHolding({ ...holding, unitName: u.unit_name, susNo: u.sus_no });
                setHoldingUnits([]);
                setHoldingQueryField(null);
              }}
            />
          </FormRow>
          <FormRow label="IV No" required>
            <Input
              placeholder="Enter IV No..."
              value={holding.ivNo}
              disabled={busy}
              onChange={(e) => updHolding("ivNo", e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, ""))}
            />
          </FormRow>
          <FormRow label="IV Date" required>
            <DateInput
              value={holding.ivDate}
              disabled={busy}
              onChange={(v) => updHolding("ivDate", v)}
            />
          </FormRow>
          <FormRow label="Eqpt Category/Domain Name" required>
            <Select
              value={holding.domainId}
              disabled={busy}
              onValueChange={(v) =>
                setHolding({ ...holding, domainId: v, subDomainId: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select Eqpt category--" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.eqpt_cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="EP Census/Sub Domain" required>
            <Select
              value={holding.subDomainId}
              disabled={busy || !holding.domainId}
              onValueChange={(v) => updHolding("subDomainId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select EP Census/Eqpt Nomen--" />
              </SelectTrigger>
              <SelectContent>
                {subDomains.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.sub_domain_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Is Registration No Avl?" required>
            <div className="flex flex-row items-center gap-5">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-foreground">
                <input
                  type="radio"
                  name="ep-regn-no-avl"
                  value="yes"
                  checked={holding.regnNoAvl === "yes"}
                  disabled={busy}
                  className="h-4 w-4 accent-primary"
                  onChange={() =>
                    setHolding((prev) => ({ ...prev, regnNoAvl: "yes" }))
                  }
                />
                Yes
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-foreground">
                <input
                  type="radio"
                  name="ep-regn-no-avl"
                  value="no"
                  checked={holding.regnNoAvl === "no"}
                  disabled={busy}
                  className="h-4 w-4 accent-primary"
                  onChange={() =>
                    setHolding((prev) => ({ ...prev, regnNoAvl: "no" }))
                  }
                />
                No
              </label>
            </div>
          </FormRow>
          <FormRow label="Qty" required>
            <Input
              placeholder="Max Four Character"
              value={holding.qty}
              disabled={busy}
              onChange={(e) => handleQtyChange(e.target.value)}
            />
          </FormRow>
          <FormRow label="Upload Voucher">
            <Input
              type="file"
              className="h-auto py-1"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setVoucherFileObj(f);
                updHolding("voucherFile", f?.name ?? "");
              }}
            />
          </FormRow>
        </FormGrid>

        <FormRow label="Remarks" className="sm:grid-cols-[140px_minmax(0,1fr)]">
          <Textarea
            rows={2}
            placeholder="Enter Remarks..."
            value={holding.remarks}
            disabled={busy}
            onChange={(e) => updHolding("remarks", e.target.value)}
          />
        </FormRow>

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="w-16 text-primary-foreground">Sr. No</TableHead>
                <TableHead className="text-primary-foreground">Equipment Regd No</TableHead>
                <TableHead className="text-primary-foreground">Serviceability State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={row.regdNo}
                      disabled={busy || holding.regnNoAvl === "no"}
                      onChange={(e) => {
                        const next = [...equipRows];
                        next[idx] = { ...next[idx], regdNo: e.target.value.replace(/[^a-zA-Z0-9\s\-/]/g, "") };
                        setEquipRows(next);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.serviceability}
                      disabled={busy}
                      onValueChange={(v) => {
                        const next = [...equipRows];
                        next[idx] = { ...next[idx], serviceability: v };
                        setEquipRows(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceOptions.map((opt) => (
                          <SelectItem key={opt.code_value} value={opt.code_value}>
                            {opt.label_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </FormPanel>
  );
}

