import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import {
  ARMS,
  BDES,
  COMMANDS,
  CORPS,
  DEFAULT_MONTH,
  DIVS,
  HOLDING_TYPES,
  PrfGroupField,
  SelectField,
} from "@/components/reports/shared";

export function UnitWiseHoldingData() {
  const [prfSearch, setPrfSearch] = useState("");
  const [prfGroup, setPrfGroup] = useState("");
  const [holdingType, setHoldingType] = useState("");
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [arm, setArm] = useState("");
  const [command, setCommand] = useState("");
  const [corps, setCorps] = useState("");
  const [div, setDiv] = useState("");
  const [bde, setBde] = useState("");
  const [susNo, setSusNo] = useState("");
  const [unitName, setUnitName] = useState("");

  const handleClear = () => {
    setPrfSearch("");
    setPrfGroup("");
    setHoldingType("");
    setMonth(DEFAULT_MONTH);
    setArm("");
    setCommand("");
    setCorps("");
    setDiv("");
    setBde("");
    setSusNo("");
    setUnitName("");
  };

  return (
    <FormPanel
      title="UNIT WISE HOLDING DATA"
      footer={
        <>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => toast.message("List Holding Data — functionality coming soon")}
          >
            List Holding Data
          </Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => toast.message("Holding Data Summary — functionality coming soon")}
          >
            Holding Data Summary
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-5xl space-y-2 pt-1">
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
              placeholder="--ALL Type of Holding-"
            />
          </FormRow>
          <FormRow label="Month" className="sm:grid-cols-[80px_minmax(0,1fr)]">
            <MonthInput value={month} onChange={setMonth} />
          </FormRow>
        </FormGrid>

        <FormRow label="Arm" className="sm:grid-cols-[120px_minmax(0,1fr)] sm:max-w-xl">
          <SelectField
            value={arm}
            onChange={setArm}
            options={ARMS}
            placeholder="-- All ARMS --"
          />
        </FormRow>

        <FormGrid cols={2}>
          <FormRow label="Command" className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <SelectField
              value={command}
              onChange={setCommand}
              options={COMMANDS}
              placeholder="-- All Command --"
            />
          </FormRow>
          <FormRow label="Corps" className="sm:grid-cols-[80px_minmax(0,1fr)]">
            <SelectField
              value={corps}
              onChange={setCorps}
              options={CORPS}
              placeholder="-- All Corps --"
            />
          </FormRow>
          <FormRow label="Div" className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <SelectField
              value={div}
              onChange={setDiv}
              options={DIVS}
              placeholder="-- All Div --"
            />
          </FormRow>
          <FormRow label="Bde" className="sm:grid-cols-[80px_minmax(0,1fr)]">
            <SelectField
              value={bde}
              onChange={setBde}
              options={BDES}
              placeholder="-- All Bde --"
            />
          </FormRow>
          <FormRow label="SUS No" className="sm:grid-cols-[120px_minmax(0,1fr)]">
            <Input
              placeholder="Search..."
              value={susNo}
              onChange={(e) => setSusNo(e.target.value)}
            />
          </FormRow>
          <FormRow label="Unit Name" className="sm:grid-cols-[80px_minmax(0,1fr)]">
            <Input
              placeholder="Search..."
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}
