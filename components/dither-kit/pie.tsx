"use client"

import { useEffect } from "react"
import type { AreaVariant } from "./chart-context"
import { usePolarPart } from "./polar-context"

export type PieProps = {
  /** Fill texture applied to every slice when `variants` is omitted. */
  variant?: AreaVariant
  /**
   * Per-slice fill textures keyed by the chart `nameKey` value. Use this when
   * slices share one ink colour and need patterns to stay distinct (e.g. on a
   * coloured paper background).
   */
  variants?: Record<string, AreaVariant>
}

/**
 * The pie/donut ring. Slices come from the chart `data` (one per row); this part
 * sets the fill variant(s). The dithered wedges are painted on the canvas.
 */
export function Pie({ variant = "gradient", variants }: PieProps) {
  const ctx = usePolarPart("Pie", "pie")
  const { registerVariant, unregisterVariant } = ctx
  // Object identity changes every render from JSX; key the effect on contents.
  const variantsKey = variants
    ? Object.entries(variants)
      .map(([key, value]) => `${key}\0${value}`)
      .sort()
      .join("\n")
    : ""

  useEffect(() => {
    if (variantsKey) {
      const entries = variantsKey.split("\n").map((line) => {
        const [key, value] = line.split("\0")
        return [key, value as AreaVariant] as const
      })
      for (const [key, value] of entries) {
        registerVariant(key, value)
      }
      return () => {
        for (const [key] of entries) {
          unregisterVariant(key)
        }
      }
    }

    registerVariant("*", variant)
    return () => unregisterVariant("*")
  }, [variant, variantsKey, registerVariant, unregisterVariant])

  return null
}
