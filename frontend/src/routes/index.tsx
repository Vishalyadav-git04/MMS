import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, type ModuleId, type WeaponSub } from "@/components/AppLayout";
import { LoginScreen } from "@/components/LoginScreen";
import { FormScreen } from "@/components/FormPanel";
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
import { EpIutTransfer } from "@/components/ep/EpIutTransfer";
import { DrrDirUpload } from "@/components/ro/DrrDirUpload";
import { GenerateRo } from "@/components/ro/GenerateRo";
import { SearchRo } from "@/components/ro/SearchRo";
import { ViewMlccs } from "@/components/mlccs/ViewMlccs";
import {
  InterUnitTransfer,
  DepotToDepotTransfer,
  UnitToDepotDeposit,
} from "@/components/transfer/EqptTransferForms";
import { AddNewEqpt } from "@/components/unit-holding/AddNewEqpt";
import { ApproveNewEqpt } from "@/components/unit-holding/ApproveNewEqpt";
import { UpdateEqptData } from "@/components/unit-holding/UpdateEqptData";
import { UpdateArtyEqptData } from "@/components/unit-holding/UpdateArtyEqptData";
import { AllIndiaHolding } from "@/components/reports/AllIndiaHolding";
import { UnitWiseHoldingData } from "@/components/reports/UnitWiseHoldingData";
import { WpnsAndEqptStatus } from "@/components/reports/WpnsAndEqptStatus";
import { WpnAndEqptDetails } from "@/components/reports/WpnAndEqptDetails";
import { WpnEqptStatusNodalDte } from "@/components/reports/WpnEqptStatusNodalDte";
import { Toaster } from "@/components/ui/sonner";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Bokeh } from "@/components/aid/Bokeh";
import { Magnetic } from "@/components/aid/Magnetic";
import { StatDrillCard } from "@/components/aid/StatDrillCard";
import { WelcomeSplash } from "@/components/aid/WelcomeSplash";
import { LiveHero } from "@/components/aid/LiveHero";
import { PageHeader } from "@/components/PageHeader";
import { ASSETS } from "@/assets/images";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  FileText,
  Link2,
  ClipboardList,
  Database,
  Search,
  Shield,
  HardDrive,
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
  BadgeCheck,
  RefreshCw,
  Crosshair,
  Globe2,
  Building2,
  ListChecks,
  Share2,
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
  {
    id: "ep-iut",
    label: "EP IUT (Inter Unit Transfer)",
    icon: ArrowLeftRight,
    description: "EP inter-unit transfer of registration numbers",
  },
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

const HOLDING_TILES = [
  {
    id: "add-new-eqpt",
    label: "ADD NEW EQPT",
    icon: PackagePlus,
    description: "Capture details of new equipment",
  },
  {
    id: "approve-new-eqpt",
    label: "APPROVE NEW EQPT",
    icon: BadgeCheck,
    description: "Search and approve new equipment",
  },
  {
    id: "update-eqpt-data",
    label: "UPDATE EQPT DATA",
    icon: RefreshCw,
    description: "Update equipment serviceability status",
  },
  {
    id: "update-arty-eqpt-data",
    label: "UPDATE ARTY EQPT DATA",
    icon: Crosshair,
    description: "Update artillery OH, barrel and strip inspection data",
  },
];

const REPORT_TILES = [
  {
    id: "all-india-holding",
    label: "ALL INDIA HOLDING",
    icon: Globe2,
    description: "All India Holding report for WPNs and EQPT",
  },
  {
    id: "unit-wise-holding-data",
    label: "UNIT WISE HOLDING DATA",
    icon: Building2,
    description: "Unit-wise holding data and summary",
  },
  {
    id: "wpns-and-eqpt-status",
    label: "WPNS AND EQPT STATUS",
    icon: Crosshair,
    description: "Weapon and equipment status by unit",
  },
  {
    id: "wpn-and-eqpt-details",
    label: "WPN AND EQPT DETAILS",
    icon: ListChecks,
    description: "WPNs and EQPT details by Line Dte",
  },
  {
    id: "wpn-eqpt-status-nodal-dte",
    label: "WPN EQPT STATUS NODAL DTE",
    icon: Share2,
    description: "WPNs and EQPT details by Nodal Dte",
  },
];

type MmsTile = (typeof MMS_TILES)[number]["id"];
type EpTile = (typeof EP_TILES)[number]["id"];
type RoTile = (typeof RO_TILES)[number]["id"];
type MlccsTile = (typeof MLCCS_TILES)[number]["id"];
type TransferTile = (typeof TRANSFER_TILES)[number]["id"];
type HoldingTile = (typeof HOLDING_TILES)[number]["id"];
type ReportTile = (typeof REPORT_TILES)[number]["id"];

function Index() {
  const { isAuthenticated, user, logout } = useAuth();
  const admin = isAdmin(user);

  const [active, setActive] = useState<ModuleId>("dashboard");
  const [activeSub, setActiveSub] = useState<WeaponSub | null>(null);
  const [activeMms, setActiveMms] = useState<MmsTile | null>(null);
  const [activeEp, setActiveEp] = useState<EpTile | null>(null);
  const [activeRo, setActiveRo] = useState<RoTile | null>(null);
  const [activeMlccs, setActiveMlccs] = useState<MlccsTile | null>(null);
  const [activeTransfer, setActiveTransfer] = useState<TransferTile | null>(null);
  const [activeHolding, setActiveHolding] = useState<HoldingTile | null>(null);
  const [activeReport, setActiveReport] = useState<ReportTile | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const wasAuth = useRef(isAuthenticated);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("mms:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mms:unauthorized", onUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!admin && activeSub === "mms-admin") {
      setActiveSub("mlccs");
      setActiveMms(null);
    }
  }, [admin, activeSub]);

  // Initialize state from URL search params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as ModuleId | null;
    const subParam = params.get("sub") as WeaponSub | null;
    const screenParam = params.get("screen");

    if (tabParam) setActive(tabParam);
    if (subParam) setActiveSub(subParam);
    if (screenParam) {
      if (subParam === "mms-admin") setActiveMms(screenParam as MmsTile);
      if (subParam === "ep-stores") setActiveEp(screenParam as EpTile);
      if (subParam === "generate-ro") setActiveRo(screenParam as RoTile);
      if (subParam === "mlccs") setActiveMlccs(screenParam as MlccsTile);
      if (subParam === "eqpt-transfer") setActiveTransfer(screenParam as TransferTile);
      if (subParam === "unit-holding") setActiveHolding(screenParam as HoldingTile);
      if (subParam === "reports") setActiveReport(screenParam as ReportTile);
    }
  }, []);

  // Synchronize state changes to URL search params in address bar
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (active && active !== "dashboard") params.set("tab", active);
    if (activeSub) params.set("sub", activeSub);
    const activeTile =
      activeMms ||
      activeEp ||
      activeRo ||
      activeMlccs ||
      activeTransfer ||
      activeHolding ||
      activeReport;
    if (activeTile) params.set("screen", activeTile);

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [
    active,
    activeSub,
    activeMms,
    activeEp,
    activeRo,
    activeMlccs,
    activeTransfer,
    activeHolding,
    activeReport,
  ]);

  // Visual-only splash after a fresh login transition (not on session restore refresh).
  useEffect(() => {
    if (!wasAuth.current && isAuthenticated) setShowSplash(true);
    if (!isAuthenticated) setShowSplash(false);
    wasAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleSelect = (m: ModuleId, sub?: WeaponSub) => {
    setActive(m);
    setActiveMms(null);
    setActiveEp(null);
    setActiveRo(null);
    setActiveMlccs(null);
    setActiveTransfer(null);
    setActiveHolding(null);
    setActiveReport(null);
    if (m === "weapon") {
      const next = sub ?? "mlccs";
      setActiveSub(next === "mms-admin" && !admin ? "mlccs" : next);
    } else {
      setActiveSub(null);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (showSplash) {
    return <WelcomeSplash onDone={() => setShowSplash(false)} />;
  }

  const breadcrumb: { label: string; onClick?: () => void }[] = [
    { label: "Home", onClick: () => handleSelect("dashboard") },
  ];
  if (active === "dashboard") breadcrumb.push({ label: "Dashboard" });
  if (active === "it-asset") breadcrumb.push({ label: "IT Asset" });
  if (active === "weapon") {
    breadcrumb.push({ label: "Weapon", onClick: () => handleSelect("weapon") });
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
      const hasTile =
        (activeSub === "mms-admin" && activeMms) ||
        (activeSub === "ep-stores" && activeEp) ||
        (activeSub === "generate-ro" && activeRo) ||
        (activeSub === "mlccs" && activeMlccs) ||
        (activeSub === "eqpt-transfer" && activeTransfer) ||
        (activeSub === "unit-holding" && activeHolding) ||
        (activeSub === "reports" && activeReport);
      breadcrumb.push({
        label,
        onClick: hasTile ? () => handleSelect("weapon", activeSub) : undefined,
      });
      if (activeSub === "mms-admin" && activeMms) {
        const tile = MMS_TILES.find((t) => t.id === activeMms);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "ep-stores" && activeEp) {
        const tile = EP_TILES.find((t) => t.id === activeEp);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "generate-ro" && activeRo) {
        const tile = RO_TILES.find((t) => t.id === activeRo);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "mlccs" && activeMlccs) {
        const tile = MLCCS_TILES.find((t) => t.id === activeMlccs);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "eqpt-transfer" && activeTransfer) {
        const tile = TRANSFER_TILES.find((t) => t.id === activeTransfer);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "unit-holding" && activeHolding) {
        const tile = HOLDING_TILES.find((t) => t.id === activeHolding);
        if (tile) breadcrumb.push({ label: tile.label });
      }
      if (activeSub === "reports" && activeReport) {
        const tile = REPORT_TILES.find((t) => t.id === activeReport);
        if (tile) breadcrumb.push({ label: tile.label });
      }
    }
  }

  const activeTile = MMS_TILES.find((t) => t.id === activeMms);
  const activeEpTile = EP_TILES.find((t) => t.id === activeEp);
  const activeRoTile = RO_TILES.find((t) => t.id === activeRo);
  const activeMlccsTile = MLCCS_TILES.find((t) => t.id === activeMlccs);
  const activeTransferTile = TRANSFER_TILES.find((t) => t.id === activeTransfer);
  const activeHoldingTile = HOLDING_TILES.find((t) => t.id === activeHolding);
  const activeReportTile = REPORT_TILES.find((t) => t.id === activeReport);

  const formOpen = Boolean(
    activeMms ||
      activeEp ||
      activeRo ||
      activeMlccs ||
      activeTransfer ||
      activeHolding ||
      activeReport,
  );
  const screenLabel =
    activeTile?.label ||
    activeEpTile?.label ||
    activeRoTile?.label ||
    activeMlccsTile?.label ||
    activeTransferTile?.label ||
    activeHoldingTile?.label ||
    activeReportTile?.label;
  const stageKey = [
    active,
    activeSub ?? "",
    activeMms ?? "",
    activeEp ?? "",
    activeRo ?? "",
    activeMlccs ?? "",
    activeTransfer ?? "",
    activeHolding ?? "",
    activeReport ?? "",
  ].join(":");

  return (
    <>
      <AppLayout
        active={active}
        activeSub={activeSub}
        onSelect={handleSelect}
        breadcrumb={breadcrumb}
        stageKey={stageKey}
        formOpen={formOpen}
        screenLabel={screenLabel}
      >
        {active === "dashboard" && (
          <DashboardScreen admin={admin} onNavigate={handleSelect} />
        )}
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
          <FormScreen
            section="MMS Admin"
            title={activeTile?.label ?? ""}
            onBack={() => setActiveMms(null)}
          >
            {activeMms === "capture-mlccs" && <CaptureMlccs />}
            {activeMms === "link-eqpt-ue" && <LinkEqptUe />}
            {activeMms === "unit-obsn-status" && <UnitObsnStatus />}
            {activeMms === "mms-domain-master" && <MmsDomainMaster />}
            {activeMms === "search-regn-no" && <SearchRegnNo />}
          </FormScreen>
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
          <FormScreen
            section="EP Stores"
            title={activeEpTile?.label ?? ""}
            onBack={() => setActiveEp(null)}
          >
            {activeEp === "domain-master" && <EqptDomainMaster />}
            {activeEp === "sub-domain-master" && <SubDomainMaster />}
            {activeEp === "gen-ep-census" && <GenEpCensus />}
            {activeEp === "capture-ep-stores" && <CaptureEpStores />}
            {activeEp === "search-approve-ep" && <SearchApproveEpStores />}
            {activeEp === "ep-iut" && <EpIutTransfer />}
          </FormScreen>
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
          <FormScreen
            section="Generate RO"
            title={activeRoTile?.label ?? ""}
            onBack={() => setActiveRo(null)}
          >
            {activeRo === "drr-dir-upload" && <DrrDirUpload />}
            {activeRo === "generate-ro" && <GenerateRo />}
            {activeRo === "search-ro" && <SearchRo />}
          </FormScreen>
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
          <FormScreen
            section="MLCCS"
            title={activeMlccsTile?.label ?? ""}
            onBack={() => setActiveMlccs(null)}
          >
            {activeMlccs === "view-mlccs" && <ViewMlccs />}
          </FormScreen>
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
          <FormScreen
            section="EQPT Transfer/Deposit"
            title={activeTransferTile?.label ?? ""}
            onBack={() => setActiveTransfer(null)}
          >
            {activeTransfer === "inter-unit" && <InterUnitTransfer />}
            {activeTransfer === "depot-to-depot" && <DepotToDepotTransfer />}
            {activeTransfer === "unit-to-depot" && <UnitToDepotDeposit />}
          </FormScreen>
        )}
        {active === "weapon" && activeSub === "unit-holding" && !activeHolding && (
          <div className="space-y-3">
            <SectionHeading
              title="Unit Holding"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={HOLDING_TILES}
              active=""
              onSelect={(id) => setActiveHolding(id as HoldingTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "unit-holding" && activeHolding && (
          <FormScreen
            section="Unit Holding"
            title={activeHoldingTile?.label ?? ""}
            onBack={() => setActiveHolding(null)}
          >
            {activeHolding === "add-new-eqpt" && <AddNewEqpt />}
            {activeHolding === "approve-new-eqpt" && <ApproveNewEqpt />}
            {activeHolding === "update-eqpt-data" && <UpdateEqptData />}
            {activeHolding === "update-arty-eqpt-data" && <UpdateArtyEqptData />}
          </FormScreen>
        )}
        {active === "weapon" && activeSub === "reports" && !activeReport && (
          <div className="space-y-3">
            <SectionHeading
              title="Reports"
              subtitle="Select a sub-module to begin."
            />
            <SubModuleTiles
              tiles={REPORT_TILES}
              active=""
              onSelect={(id) => setActiveReport(id as ReportTile)}
            />
          </div>
        )}
        {active === "weapon" && activeSub === "reports" && activeReport && (
          <FormScreen
            section="Reports"
            title={activeReportTile?.label ?? ""}
            onBack={() => setActiveReport(null)}
          >
            {activeReport === "all-india-holding" && <AllIndiaHolding />}
            {activeReport === "unit-wise-holding-data" && <UnitWiseHoldingData />}
            {activeReport === "wpns-and-eqpt-status" && <WpnsAndEqptStatus />}
            {activeReport === "wpn-and-eqpt-details" && <WpnAndEqptDetails />}
            {activeReport === "wpn-eqpt-status-nodal-dte" && <WpnEqptStatusNodalDte />}
          </FormScreen>
        )}
        {active === "weapon" &&
          activeSub &&
          activeSub !== "mms-admin" &&
          activeSub !== "ep-stores" &&
          activeSub !== "generate-ro" &&
          activeSub !== "mlccs" &&
          activeSub !== "eqpt-transfer" &&
          activeSub !== "unit-holding" &&
          activeSub !== "reports" && (
          <PlaceholderScreen
            icon={Shield}
            title={activeSub}
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
    <PageHeader
      eyebrow="Overview"
      title={title}
      subtitle={subtitle}
      action={
        <div
          className="h-1 w-16 rounded-full"
          style={{ backgroundColor: "#a85711" }}
          aria-hidden
        />
      }
    />
  );
}

interface DashboardCounts {
  mlccs: { unique_census_no: number; prf_group: number };
  ep: { domain: number; sub_domain: number; regn_no: number };
  mms: { ue: number; uh: number };
}

const DUMMY_MLCCS = { unique_census_no: 1284, prf_group: 86 };
const DUMMY_MMS = { ue: 4520, uh: 18976 };

function DashboardScreen({
  admin,
  onNavigate,
}: {
  admin: boolean;
  onNavigate: (m: ModuleId, sub?: WeaponSub) => void;
}) {
  const [epCounts, setEpCounts] = useState<DashboardCounts["ep"]>({
    domain: 0,
    sub_domain: 0,
    regn_no: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadEpCounts() {
      try {
        const data = await api<DashboardCounts>("/dashboard/counts");
        if (!cancelled) {
          setEpCounts(data.ep);
        }
        return;
      } catch {
        // Fall back to existing EP list endpoints if dashboard route is unavailable
      }
      try {
        const [domains, subDomains] = await Promise.all([
          api<{ id: string }[]>("/ep/domain-master/"),
          api<{ id: string }[]>("/ep/sub-domain-master/search"),
        ]);
        if (!cancelled) {
          setEpCounts({
            domain: domains.length,
            sub_domain: subDomains.length,
            regn_no: 0,
          });
        }
      } catch {
        if (!cancelled) {
          setEpCounts({ domain: 0, sub_domain: 0, regn_no: 0 });
        }
      }
    }

    void loadEpCounts().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = [
    {
      id: "mlccs" as const,
      title: "MLCCS",
      subtitle: "Master List of Census of Controlled Stores",
      icon: Eye,
      stats: [
        { label: "Unique Census No.", value: DUMMY_MLCCS.unique_census_no },
        { label: "PRF Group", value: DUMMY_MLCCS.prf_group },
      ],
      navigate: true as const,
      loadingStats: false,
    },
    {
      id: "ep-stores" as const,
      title: "EP",
      subtitle: "Equipment Personal / EP Stores",
      icon: PackagePlus,
      stats: [
        { label: "Total Domain", value: epCounts.domain },
        { label: "Sub Domain", value: epCounts.sub_domain },
        { label: "Total Regn No.", value: epCounts.regn_no },
      ],
      navigate: true as const,
      loadingStats: loading,
    },
    {
      id: "mms-admin" as const,
      title: "MMS",
      subtitle: "UE and UH totals",
      icon: Database,
      stats: [
        { label: "Total UE", value: DUMMY_MMS.ue },
        { label: "Total UH", value: DUMMY_MMS.uh },
      ],
      navigate: admin,
      loadingStats: false,
    },
  ];

  return (
    <div className="aid relative space-y-5">
      <Bokeh count={12} />
      <div className="relative z-[1] space-y-5">
        <LiveHero
          image={ASSETS.heroPinned}
          height={200}
          pinSubject
          className="mms-banner shadow-[var(--shadow-md)]"
        >
          <div className="flex h-full flex-col justify-end p-5 sm:p-6">
            <div className="mms-page-header__eyebrow text-[#fbf0e4]/90!">Indian Army · MISO</div>
            <h2 className="hero-title text-[24px] font-bold tracking-[-0.02em] text-white sm:text-[32px]">
              Holdings at a glance
            </h2>
            <p className="mt-1 max-w-[68ch] text-[13.5px] text-white/80">
              MLCCS · EP · MMS overview — open a module card to continue.
            </p>
          </div>
        </LiveHero>

        <PageHeader
          eyebrow="Analytics"
          title="Dashboard"
          subtitle="MLCCS · EP · MMS overview"
          className="mb-0"
          titleClassName="aid-h1 truncate"
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {sections.map((section, i) => {
            const card = (
              <StatDrillCard
                title={section.title}
                subtitle={section.subtitle}
                icon={section.icon}
                stats={section.stats}
                loading={section.loadingStats}
                delayMs={i * 60}
                drillable={section.navigate}
                onOpen={
                  section.navigate
                    ? () => onNavigate("weapon", section.id)
                    : undefined
                }
              />
            );
            return section.navigate ? (
              <Magnetic key={section.id} strength={0.12}>
                {card}
              </Magnetic>
            ) : (
              <div key={section.id}>{card}</div>
            );
          })}
        </div>

        <div className="aid-glass aid-glass--strong p-3 sm:p-4">
          <DashboardCharts
            mlccs={DUMMY_MLCCS}
            ep={epCounts}
            mms={DUMMY_MMS}
            loadingEp={loading}
          />
        </div>
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
