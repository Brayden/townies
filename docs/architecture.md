# Architecture

Townies is a browser client and a Cloudflare Worker, with one SQLite Durable Object per town. The official service uses account authentication. The historical Sites/header authentication adapter remains for compatibility and is not enabled by the contributor configuration.

## Code map

| Area                                                   | Responsibility                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `app/game/`                                            | Three.js scene, HUD, input, shared geometry and gameplay catalogs |
| `app/api/`                                             | HTTP endpoints and authentication boundaries                      |
| `server/game.ts`, `server/chat.ts`, `server/social.ts` | Server validation and gameplay operations                         |
| `server/towns/router.ts`                               | Authenticate and route requests to the resident's town            |
| `server/towns/Town.ts`                                 | Town-local state, transactions, WebSocket membership and updates  |
| `server/towns/ResidentCoordinator.ts`                  | Coordinate resident moves between towns                           |
| `server/towns/schema.ts`, `sqlite.ts`                  | Apply town migrations and adapt SQLite queries                    |
| `db/`                                                  | Shared schema, account auth and gameplay query helpers            |
| `worker.ts`                                            | Worker entry point and WebSocket upgrade route                    |
| `drizzle/`                                             | Append-only SQL migrations and schema metadata                    |

## State ownership

D1 holds Better Auth accounts, sessions, passkeys, directory/membership information and historical source data needed by the one-time town import. Active gameplay state belongs to each town's Durable Object. Town state is imported once when necessary; it must not be overwritten by stale D1 rows. A resident coordinator handles cross-town transfers. See [Durable towns](durable-towns.md) for migration and transfer details.

Authenticated clients connect through `/api/town-socket`. The Worker routes them to their town. The town authorizes commands and broadcasts state, movement and chat updates. HTTP remains available as a fallback. Never broadcast private conversations or account/session data to the whole town.

The browser predicts motion and animates shared work, while the server owns rewards, permissions, inventory, capacity and timestamps. Multiple devices can observe the same resident; movement ownership prevents an idle device from repeatedly resetting the active device. See [device handoff](device-handoff.md).

## Persistence changes

Do not modify a migration already used by a deployed town. Add a new SQL migration and decide whether it belongs to shared D1, town-local SQLite, or both. Town migrations are selected explicitly in `server/towns/schema.ts`; merely adding a file is insufficient. Accounts/passkeys must never be copied into a town object. Test an existing save as well as an empty database.

Worker names, Durable Object class names/bindings and migration tags are persistent infrastructure identities. Changing them can create a different namespace instead of upgrading existing towns. Preserve these identities in official deployments.

## Local and deployed environments

`wrangler.local.json` contains placeholders for local emulation only. Generated development credentials/state live under ignored `outputs/local/`. `wrangler.deploy.example.json` is a template for independent deployments. Official production and staging configuration is private and ignored. Tests create their own state and never use the official service.

## Current boundaries

Some scene and server modules are large, and a number of tests use source instrumentation. The project is playable but still evolving; extracting modules gradually is preferable to rewriting the game while changing behavior. The roadmap lists concrete improvement areas.
