# Initial public-source readiness audit

Prepared September 11, 2026. This is an engineering review, not a guarantee that the software has no vulnerabilities.

- The 61-commit private history was scanned with Gitleaks 8.30.1 in redacted mode; no secrets were detected. A separate export of publishable working files also passed. Local credentials, databases, backups, recordings, deployment configurations and reports remain ignored. Public historical infrastructure IDs are not credentials and have not been destructively rewritten.
- Apache-2.0, the upstream NOTICE, the trademark policy, asset provenance and dependency notices establish the contribution/distribution boundary. A few dependency publishers omit complete notices or have inconsistent package metadata; THIRD_PARTY_NOTICES.md records those exceptions explicitly.
- Default commands now use local account authentication, generated development credentials and local Cloudflare emulation. The existing official Worker and storage configuration is preserved privately. Staging uses independent storage.
- Cloudflare tooling updates removed all high-severity npm audit findings. Four moderate findings remain in the Drizzle migration tool dependency chain. The suggested npm force-fix is a breaking downgrade and was not applied. CI rejects new high/critical findings; Dependabot tracks updates. Do not expose development tool servers publicly.
- TypeScript, the no-increased-lint-debt gate, formatting, 32 deterministic suites, four browser suites, a built Worker, and isolated account/DO/WebSocket/migration/passkey integration checks passed locally. The browser checks exposed a negative frame-duration edge case during scene reconstruction; frame time is now clamped to prevent a backward movement step.
- There are 254 existing lint findings tracked by file/rule. Legacy game formatting exceptions and former header-auth API fixtures remain explicit technical debt. The tests do not establish capacity at 50 simultaneous players or replace a security/load/accessibility audit.
- Public PR checks receive no deployment secrets. GitHub required checks/code owners, protected environments and owner-controlled release tags provide separate merge and release controls. The manual release workflow stays disabled until a scoped Cloudflare token is added and the maintainer enables it.

See the repository's current Actions runs and GitHub settings for the live status of checks and protections. See docs/releases.md for provisioning, validation and rollback procedures.
