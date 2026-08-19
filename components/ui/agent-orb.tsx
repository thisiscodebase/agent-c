"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ThinkingOrb,
  type OrbSize,
  type OrbState,
  type ThinkingOrbProps,
} from "thinking-orbs";
import { cn } from "~/lib/utils";

export type { OrbSize, OrbState };

/** Display size for chat presence — package preset is 20; we scale slightly up. */
export const AGENT_ORB_DISPLAY_PX = 28;

export type AgentOrbProps = Omit<ThinkingOrbProps, "theme" | "size"> & {
  /** Package canvas preset (always 20 for chat). Display size is scaled via CSS. */
  size?: OrbSize;
  /** CSS px box; defaults to 28 for the 20 preset, 64 for the 64 preset. */
  displayPx?: number;
  /** Hue shift off the branded orange ink. Omit for the default fruit colour. */
  hueRotate?: number;
  className?: string;
};

/**
 * Branded Agent C thinking orb — orange-fruit ink via patched `thinking-orbs`.
 * State changes crossfade so modes morph instead of hard-cutting.
 */
export function AgentOrb({
  state = "breathing",
  size = 20,
  displayPx: displayPxProp,
  hueRotate,
  speed = 1,
  paused = false,
  className,
  style,
  "aria-label": ariaLabel,
  ...rest
}: AgentOrbProps) {
  const displayPx = displayPxProp ?? (size === 64 ? 64 : AGENT_ORB_DISPLAY_PX);
  const reduceMotion = useReducedMotion();
  const [activeState, setActiveState] = useState(state);

  useEffect(() => {
    setActiveState(state);
  }, [state]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{
        width: displayPx,
        height: displayPx,
        ...(hueRotate != null ? { filter: `hue-rotate(${hueRotate}deg)` } : {}),
      }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={activeState}
          className="absolute inset-0 flex items-center justify-center"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <ThinkingOrb
            {...rest}
            aria-label={ariaLabel}
            paused={paused}
            size={size}
            speed={speed}
            state={activeState}
            style={{
              ...style,
              width: displayPx,
              height: displayPx,
            }}
            theme="auto"
          />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
