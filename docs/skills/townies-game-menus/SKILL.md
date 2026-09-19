---
name: townies-game-menus
description: Design and implement focused, game-like menus for Townies, including settings, inventory, shops, town selection, and progression screens. Use for menu structure, hierarchy, density, navigation, and desktop/mobile interaction; not world rendering or game balance.
---

# Townies game menus

Create menus that help players understand a choice and act quickly. Borrow the spatial clarity of Diablo's inventory, the readable categories of Stardew Valley, and the contextual tools of The Sims. These are interaction references, not a request to copy their assets or impose a dark fantasy skin on Townies.

## Frame the task before styling

Write a brief internal map of the player's goal, relevant information, primary action, and secondary/back action. Give each view one coherent task. Separate unrelated tasks into named tabs or distinct steps, not stacked sections. Settings owns preferences, account access, control reference, and navigation to town relocation; careers belong under Work.

Keep the scope requested by the user. Do not redesign every menu at once. Preserve existing capabilities by moving them to a sensible destination rather than silently removing them.

## Compose a game surface

- Keep a stable frame: title and close control, category navigation, working area, then context/actions. Use a left rail when labels need room on wide screens, or a top strip for a few short categories. On phones keep navigation visible without wrapping into competing rows.
- Reserve the largest type for the view title (roughly 24–28px), medium type for section or selected-item names (18–20px), and clear 14–16px labels. Use 12–13px only for secondary metadata. Cost, selection, requirements, and consequences must remain readable.
- Make the scan order obvious: identity → useful state/comparison → action. Group a setting label with its control. Use consistent row heights, aligned values, concise helper text, and restrained dividers. Avoid a card, oversized icon, or paragraph for every single switch.
- For inventories and catalogs use regular slots/cards. Put the same information in the same position in every slot. Distinguish selected, unavailable, owned, and actionable states with text or shape as well as color. Do not invent thumbnails or omit essential comparison data just to fit a card.
- Show details on selection. Purchasing, relocation, and irreversible choices should have a focused review state with clear cost/consequences; keep the safe back action visible. Preserve the existing server validation and authorization rules.
- Fit common tasks in one viewport at normal desktop/phone sizes. Use pages for large catalogs and address lists. Keep navigation and critical actions outside any bounded scrolling region. Do not solve density with tiny text, clipping, or enormous full-height rows.
- Scrolling remains an accessibility fallback for short landscape screens, zoomed text, long translations, and genuinely variable detail. Prefer one predictable scrolling content area to nested scrollboxes. No blanket overflow:hidden that strands controls.

## Townies implementation

Work inside the current repo and branch. Read its AGENTS.md. Reuse `components/ui/dialog.tsx` and `components/ui/tabs.tsx` (Base UI) for focus, keyboard operation, active panels, and dismissal. Scope CSS to the menu rather than restyling all `.modal`, `.option`, or buttons globally. Inactive panels must not occupy space or accept focus, including during transitions.

Use Townies' existing warm paper surfaces, forest-green selection/action color, restrained gold accents, and serif titles with readable UI labels. Aim for deliberate contrast and compact geometry, not ornate frames, marketing copy, or dramatic animation. Respect reduced motion.

Settings reference: Sound uses aligned toggle/volume controls; Account owns sign-in and passkeys; Controls uses action/binding rows grouped by desktop or touch; Towns uses paged comparison cards, invitation-code lookup, address selection, and move review. Each may evolve when the user's task calls for it.

Navigation menus show belongings and personal capabilities. Keep storefront purchase catalogs at their buildings; a place-directory action walks the player there. Owned outfits may be equipped from Home without showing unowned paid pieces. Put personal XP/education in Journal and prosperity/shared funds in Town. Chat belongs in the activity dock with its unread badge, including access during a work shift; avoid a second floating launcher.

## Verify the actual interaction

Exercise switching tabs, keyboard focus and activation, dismissal, return navigation, and the primary action. Cover loading, empty, failure, disabled, and long-name states where applicable. Verify actions have not changed meaning while moving them.

Use the repo's automated browser fixtures at desktop, narrow portrait (320/390px), and short landscape sizes. Check that the frame and tabs stay reachable, content has no horizontal overflow, and common-task controls fit without scrolling at normal sizes. Check enlarged text remains reachable even when scrolling becomes necessary. For paged grids, test forward/back navigation and page boundaries, not just the first few cards. Run the relevant checks and build; do not increase lint/format baselines. Keep deployment governed by the user's existing instructions.
