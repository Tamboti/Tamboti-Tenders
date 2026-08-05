import type { Variants } from "framer-motion";

// Shared scroll/mount entrance animation for public pages — short fade +
// slight rise, runs once, so it reads as polish rather than a showcase.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
