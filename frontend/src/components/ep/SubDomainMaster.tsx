import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

const DOMAIN_OPTIONS = ["Weapon", "Vehicle", "Communication", "Ammunition", "Optics"];

export function SubDomainMaster() {
  const [eqptCat, setEqptCat] = useState("");
  const [subDomain, setSubDomain] = useState("");

  const handleClear = () => {
    setEqptCat("");
    setSubDomain("");
  };

  return (
    <FormPanel
      title="SUB DOMAIN MASTER"
      footer={
        <>
          <Button
            onClick={() => {
              if (!eqptCat || !subDomain.trim()) {
                return toast.error("EQPT CAT and Sub Domain Name are required");
              }
              toast.success("Sub domain saved");
              handleClear();
            }}
          >
            Save
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button onClick={() => toast.success("Searching...")}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center text-sm font-bold uppercase tracking-wide text-foreground">
          ADD
        </div>
        <FormGrid>
          <FormRow label="EQPT CAT(Domain Name)" required>
            <Select value={eqptCat} onValueChange={setEqptCat}>
              <SelectTrigger>
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Sub Domain Name" required>
            <Input
              value={subDomain}
              onChange={(e) => setSubDomain(e.target.value)}
              placeholder="Enter Sub Domain"
            />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}
