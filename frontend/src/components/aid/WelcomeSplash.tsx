import { useEffect, useRef, useState } from "react";
import { Bokeh } from "@/components/aid/Bokeh";
import { BrandEmblem } from "@/components/BrandEmblem";

const STAGES = ["Securing session", "Loading entitlements", "Preparing workspace"];

/**
 * Post-login splash — visual only. Completion is driven by ONE timer (not animation callbacks).
 */
export function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 600 : 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      setProgress(Math.round(t * 100));
      setStage(Math.min(STAGES.length - 1, Math.floor(t * STAGES.length)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else done.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const title = "MISO · MMS";
  const words = title.split(" ");

  return (
    <div
      className="mms-splash"
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
    >
      <Bokeh count={16} />
      <div className="mms-splash__rings" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="mms-splash__emblem" aria-hidden>
        <BrandEmblem size="xl" />
      </div>
      <h1 className="mms-splash__title">
        <span className="mms-sr-only">{title}</span>
        {words.map((w, wi) => (
          <span key={wi} className="mms-splash__word" aria-hidden>
            {wi > 0 ? "\u00A0" : null}
            {w.split("").map((ch, i) => (
              <span
                key={`${wi}-${i}`}
                className="mms-splash__letter"
                style={{ animationDelay: `${(wi * 4 + i) * 0.035}s` }}
              >
                {ch}
              </span>
            ))}
          </span>
        ))}
      </h1>
      <div className="mms-splash__orbit" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="mms-splash__stage">{STAGES[stage]}</p>
      <div className="mms-splash__track" aria-hidden>
        <div className="mms-splash__bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
