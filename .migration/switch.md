# switch

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, zero consumers — migrated and finalized in one pass.

## Changed

- `components/ui/switch.tsx` — replaced radix-ui `Switch` primitive with `@base-ui/react/switch`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/switch.tsx` — no matches.

## Left alone

Zero consumers in the app today.

## Behavior changes

None observed — no consumers to exercise. (`data-state="checked"/"unchecked"` becomes presence attributes `data-checked`/`data-unchecked` on both Root and Thumb, matching the wrapper's existing class selectors.)

## Verify by hand

No consumers exist yet. Before the first consumer ships, confirm click/keyboard toggle, checked/unchecked visual state, and disabled styling.
