import { useState } from "react";
import { Download } from "lucide-react";
import { FormPanel } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="-mx-2 sm:-mx-3 border-y border-border bg-muted/60 px-2 py-1 text-center text-[12px] font-semibold text-foreground">
      {title}
    </div>
  );
}

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
            className="bg-success hover:bg-success/90 text-success-foreground"
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
      <div className="-mt-2 flex flex-col sm:-mt-3">
        <SectionHeader title="Receive / Issue" />

        <div className="px-1 py-3">
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
                <Label htmlFor={opt.id} className="cursor-pointer text-sm font-normal">
                  {opt.value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <SectionHeader title="Upload" />

        <div className="flex flex-col gap-4 px-1 py-3">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:gap-6">
            <p className="text-[12px] leading-snug text-foreground">
              <span className="mr-0.5 text-destructive">*</span>
              Click Choose File/Browse button below and pick the sample Excel file
              or another excel file
            </p>
            <Input
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="h-auto max-w-md py-0.5"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-foreground">
              Download Format
            </span>
            <button
              type="button"
              onClick={() => toast.info(`Downloading ${type} format template...`)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
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
