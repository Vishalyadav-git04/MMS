import { useState } from "react";
import { FormPanel } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function DrrDirUpload() {
  const [type, setType] = useState<"DRR" | "DIR">("DRR");

  return (
    <FormPanel
      title="DRR/ DIR UPLOAD"
      tabs={
        <div className="pb-2 text-center text-sm font-semibold text-foreground">
          Receive / Issue
        </div>
      }
      footer={
        <>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => toast.success(`${type} upload submitted`)}
          >
            Submit
          </Button>
          <Button variant="destructive" onClick={() => toast("Cancelled")}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="min-h-[120px] flex items-start pt-2">
        <RadioGroup
          value={type}
          onValueChange={(v) => setType(v as "DRR" | "DIR")}
          className="flex flex-row gap-10"
        >
          <div className="flex flex-col items-center gap-1.5">
            <RadioGroupItem value="DRR" id="drr" />
            <Label htmlFor="drr" className="text-sm font-normal">
              DRR
            </Label>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <RadioGroupItem value="DIR" id="dir" />
            <Label htmlFor="dir" className="text-sm font-normal">
              DIR
            </Label>
          </div>
        </RadioGroup>
      </div>
    </FormPanel>
  );
}
