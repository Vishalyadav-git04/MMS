import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function SearchRegnNo() {
  const [regnNo, setRegnNo] = useState("");
  const [censusNo, setCensusNo] = useState("");
  const [prfCode, setPrfCode] = useState("");

  return (
    <FormPanel
      title="Regn No : Search"
      footer={
        <>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => {
              if (!regnNo) return toast.error("Regn No is required");
              toast.success("Searching...");
            }}
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setRegnNo("");
              setCensusNo("");
              setPrfCode("");
            }}
          >
            Clear
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pt-2">
        <FormRow label="Regn No" required>
          <Input
            placeholder="ENTER THE REGN NO"
            value={regnNo}
            onChange={(e) => setRegnNo(e.target.value)}
          />
        </FormRow>
        <FormGrid>
          <FormRow label="Census No">
            <Input
              placeholder="Census No"
              value={censusNo}
              onChange={(e) => setCensusNo(e.target.value)}
            />
          </FormRow>
          <FormRow label="PRF Code">
            <Input
              placeholder="PRF Code"
              value={prfCode}
              onChange={(e) => setPrfCode(e.target.value)}
            />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}
