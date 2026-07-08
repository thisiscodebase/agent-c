# popover

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, zero consumers — migrated and finalized in one pass.

## Changed

- `components/ui/popover.tsx` — replaced radix-ui `Popover` primitive with `@base-ui/react/popover`. Byte-identical to the `radix-nova` registry golden after alias normalization (no local customization), so the `base-nova` variant was applied directly with only the import-alias fix (`@/registry/base-nova/lib/utils` -> `~/lib/utils`).
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/popover.tsx` — no matches.

## Left alone

Zero consumers in the app today (grep for `ui/popover` outside the wrapper found nothing).

## Behavior changes

None observed — no consumers to exercise.

## Verify by hand

No consumers exist yet, so nothing to click through. Before the first consumer ships, confirm: trigger click opens/closes the popover, outside-click and Escape dismiss it, and positioning/collision avoidance looks right near viewport edges.
