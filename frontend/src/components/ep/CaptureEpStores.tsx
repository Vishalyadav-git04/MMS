import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

interface EquipRow {
  regdNo: string;
  serviceability: string;
}

const emptyIssuer = {
  sanctioningAuth: "DG CD",
  issuingAuthority: "",
  issueSusNo: "",
  authLetterNo: "",
  date: "2026-07-24",
  authLetterFile: "",
};

const emptyHolding = {
  unitName: "",
  susNo: "",
  ivNo: "",
  ivDate: "2026-07-24",
  eqptCategory: "",
  epCensus: "",
  regnNoAvl: "yes",
  qty: "",
  voucherFile: "",
  remarks: "",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="-mx-3 sm:-mx-4 mb-2 border-y border-border bg-muted/60 px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
      {title}
    </div>
  );
}

export function CaptureEpStores() {
  const [issuer, setIssuer] = useState(emptyIssuer);
  const [holding, setHolding] = useState(emptyHolding);
  const [equipRows, setEquipRows] = useState<EquipRow[]>([
    { regdNo: "", serviceability: "Serviceable" },
  ]);

  const updIssuer = <K extends keyof typeof emptyIssuer>(k: K, v: (typeof emptyIssuer)[K]) =>
    setIssuer({ ...issuer, [k]: v });
  const updHolding = <K extends keyof typeof emptyHolding>(k: K, v: (typeof emptyHolding)[K]) =>
    setHolding({ ...holding, [k]: v });

  const handleClear = () => {
    setIssuer(emptyIssuer);
    setHolding(emptyHolding);
    setEquipRows([{ regdNo: "", serviceability: "Serviceable" }]);
  };

  const handleQtyChange = (qty: string) => {
    const cleaned = qty.replace(/\D/g, "").slice(0, 4);
    updHolding("qty", cleaned);
    const n = Math.max(1, Math.min(Number(cleaned) || 1, 20));
    setEquipRows((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ regdNo: "", serviceability: "Serviceable" });
      return next.slice(0, n);
    });
  };

  return (
    <FormPanel
      title="EP STORES"
      fill
      footer={
        <>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => {
              if (
                !issuer.sanctioningAuth ||
                !issuer.issuingAuthority ||
                !issuer.issueSusNo ||
                !issuer.authLetterNo ||
                !holding.unitName ||
                !holding.susNo ||
                !holding.ivNo ||
                !holding.eqptCategory ||
                !holding.epCensus ||
                !holding.qty
              ) {
                return toast.error("Please fill all required fields");
              }
              toast.success("EP Store submitted");
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SectionHeader title="ISSUER DETAILS" />
        <FormGrid>
          <FormRow label="Sanctioning Auth" required>
            <Select
              value={issuer.sanctioningAuth}
              onValueChange={(v) => updIssuer("sanctioningAuth", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DG CD">DG CD</SelectItem>
                <SelectItem value="DGOS">DGOS</SelectItem>
                <SelectItem value="DGAS">DGAS</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Issuing Authority" required>
            <Input
              placeholder="Search Issuing Auth Unit Name..."
              value={issuer.issuingAuthority}
              onChange={(e) => updIssuer("issuingAuthority", e.target.value)}
            />
          </FormRow>
          <FormRow label="Issue SUS No" required>
            <Input
              placeholder="Search Issuing Auth SUS No..."
              value={issuer.issueSusNo}
              onChange={(e) => updIssuer("issueSusNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="Auth Letter No" required>
            <Input
              placeholder="Enter Auth Letter No..."
              value={issuer.authLetterNo}
              onChange={(e) => updIssuer("authLetterNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="Date" required>
            <Input
              type="date"
              value={issuer.date}
              onChange={(e) => updIssuer("date", e.target.value)}
            />
          </FormRow>
          <FormRow label="Upload Auth Letter">
            <Input
              type="file"
              className="h-auto py-1"
              onChange={(e) =>
                updIssuer("authLetterFile", e.target.files?.[0]?.name ?? "")
              }
            />
          </FormRow>
        </FormGrid>

        <SectionHeader title="EP HOLDING DETAILS" />
        <FormGrid>
          <FormRow label="Unit Name" required>
            <Input
              placeholder="Search..."
              value={holding.unitName}
              onChange={(e) => updHolding("unitName", e.target.value)}
            />
          </FormRow>
          <FormRow label="SUS No" required>
            <Input
              placeholder="Search..."
              value={holding.susNo}
              onChange={(e) => updHolding("susNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="IV No" required>
            <Input
              placeholder="Enter IV No..."
              value={holding.ivNo}
              onChange={(e) => updHolding("ivNo", e.target.value)}
            />
          </FormRow>
          <FormRow label="IV Date" required>
            <Input
              type="date"
              value={holding.ivDate}
              onChange={(e) => updHolding("ivDate", e.target.value)}
            />
          </FormRow>
          <FormRow label="Eqpt Category/Domain Name" required>
            <Select
              value={holding.eqptCategory}
              onValueChange={(v) => updHolding("eqptCategory", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select Eqpt category--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Weapon">Weapon</SelectItem>
                <SelectItem value="Vehicle">Vehicle</SelectItem>
                <SelectItem value="Communication">Communication</SelectItem>
                <SelectItem value="Optics">Optics</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="EP Census/Sub Domain" required>
            <Select
              value={holding.epCensus}
              onValueChange={(v) => updHolding("epCensus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="--Select EP Census/Eqpt Nomen--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Radar">Radar</SelectItem>
                <SelectItem value="Sensors">Sensors</SelectItem>
                <SelectItem value="Night Vision">Night Vision</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Is Registration No Avl?" required>
            <RadioGroup
              value={holding.regnNoAvl}
              onValueChange={(v) => updHolding("regnNoAvl", v)}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="yes" id="regn-yes" />
                <Label htmlFor="regn-yes" className="text-xs font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="no" id="regn-no" />
                <Label htmlFor="regn-no" className="text-xs font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>
          </FormRow>
          <FormRow label="Qty" required>
            <Input
              placeholder="Max Four Character"
              value={holding.qty}
              onChange={(e) => handleQtyChange(e.target.value)}
            />
          </FormRow>
          <FormRow label="Upload Voucher">
            <Input
              type="file"
              className="h-auto py-1"
              onChange={(e) =>
                updHolding("voucherFile", e.target.files?.[0]?.name ?? "")
              }
            />
          </FormRow>
        </FormGrid>

        <FormRow label="Remarks" className="sm:grid-cols-[140px_minmax(0,1fr)]">
          <Textarea
            rows={2}
            placeholder="Enter Remarks..."
            value={holding.remarks}
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
                      disabled={holding.regnNoAvl === "no"}
                      onChange={(e) => {
                        const next = [...equipRows];
                        next[idx] = { ...next[idx], regdNo: e.target.value };
                        setEquipRows(next);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.serviceability}
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
                        <SelectItem value="Serviceable">Serviceable</SelectItem>
                        <SelectItem value="Repairable">Repairable</SelectItem>
                        <SelectItem value="BER">BER</SelectItem>
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
