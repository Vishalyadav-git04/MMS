import type { CSSProperties, ReactNode } from "react";

const EMBERS = [
  { l: "8%", t: "72%", d: "0s" },
  { l: "14%", t: "58%", d: "1.2s" },
  { l: "22%", t: "80%", d: "0.4s" },
  { l: "31%", t: "64%", d: "2.1s" },
  { l: "38%", t: "88%", d: "0.8s" },
  { l: "47%", t: "70%", d: "1.6s" },
  { l: "55%", t: "82%", d: "0.2s" },
  { l: "63%", t: "60%", d: "2.4s" },
  { l: "71%", t: "76%", d: "1.0s" },
  { l: "78%", t: "68%", d: "1.8s" },
  { l: "84%", t: "84%", d: "0.6s" },
  { l: "90%", t: "62%", d: "2.0s" },
  { l: "18%", t: "48%", d: "1.4s" },
  { l: "42%", t: "52%", d: "0.9s" },
  { l: "66%", t: "46%", d: "2.2s" },
  { l: "12%", t: "90%", d: "1.1s" },
  { l: "58%", t: "92%", d: "0.5s" },
  { l: "86%", t: "54%", d: "1.7s" },
];

/**
 * Still photograph brought to life with cheap looping layers (no video).
 * pinSubject locks a centred band over an unfiltered copy of the same image.
 */
export function LiveHero({
  image,
  height = 420,
  pinSubject = true,
  calm = false,
  className,
  children,
}: {
  image: string;
  height?: number;
  pinSubject?: boolean;
  calm?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`live-hero${calm ? " live-hero--calm" : ""}${className ? ` ${className}` : ""}`}
      style={{ ["--h" as string]: `${height}px` } as CSSProperties}
    >
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter id="mmsFlag" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.013"
            numOctaves="2"
            seed="4"
            result="n"
          >
            <animate
              attributeName="baseFrequency"
              dur="4.5s"
              values="0.004 0.013; 0.009 0.021; 0.006 0.016; 0.004 0.013"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <img src={image} alt="" className="live-hero__img live-hero__img--scene" aria-hidden />
      {pinSubject && (
        <img src={image} alt="" className="live-hero__img live-hero__img--still" aria-hidden />
      )}

      <div className="live-hero__dust live-hero__dust--a" aria-hidden />
      <div className="live-hero__dust live-hero__dust--b" aria-hidden />
      <div className="live-hero__grade" aria-hidden />
      <div className="live-hero__rays" aria-hidden />
      <div className="live-hero__embers" aria-hidden>
        {EMBERS.map((e, i) => (
          <span
            key={i}
            style={{ left: e.l, top: e.t, animationDelay: e.d } as CSSProperties}
          />
        ))}
      </div>
      <div className="live-hero__vignette" aria-hidden />
      {children && <div className="live-hero__content">{children}</div>}
    </div>
  );
}
