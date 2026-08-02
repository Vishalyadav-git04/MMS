import type { Transition, Variants } from "framer-motion";

export const SPRING: Transition = { type: "spring", stiffness: 100, damping: 15 };
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 260, damping: 24 };
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 70, damping: 18 };

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const stageEnter = {
  opacity: 0,
  rotateY: -14,
  z: -140,
  y: 18,
  scale: 0.97,
};

export const stageCentre = {
  opacity: 1,
  rotateY: 0,
  z: 0,
  y: 0,
  scale: 1,
};

export const stageFade = {
  opacity: 0,
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: { opacity: 0, y: -14, transition: { duration: 0.18 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

export const chartIn: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
};

export const modalFromIcon: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: SPRING_SNAPPY },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.18 } },
};

export const accordion: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.22 } },
  open: {
    height: "auto",
    opacity: 1,
    transition: { ...SPRING_SOFT, opacity: { delay: 0.06 } },
  },
};

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};
