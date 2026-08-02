import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

/** Dashboard drill card — §10.4 / §11.3 visual recipe (navigation callback unchanged). */
export function StatDrillCard({
  title,
  subtitle,
  icon: Icon,
  stats,
  loading,
  delayMs = 0,
  drillable,
  onOpen,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  stats: { label: string; value: number }[];
  loading?: boolean;
  delayMs?: number;
  drillable: boolean;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="mms-stat__top">
        <span className="mms-stat__icon" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        {drillable && <span className="mms-stat__cue">View module</span>}
      </div>
      <div className="min-w-0 px-4 pt-1">
        <div className="text-base font-semibold tracking-tight text-[#15202b]">{title}</div>
        <div className="text-[13px] leading-snug text-[#54606c]">{subtitle}</div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {stats.map((stat) => (
          <StatRow key={stat.label} label={stat.label} value={stat.value} loading={!!loading} />
        ))}
      </div>
      <div className={cn("mms-stat__spark", !loading && "mms-stat__spark--done")} aria-hidden />
    </>
  );

  if (drillable && onOpen) {
    return (
      <button
        type="button"
        className="mms-stat mms-stat--drill mms-rise aid-glass"
        style={{ animationDelay: `${delayMs}ms` }}
        onClick={onOpen}
        aria-label={`${title}: open module`}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className="mms-stat mms-rise aid-glass"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {body}
    </div>
  );
}

function StatRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  const n = useCountUp(loading ? 0 : value);
  return (
    <div className="flex items-end justify-between gap-3 border-b border-[rgba(20,86,140,0.08)] pb-2 last:border-0 last:pb-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#616d79]">
        {label}
      </span>
      <span className="mms-stat__value">
        {loading ? "—" : n.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
