import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { CHART_BLUES, CHART_ALERT } from "@/theme";
import { chartIn } from "@/lib/motion";
import { AnomalyDot } from "@/components/aid/AnomalyDot";

/** Blues only — anomaly red is reserved so a single non-blue stands out. */
const BLUES = CHART_BLUES;
const GRID = "rgba(20,86,140,0.10)";
const AXIS = { fontSize: 11, fill: "#616d79" };

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
    <div className={anomalous ? "aid-tip aid-tip--alert" : "aid-tip"}>
      <div className="font-semibold">
        {mod ? `${mod} · ` : ""}
        {label ?? row.name}
      </div>
      <div className="tabular-nums">
        {typeof row.value === "number" ? row.value.toLocaleString("en-IN") : row.value}
      </div>
      {anomalous && (
        <div className="aid-tip__alert">⚠ {row.payload?.reason ?? "Anomaly"}</div>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  alert,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  alert?: boolean;
}) {
  return (
    <motion.div
      className={`mms-stat overflow-hidden aid-glass aid-glass--strong !shadow-none${alert ? " aid-card--alert" : ""}`}
      variants={chartIn}
      initial="hidden"
      animate="show"
    >
      <div className="border-b border-[rgba(20,86,140,0.10)] bg-white/40 px-4 py-3">
        <div className="text-sm font-semibold tracking-tight text-primary">{title}</div>
        <div
          className={`text-[13px]${alert ? " font-bold text-[#d32020]" : " text-muted-foreground"}`}
        >
          {subtitle}
        </div>
      </div>
      <div className="h-[236px] p-3">{children}</div>
    </motion.div>
  );
}

export function DashboardCharts({ mlccs, ep, mms, loadingEp }: Props) {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="MLCCS Distribution" subtitle="Census No. vs PRF Group">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mlccsData}
              layout="vertical"
              margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 4" horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" width={78} tick={AXIS} />
              <Tooltip content={<GlassTip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={68} barSize={22}>
                {mlccsData.map((_, i) => (
                  <Cell key={i} fill={BLUES[i % BLUES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="EP Composition"
          subtitle={
            loadingEp
              ? "Loading…"
              : epEmpty
                ? "No EP rows yet"
                : "Domain · Sub Domain · Regn No."
          }
          alert={epEmpty}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={epData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
              >
                {epData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={epEmpty && i === 0 ? CHART_ALERT : BLUES[i % BLUES.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<GlassTip />} />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="MMS UE vs UH" subtitle="Unit Entitlement · Unit Holding">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mmsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={3}
              >
                <Cell fill={BLUES[0]} />
                <Cell fill={BLUES[2]} />
              </Pie>
              <Tooltip content={<GlassTip />} />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="All Metrics Overview"
          subtitle={hasAnomaly ? "Anomaly highlighted in red" : "Counts across MLCCS, EP and MMS"}
          alert={hasAnomaly}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overviewData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={GRID} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#616d79" }}
                interval={0}
                angle={-22}
                textAnchor="end"
                height={54}
              />
              <YAxis tick={AXIS} />
              <Tooltip content={<GlassTip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={68} barSize={28}>
                {overviewData.map((row) => (
                  <Cell key={row.name} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Metric profile"
          subtitle="Line view with anomaly dots"
          alert={hasAnomaly}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overviewData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={GRID} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#616d79" }}
                interval={0}
                angle={-22}
                textAnchor="end"
                height={54}
              />
              <YAxis tick={AXIS} />
              <Tooltip content={<GlassTip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={BLUES[1]}
                strokeWidth={2}
                dot={<AnomalyDot />}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </div>
  );
}
