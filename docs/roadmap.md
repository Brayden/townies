# Contributor roadmap

The original [gameplay design](gameplay-design.md) describes aspirations as well as current systems. This roadmap is a starting point for contributions, not a promise that all original design features are shipped.

## Good first contributions

- Improve keyboard and screen-reader labels for HUD controls while preserving touch layout. Cover focus order, accessible names and Escape behavior.
- Document common local setup and WebGL troubleshooting with reproducible, sanitized diagnostics.
- Port one legacy job API fixture to the isolated account-mode integration suite, covering authorization and duplicate rewards.

## Community square prototype

New towns have an inward-facing square with four resident-selected building lots. The catalog connects twelve buildable venues to potential careers and activities; those new gameplay loops remain planned. See [the prototype and next playable slice](community-square.md) before extending it.

## Coordinated work

- Extract focused modules from the scene and game server while keeping saved data and behavior stable.
- Expand multiplayer tests for reconnects, simultaneous work claims, town capacity and interrupted town transfers.
- Exercise long-running town economies and progression with synthetic local residents.
- Strengthen abuse prevention, moderation tools, reporting, accessibility and performance budgets before larger releases.
- Reduce the explicit lint/format debt a module at a time.

Open an issue before large changes to economy, map generation, persistent state, authentication or infrastructure. Maintainers decide the official product direction; contributors are free to experiment in independently branded forks.
