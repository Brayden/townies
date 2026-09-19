# Contributor and coding-agent instructions

Read README.md and CONTRIBUTING.md first. Use Node 24. Default to the local environment; never use production accounts, data, credentials, migrations, or deployment commands for testing.

Preserve the server-authoritative game model, town/account isolation, and existing player saves. Never edit an applied migration. Distinguish shared D1 from town-local SQLite migrations and update the explicit town migration list only when appropriate.

Keep PRs focused. Do not increase the tracked lint/format baseline or weaken CI/rules to make checks pass. Run relevant checks plus typecheck/build. Browser tests use Playwright's installed Chromium or an explicit CHROME_PATH, never a personal filesystem path.

Do not push directly to main, create official release tags, publish releases, or deploy without explicit maintainer authorization for that action. Do not include credentials, local state, backups, reports, or recordings in commits. Report security problems privately under SECURITY.md.

Document player-visible behavior and validation, not the conversation history. Contributors retain copyright; contributions are submitted under Apache-2.0. The Townies name and branding are reserved by TRADEMARKS.md.

For menu structure, hierarchy, navigation, and layout work, apply [the Townies game menus skill](docs/skills/townies-game-menus/SKILL.md). Keep its canonical version in this repository so contributors share the same guidance.
