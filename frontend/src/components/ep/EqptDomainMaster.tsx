import { useState } from "react";
import { FormPanel, FormRow } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

export function EqptDomainMaster() {
  const [eqptCat, setEqptCat] = useState("");

  const handleClear = () => setEqptCat("");

  return (
    <FormPanel
      title="EQPT DOMAIN MASTER"
      footer={
        <>
          <Button
            onClick={() => {
              if (!eqptCat.trim()) return toast.error("EQPT CAT is required");
              toast.success("Domain saved");
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
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="text-center text-sm font-bold uppercase tracking-wide text-foreground">
          ADD
        </div>
        <FormRow label="EQPT CAT" required>
          <Input
            value={eqptCat}
            onChange={(e) => setEqptCat(e.target.value)}
            placeholder="Enter EQPT CAT"
          />
        </FormRow>
      </div>
    </FormPanel>
  );
}
