import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { MonthInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import {
  DEFAULT_MONTH,
  HOLDING_TYPES,
  PrfGroupField,
  SelectField,
} from "@/components/reports/shared";

export function AllIndiaHolding() {
  const [prfSearch, setPrfSearch] = useState("");
  const [prfGroup, setPrfGroup] = useState("");
  const [holdingType, setHoldingType] = useState("");
  const [month, setMonth] = useState(DEFAULT_MONTH);

  const handleClear = () => {
    setPrfSearch("");
    setPrfGroup("");
    setHoldingType("");
    setMonth(DEFAULT_MONTH);
  };

  const handleGetAih = () => {
    toast.message("Get AIH — functionality coming soon");
  };

  return (
    <FormPanel
      title="ALL INDIA HOLDING REPORT : WPNs AND EQPT"
      footer={
        <>
          <Button
            onClick={handleGetAih}
          >
            Get AIH
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-4xl space-y-2 pt-1">
        <FormRow label="PRF Group" className="sm:grid-cols-[120px_minmax(0,1fr)]">
          <PrfGroupField
            search={prfSearch}
            onSearchChange={setPrfSearch}
            value={prfGroup}
            onChange={setPrfGroup}
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Type of Holding" className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <SelectField
              value={holdingType}
              onChange={setHoldingType}
              options={HOLDING_TYPES}
              placeholder="--All Types of Holding--"
            />
          </FormRow>
          <FormRow label="Month" className="sm:grid-cols-[80px_minmax(0,1fr)]">
            <MonthInput value={month} onChange={setMonth} />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}
