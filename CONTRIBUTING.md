# Contributing to Townies

Thanks for helping build a welcoming little town. Everyone can report bugs, discuss improvements, and submit a pull request. Official merges and releases remain maintainer decisions.

1. Read the README and run the game locally.
2. Pick an issue labeled `good first issue`, or open an issue before making a substantial gameplay, architecture, economy, or dependency change.
3. Fork the repository and create a branch for one cohesive change.
4. Add or update the checks relevant to the behavior you changed. Never use live accounts, chats, towns, or production credentials as fixtures.
5. Run `npm run check` and `npm run build`. Run browser or integration checks for changes to those paths.
6. Open a PR describing the player-visible problem, what changed, and how you checked it. Include screenshots only when they help assess a visual change. Disclose any remaining limitations.

## Expectations

- Keep the game usable on phones and slower graphics devices. Avoid per-frame allocation, unnecessary scene rebuilds, and repeated GPU uploads.
- Server validation owns money, inventory, membership, elections, and shared work. Never trust client identity or completion claims.
- Keep shared geometry and rules consistent across rendering, pathfinding, and server validation.
- Do not edit applied SQL migrations. Append a migration and explicitly classify it as shared D1 or town-local. See `docs/architecture.md` and `docs/releases.md`.
- Keep personal state out of town-wide WebSocket updates. Check multi-device behavior and reconnection when touching networking.
- Keep credentials, backups, test databases, generated reports, and large recordings out of commits.
- Do not increase lint debt or change lint/format baselines to hide issues. Maintainers review changes to those baselines and CI.
- Read `docs/testing.md` for the formatting transition; avoid mass-formatting unrelated legacy game code in a feature PR.

## Licensing contributions

By intentionally submitting a contribution for inclusion, you offer it under Apache-2.0, as described in section 5 of LICENSE. You retain copyright to your contribution. Do not submit code or assets you do not have the right to contribute. Identify third-party sources and their licenses in the PR and update notices when appropriate. No copyright assignment or separate CLA is required.

AI-assisted contributions are welcome. The contributor remains responsible for understanding the change, checking rights and dependencies, and validating it. Do not submit generated changes you have not reviewed.

## Review

PRs need passing required checks and maintainer approval. Approval can be dismissed when a new commit changes the PR. A merge is not a promise of immediate production release. Product-direction proposals should include the effect on existing towns and players.

Security issues: follow SECURITY.md rather than opening a public issue. Community interactions follow CODE_OF_CONDUCT.md.
