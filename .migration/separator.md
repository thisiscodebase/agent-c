# separator

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/separator.tsx` — replaced radix-ui `Separator` primitive (`Separator.Root`) with `@base-ui/react/separator` (a single callable `Separator`, no `.Root`). Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/separator.tsx` — no matches.

## Left alone

`components/ui/button-group.tsx` (sole consumer) uses `<Separator orientation="vertical" />` only — no `decorative` prop, so nothing breaks (Base UI's separator is always semantic/`role="separator"`; Radix's `decorative` prop has no equivalent and wasn't in use here).

## Behavior changes

None.

## Verify by hand

Confirm the vertical divider still renders correctly between button-group items.
