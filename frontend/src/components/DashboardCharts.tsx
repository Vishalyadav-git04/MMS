import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  olive: "#3d5c40",
  gold: "#c4a035",
  khaki: "#9a8b5c",
  moss: "#5a7a52",
  sand: "#d4c48a",
};

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

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="text-[13px] text-muted-foreground">{subtitle}</div>
      </div>
      <div className="h-56 p-3">{children}</div>
    </div>
  );
}

function tooltipStyle() {
  return {
    backgroundColor: "#fff",
    border: "1px solid #e5e0d4",
    borderRadius: 8,
    fontSize: 12,
  };
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
    { name: "Census No.", module: "MLCCS", value: mlccs.unique_census_no, fill: COLORS.olive },
    { name: "PRF Group", module: "MLCCS", value: mlccs.prf_group, fill: COLORS.gold },
    { name: "Domain", module: "EP", value: ep.domain, fill: COLORS.moss },
    { name: "Sub Domain", module: "EP", value: ep.sub_domain, fill: COLORS.khaki },
    { name: "Regn No.", module: "EP", value: ep.regn_no, fill: COLORS.sand },
    { name: "UE", module: "MMS", value: mms.ue, fill: COLORS.olive },
    { name: "UH", module: "MMS", value: mms.uh, fill: COLORS.gold },
  ];

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
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e0d4" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle()} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                {mlccsData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? COLORS.olive : COLORS.gold} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="EP Composition"
          subtitle={loadingEp ? "Loading…" : "Domain · Sub Domain · Regn No."}
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
                  <Cell key={i} fill={[COLORS.olive, COLORS.gold, COLORS.khaki][i % 3]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle()} />
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
                <Cell fill={COLORS.olive} />
                <Cell fill={COLORS.gold} />
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v: number) => v.toLocaleString("en-IN")}
              />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <ChartPanel title="All Metrics Overview" subtitle="Counts across MLCCS, EP and MMS">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={overviewData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e0d4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(v: number) => v.toLocaleString("en-IN")}
              labelFormatter={(label, payload) => {
                const mod = payload?.[0]?.payload?.module;
                return mod ? `${mod} · ${label}` : String(label);
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
              {overviewData.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
