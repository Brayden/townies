# Townies

A cooperative browser game where up to 50 neighbors build a town together. Deliver newspapers by bike, mow growing grass, tidy streets and gardens, personalize your home, visit friends, and vote on the town's future.

**[Play the official game](https://townies.town) · [Report a bug](https://github.com/Brayden/townies/issues/new/choose) · [Contribute](CONTRIBUTING.md)**

Townies uses Three.js with an angled 2.5D camera, React, Vinext/Vite+, and Cloudflare Workers. Each town has its own SQLite-backed Durable Object and authenticated WebSocket connections. D1 stores accounts and the shared directory. See [architecture](docs/architecture.md).

## Run locally

Requires **Node 24**, npm, and a browser with WebGL 2. macOS and Linux are supported; on Windows use WSL2. A Cloudflare account, GitHub token, and production credentials are **not required**.

```sh
git clone https://github.com/Brayden/townies.git
cd townies
nvm use                    # or install Node 24 another way
npm ci
npm run setup
npm run dev
```

Open `http://localhost:3002`, create a local account, then create or join a local town. Use a separate browser profile for a second player. These accounts and towns exist only on your machine.

`npm run setup` generates an ignored development secret and applies migrations to `outputs/local/state`. It is safe to rerun and preserves existing local data. `npm run build && npm start` runs the production-style Worker locally, including the real WebSocket path. The Vite development server may use HTTP fallback; use the built Worker when working on multiplayer transport.

## Check your change

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:browser
npm run test:integration
```

On Linux, use `npx playwright install --with-deps chromium`. `CHROME_PATH` optionally selects a locally installed Chrome binary. No test relies on a maintainer's computer or a live town. Integration tests create a separate local database and manage their own server.

The [testing guide](docs/testing.md) explains fast tests, multiplayer coverage, legacy fixtures, and the existing lint/format baseline. CI runs checks, builds, browser tests, authentication, and multiplayer regressions for public PRs without deployment credentials.

## What's playable

- Nine physical jobs: paper carrier, street cleaner, lawn mower, gardener, parcel delivery, street sweeper, sidewalk powerwasher, hedge trimmer, and leaf raker.
- Shared completion and regrowth, a live work checklist, job equipment, rewards, and progression.
- Fifty home locations, house upgrades and relocation, furniture, multi-floor interiors, outfits, bikes, and pets.
- Town/profession chat, friends, private messages, gestures, invitations, and permission-controlled home visits.
- Elections, campaign promises, taxes, civic projects, branching building development, relocation, and territory expansion.
- Desktop/touch controls, adaptive graphics, optional music/effects, email/password accounts, and passkeys.

Some systems remain experimental. This repository does not promise that every feature in the [original design](docs/gameplay-design.md) is implemented. See [roadmap](docs/roadmap.md) and open issues before starting larger work.

## Contribute and release

Everyone may fork the project and open pull requests. Maintainers decide which changes enter the official game. PR approval and production release approval are separate. See [contributing](CONTRIBUTING.md), [governance](GOVERNANCE.md), and [release operations](docs/releases.md).

Security vulnerabilities should be reported privately through [GitHub security advisories](https://github.com/Brayden/townies/security/advisories/new), not public issues. See [SECURITY.md](SECURITY.md).

## License and attribution

Code and project-owned non-brand assets are available under [Apache-2.0](LICENSE), subject to the exceptions and third-party notices in [ASSETS.md](ASSETS.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Redistributed derivatives must preserve applicable attribution from [NOTICE](NOTICE), including the upstream repository reference, as the license requires.

**The Townies name, logo, and branding are reserved for the official project.** The open-source license does not grant trademark rights. Public forks should use their own name and branding while accurately acknowledging their origin. See [TRADEMARKS.md](TRADEMARKS.md).
