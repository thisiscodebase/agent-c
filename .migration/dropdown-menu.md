# dropdown-menu

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Migrated and finalized in one pass.

## Changed

- `components/ui/dropdown-menu.tsx` — replaced radix-ui `DropdownMenu` primitive with `@base-ui/react/menu` (`Content` -> `Portal > Positioner > Popup`, `Sub` -> `SubmenuRoot`, `SubTrigger` -> `SubmenuTrigger`, `Label` -> `GroupLabel`, `ItemIndicator` split into `CheckboxItemIndicator`/`RadioItemIndicator`). Icon placeholders resolved to `lucide-react`. Skipped the same undefined upstream `cn-menu-target`/`cn-menu-translucent` classes already caught and skipped during the `select` migration (confirmed again via grep against the shipped `shadcn/dist/tailwind.css` — still undefined).
- `components/ai-elements/prompt-input.tsx`, three call sites, all in the (currently consumer-less) `PromptInputActionMenu*` family:
  - `PromptInputActionMenuTrigger`: `<DropdownMenuTrigger asChild><PromptInputButton>...</PromptInputButton></DropdownMenuTrigger>` -> `<DropdownMenuTrigger render={<PromptInputButton>...</PromptInputButton>} />`.
  - `PromptInputActionAddAttachments`: Radix's `onSelect` handler called `e.preventDefault()` unconditionally to keep the menu open while opening the file dialog. Base UI has no `onSelect`/preventDefault-controls-close mechanic — replaced with `onClick` (just opens the dialog) + the declarative `closeOnClick={false}` prop, which reproduces the same "menu stays open" behavior.
  - `PromptInputActionAddScreenshot`: renamed `onSelect` prop to `onClick` (type `BaseUIEvent<React.MouseEvent<HTMLDivElement>>`, imported from `@base-ui/react/types`), preserving the "call the consumer's handler first, skip the screenshot if it called `preventDefault()`" veto pattern — that part is plain DOM event semantics, unrelated to Base UI's menu machinery, and still works. What it does NOT preserve: in Radix, the consumer calling `preventDefault()` also kept the menu open; in Base UI, whether the menu closes is controlled by the separate `closeOnClick` prop (left at its default, `true`), decoupled from whether the consumer vetoes the action. Flagged, not patched — see Behavior changes.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/dropdown-menu.tsx` — no matches.

## Left alone

None of the three `PromptInputActionMenu*`/`PromptInputActionAddAttachments`/`PromptInputActionAddScreenshot` components have any consumer in the app today (grepped the whole repo) — same "unused AI Elements toolkit export" pattern as `PromptInputHoverCard*` from the hover-card migration.

## Behavior changes

- `PromptInputActionAddScreenshot`: a future consumer that passes `onClick` and calls `event.preventDefault()` to veto the screenshot will find the menu closes anyway (Radix kept it open in that case; Base UI's `closeOnClick` is static, not driven by the handler's `preventDefault()`). If that coupling matters when this component gets a real consumer, pass `closeOnClick={false}` explicitly at that call site.
- `CheckboxItem`/`RadioItem` `closeOnClick` defaults to `false` in Base UI (Radix defaulted to closing on select) — not exercised by any current code (no checkbox/radio items in use), noted for future consumers.

## Verify by hand

No live consumers exist yet for the action-menu family. Before `PromptInputActionMenu*` is wired to real UI: open the menu via the trigger button, confirm "Add photos or files" opens the file picker without closing the menu, confirm "Take screenshot" closes the menu and captures a screenshot, and confirm submenu hover/keyboard nav if any submenus are added later.
