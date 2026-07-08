# tabs

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, zero consumers — migrated and finalized in one pass.

## Changed

- `components/ui/tabs.tsx` — replaced radix-ui `Tabs` primitive with `@base-ui/react/tabs`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/tabs.tsx` — no matches.

## Left alone

Zero consumers in the app today.

## Behavior changes

Two registry-default deltas worth knowing before the first consumer ships: (1) `List.activateOnFocus` defaults to `false` in Base UI (manual tab activation) vs Radix's automatic-activation default — if automatic activation is wanted, pass `activateOnFocus` explicitly on `TabsList`. (2) `defaultValue` defaults to `0`/first-tab in Base UI vs no default in Radix.

## Verify by hand

No consumers exist yet. Before the first consumer ships, confirm click/keyboard tab switching and the active-tab indicator styling.
