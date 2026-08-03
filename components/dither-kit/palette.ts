export type Rgb = [number, number, number]

export type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "grey"
  | "ink"

export type Seed = { fill: Rgb; line: Rgb; star: Rgb }

/** Near-black ink for light paper. */
const INK_ON_LIGHT: Seed = {
  fill: [42, 40, 38],
  line: [68, 64, 60],
  star: [110, 105, 98],
}

/** Near-white ink for dark paper / dark mode — matches paper text, not pure white. */
const INK_ON_DARK: Seed = {
  fill: [210, 208, 204],
  line: [228, 226, 222],
  star: [238, 236, 232],
}

function prefersDarkScheme(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

// Each seed: the area-fill hue, the bright series line, and the star sparkle.
export const PALETTE: Record<DitherColor, Seed> = {
  green: { fill: [40, 210, 110], line: [150, 255, 180], star: [200, 255, 220] },
  blue: { fill: [53, 143, 243], line: [150, 200, 255], star: [205, 228, 255] },
  purple: {
    fill: [150, 110, 255],
    line: [200, 175, 255],
    star: [225, 210, 255],
  },
  pink: { fill: [240, 90, 190], line: [255, 170, 220], star: [255, 205, 235] },
  orange: {
    fill: [255, 105, 20],
    line: [255, 140, 45],
    star: [255, 175, 95],
  },
  red: { fill: [240, 70, 70], line: [255, 150, 140], star: [255, 195, 185] },
  // No-data: a muted grey so empty metrics read as "nothing here".
  grey: { fill: [92, 92, 100], line: [140, 140, 150], star: [165, 165, 175] },
  // Default to light-paper ink; `seedOfColor` swaps for dark scheme.
  ink: INK_ON_LIGHT,
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => {
  if (color === "ink") {
    return prefersDarkScheme() ? INK_ON_DARK : INK_ON_LIGHT
  }
  return PALETTE[color]
}

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
