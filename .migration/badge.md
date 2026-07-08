# badge

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/badge.tsx` — replaced radix-ui `Slot`-based `asChild` composition with Base UI's `useRender`/`mergeProps`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/badge.tsx` — no matches.

## Left alone

`app/(app)/settings/integrations/page.tsx` and `components/ai-elements/tool.tsx` (consumers) both use plain `<Badge variant="...">text</Badge>` — no `asChild`, no call-site changes needed.

## Behavior changes

None expected — same reasoning as button-group (Slot was a pure polymorphism helper, no stateful radix behavior).

## Verify by hand

Confirm integration-status badges (settings/integrations page) and tool-call state badges (tool.tsx) still render with correct variant colors.
