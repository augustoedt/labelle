import { motion, useReducedMotion } from "framer-motion";

const offsets = {
  up: (distance) => ({ opacity: 0, y: distance }),
  right: (distance) => ({ opacity: 0, x: distance }),
  left: (distance) => ({ opacity: 0, x: -distance }),
};

const destinations = {
  up: { opacity: 1, y: 0 },
  right: { opacity: 1, x: 0 },
  left: { opacity: 1, x: 0 },
};

export default function Reveal({
  children,
  index = 0,
  direction = "up",
  distance = 14,
  className,
  ...props
}) {
  const prefersReduced = useReducedMotion();
  const isReduced = prefersReduced === true;
  const safeDirection = offsets[direction] ? direction : "up";

  return (
    <motion.div
      {...props}
      className={className}
      initial={offsets[safeDirection](distance)}
      animate={destinations[safeDirection]}
      transition={{
        duration: isReduced ? 0 : 0.45,
        delay: isReduced ? 0 : index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
