# scroll-area

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/scroll-area.tsx` — replaced radix-ui `ScrollArea` primitive with `@base-ui/react/scroll-area`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/scroll-area.tsx` — no matches.

## Left alone

Two consumers, both using plain `Root`/`Viewport` with no radix-specific props (no `type`, `scrollHideDelay`, or `dir`): `components/app-shell.tsx` (sidebar thread list, has unrelated in-progress local edits from a concurrent session — left untouched), `components/ai-elements/suggestion.tsx` (horizontal suggestion chips).

## Behavior changes

Radix's `type="hover"` auto-show/hide scrollbar behavior is now CSS-driven (`[data-hovering]`/`[data-scrolling]` presence attributes) rather than a prop; the wrapper's existing scrollbar styling already targets the right selectors per the registry source, so no visual change expected.

## Verify by hand

Confirm the sidebar thread list scrolls correctly and the suggestion-chip row scrolls horizontally without layout shift.
