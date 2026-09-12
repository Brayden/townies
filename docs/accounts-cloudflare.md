# Accounts and Cloudflare hosting

Townies uses email/password accounts before loading the game. Account creation signs the player in, then offers town creation or joining. Returning players resume their resident, home, and job. Settings includes logout. Town invitation hashes survive signup and login.

World storage now runs in per-town Durable Objects. See [Durable towns](durable-towns.md) before changing database migrations or rolling back deployments.

## Maintainer-only deployment boundary

- Worker: `townies` (renamed in place; same immutable Worker ID)
- URL: https://townies.town
- D1: `townies-beta-db` (existing database ID retained; the supported D1 update API does not expose a name change)
- Authentication mode: `account`

The Cloudflare world remains separate from the original Sites database. The custom-domain release preserves the existing Cloudflare accounts, residents, and town objects. A new account does not claim a Sites resident based on email. Sites builds retain their explicit dispatcher identity mode; the standalone Worker rejects those headers as authentication.

## Local development

Run `npm ci`, `npm run setup`, and `npm run dev`. The setup creates an ignored development secret and local database under `outputs/local/`; no Cloudflare account is needed. Use `npm run test:integration` for isolated account, WebSocket, migration and passkey fixtures. See [testing](testing.md).

## Publishing updates

```sh
npm run build:cloudflare
npx wrangler d1 migrations apply DB --remote --config wrangler.production.json
npm run deploy:cloudflare
```

Set `BETTER_AUTH_SECRET` separately using Wrangler's secret store, not a public variable or source file. It is already configured for this Worker. Keep it stable across deployments. The generated server `.dev.vars` is only for local emulation; do not include it in deployment artifacts. The deploy script removes that generated copy and verifies the standalone target before publishing.

Account data is stored in migration 0016's five auth tables. Better Auth handles password hashing and signed HttpOnly session cookies, with 30-day sessions and database-backed request limits. Game, social, and chat APIs resolve the verified session on the server. Existing resident authorization applies afterward.

## Remaining launch work

Email verification and password recovery need a transactional email provider and are not enabled yet. Accounts currently accept unverified email addresses; players should use their own email and save their password. Existing Sites progress needs an explicitly verified migration workflow if we later offer transfers. Broader open-beta work remains: moderation/account management, recovery and restore drills, load testing, and performance monitoring. This release establishes standalone accounts and hosting, not completion of those launch requirements.

Framework dependencies were updated during this change to address identified runtime advisories. Some development-tool dependency advisories remain; do not interpret a successful build as a clean dependency audit.

## Custom-domain transition

The existing Worker is renamed in place from `townies-beta` to `townies`, preserving its immutable identity and both Durable Object namespaces. The `Town` and `ResidentCoordinator` class names and migration history stay unchanged. `townies.town` is a Worker Custom Domain; Cloudflare manages its DNS and certificate. `BETTER_AUTH_URL` is the canonical HTTPS address. The new workers.dev alias redirects there. Cookies are host-only, so players sign in once on the new domain using their existing account; their saved resident resumes normally. The old beta workers.dev hostname is retired by the Worker rename.

Changing `name` in Wrangler alone would deploy a new Worker. Never use that as a way to rename this deployment. Preserve the existing D1 ID and both namespace IDs, and verify identities after changes. The database and existing DO namespaces retain their historical display names (`townies-beta-db`, `townies-beta_Town`, and `townies-beta_ResidentCoordinator`). These labels do not determine the service’s release status; replacing storage to change a label would be inappropriate. The Worker name and public branding no longer say beta.

Verified release `b464e1bd-5a30-4ff3-918b-346b29d8ab49` on September 11, 2026: HTTPS home/account routes, workers.dev canonical redirect, existing-account login with matching resident/town IDs and saved homes/careers/balances/active mowing, secure WebSocket chat and logout revocation, and unchanged storage identities after deployment. Build and type checking passed. Temporary test directory/account records were removed; unlisted test object storage remains subject to the retention note in the durable-town guide.
