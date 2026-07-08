# button

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, 15 consumers — migrated in one pass.

## Changed

- `components/ui/button.tsx` — replaced the radix-ui `Slot`-based `asChild` polymorphism helper with the REAL `@base-ui/react/button` `Button` primitive (per the migration skill's hard rule: button.tsx must use the real primitive, never a hand-rolled `useRender` wrapper). Byte-identical to the `radix-nova` registry golden after alias normalization. Kept the local `data-variant`/`data-size` attributes on the rendered element — present in the `radix-nova` golden but omitted from the `base-nova` golden (an apparent upstream registry oversight); nothing in the app currently selects on them, but dropping an existing attribute silently would be a regression, not a migration.
- Repo-wide grep found exactly one `asChild` usage on `Button` across all 15 consumers: `components/app-shell.tsx`'s sidebar "Settings" button, which wraps a `next/link` `<Link>`. Converted to `render={<Link href="/settings/profile" />}` with `nativeButton={false}` (the rendered element is an `<a>`, not a `<button>`).
- `components/ai-elements/prompt-input.tsx` (`PromptInputSubmit`'s `handleClick`) — `InputGroupButton` wraps `Button`, so its `onClick` prop type now flows from Base UI's `Button`, which wraps the event as `BaseUIEvent<React.MouseEvent<...>>` (adds `preventBaseUIHandler()`). `handleClick`'s parameter was typed as a plain `React.MouseEvent`; retyped to `BaseUIEvent<React.MouseEvent<HTMLButtonElement>>` (imported from `@base-ui/react/types`) to match.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/button.tsx` — no matches.

## Left alone

The other 13 consumers (`settings/integrations/page.tsx`, `settings/profile/page.tsx`, `login/page.tsx`, `input-group.tsx`, `dialog.tsx`, `message-scroller.tsx`, `chat-error-banner.tsx`, `save-memory-part.tsx`, `carousel.tsx`, `confirmation.tsx`, `tool-part.tsx`, `code-block.tsx`, `message.tsx`, `suggestion.tsx`) all use plain props (`variant`, `size`, `onClick`, `disabled`, `type`, `className`, icon/text children) with no `asChild` and no other radix-specific escape hatches — no changes needed.

## Behavior changes

None expected. `Slot` was pure polymorphism, not stateful radix behavior; the real Base UI `Button` primitive renders a native `<button>` by default (`nativeButton` defaults `true`), matching prior behavior everywhere except the one `render`-based Settings link.

## Verify by hand

Given the reach (15 consumers), a broad pass: click through primary actions (login, connect/test/revoke integrations, save profile, new-chat, delete-thread, prompt submit/stop, save-memory approve/reject, carousel prev/next, tool-call approve/reject, code-block copy) and confirm hover/focus/disabled states still look right. Specifically verify the sidebar "Settings" link still navigates correctly and looks like a button (not an anchor-styled link).
