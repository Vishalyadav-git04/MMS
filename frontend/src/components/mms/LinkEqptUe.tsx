import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function LinkEqptUe() {
  const [censusNo, setCensusNo] = useState("");
  const [nomenclature, setNomenclature] = useState("");
  const [fetched, setFetched] = useState(false);
  const [linkedCode, setLinkedCode] = useState("");

  const [details, setDetails] = useState({
    catPartNo: "",
    prfGroup: "",
  });

  const handleFetch = () => {
    if (!censusNo || !nomenclature) {
      toast.error("Census No and Nomenclature are required");
      return;
    }
    setDetails({ catPartNo: "CP-77482", prfGroup: "Group B" });
    setFetched(true);
    toast.success("Details fetched");
  };

  return (
    <FormPanel
      title="Linking of Census No with Item Code"
      footer={
        !fetched ? (
          <>
            <Button onClick={handleFetch} className="bg-primary hover:bg-primary/90">
              Fetch Details
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCensusNo("");
                setNomenclature("");
              }}
            >
              Clear
            </Button>
            <Button variant="destructive" onClick={() => toast("Cancelled")}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                if (!linkedCode) return toast.error("Select an item code");
                toast.success("Item code linked");
              }}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              Update
            </Button>
            <Button variant="secondary" onClick={() => setLinkedCode("")}>
              Clear
            </Button>
            <Button variant="destructive" onClick={() => setFetched(false)}>
              Cancel
            </Button>
          </>
        )
      }
    >
      {!fetched ? (
        <div className="mx-auto max-w-3xl space-y-4 pt-2">
          <FormRow label="Census No" required>
            <Input
              value={censusNo}
              onChange={(e) => setCensusNo(e.target.value)}
              placeholder="Search..."
            />
          </FormRow>
          <FormRow label="Nomenclature" required>
            <Textarea
              rows={1}
              value={nomenclature}
              onChange={(e) => setNomenclature(e.target.value)}
              placeholder="Search..."
            />
          </FormRow>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-3 pt-2">
          <FormGrid>
            <FormRow label="Census No" required>
              <Input value={censusNo} disabled />
            </FormRow>
            <FormRow label="Cat/Part No" required>
              <Input value={details.catPartNo} disabled />
            </FormRow>
          </FormGrid>
          <FormRow label="Nomenclature" required>
            <Textarea rows={1} value={nomenclature} disabled />
          </FormRow>
          <FormRow label="PRF Group" required>
            <Input value={details.prfGroup} disabled />
          </FormRow>
          <FormRow label="Linked Item Code" required>
            <Select value={linkedCode} onValueChange={setLinkedCode}>
              <SelectTrigger>
                <SelectValue placeholder="--Select Item Code--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IC-1001">IC-1001 · Rifle Assembly</SelectItem>
                <SelectItem value="IC-1002">IC-1002 · Barrel Kit</SelectItem>
                <SelectItem value="IC-1003">IC-1003 · Sight Unit</SelectItem>
                <SelectItem value="IC-1004">IC-1004 · Magazine Set</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        </div>
      )}
    </FormPanel>
  );
}
