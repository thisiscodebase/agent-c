/** React production error #185 — nested update depth exceeded. */
export function isReactMaxUpdateDepthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Minified React error #185")
    || error.message.includes("Maximum update depth exceeded")
  );
}
