# avatar

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/avatar.tsx` — replaced radix-ui `Avatar` primitive with `@base-ui/react/avatar`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/avatar.tsx` — no matches.

## Left alone

`components/app-shell.tsx` (sole consumer) uses `<Avatar>`/`<AvatarFallback>` with no radix-specific props (no `delayMs`, no `onLoadingStatusChange`); no call-site changes needed. Note: app-shell.tsx has unrelated in-progress local edits from a concurrent session — left untouched, not part of this migration.

## Behavior changes

None expected. `delayMs` (Fallback) renamed to `delay` in Base UI if ever used; not currently used here.

## Verify by hand

Confirm the avatar fallback initial renders correctly in the sidebar user menu (app-shell.tsx), and that it still looks right with/without a profile image.
