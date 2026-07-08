# tooltip

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/tooltip.tsx` — replaced radix-ui `Tooltip` primitive with `@base-ui/react/tooltip`. Byte-identical to the `radix-nova` registry golden after alias normalization, so the `base-nova` variant was applied directly with only the import-alias fix.
- `components/ai-elements/message.tsx` (`MessageAction`) and `components/ai-elements/prompt-input.tsx` (tooltip-wrapped toolbar buttons) both used `<TooltipTrigger asChild>{button}</TooltipTrigger>`; `asChild` doesn't exist in Base UI, so both call sites were updated to `<TooltipTrigger render={button} />`. `button` already renders a real `<button>` element via the shared `Button` component, so the default `nativeButton={true}` needed no override.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/tooltip.tsx` — no matches.

## Left alone

Nothing else — both consumers used only the trigger/content pattern above.

## Behavior changes

Delay control: Radix's `delayDuration` (Provider/Root) moves to `delay` on Trigger (default 600ms vs Radix's 700ms) — not overridden by either consumer, so tooltips will open marginally faster than before. Flagged, not patched, per the migration skill's rules.

## Verify by hand

Hover over message action buttons (copy, regenerate, etc.) and prompt-input toolbar buttons — confirm tooltips appear after a short hover delay, position correctly, and dismiss on mouse-out/Escape.
