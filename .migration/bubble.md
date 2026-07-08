# bubble

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper — migrated and finalized in one pass.

## Changed

- `components/ui/bubble.tsx` — replaced the radix-ui `Slot`-based `asChild` composition on `BubbleContent` with Base UI's `useRender`/`mergeProps` (`@base-ui/react/use-render`, `@base-ui/react/merge-props`), matching the `base-nova` registry golden exactly. `Bubble`, `BubbleGroup`, and `BubbleReactions` were already plain `<div>`s with no radix dependency.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui" components/ui/bubble.tsx` — no matches.

## Left alone

`components/chat/parts/text-part.tsx` (sole consumer) uses only `<Bubble variant="secondary"><BubbleContent>...</BubbleContent></Bubble>` — no `asChild`, no call-site changes needed.

## Behavior changes

None expected — same reasoning as button-group/badge (Slot was pure polymorphism, no stateful radix behavior).

## Verify by hand

Confirm user message bubbles in the chat transcript still render with the secondary background and correct alignment.
