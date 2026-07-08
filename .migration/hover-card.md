# hover-card

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/hover-card.tsx` — replaced radix-ui `HoverCard` primitive with `@base-ui/react/preview-card` (Base UI's hover-card equivalent; the wrapper keeps exporting `HoverCard`/`HoverCardTrigger`/`HoverCardContent` names for API stability). Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- `components/ai-elements/prompt-input.tsx` — `PromptInputHoverCard`/`PromptInputHoverCardTrigger` previously read `openDelay`/`closeDelay` at the Root level (Radix API). Base UI's PreviewCard moved delay control to the Trigger (`delay`/`closeDelay`), and Root no longer accepts them at all, so this call site needed a real edit: `PromptInputHoverCard` now just passes props through to `HoverCard` (Root), and `PromptInputHoverCardTrigger` owns the `delay`/`closeDelay` defaults instead. Verified via `grep` that neither `PromptInputHoverCard` nor `PromptInputHoverCardTrigger` has any consumer in the app today, so no downstream call sites were affected.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/hover-card.tsx` — no matches.

## Left alone

`components/ai-elements/prompt-input.tsx` is the only file referencing this wrapper (via `PromptInputHoverCard*`), and those exports are themselves unused elsewhere in the app.

## Behavior changes

Delay control moved from Root to Trigger (see above) — a genuine API shape change, not just a rename, but harmless here since there are no live consumers to break.

## Verify by hand

No live consumers exist. Before `PromptInputHoverCard*` is wired up to real UI, confirm hover-open/hover-close delay timing feels right and positioning/collision avoidance works near viewport edges.
