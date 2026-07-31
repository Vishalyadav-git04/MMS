import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  BDES,
  COMMANDS,
  CORPS,
  DIVS,
  DualSelectPane,
  NODAL_DTES,
  SAMPLE_ITEMS,
  SelectField,
  WPN_CATS,
} from "@/components/reports/shared";

export function WpnEqptStatusNodalDte() {
  const [nodalDte, setNodalDte] = useState("");
  const [wpnCat, setWpnCat] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [corps, setCorps] = useState("");
  const [division, setDivision] = useState("");
  const [brigade, setBrigade] = useState("");
  const [unitName, setUnitName] = useState("");
  const [susNo, setSusNo] = useState("");

  const handleClear = () => {
    setNodalDte("");
    setWpnCat("");
    setSelectedItems([]);
    setCommand("");
    setCorps("");
    setDivision("");
    setBrigade("");
    setUnitName("");
    setSusNo("");
  };

  const handleSearch = () => {
    if (!nodalDte) {
      toast.error("Nodal Dte is required");
      return;
    }
    toast.message("Search — functionality coming soon");
  };

  return (
    <FormPanel
      title="WPNS AND EQPTS DETLS : NODAL DTE"
      fill
      lockBodyScroll
      footer={
        <>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleClear}
          >
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
          <FormRow label="Nodal Dte" required>
            <SelectField
              value={nodalDte}
              onChange={setNodalDte}
              options={NODAL_DTES}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="WPN CAT">
            <SelectField
              value={wpnCat}
              onChange={setWpnCat}
              options={WPN_CATS}
              placeholder="--Select--"
            />
          </FormRow>
        </FormGrid>

        <DualSelectPane
          available={SAMPLE_ITEMS}
          selected={selectedItems}
          onChange={setSelectedItems}
          searchPlaceholder="Search Item Nomenclature"
          selectedLabel="Selected Item Nomenclature"
          className="min-h-0 flex-1"
        />

        <FormGrid cols={2} className="shrink-0">
          <FormRow label="Command">
            <SelectField
              value={command}
              onChange={setCommand}
              options={COMMANDS}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="Corps">
            <SelectField
              value={corps}
              onChange={setCorps}
              options={CORPS}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="Division">
            <SelectField
              value={division}
              onChange={setDivision}
              options={DIVS}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="Brigade">
            <SelectField
              value={brigade}
              onChange={setBrigade}
              options={BDES}
              placeholder="--Select--"
            />
          </FormRow>
          <FormRow label="Unit Name">
            <Input
              placeholder="select Unit Name"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            />
          </FormRow>
          <FormRow label="SUS No">
            <Input
              placeholder="Select SUS No"
              value={susNo}
              onChange={(e) => setSusNo(e.target.value)}
            />
          </FormRow>
        </FormGrid>
      </div>
    </FormPanel>
  );
}
