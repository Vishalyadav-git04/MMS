import { useMemo, useState } from "react";
import { FormPanel } from "@/components/FormPanel";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type SearchField = "Nomenclature" | "Census No" | "Material No" | "Cat Part No";

interface MlccsRow {
  id: string;
  materialNo: string;
  censusNo: string;
  nomenclature: string;
  classOfEqpt: string;
  catPartNo: string;
  au: string;
  status: string;
}

const DUMMY_ROWS: MlccsRow[] = [
  {
    id: "1",
    materialNo: "MAT-100245",
    censusNo: "CN-2020-01482",
    nomenclature: "Rifle 5.56mm Assault — Standard Pattern",
    classOfEqpt: "Class I",
    catPartNo: "CP-A247108",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "2",
    materialNo: "MAT-100312",
    censusNo: "CN-2021-00891",
    nomenclature: "Machine Gun 7.62mm Light — Belt Fed",
    classOfEqpt: "Class I",
    catPartNo: "CP-B381204",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "3",
    materialNo: "MAT-100478",
    censusNo: "CN-2019-03301",
    nomenclature: "Night Vision Sight — Gen III Clip-On",
    classOfEqpt: "Class II",
    catPartNo: "CP-C552917",
    au: "NOS",
    status: "Pending",
  },
  {
    id: "4",
    materialNo: "MAT-100501",
    censusNo: "CN-2022-00115",
    nomenclature: "Radio Set VHF Manpack — 5W",
    classOfEqpt: "Class II",
    catPartNo: "CP-D118640",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "5",
    materialNo: "MAT-100629",
    censusNo: "CN-2018-04772",
    nomenclature: "Binocular Prismatic 7x50 — Military",
    classOfEqpt: "Class III",
    catPartNo: "CP-E774023",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "6",
    materialNo: "MAT-100744",
    censusNo: "CN-2023-00654",
    nomenclature: "Mortar 81mm — Smooth Bore Complete",
    classOfEqpt: "Class I",
    catPartNo: "CP-F902331",
    au: "NOS",
    status: "Obs",
  },
  {
    id: "7",
    materialNo: "MAT-100815",
    censusNo: "CN-2020-01903",
    nomenclature: "Laser Range Finder — Hand Held 10km",
    classOfEqpt: "Class II",
    catPartNo: "CP-G445812",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "8",
    materialNo: "MAT-100902",
    censusNo: "CN-2021-02240",
    nomenclature: "Ballistic Helmet — Level IIIA Composite",
    classOfEqpt: "Class III",
    catPartNo: "CP-H661059",
    au: "NOS",
    status: "Approved",
  },
  {
    id: "9",
    materialNo: "MAT-101033",
    censusNo: "CN-2017-05518",
    nomenclature: "Generator Set Diesel 5kVA — Portable",
    classOfEqpt: "Class II",
    catPartNo: "CP-J228774",
    au: "NOS",
    status: "Pending",
  },
  {
    id: "10",
    materialNo: "MAT-101156",
    censusNo: "CN-2024-00087",
    nomenclature: "UAV Reconnaissance Mini — Day/Night",
    classOfEqpt: "Class I",
    catPartNo: "CP-K319460",
    au: "NOS",
    status: "Approved",
  },
];

export function ViewMlccs() {
  const [searchText, setSearchText] = useState("");
  const [searchIn, setSearchIn] = useState<SearchField>("Nomenclature");
  const [classOfEqpt, setClassOfEqpt] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [queried, setQueried] = useState(true);
  const [appliedSearch, setAppliedSearch] = useState({ text: "", field: "Nomenclature" as SearchField, classOfEqpt: "" });

  const filtered = useMemo(() => {
    if (!queried) return [];
    return DUMMY_ROWS.filter((row) => {
      if (appliedSearch.classOfEqpt && row.classOfEqpt !== appliedSearch.classOfEqpt) {
        return false;
      }
      if (appliedSearch.text.trim()) {
        const q = appliedSearch.text.trim().toLowerCase();
        const fieldMap: Record<SearchField, string> = {
          Nomenclature: row.nomenclature,
          "Census No": row.censusNo,
          "Material No": row.materialNo,
          "Cat Part No": row.catPartNo,
        };
        if (!fieldMap[appliedSearch.field].toLowerCase().includes(q)) return false;
      }
      if (resultFilter.trim()) {
        const q = resultFilter.trim().toLowerCase();
        return (
          row.materialNo.toLowerCase().includes(q) ||
          row.censusNo.toLowerCase().includes(q) ||
          row.nomenclature.toLowerCase().includes(q) ||
          row.classOfEqpt.toLowerCase().includes(q) ||
          row.catPartNo.toLowerCase().includes(q) ||
          row.au.toLowerCase().includes(q) ||
          row.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queried, appliedSearch, resultFilter]);

  const handleSearch = () => {
    setAppliedSearch({ text: searchText, field: searchIn, classOfEqpt });
    setQueried(true);
    setSelectedId("");
    toast.success("Search complete");
  };

  return (
    <FormPanel title="VIEW MLCCS" fill>
      <div className="space-y-3">
        <div className="rounded border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">in</span>
            <Select value={searchIn} onValueChange={(v) => setSearchIn(v as SearchField)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nomenclature">Nomenclature</SelectItem>
                <SelectItem value="Census No">Census No</SelectItem>
                <SelectItem value="Material No">Material No</SelectItem>
                <SelectItem value="Cat Part No">Cat Part No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-foreground">Class of Eqpt</span>
            <Select value={classOfEqpt} onValueChange={setClassOfEqpt}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="--Select--" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Class I">Class I</SelectItem>
                <SelectItem value="Class II">Class II</SelectItem>
                <SelectItem value="Class III">Class III</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-primary">
            Select a Census No to Modify Data
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Search in Result({filtered.length}):
            </span>
            <Input
              className="h-7 w-40"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-auto rounded border border-border">
          <RadioGroup value={selectedId} onValueChange={setSelectedId}>
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-10 text-primary-foreground" />
                  <TableHead className="text-primary-foreground text-xs">Material No</TableHead>
                  <TableHead className="text-primary-foreground text-xs">Census No</TableHead>
                  <TableHead className="text-primary-foreground text-xs">Nomenclature</TableHead>
                  <TableHead className="text-primary-foreground text-xs">Class of Eqpt</TableHead>
                  <TableHead className="text-primary-foreground text-xs">Cat Part No</TableHead>
                  <TableHead className="text-primary-foreground text-xs">A/U</TableHead>
                  <TableHead className="text-primary-foreground text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    className={idx % 2 === 1 ? "bg-muted/40" : undefined}
                  >
                    <TableCell className="w-10">
                      <RadioGroupItem value={row.id} id={`mlccs-${row.id}`} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.materialNo}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.censusNo}</TableCell>
                    <TableCell className="text-xs min-w-[220px]">{row.nomenclature}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.classOfEqpt}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.catPartNo}</TableCell>
                    <TableCell className="text-xs">{row.au}</TableCell>
                    <TableCell className="text-xs">{row.status}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center text-sm text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </RadioGroup>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => toast.success("Export started")}
            >
              Export
            </Button>
            <Button onClick={() => toast("Print dialog opened")}>Print Page</Button>
          </div>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => {
              if (!selectedId) return toast.error("Select a Census No first");
              const row = DUMMY_ROWS.find((r) => r.id === selectedId);
              toast.success(`Modify Census: ${row?.censusNo}`);
            }}
          >
            Modify Census Details
          </Button>
        </div>
      </div>
    </FormPanel>
  );
}
