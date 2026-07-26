import { useState } from "react";
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
import { toast } from "sonner";

type Mode = "add" | "search";

export function MmsDomainMaster() {
  const [mode, setMode] = useState<Mode>("add");

  const [addForm, setAddForm] = useState({
    domainName: "",
    codeValue: "",
    labelName: "",
    labelShort: "",
    dispOrder: "",
  });

  const [searchDomain, setSearchDomain] = useState("");

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
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => toast.success("Domain saved")}
            >
              Submit
            </Button>
            <Button variant="destructive" onClick={() => toast("Cancelled")}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => toast.success("Searching...")}
            >
              Search
            </Button>
            <Button variant="destructive">Cancel</Button>
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
            />
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
          <FormRow label="Label in Short">
            <Input
              placeholder="Please Enter Label Short..."
              value={addForm.labelShort}
              onChange={(e) => setAddForm({ ...addForm, labelShort: e.target.value })}
            />
          </FormRow>
          <FormRow label="Disp Order">
            <Input
              placeholder="Please Enter Disp Order..."
              value={addForm.dispOrder}
              onChange={(e) => setAddForm({ ...addForm, dispOrder: e.target.value })}
            />
          </FormRow>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-3 pt-2">
          <FormRow label="Domain Name" required>
            <Select value={searchDomain} onValueChange={setSearchDomain}>
              <SelectTrigger>
                <SelectValue placeholder="--Select the Value--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weapon">Weapon</SelectItem>
                <SelectItem value="ammunition">Ammunition</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="comms">Communication</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        </div>
      )}
    </FormPanel>
  );
}
