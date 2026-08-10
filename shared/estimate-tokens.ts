/**
 * Cheap token estimator used for context composition (not provider billing).
 * Keep consistent everywhere we bake baselines or count conversation text.
 */
export function estimateTokensFromText(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.max(0, Math.ceil(text.length / 4));
}
