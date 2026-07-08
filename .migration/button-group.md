# button-group

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/button-group.tsx` — replaced radix-ui `Slot`-based `asChild` composition with Base UI's `useRender`/`mergeProps` (`@base-ui/react/use-render`, `@base-ui/react/merge-props`). Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix (including its own `Separator` import, now `~/components/ui/separator`).
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/button-group.tsx` — no matches.

## Left alone

`components/ai-elements/message.tsx` (sole consumer, `MessageBranchSelector`) passes only `orientation` and `className` — no radix-specific props, no call-site changes needed.

## Behavior changes

None expected — this component never had radix stateful behavior (`Slot` is purely a polymorphism helper, not a primitive), so the swap is a pure implementation-detail change.

## Verify by hand

Confirm the branch-selector button group (prev/page/next) in message actions still renders and groups borders correctly.
