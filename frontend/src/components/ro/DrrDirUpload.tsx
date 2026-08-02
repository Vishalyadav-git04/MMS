import { useState } from "react";
import { Download } from "lucide-react";
import { FormPanel, FormSection } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function DrrDirUpload() {
  const [type, setType] = useState<"DRR" | "DIR">("DRR");
  const [fileName, setFileName] = useState("");

  const handleSubmit = () => {
    if (!fileName) {
      return toast.error("Please choose an Excel file to upload");
    }
    toast.success(`${type} upload submitted`);
  };

  const handleCancel = () => {
    setType("DRR");
    setFileName("");
    toast("Cancelled");
  };

  return (
    <FormPanel
      title="DRR/ DIR UPLOAD"
      footer={
        <>
          <Button
            onClick={handleSubmit}
          >
            Submit
          </Button>
          <Button variant="destructive" onClick={handleCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <FormSection title="Receive / issue" />

        <div className="py-3">
          <RadioGroup
            value={type}
            onValueChange={(v) => setType(v as "DRR" | "DIR")}
            className="flex flex-row gap-10"
          >
            {(
              [
                { value: "DRR", id: "drr-upload-type" },
                { value: "DIR", id: "dir-upload-type" },
              ] as const
            ).map((opt) => (
              <div
                key={opt.value}
                className="flex cursor-pointer flex-col items-center gap-1.5"
                onClick={() => setType(opt.value)}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={opt.id}
                  className="h-4 w-4 p-0"
                />
                <Label htmlFor={opt.id} className="cursor-pointer text-[14px] font-normal">
                  {opt.value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <FormSection title="Upload" />

        <div className="flex flex-col gap-4 py-3">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:gap-6">
            <p className="text-[12px] font-semibold leading-snug text-[var(--ink-soft,#54606c)]">
              <span className="mr-0.5 text-[var(--danger,#b3261e)]">*</span>
              Click Choose File/Browse button below and pick the sample Excel file
              or another excel file
            </p>
            <Input
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="h-auto max-w-md py-1.5"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-[var(--ink-soft,#54606c)]">
              Download Format
            </span>
            <button
              type="button"
              data-size="icon"
              onClick={() => toast.info(`Downloading ${type} format template...`)}
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--accent,#14568c)] text-white shadow-[var(--shadow-sm)] hover:bg-[#1d74b8]"
              aria-label={`Download ${type} format`}
              title="Download Format"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </FormPanel>
  );
}
