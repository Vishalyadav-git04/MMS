import { useEffect, useState } from "react";
import { FormPanel, FormRow, SwitchTabs } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

type Mode = "add" | "search";

interface DomainRow {
  id: string;
  domain_name: string;
  code_value: string;
  label_name: string;
  label_short?: string | null;
  disp_order?: string | null;
  module?: string | null;
}

export function MmsDomainMaster() {
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [results, setResults] = useState<DomainRow[]>([]);

  const [addForm, setAddForm] = useState({
    domainName: "",
    codeValue: "",
    labelName: "",
    labelShort: "",
    dispOrder: "",
  });

  const [searchDomain, setSearchDomain] = useState("");

  useEffect(() => {
    api<string[]>("/admin/mms-domain-master/domains")
      .then(setDomains)
      .catch(() => undefined);
  }, []);

  const handleSubmit = async () => {
    if (!addForm.domainName || !addForm.codeValue || !addForm.labelName) {
      toast.error("Domain Name, Code Value and Label Name are required");
      return;
    }
    setBusy(true);
    try {
      await api<DomainRow>("/admin/mms-domain-master/", {
        method: "POST",
        body: JSON.stringify({
          domain_name: addForm.domainName,
          code_value: addForm.codeValue,
          label_name: addForm.labelName,
          label_short: addForm.labelShort || null,
          disp_order: addForm.dispOrder || null,
          module: "MMS",
        }),
      });
      toast.success("Domain saved");
      setAddForm({ domainName: "", codeValue: "", labelName: "", labelShort: "", dispOrder: "" });
      const names = await api<string[]>("/admin/mms-domain-master/domains");
      setDomains(names);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async () => {
    setBusy(true);
    try {
      const q = searchDomain ? `?domain_name=${encodeURIComponent(searchDomain)}` : "";
      const rows = await api<DomainRow[]>(`/admin/mms-domain-master/search${q}`);
      setResults(rows);
      toast.success(`${rows.length} record(s) found`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPanel
      title="MMS Domain Master"
      tabs={
        <SwitchTabs<Mode>
          tabs={[
            { id: "add", label: "Add" },
            { id: "search", label: "Search" },
          ]}
          value={mode}
          onChange={setMode}
        />
      }
      footer={
        mode === "add" ? (
          <>
            <Button
              disabled={busy}
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => void handleSubmit()}
            >
              Submit
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                setAddForm({
                  domainName: "",
                  codeValue: "",
                  labelName: "",
                  labelShort: "",
                  dispOrder: "",
                })
              }
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={busy}
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => void handleSearch()}
            >
              Search
            </Button>
            <Button variant="destructive" onClick={() => setResults([])}>
              Cancel
            </Button>
          </>
        )
      }
    >
      {mode === "add" ? (
        <div className="mx-auto max-w-3xl space-y-3 pt-2">
          <FormRow label="Domain Name">
            <Input
              placeholder="Please Enter Domain Name..."
              value={addForm.domainName}
              onChange={(e) => setAddForm({ ...addForm, domainName: e.target.value })}
              list="domain-names"
            />
            <datalist id="domain-names">
              {domains.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </FormRow>
          <FormRow label="Code Value">
            <Input
              placeholder="Please Enter Code Value..."
              value={addForm.codeValue}
              onChange={(e) => setAddForm({ ...addForm, codeValue: e.target.value })}
            />
          </FormRow>
          <FormRow label="Label Name">
            <Input
              placeholder="Please Enter Label Name..."
              value={addForm.labelName}
              onChange={(e) => setAddForm({ ...addForm, labelName: e.target.value })}
            />
          </FormRow>
          <FormRow label="Label Short">
            <Input
              placeholder="Please Enter Label Short..."
              value={addForm.labelShort}
              onChange={(e) => setAddForm({ ...addForm, labelShort: e.target.value })}
            />
          </FormRow>
          <FormRow label="Display Order">
            <Input
              placeholder="Please Enter Display Order..."
              value={addForm.dispOrder}
              onChange={(e) => setAddForm({ ...addForm, dispOrder: e.target.value })}
            />
          </FormRow>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-3 pt-2">
          <FormRow label="Domain Name">
            <Select value={searchDomain || "__all__"} onValueChange={(v) => setSearchDomain(v === "__all__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">-- ALL --</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          {results.length > 0 && (
            <div className="overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Short</TableHead>
                    <TableHead>Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.domain_name}</TableCell>
                      <TableCell>{r.code_value}</TableCell>
                      <TableCell>{r.label_name}</TableCell>
                      <TableCell>{r.label_short}</TableCell>
                      <TableCell>{r.disp_order}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </FormPanel>
  );
}
