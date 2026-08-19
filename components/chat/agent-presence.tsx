"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { AgentOrb, type OrbState } from "~/components/ui/agent-orb";
import { cn } from "~/lib/utils";

const WIDTH_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Floating agent presence above the composer — centered pill with feathered
 * backdrop. Orb state crossfades; label fades while the pill width morphs.
 */
export function AgentPresence({
  state = "breathing",
  label = "Thinking…",
  paused = false,
  className,
}: {
  state?: OrbState;
  label?: string;
  paused?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [labelWidth, setLabelWidth] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = sizerRef.current;
    if (!el) return;
    setLabelWidth(Math.ceil(el.scrollWidth) + 1);
  }, [label]);

  return (
    <div
      aria-live="polite"
      className={cn("relative pointer-events-auto", className)}
    >
      {/* Soft feathered pool so the pill reads against the message fade */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2",
          "h-16 w-[min(24rem,80vw)] rounded-full",
          "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_92%,transparent)_0%,color-mix(in_oklab,var(--background)_55%,transparent)_45%,transparent_75%)]",
          "dark:bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_88%,transparent)_0%,color-mix(in_oklab,var(--background)_40%,transparent)_50%,transparent_78%)]",
        )}
      />

      {/* Unconstrained sizer — not inside the animated overflow clip. */}
      <span
        ref={sizerRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-xs font-medium"
      >
        {label}
      </span>

      <div
        className={cn(
          "inline-flex items-center gap-2.5 overflow-hidden rounded-full",
          "border border-border/50",
          "bg-[color-mix(in_oklab,var(--card)_78%,var(--background))]",
          "px-3 py-1.5 text-muted-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.08)]",
          "backdrop-blur-md",
          "dark:border-white/10 dark:bg-[color-mix(in_oklab,var(--card)_72%,var(--background))]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_rgba(0,0,0,0.35)]",
        )}
      >
        <AgentOrb aria-label={label} paused={paused} state={state} />
        <motion.span
          className="relative overflow-hidden"
          initial={false}
          animate={
            reduceMotion || labelWidth === "auto"
              ? undefined
              : { width: labelWidth }
          }
          transition={{ duration: 0.34, ease: WIDTH_EASE }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={label}
              className="block whitespace-nowrap text-xs font-medium shimmer shimmer-duration-1000"
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: WIDTH_EASE }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </div>
    </div>
  );
}
