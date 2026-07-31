import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  buildWatermarkLine,
  getCachedClientIp,
  resolveClientIp,
} from "@/lib/session-watermark";

const ANGLE_DEG = 28;
const COL_GAP = 56; // px, must match gap-14 on the row
const ROW_GAP = 40; // px, must match gap-10 on the canvas
const MAX_ROWS = 60;
const MAX_COLS = 24;

/** Diagonal session watermark (IP · username · datetime) on authenticated screens. */
export function SessionWatermark() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [clientIp, setClientIp] = useState(() => getCachedClientIp() || "…");
  const [grid, setGrid] = useState({ rows: 14, cols: 8 });
  const cellRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveClientIp().then((ip) => {
      if (!cancelled) setClientIp(ip);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const username = (user?.username || user?.displayName || "USER").toUpperCase();
  const line = buildWatermarkLine({ clientIp, username, date: now });

  // Rotating the canvas means it must span the viewport's rotated bounding box,
  // otherwise the tiling leaves bare corners on wide screens.
  useLayoutEffect(() => {
    const measure = () => {
      const cell = cellRef.current;
      if (!cell) return;
      const cellW = cell.offsetWidth;
      const cellH = cell.offsetHeight;
      if (!cellW || !cellH) return;

      const rad = (ANGLE_DEG * Math.PI) / 180;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spanW = vw * Math.cos(rad) + vh * Math.sin(rad);
      const spanH = vw * Math.sin(rad) + vh * Math.cos(rad);

      const cols = Math.min(
        MAX_COLS,
        Math.max(2, Math.ceil(spanW / (cellW + COL_GAP)) + 2),
      );
      const rows = Math.min(
        MAX_ROWS,
        Math.max(2, Math.ceil(spanH / (cellH + ROW_GAP)) + 2),
      );

      setGrid((prev) =>
        prev.rows === rows && prev.cols === cols ? prev : { rows, cols },
      );
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [username, clientIp]);

  const rows = useMemo(
    () => Array.from({ length: grid.rows }, (_, i) => i),
    [grid.rows],
  );
  const cols = useMemo(
    () => Array.from({ length: grid.cols }, (_, i) => i),
    [grid.cols],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[40] overflow-hidden select-none print:z-[9999]"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 flex w-max -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] flex-col items-center gap-10 opacity-[0.08] print:opacity-[0.11]">
        {rows.map((r) => (
          <div
            key={r}
            className="flex w-max shrink-0 gap-14"
            style={{ marginLeft: r % 2 === 0 ? "0" : "5rem" }}
          >
            {cols.map((c) => (
              <span
                key={`${r}-${c}`}
                ref={r === 0 && c === 0 ? cellRef : undefined}
                className="inline-block shrink-0 whitespace-nowrap text-[14px] font-medium tracking-wide text-foreground"
              >
                {line}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
