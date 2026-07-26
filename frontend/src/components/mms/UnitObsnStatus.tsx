import { useState } from "react";
import { FormPanel, FormRow, FormGrid } from "@/components/FormPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function UnitObsnStatus() {
  const [unitName, setUnitName] = useState("");
  const [period, setPeriod] = useState("2026-07");
  const [status, setStatus] = useState("all");

  return (
    <FormPanel title="Unit Obsn Status" fill>
      <div className="flex h-full min-h-0 flex-col gap-1.5">
        <FormGrid cols={3}>
          <FormRow label="Unit Name">
            <Input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="Search..."
            />
          </FormRow>
          <FormRow label="Period">
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </FormRow>
          <FormRow label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- ALL STATUS --</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        </FormGrid>

        {/* Action buttons above the grid */}
        <div className="flex flex-wrap justify-center gap-2 py-1">
          <Button
            onClick={() => toast.success("Searching records...")}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setUnitName("");
              setStatus("all");
            }}
          >
            Clear
          </Button>
          <Button variant="destructive">Cancel</Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
          <div className="flex shrink-0 items-center justify-between px-3 py-1 bg-secondary/60 text-[10px]">
            <div>
              Show{" "}
              <select className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px]">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>{" "}
              entries
            </div>
            <div className="flex items-center gap-1.5">
              Search: <Input className="h-6 w-36" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  {[
                    "Unit Name",
                    "Uploaded Doc",
                    "Obsn ID",
                    "Observation",
                    "Obsn Date",
                    "Date of Completion",
                    "Completion by",
                    "MISO Reply",
                  ].map((h) => (
                    <TableHead key={h} className="text-primary-foreground font-semibold text-[10px]">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-xs">
                    No data available in table
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="flex shrink-0 items-center justify-between px-3 py-1 bg-muted/40 text-[10px] text-muted-foreground">
            <div>Showing 0 to 0 of 0 entries</div>
            <div className="flex gap-0.5">
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5">
                First
              </Button>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5">
                Previous
              </Button>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5">
                Next
              </Button>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5">
                Last
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FormPanel>
  );
}
