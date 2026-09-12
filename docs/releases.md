# Maintainer release operations

Public PRs run without deployment credentials. Merging and deploying are separate decisions. The official game is administered by @Brayden.

## One-time repository setup

After the initial clean import, configure `main` to require the `Checks`, `Browser`, `Integration` and `Security` checks, one approving code-owner review, dismissal of stale reviews and resolution of conversations. Block force pushes and deletion. With one maintainer, allow the owner to bypass the review requirement only through a PR, so the owner can merge their own work. Never grant contributors automatic push or release rights.

Protect `v*` tags against creation, changes and deletion except by the owner. Set Actions default token permissions to read-only, disallow Actions approving PRs, and require approval for outside collaborators' workflow runs. Enable private vulnerability reporting, secret scanning/push protection where available, and dependency alerts.

Create `staging` and `production` GitHub environments. Each must allow only the protected `main` branch and require @Brayden's review. A sole maintainer needs self-review enabled; disable self-review when a second trusted release maintainer exists. Disable administrator bypass where supported. These settings are not created by adding a workflow file; verify them in GitHub before enabling releases.

Each environment needs a `CLOUDFLARE_API_TOKEN` secret and a `TOWNIES_DEPLOY_CONFIG` JSON variable. Set `TOWNIES_RELEASE_ENABLED` to `true` only after reviewing the protections. Use a dedicated Cloudflare token with only required Workers/D1 and applicable zone deployment permissions, scoped to the official account/zone. Do not put a personal Wrangler OAuth token, Better Auth secret or API token in source or a public issue.

## Staging

Create a separate Worker (`townies-staging`), D1 database and auth secret. The separate Worker gets its own Durable Object namespaces. Use a distinct staging URL and passkey relying-party origin. Never copy real user data into staging; create synthetic accounts. Put this configuration in the staging environment and, optionally, ignored `wrangler.staging.json` for local maintainer commands.

Start from `wrangler.deploy.example.json`. Replace its account, database, URL and routing placeholders. Provision `BETTER_AUTH_SECRET` directly as a Worker secret using Wrangler or the Cloudflare dashboard; the release workflow preserves existing Worker secrets. Disable email integrations or other real-world effects in staging until deliberately configured.

## Release workflow

1. Merge the reviewed PR with passing checks. Record player-visible changes and migration impact.
2. Run the manual **Release** workflow from `main`, selecting a full 40-character commit SHA on `main` and the staging environment. It verifies the commit and reruns checks, build, browser and integration tests before requesting environment approval.
3. Review the candidate SHA, configuration, schema changes and deployment target at the environment approval gate. D1 migration application is explicit; the workflow defaults to refusing a migration step unless selected. Select it only after reviewing pending migrations. Town-local migrations run in the Durable Object under the game's migration logic.
4. Verify staging with two synthetic accounts, reload/reconnect, input on a phone, a shared job and a home visit. For storage changes, verify existing synthetic saves and a restart. Record the result in the release notes.
5. Dispatch the same SHA to production, repeat approval, and verify the official game after deployment. Record the Cloudflare version identifier.
6. Create an immutable `vX.Y.Z` tag on the tested SHA and a GitHub release describing changes, validation and migration/rollback notes. Tagging does not automatically deploy.

The workflow refuses to deploy without environment configuration, an enabled release gate and a token. Before first use, a maintainer must finish environment/resource provisioning. No automatic production release happens on a push or merge.

## Local maintainer deployment

Copy the deployment template to ignored `wrangler.production.json` or `wrangler.staging.json`. The existing official configuration is preserved privately when migrating to this setup. Production must retain Worker `townies`, the existing D1 identifier, `Town` and `ResidentCoordinator` bindings/classes, and all applied Durable Object migration tags. The historical database name containing “beta” is not a reason to recreate it.

Use `npm run build:staging` then `npm run deploy:staging`, or the production counterparts `npm run build:cloudflare` and `npm run deploy:cloudflare`. Both are explicit maintainer operations. Default build/start commands are local-only. Apply reviewed shared migrations separately with the correct private configuration and `--remote`; never use these operations for contributor tests.

## Rollback and recovery

Record the previous Worker version before deployment. A Worker rollback restores code, not D1 or Durable Object data. Prefer backward-compatible, additive schema changes and a forward repair when a migration cannot be undone safely. Plan and verify backups before destructive changes; do not assume a code rollback is a database backup. Pause new releases if account access, town isolation, rewards, movement or shared state regress.

Use private operational records for secrets, backup locations and incident data. Publish only sanitized release notes and issue reproductions.
