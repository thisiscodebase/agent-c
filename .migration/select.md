# select

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Migrated and finalized in one pass.

## Changed

- `components/ui/select.tsx` — replaced radix-ui `Select` primitive with `@base-ui/react/select` (`Content` -> `Portal > Positioner > Popup > List`; `Viewport` dropped, `List` replaces it). Diffed against both goldens: icon placeholders resolved to `lucide-react` icons (as with every other component in this batch). Deliberately did NOT port two upstream registry classes on `SelectContent` (`cn-menu-target cn-menu-translucent`) — grepped the actual installed `shadcn/dist/tailwind.css` and this project's `globals.css` and neither defines them, so they'd be inert/dead classes; same category of upstream registry artifact as the `cn-font-heading` typo caught during the dialog migration.
- `app/(app)/settings/profile/page.tsx` — the one real call-site restructuring in this whole batch. Base UI's `Select` root requires an `items` array (used for value<->label lookup by `SelectValue`); the Radix `<SelectValue placeholder="...">` pattern is gone, replaced by a `{ value: null, label: "..." }` entry in `items`. Built `timezoneItems`/`localeItems` via `useMemo` (placeholder entry prepended, then mapped from the existing `timezones`/`locales` option arrays), dropped the `placeholder` prop from both `SelectValue`s, and passed `items` to both `Select` roots. `SelectItem` children are unchanged (Base UI still requires them rendered explicitly alongside `items`, matching the shadcn docs pattern; `items` alone doesn't render the list). Also: the local `timezone`/`locale` state defaults to `""` (required by `UserProfilePatch`'s `string` field type, not nullable), which doesn't match any item's `value` including the placeholder's `null` — added `value={timezone || null}` / `onValueChange={(v) => setTimezone(v ?? "")}` (and same for locale) to bridge the empty-string-default <-> null-placeholder mismatch without changing the patch type.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/select.tsx` — no matches.

## Left alone

`components/ai-elements/code-block.tsx` (`CodeBlockLanguageSelector*`) and `components/ai-elements/prompt-input.tsx` (`PromptInputSelect*`) both re-export `Select`/`SelectTrigger`/etc. as thin pass-throughs with no inline `items`/`SelectItem` usage of their own — grepped the whole app and neither has any consumer, so there was nothing to restructure there.

## Behavior changes

Content positioning: Radix's `position="popper"` vs `"item-aligned"` becomes Base UI's `alignItemWithTrigger` (default `true`, closest match to Radix's `item-aligned` default `false`... actually inverted — flagging this: our old wrapper defaulted to Radix `position="item-aligned"`, the new one defaults `alignItemWithTrigger={true}` per the base-nova registry default, which is the more common modern pattern (dropdown aligns to trigger width like a typical combobox) rather than aligning the selected item under the cursor. Neither profile-page call site passed a custom `position`, so both now render with `alignItemWithTrigger` behavior — worth a visual check.

## Verify by hand

Settings -> Profile: open both selects, confirm the placeholder shows correctly when no value is set, confirm selecting an option updates the trigger text and persists on Save, confirm keyboard nav (arrow keys, typeahead) still works, and eyeball the dropdown's position/width relative to the trigger (this is the one place the default positioning model actually changed).
