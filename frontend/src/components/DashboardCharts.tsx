import { useState, useEffect, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Maximize2, ZoomIn } from "lucide-react";
import { CHART_BLUES, CHART_ALERT } from "@/theme";
import { chartIn } from "@/lib/motion";
import { AnomalyDot } from "@/components/aid/AnomalyDot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Blues only — anomaly red is reserved so a single non-blue stands out. */
const BLUES = CHART_BLUES;
const GRID = "rgba(20,86,140,0.10)";
const AXIS = { fontSize: 11, fill: "#616d79" };
const AXIS_ENLARGED = { fontSize: 13, fill: "#334155", fontWeight: 500 };

interface EpCounts {
  domain: number;
  sub_domain: number;
  regn_no: number;
}

interface Props {
  mlccs: { unique_census_no: number; prf_group: number };
  ep: EpCounts;
  mms: { ue: number; uh: number };
  loadingEp?: boolean;
}

type TipPayload = {
  name?: string;
  value?: number;
  payload?: { anomaly?: boolean; reason?: string; module?: string };
};

type ChartId = "mlccs" | "ep" | "mms" | "overview" | "profile";

function GlassTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const anomalous = !!row.payload?.anomaly;
  const mod = row.payload?.module;
  return (
    <div className={anomalous ? "aid-tip aid-tip--alert shadow-lg" : "aid-tip shadow-lg"}>
      <div className="font-semibold text-sm">
        {mod ? `${mod} · ` : ""}
        {label ?? row.name}
      </div>
      <div className="tabular-nums font-bold text-base mt-0.5">
        {typeof row.value === "number" ? row.value.toLocaleString("en-IN") : row.value}
      </div>
      {anomalous && (
        <div className="aid-tip__alert mt-1 text-xs">⚠ {row.payload?.reason ?? "Anomaly"}</div>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  alert,
  onEnlarge,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  alert?: boolean;
  onEnlarge?: () => void;
}) {
  return (
    <motion.div
      className={`mms-stat overflow-hidden aid-glass aid-glass--strong !shadow-none group relative cursor-pointer ${
        alert ? " aid-card--alert" : ""
      }`}
      variants={chartIn}
      initial="hidden"
      animate="show"
      onDoubleClick={onEnlarge}
      title="Double-click card or click maximize button to enlarge"
    >
      <div className="flex items-center justify-between border-b border-[rgba(20,86,140,0.10)] bg-white/40 px-4 py-3">
        <div>
          <div className="text-sm font-semibold tracking-tight text-primary">{title}</div>
          <div
            className={`text-[13px]${
              alert ? " font-bold text-[#d32020]" : " text-muted-foreground"
            }`}
          >
            {subtitle}
          </div>
        </div>
        {onEnlarge && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEnlarge();
            }}
            title="Enlarge chart view"
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[rgba(20,86,140,0.15)] bg-white/70 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="sr-only">Enlarge {title}</span>
          </button>
        )}
      </div>
      <div className="h-[236px] p-3 select-none">{children}</div>
    </motion.div>
  );
}

export function DashboardCharts({ mlccs, ep, mms, loadingEp }: Props) {
  const [enlargedChart, setEnlargedChart] = useState<ChartId | null>(null);
  // chartReady: delays chart mount by 60ms so the dialog backdrop appears first,
  // preventing Recharts from measuring a zero-size container and skipping the animation.
  const [chartReady, setChartReady] = useState(false);
  // showPieLabels: fires after the full pie sweep (800ms) + a small buffer.
  const [showPieLabels, setShowPieLabels] = useState(false);

  useEffect(() => {
    if (enlargedChart) {
      setChartReady(false);
      setShowPieLabels(false);
      // Small delay so the dialog open CSS transition begins before the chart mounts
      const tReady = setTimeout(() => setChartReady(true), 60);
      // Labels appear after the pie sweep finishes (800ms anim + 80ms buffer)
      const tLabels = setTimeout(() => setShowPieLabels(true), 940);
      return () => {
        clearTimeout(tReady);
        clearTimeout(tLabels);
      };
    } else {
      setChartReady(false);
      setShowPieLabels(false);
    }
  }, [enlargedChart]);

  const mlccsData = [
    { name: "Census No.", value: mlccs.unique_census_no },
    { name: "PRF Group", value: mlccs.prf_group },
  ];

  const epData = [
    { name: "Domain", value: ep.domain },
    { name: "Sub Domain", value: ep.sub_domain },
    { name: "Regn No.", value: ep.regn_no },
  ];

  const mmsData = [
    { name: "UE", value: mms.ue },
    { name: "UH", value: mms.uh },
  ];

  const overviewData = [
    { name: "Census No.", module: "MLCCS", value: mlccs.unique_census_no, fill: BLUES[0] },
    { name: "PRF Group", module: "MLCCS", value: mlccs.prf_group, fill: BLUES[1] },
    { name: "Domain", module: "EP", value: ep.domain, fill: BLUES[2] },
    { name: "Sub Domain", module: "EP", value: ep.sub_domain, fill: BLUES[3] },
    {
      name: "Regn No.",
      module: "EP",
      value: ep.regn_no,
      fill: ep.regn_no === 0 && !loadingEp ? CHART_ALERT : BLUES[4],
      anomaly: ep.regn_no === 0 && !loadingEp,
      reason: "No registration numbers captured",
    },
    { name: "UE", module: "MMS", value: mms.ue, fill: BLUES[0] },
    { name: "UH", module: "MMS", value: mms.uh, fill: BLUES[5] },
  ];

  const epEmpty = !loadingEp && ep.domain === 0 && ep.sub_domain === 0 && ep.regn_no === 0;
  const hasAnomaly = overviewData.some((r) => r.anomaly);

  const renderMlccsChart = (isEnlarged = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={mlccsData}
        layout="vertical"
        margin={isEnlarged ? { left: 24, right: 64, top: 20, bottom: 20 } : { left: 8, right: 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 4" horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={isEnlarged ? AXIS_ENLARGED : AXIS} />
        <YAxis type="category" dataKey="name" width={isEnlarged ? 120 : 78} tick={isEnlarged ? AXIS_ENLARGED : AXIS} />
        <Tooltip content={<GlassTip />} />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          maxBarSize={isEnlarged ? 80 : 68}
          barSize={isEnlarged ? 44 : 22}
          isAnimationActive={true}
          animationDuration={450}
          animationEasing="ease-out"
        >
          {mlccsData.map((_, i) => (
            <Cell key={i} fill={BLUES[i % BLUES.length]} />
          ))}
          {isEnlarged && (
            <LabelList
              dataKey="value"
              position="right"
              offset={10}
              formatter={(val: number) => (typeof val === "number" ? val.toLocaleString("en-IN") : val)}
              style={{ fontSize: 13, fontWeight: 700, fill: "#14568c" }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderEpChart = (isEnlarged = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={epData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="46%"
          innerRadius={isEnlarged ? 85 : 42}
          outerRadius={isEnlarged ? 140 : 68}
          paddingAngle={isEnlarged ? 4 : 2}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
          label={
            isEnlarged && showPieLabels
              ? ({ name, value }: { name?: string; value?: number }) =>
                  `${name ?? ""}: ${typeof value === "number" ? value.toLocaleString("en-IN") : value}`
              : false
          }
          labelLine={isEnlarged && showPieLabels}
        >
          {epData.map((_, i) => (
            <Cell
              key={i}
              fill={epEmpty && i === 0 ? CHART_ALERT : BLUES[i % BLUES.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<GlassTip />} />
        <Legend
          verticalAlign="bottom"
          height={isEnlarged ? 40 : 28}
          wrapperStyle={isEnlarged ? { fontSize: 13, paddingTop: 12 } : { fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderMmsChart = (isEnlarged = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={mmsData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="46%"
          innerRadius={isEnlarged ? 85 : 42}
          outerRadius={isEnlarged ? 140 : 68}
          paddingAngle={isEnlarged ? 4 : 3}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
          label={
            isEnlarged && showPieLabels
              ? ({ name, value }: { name?: string; value?: number }) =>
                  `${name ?? ""}: ${typeof value === "number" ? value.toLocaleString("en-IN") : value}`
              : false
          }
          labelLine={isEnlarged && showPieLabels}
        >
          <Cell fill={BLUES[0]} />
          <Cell fill={BLUES[2]} />
        </Pie>
        <Tooltip content={<GlassTip />} />
        <Legend
          verticalAlign="bottom"
          height={isEnlarged ? 40 : 28}
          wrapperStyle={isEnlarged ? { fontSize: 13, paddingTop: 12 } : { fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderOverviewChart = (isEnlarged = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={overviewData}
        margin={isEnlarged ? { left: 12, right: 24, top: 28, bottom: 20 } : { left: 0, right: 8, top: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={GRID} />
        <XAxis
          dataKey="name"
          tick={isEnlarged ? AXIS_ENLARGED : { fontSize: 10, fill: "#616d79" }}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={isEnlarged ? 68 : 54}
        />
        <YAxis tick={isEnlarged ? AXIS_ENLARGED : AXIS} />
        <Tooltip content={<GlassTip />} />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          maxBarSize={isEnlarged ? 90 : 68}
          barSize={isEnlarged ? 52 : 28}
          isAnimationActive={true}
          animationDuration={450}
          animationEasing="ease-out"
        >
          {overviewData.map((row) => (
            <Cell key={row.name} fill={row.fill} />
          ))}
          {isEnlarged && (
            <LabelList
              dataKey="value"
              position="top"
              offset={8}
              formatter={(val: number) => (typeof val === "number" ? val.toLocaleString("en-IN") : val)}
              style={{ fontSize: 12, fontWeight: 700, fill: "#14568c" }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderProfileChart = (isEnlarged = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={overviewData}
        margin={isEnlarged ? { left: 12, right: 28, top: 28, bottom: 20 } : { left: 0, right: 12, top: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={GRID} />
        <XAxis
          dataKey="name"
          tick={isEnlarged ? AXIS_ENLARGED : { fontSize: 10, fill: "#616d79" }}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={isEnlarged ? 68 : 54}
        />
        <YAxis tick={isEnlarged ? AXIS_ENLARGED : AXIS} />
        <Tooltip content={<GlassTip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={BLUES[1]}
          strokeWidth={isEnlarged ? 3 : 2}
          dot={<AnomalyDot />}
          activeDot={{ r: isEnlarged ? 8 : 5 }}
          isAnimationActive={true}
          animationDuration={450}
          animationEasing="ease-out"
        >
          {isEnlarged && (
            <LabelList
              dataKey="value"
              position="top"
              offset={12}
              formatter={(val: number) => (typeof val === "number" ? val.toLocaleString("en-IN") : val)}
              style={{ fontSize: 12, fontWeight: 700, fill: "#14568c" }}
            />
          )}
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );

  const epSubtitle = loadingEp
    ? "Loading…"
    : epEmpty
      ? "No EP rows yet"
      : "Domain · Sub Domain · Regn No.";

  const getChartDetails = (id: ChartId | null) => {
    switch (id) {
      case "mlccs":
        return {
          title: "MLCCS Distribution",
          subtitle: "Census No. vs PRF Group",
          render: () => renderMlccsChart(true),
        };
      case "ep":
        return {
          title: "EP Composition",
          subtitle: epSubtitle,
          render: () => renderEpChart(true),
        };
      case "mms":
        return {
          title: "MMS UE vs UH",
          subtitle: "Unit Entitlement · Unit Holding",
          render: () => renderMmsChart(true),
        };
      case "overview":
        return {
          title: "All Metrics Overview",
          subtitle: hasAnomaly ? "Anomaly highlighted in red" : "Counts across MLCCS, EP and MMS",
          render: () => renderOverviewChart(true),
        };
      case "profile":
        return {
          title: "Metric profile",
          subtitle: "Line view with anomaly dots",
          render: () => renderProfileChart(true),
        };
      default:
        return null;
    }
  };

  const activeEnlarged = getChartDetails(enlargedChart);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel
          title="MLCCS Distribution"
          subtitle="Census No. vs PRF Group"
          onEnlarge={() => setEnlargedChart("mlccs")}
        >
          {renderMlccsChart()}
        </ChartPanel>

        <ChartPanel
          title="EP Composition"
          subtitle={epSubtitle}
          alert={epEmpty}
          onEnlarge={() => setEnlargedChart("ep")}
        >
          {renderEpChart()}
        </ChartPanel>

        <ChartPanel
          title="MMS UE vs UH"
          subtitle="Unit Entitlement · Unit Holding"
          onEnlarge={() => setEnlargedChart("mms")}
        >
          {renderMmsChart()}
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="All Metrics Overview"
          subtitle={hasAnomaly ? "Anomaly highlighted in red" : "Counts across MLCCS, EP and MMS"}
          alert={hasAnomaly}
          onEnlarge={() => setEnlargedChart("overview")}
        >
          {renderOverviewChart()}
        </ChartPanel>

        <ChartPanel
          title="Metric profile"
          subtitle="Line view with anomaly dots"
          alert={hasAnomaly}
          onEnlarge={() => setEnlargedChart("profile")}
        >
          {renderProfileChart()}
        </ChartPanel>
      </div>

      <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
        <DialogContent className="max-w-4xl w-[92vw] sm:max-w-5xl bg-white/95 backdrop-blur-xl border border-[rgba(20,86,140,0.2)] p-6 shadow-2xl rounded-2xl focus:outline-none focus:ring-0 [&_*]:outline-none">
          {activeEnlarged && (
            <>
              <DialogHeader className="border-b border-[rgba(20,86,140,0.12)] pb-3 mb-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-[var(--accent,#14568c)] flex items-center gap-2">
                  <ZoomIn className="h-5 w-5 text-[#1d74b8]" />
                  {activeEnlarged.title}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  {activeEnlarged.subtitle}
                </DialogDescription>
              </DialogHeader>
              <div className="h-[480px] w-full pt-2 pb-1 select-none [&_svg]:outline-none [&_.recharts-wrapper]:outline-none">
                {chartReady ? activeEnlarged.render() : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


