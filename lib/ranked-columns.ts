/** Split a ranked list into left (1–5) and right (6–10) columns. */
export function splitRankedColumns<T>(items: T[]): { left: T[]; right: T[] } {
  const top = items.slice(0, 10);
  return {
    left: top.slice(0, 5),
    right: top.slice(5, 10),
  };
}
