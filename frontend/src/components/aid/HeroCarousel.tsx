import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

const MOVES = [
  { scale: [1, 1.14], x: ["0%", "-3%"], y: ["0%", "2%"] },
  { scale: [1.05, 1.12], x: ["2%", "-2%"], y: ["-1%", "3%"] },
  { scale: [1.02, 1.14], x: ["-2%", "3%"], y: ["2%", "-2%"] },
  { scale: [1.08, 1.02], x: ["3%", "-1%"], y: ["-2%", "1%"] },
] as const;

const HOLD_MS = 5000;
const FADE_S = 1.6;
const ZOOM_S = HOLD_MS / 1000 * 2.4; // deliberately longer than hold

/**
 * Glob-friendly Ken Burns carousel. Zoom/pan lives on an INNER element so
 * opacity crossfade does not restart the move (design-system §10.7).
 * Dots hidden on login — photography is ambient, not operable.
 */
export function HeroCarousel({
  slides,
  className,
  hideDots = true,
}: {
  slides: string[];
  className?: string;
  hideDots?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const n = slides.length || 1;

  useEffect(() => {
    if (n < 2 || reduced) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [n, reduced]);

  if (!slides.length) return null;

  return (
    <div className={`aid-carousel${className ? ` ${className}` : ""}`} aria-hidden>
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="aid-carousel__slide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : FADE_S, ease: "easeInOut" }}
        >
          <motion.img
            src={slides[index]}
            alt=""
            className="aid-carousel__img"
            initial={reduced ? false : { scale: MOVES[index % 4].scale[0], x: MOVES[index % 4].x[0], y: MOVES[index % 4].y[0] }}
            animate={
              reduced
                ? { scale: 1.02 }
                : {
                    scale: MOVES[index % 4].scale[1],
                    x: MOVES[index % 4].x[1],
                    y: MOVES[index % 4].y[1],
                  }
            }
            transition={{ duration: ZOOM_S, ease: "linear" }}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      <div className="aid-smoke" aria-hidden>
        <span className="aid-smoke__blob a" />
        <span className="aid-smoke__blob b" />
        <span className="aid-smoke__blob c" />
        <span className="aid-smoke__blob d" />
        <span className="aid-smoke__trail e" />
        <span className="aid-smoke__trail f" />
      </div>
      <div className="aid-carousel__scanline" aria-hidden />

      {!hideDots && n > 1 && (
        <div className="aid-carousel__dots" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={i === index ? "on" : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
