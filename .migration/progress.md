# progress

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, zero consumers — migrated and finalized in one pass.

## Changed

- `components/ui/progress.tsx` — replaced radix-ui `Progress` primitive with `@base-ui/react/progress`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix. Note: Base UI nests `Indicator` inside a new `Track` part and computes fill width itself (no more manual `translateX` style) — already reflected in the registry source used here.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/progress.tsx` — no matches.

## Left alone

Zero consumers in the app today.

## Behavior changes

`getValueLabel` (Radix) has no direct equivalent; Base UI uses `getAriaValueText` with a different signature (`(formattedValue, value) => string`). Not applicable here since the wrapper doesn't set either.

## Verify by hand

No consumers exist yet. Before the first consumer ships, confirm the fill bar renders at the correct percentage and the indeterminate state (value=null) looks right if used.
