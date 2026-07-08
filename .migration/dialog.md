# dialog

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Migrated and finalized in one pass.

## Changed

- `components/ui/dialog.tsx` — replaced radix-ui `Dialog` primitive with `@base-ui/react/dialog` (`Overlay` -> `Backdrop`, `Content` -> `Popup`). Diffed against both goldens: the only real delta from the `base-nova` registry source was a typo in the upstream registry (`cn-font-heading` on `DialogTitle`, which isn't a real utility class anywhere in this project or Tailwind) — kept our correct, pre-existing `font-heading` class (matches the `--font-heading` CSS var in `app/globals.css` and the same class in `card.tsx`) instead of copying the upstream typo. Close-button icon resolved to `XIcon` from `lucide-react` (was already the case locally); `DialogClose`'s `asChild` wrapping a `<Button>` became `render={<Button ... />}` with the icon/label as `Popup`-level children.
- `app/(app)/settings/integrations/page.tsx` (revoke-connector dialog) — two `asChild` usages (`DialogTrigger`, `DialogClose`) converted to `render={<Button ... />}`.
- `components/ui/command.tsx` (`CommandDialog`, wraps cmdk's command palette in our `Dialog`) — no radix-specific props were in use, but `React.ComponentProps<typeof Dialog>` now includes a payload-render-function form for `children` (Base UI dialogs support `children` as `(payload) => ReactNode`), which no longer type-checked against `DialogContent`'s plain-`ReactNode` children slot. Fixed by explicitly typing `CommandDialog`'s own `children` prop as `React.ReactNode` (`Omit<ComponentProps<typeof Dialog>, "children"> & { children?: React.ReactNode }`) rather than inheriting the wider type. No runtime behavior change — cmdk never used the payload-render form.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/dialog.tsx` — no matches.

## Left alone

Nothing else references `Dialog` directly; `AlertDialog` doesn't exist in this project (not in the component list).

## Behavior changes

None expected for existing consumers — both call sites used only the standard trigger/content/close pattern, no dismiss-callback props (`onEscapeKeyDown`, `onPointerDownOutside`, `onOpenAutoFocus`) were in use anywhere in the app (verified via a repo-wide grep before migrating).

## Verify by hand

1. Cmd+K command palette: opens, searches, closes on Escape/outside-click, focus returns to trigger on close.
2. Settings -> Integrations -> Revoke dialog: opens on "Revoke" click, Cancel and outside-click both dismiss without revoking, confirming "Revoke" runs the action and closes.
