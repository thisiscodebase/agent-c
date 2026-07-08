# collapsible

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/collapsible.tsx` — replaced radix-ui `Collapsible` primitive with `@base-ui/react/collapsible`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/collapsible.tsx` — no matches.

## Left alone

Three consumers, all using plain `Root`/`Trigger`/`Content` with no radix-specific props: `components/ai-elements/sources.tsx`, `components/ai-elements/reasoning.tsx` (the `Reasoning` component that wraps this — its own `useControllableState` from `@radix-ui/react-use-controllable-state` is a separate standalone package, out of scope for this migration), `components/ai-elements/tool.tsx`.

## Behavior changes

`Content` -> `Panel` rename is internal to the wrapper (still exported as `CollapsibleContent`). `[data-disabled]` is no longer emitted on collapsible parts in Base UI (Radix had it) — none of the three consumers style on `[data-disabled]` for this component.

## Verify by hand

Confirm expand/collapse works for: reasoning blocks (click to expand "Thinking..."), tool-call detail panels, and the sources list toggle.
