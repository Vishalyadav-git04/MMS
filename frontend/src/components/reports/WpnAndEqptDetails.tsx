import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  COMMANDS,
  DualSelectPane,
  LINE_DTES,
  SAMPLE_UNITS,
  SelectField,
  WPN_CATS,
  WPN_SUB_CATS,
} from "@/components/reports/shared";

export function WpnAndEqptDetails() {
  const [wpnCat, setWpnCat] = useState("");
  const [wpnSubCat, setWpnSubCat] = useState("");
  const [command, setCommand] = useState("");
  const [lineDte, setLineDte] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const handleClear = () => {
    setWpnCat("");
    setWpnSubCat("");
    setCommand("");
    setLineDte("");
    setSelectedUnits([]);
  };

  const handleSearch = () => {
    if (!wpnCat) {
      toast.error("WPN CAT is required");
      return;
    }
    toast.message("Search — functionality coming soon");
  };

  return (
    <FormPanel
      title="WPNS AND EQPTS DETLS : LINE DTE"
      fill
      lockBodyScroll
      footer={
        <>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleSearch}>Search</Button>
          <Button
            className="bg-[oklch(0.62_0.12_55)] hover:bg-[oklch(0.58_0.12_55)] text-white"
            onClick={() => toast.message("Export — functionality coming soon")}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden">
        <FormGrid cols={2} className="shrink-0">
          <FormRow label="WPN CAT" required>
            <SelectField
              value={wpnCat}
              onChange={setWpnCat}
              options={WPN_CATS}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="WPN SUB CAT">
            <SelectField
              value={wpnSubCat}
              onChange={setWpnSubCat}
              options={WPN_SUB_CATS}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="COMMAND">
            <SelectField
              value={command}
              onChange={setCommand}
              options={COMMANDS}
              placeholder="-- Select All --"
            />
          </FormRow>
          <FormRow label="Line Dte">
            <SelectField
              value={lineDte}
              onChange={setLineDte}
              options={LINE_DTES}
              placeholder="--Select--"
            />
          </FormRow>
        </FormGrid>

        <DualSelectPane
          available={SAMPLE_UNITS}
          selected={selectedUnits}
          onChange={setSelectedUnits}
          searchPlaceholder="Search unit name.."
          selectedLabel="Selected Units"
          className="min-h-0 flex-1"
        />
      </div>
    </FormPanel>
  );
}
