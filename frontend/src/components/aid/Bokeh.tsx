import { useMemo, type CSSProperties } from "react";

/** Seeded LCG — stable bokeh composition across reloads (no Math.random in render). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

type Orb = {
  left: string;
  top: string;
  size: string;
  tint: string;
  dx: string;
  dy: string;
  dur: string;
  delay: string;
};

const TINTS = [
  "rgba(46,168,213,0.55)",
  "rgba(29,116,184,0.45)",
  "rgba(20,86,140,0.40)",
  "rgba(92,192,224,0.50)",
  "rgba(232,242,250,0.70)",
];

export function Bokeh({ count = 12, seed = 20260729 }: { count?: number; seed?: number }) {
  const orbs = useMemo(() => {
    const rand = lcg(seed);
    const n = Math.min(16, Math.max(9, count));
    const list: Orb[] = [];
    for (let i = 0; i < n; i++) {
      const size = 80 + rand() * 160;
      list.push({
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        size: `${size}px`,
        tint: TINTS[i % TINTS.length],
        dx: `${(rand() - 0.5) * 80}px`,
        dy: `${(rand() - 0.5) * 60}px`,
        dur: `${20 + rand() * 20}s`,
        delay: `${-rand() * 18}s`,
      });
    }
    return list;
  }, [count, seed]);

  return (
    <div className="aid-bokeh" aria-hidden>
      <div className="aid-bokeh__wash" />
      {orbs.map((o, i) => (
        <span
          key={i}
          className="aid-bokeh__orb"
          style={
            {
              left: o.left,
              top: o.top,
              width: o.size,
              height: o.size,
              background: `radial-gradient(circle at 32% 32%, ${o.tint}, transparent 68%)`,
              ["--dx"]: o.dx,
              ["--dy"]: o.dy,
              ["--dur"]: o.dur,
              ["--delay"]: o.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
