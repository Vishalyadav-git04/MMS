import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, type ModuleId, type WeaponSub } from "@/components/AppLayout";
import { SubModuleTiles } from "@/components/SubModuleTiles";
import { CaptureMlccs } from "@/components/mms/CaptureMlccs";
import { LinkEqptUe } from "@/components/mms/LinkEqptUe";
import { UnitObsnStatus } from "@/components/mms/UnitObsnStatus";
import { MmsDomainMaster } from "@/components/mms/MmsDomainMaster";
import { SearchRegnNo } from "@/components/mms/SearchRegnNo";
import { EqptDomainMaster } from "@/components/ep/EqptDomainMaster";
import { SubDomainMaster } from "@/components/ep/SubDomainMaster";
import { GenEpCensus } from "@/components/ep/GenEpCensus";
import { CaptureEpStores } from "@/components/ep/CaptureEpStores";
import { SearchApproveEpStores } from "@/components/ep/SearchApproveEpStores";
import { DrrDirUpload } from "@/components/ro/DrrDirUpload";
import { GenerateRo } from "@/components/ro/GenerateRo";
import { SearchRo } from "@/components/ro/SearchRo";
import { ViewMlccs } from "@/components/mlccs/ViewMlccs";
import {
  InterUnitTransfer,
  DepotToDepotTransfer,
  UnitToDepotDeposit,
} from "@/components/transfer/EqptTransferForms";
import { Toaster } from "@/components/ui/sonner";
import {
  FileText,
  Link2,
  ClipboardList,
  Database,
  Search,
  LayoutDashboard,
  Shield,
  HardDrive,
  BarChart3,
  Boxes,
  Layers,
  Network,
  Hash,
  PackagePlus,
  ClipboardCheck,
  Upload,
  FileOutput,
  SearchCheck,
  Eye,
  ArrowLeftRight,
  Warehouse,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MISO · Indian Army — Management Information System Organisation" },
      {
        name: "description",
        content:
          "MISO v5.0 — Indian Army Management Information System Organisation. Weapon, MLCCS, MMS Admin, Unit Holding, Reports and IT Asset management.",
      },
      { property: "og:title", content: "MISO · Indian Army" },
      { property: "og:description", content: "Management Information System Organisation — Indian Army" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MMS_TILES = [
  { id: "capture-mlccs", label: "Capture MLCCS Details", icon: FileText, description: "Add / modify census records" },
  { id: "link-eqpt-ue", label: "Link Eqpt with UE", icon: Link2, description: "Link census to item code" },
  { id: "unit-obsn-status", label: "Unit Obsn Status", icon: ClipboardList, description: "Track unit observations" },
  { id: "mms-domain-master", label: "MMS Domain Master", icon: Database, description: "Domain reference data" },
  { id: "search-regn-no", label: "Search Regn No", icon: Search, description: "Lookup by registration" },
];

const EP_TILES = [
  { id: "domain-master", label: "Domain Master", icon: Layers, description: "EQPT domain reference" },
  { id: "sub-domain-master", label: "Sub Domain Master", icon: Network, description: "Sub-domain under EQPT cat" },
  { id: "gen-ep-census", label: "Gen EP Census", icon: Hash, description: "Generate EP census numbers" },
  { id: "capture-ep-stores", label: "Capture EP Stores", icon: PackagePlus, description: "Capture EP store holdings" },
  { id: "search-approve-ep", label: "Search/Approve EP Stores", icon: ClipboardCheck, description: "Search and approve EP stores" },
];

const RO_TILES = [
  { id: "drr-dir-upload", label: "Upload DIR/DRR", icon: Upload, description: "Receive / Issue DRR or DIR" },
  { id: "generate-ro", label: "Generate RO", icon: FileOutput, description: "Create MMS release orders" },
  { id: "search-ro", label: "Search RO", icon: SearchCheck, description: "Search release orders" },
];

const MLCCS_TILES = [
  { id: "view-mlccs", label: "View MLCCS", icon: Eye, description: "Search and view census records" },
];

const TRANSFER_TILES = [
  {
    id: "inter-unit",
    label: "Inter Unit Transfer (Unit to Unit)",
    icon: ArrowLeftRight,
    description: "Transfer equipment between units",
  },
  {
    id: "depot-to-depot",
    label: "EQPT Transfer (Depot to Depot)",
    icon: Warehouse,
    description: "Transfer equipment between depots",
  },
  {
    id: "unit-to-depot",
    label: "EQPT Deposit (Unit to Depot)",
    icon: PackageCheck,
    description: "Deposit equipment from unit to depot",
  },
];

type MmsTile = (typeof MMS_TILES)[number]["id"];
type EpTile = (typeof EP_TILES)[number]["id"];
type RoTile = (typeof RO_TILES)[number]["id"];
type MlccsTile = (typeof MLCCS_TILES)[number]["id"];
type TransferTile = (typeof TRANSFER_TILES)[number]["id"];

function Index() {
  const [active, setActive] = useState<ModuleId>("weapon");
  const [activeSub, setActiveSub] = useState<WeaponSub | null>("mms-admin");
  const [activeMms, setActiveMms] = useState<MmsTile | null>(null);
  const [activeEp, setActiveEp] = useState<EpTile | null>(null);
  const [activeRo, setActiveRo] = useState<RoTile | null>(null);
  const [activeMlccs, setActiveMlccs] = useState<MlccsTile | null>(null);
  const [activeTransfer, setActiveTransfer] = useState<TransferTile | null>(null);

  const handleSelect = (m: ModuleId, sub?: WeaponSub) => {
    setActive(m);
    setActiveMms(null);
    setActiveEp(null);
    setActiveRo(null);
    setActiveMlccs(null);
    setActiveTransfer(null);
    if (m === "weapon") {
      setActiveSub(sub ?? "mms-admin");
    } else {
      setActiveSub(null);
    }
  };

  const breadcrumb: string[] = ["Home"];
  if (active === "dashboard") breadcrumb.push("Dashboard");
  if (active === "it-asset") breadcrumb.push("IT Asset");
  if (active === "weapon") {
    breadcrumb.push("Weapon");
    if (activeSub) {
      const label = {
        "mlccs": "MLCCS",
        "unit-holding": "Unit Holding",
        "reports": "Reports",
        "mms-admin": "MMS Admin",
        "ep-stores": "EP Stores",
        "generate-ro": "Generate RO",
        "eqpt-transfer": "EQPT Transfer/Deposit",
      }[activeSub];
      breadcrumb.push(label);
      if (activeSub === "mms-admin" && activeMms) {
        const tile = MMS_TILES.find((t) => t.id === activeMms);
        if (tile) breadcrumb.push(tile.label);
      }
      if (activeSub === "ep-stores" && activeEp) {
        const tile = EP_TILES.find((t) => t.id === activeEp);
        if (tile) breadcrumb.push(tile.label);
      }
      if (activeSub === "generate-ro" && activeRo) {
        const tile = RO_TILES.find((t) => t.id === activeRo);
        if (tile) breadcrumb.push(tile.label);
      }
      if (activeSub === "mlccs" && activeMlccs) {
        const tile = MLCCS_TILES.find((t) => t.id === activeMlccs);
        if (tile) breadcrumb.push(tile.label);
      }
      if (activeSub === "eqpt-transfer" && activeTransfer) {
        const tile = TRANSFER_TILES.find((t) => t.id === activeTransfer);
        if (tile) breadcrumb.push(tile.label);
      }
    }
  }

  const activeTile = MMS_TILES.find((t) => t.id === activeMms);
  const activeEpTile = EP_TILES.find((t) => t.id === activeEp);
  const activeRoTile = RO_TILES.find((t) => t.id === activeRo);
  const activeMlccsTile = MLCCS_TILES.find((t) => t.id === activeMlccs);
  const activeTransferTile = TRANSFER_TILES.find((t) => t.id === activeTransfer);

  return (
    <>
      <AppLayout
        active={active}
        activeSub={activeSub}
        onSelect={handleSelect}
        breadcrumb={breadcrumb}
      >
        {active === "dashboard" && <DashboardScreen />}
        {active === "it-asset" && (
          <PlaceholderScreen
            icon={HardDrive}
            title="IT Asset Management"
            description="IT asset registry, hardware inventory and lifecycle tracking."
          />
        )}
        {active === "weapon" && activeSub === "mms-admin" && !activeMms && (
          <div className="space-y-3">
            <SectionHeading
              title="MMS Admin"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={MMS_TILES}
              active=""
              onSelect={(id) => setActiveMms(id as MmsTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "mms-admin" && activeMms && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  MMS Admin
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {activeTile?.label}
                </h2>
              </div>
              <button
                onClick={() => setActiveMms(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
              >
                ← Back to sub-modules
              </button>
            </div>
            {activeMms === "capture-mlccs" && <CaptureMlccs />}
            {activeMms === "link-eqpt-ue" && <LinkEqptUe />}
            {activeMms === "unit-obsn-status" && <UnitObsnStatus />}
            {activeMms === "mms-domain-master" && <MmsDomainMaster />}
            {activeMms === "search-regn-no" && <SearchRegnNo />}
          </div>
        )}
        {active === "weapon" && activeSub === "ep-stores" && !activeEp && (
          <div className="space-y-3">
            <SectionHeading
              title="EP Stores"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={EP_TILES}
              active=""
              onSelect={(id) => setActiveEp(id as EpTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "ep-stores" && activeEp && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  EP Stores
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {activeEpTile?.label}
                </h2>
              </div>
              <button
                onClick={() => setActiveEp(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
              >
                ← Back to sub-modules
              </button>
            </div>
            {activeEp === "domain-master" && <EqptDomainMaster />}
            {activeEp === "sub-domain-master" && <SubDomainMaster />}
            {activeEp === "gen-ep-census" && <GenEpCensus />}
            {activeEp === "capture-ep-stores" && <CaptureEpStores />}
            {activeEp === "search-approve-ep" && <SearchApproveEpStores />}
          </div>
        )}
        {active === "weapon" && activeSub === "generate-ro" && !activeRo && (
          <div className="space-y-3">
            <SectionHeading
              title="Generate RO"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={RO_TILES}
              active=""
              onSelect={(id) => setActiveRo(id as RoTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "generate-ro" && activeRo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Generate RO
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {activeRoTile?.label}
                </h2>
              </div>
              <button
                onClick={() => setActiveRo(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
              >
                ← Back to sub-modules
              </button>
            </div>
            {activeRo === "drr-dir-upload" && <DrrDirUpload />}
            {activeRo === "generate-ro" && <GenerateRo />}
            {activeRo === "search-ro" && <SearchRo />}
          </div>
        )}
        {active === "weapon" && activeSub === "mlccs" && !activeMlccs && (
          <div className="space-y-3">
            <SectionHeading
              title="MLCCS"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={MLCCS_TILES}
              active=""
              onSelect={(id) => setActiveMlccs(id as MlccsTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "mlccs" && activeMlccs && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  MLCCS
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {activeMlccsTile?.label}
                </h2>
              </div>
              <button
                onClick={() => setActiveMlccs(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
              >
                ← Back to sub-modules
              </button>
            </div>
            {activeMlccs === "view-mlccs" && <ViewMlccs />}
          </div>
        )}
        {active === "weapon" && activeSub === "eqpt-transfer" && !activeTransfer && (
          <div className="space-y-3">
            <SectionHeading
              title="EQPT Transfer/Deposit"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={TRANSFER_TILES}
              active=""
              onSelect={(id) => setActiveTransfer(id as TransferTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "eqpt-transfer" && activeTransfer && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  EQPT Transfer/Deposit
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {activeTransferTile?.label}
                </h2>
              </div>
              <button
                onClick={() => setActiveTransfer(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
              >
                ← Back to sub-modules
              </button>
            </div>
            {activeTransfer === "inter-unit" && <InterUnitTransfer />}
            {activeTransfer === "depot-to-depot" && <DepotToDepotTransfer />}
            {activeTransfer === "unit-to-depot" && <UnitToDepotDeposit />}
          </div>
        )}
        {active === "weapon" &&
          activeSub &&
          activeSub !== "mms-admin" &&
          activeSub !== "ep-stores" &&
          activeSub !== "generate-ro" &&
          activeSub !== "mlccs" &&
          activeSub !== "eqpt-transfer" && (
          <PlaceholderScreen
            icon={
              activeSub === "unit-holding"
                ? Boxes
                : activeSub === "reports"
                  ? BarChart3
                  : Shield
            }
            title={
              {
                "unit-holding": "Unit Holding",
                "reports": "Reports",
              }[activeSub]
            }
            description="This module will follow the same tile-based sub-module pattern as MMS Admin."
          />
        )}
      </AppLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}


function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
      <div>
        <h2 className="text-xl font-bold text-primary tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-1 w-16 rounded-full bg-accent" />
    </div>
  );
}

function DashboardScreen() {
  const stats = [
    { label: "Active Units", value: "1,284", color: "bg-primary" },
    { label: "Census Records", value: "48,921", color: "bg-accent" },
    { label: "Open Observations", value: "37", color: "bg-destructive" },
    { label: "Pending RO", value: "12", color: "bg-success" },
  ];
  return (
    <div className="space-y-6">
      <SectionHeading title="Dashboard" subtitle="MISO v5.0 · Operational overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className={`h-1 w-10 rounded-full ${s.color} mb-3`} />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="h-5 w-5 text-accent" />
          <h3 className="text-base font-semibold text-primary">Welcome back, VISHAL</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to navigate. Weapon → MMS Admin is preconfigured with the tile-based
          sub-module switcher.
        </p>
      </div>
    </div>
  );
}

function PlaceholderScreen({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-5">
      <SectionHeading title={title} />
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <Icon className="h-10 w-10 mx-auto text-accent mb-3" />
        <div className="text-base font-semibold text-primary">{title}</div>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
      </div>
    </div>
  );
}
