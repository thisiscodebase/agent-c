# accordion

2026-07-08. Golden pair via shadcn CLI registry (progressive mode). Pristine wrapper, no consumers in the app — migrated and finalized in one pass.

## Changed

- `components/ui/accordion.tsx` — replaced radix-ui `Accordion` primitive with `@base-ui/react/accordion`. Diffed the file against the `radix-nova` registry golden; the only delta was icon-library resolution (`IconPlaceholder` -> concrete `lucide-react` icons) and the project's `~/lib/utils` import alias, both of which are CLI-resolved boilerplate, not real customization — so the file was classified PRISTINE. Fetched `https://ui.shadcn.com/r/styles/base-nova/accordion.json`, applied the same icon/alias resolution, wrote it to `accordion-base.tsx`, typechecked, then (since the component had zero consumers) deleted the radix original and renamed `accordion-base.tsx` -> `accordion.tsx` directly instead of a staged consumer repoint.
- `package.json` / `pnpm-lock.yaml` — added `@base-ui/react@1.6.0` (radix packages kept; other `components/ui/*` wrappers are still on radix-ui and this project cannot fully flip base libraries — see Left alone).
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/accordion.tsx` — no matches.

## Left alone

- All other `components/ui/*` wrappers (alert, dialog, dropdown-menu, select, tabs, tooltip, etc.) — still on `radix-ui`, untouched. `components.json` style stays `radix-nova`; it is NOT flipped to `base-nova` because this project ships `components/ai-elements/*` (Vercel AI Elements), which depends directly on `@radix-ui/react-use-controllable-state` and is not compatible with Base UI. This project should stay in progressive mode indefinitely rather than attempt a whole-project flip.
- `components/ui/command.tsx` (cmdk), and no drawer/sonner/input-otp/calendar/chart wrappers exist in this project — not radix, correctly out of scope.
- No CSS changes needed: the shipped `shadcn/tailwind.css` accordion keyframes already fall back through both `--radix-accordion-content-height` and `--accordion-panel-height`.

## Behavior changes

- Disabled-trigger styling switched from a `disabled:` variant to `aria-disabled:` (Base UI's `AccordionPrimitive.Trigger` renders disabled state via `aria-disabled`, not the native `disabled` attribute) — this is the shadcn base-nova registry default, not a local deviation.
- None observed beyond registry defaults; no consumers exist yet to exercise runtime behavior.

## Verify by hand

Component has no consumers in the app today, so there's nothing to click through yet. Before the first consumer ships:
1. Confirm expand/collapse animation (height transition) plays smoothly, not just toggling instantly.
2. Confirm keyboard nav: Tab to trigger, Enter/Space toggles, focus ring visible.
3. Confirm chevron icon flips (down when closed, up when open) and disabled items are visually + functionally inert.
