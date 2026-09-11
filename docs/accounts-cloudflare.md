# Accounts and the personal Cloudflare beta

The standalone beta uses email/password accounts before loading the game. Account creation signs the player in, then offers town creation or joining. Returning players resume their resident, home, and job. Settings includes logout. Town invitation hashes survive signup and login.

## Deployment boundary

- Worker: `townies-beta`
- URL: https://townies-beta.brayden-wilmoth.workers.dev
- D1: `townies-beta-db` (configured in `wrangler.cloudflare.json`)
- Authentication mode: `account`

This is a fresh world. It neither modifies nor imports the existing Sites database. A new account does not claim a Sites resident based on email. Sites builds retain their explicit dispatcher identity mode; the standalone Worker rejects those headers as authentication.

## Local development

Create an ignored `.dev.vars` with `BETTER_AUTH_SECRET` (a random secret), `BETTER_AUTH_URL="http://localhost:3002"`, and `TOWNIES_AUTH_MODE="account"`. Never commit this file.

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.cloudflare.json
npm run dev:cloudflare
```

Run `node tests/accounts-api.mjs` against that local server. The test creates disposable local accounts/towns and rejects remote URLs. It covers registration, login, logout and session revocation, invitation joining, home ownership, persisted residents, cross-origin rejection, and rejection of unauthenticated or forged-header requests. For a built Worker, supply the same absolute `--persist-to` directory used by local migrations, and override `BETTER_AUTH_URL` to its test port.

## Publishing updates

```sh
npm run build:cloudflare
npx wrangler d1 migrations apply DB --remote --config wrangler.cloudflare.json
npm run deploy:cloudflare
```

Set `BETTER_AUTH_SECRET` separately using Wrangler's secret store, not a public variable or source file. It is already configured for this Worker. Keep it stable across deployments. The generated server `.dev.vars` is only for local emulation; do not include it in deployment artifacts. The deploy script removes that generated copy and verifies the standalone target before publishing.

Account data is stored in migration 0016's five auth tables. Better Auth handles password hashing and signed HttpOnly session cookies, with 30-day sessions and database-backed request limits. Game, social, and chat APIs resolve the verified session on the server. Existing resident authorization applies afterward.

## Limits of this beta

Email verification and password recovery need a transactional email provider and are not enabled yet. Accounts currently accept unverified email addresses; players should use their own email and save their password. Existing Sites progress needs an explicitly verified migration workflow if we later offer transfers. Broader open-beta work remains: moderation/account management, recovery and restore drills, load testing, and performance monitoring. This release establishes standalone accounts and hosting, not completion of those launch requirements.

Framework dependencies were updated during this change to address identified runtime advisories. Some development-tool dependency advisories remain; do not interpret a successful build as a clean dependency audit.
