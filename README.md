# Townies

An original Three.js town game with an angled orthographic camera and responsive desktop and touch controls. This first playable edition implements the cooperative foundation of the gameplay design in the parent `design` directory.

## Playable now

- Sign-in-bound residents with persistent D1 state across devices.
- Fixed public towns or private towns with an invitation key, capped at 50 resident accounts.
- Five starter jobs, fifty individually claimable cottages, camera previews, and an onboarding flow.
- WASD, arrows, click/tap pathfinding, a mobile joystick, contextual actions, camera follow and zoom.
- Shared work sites, five-step interactions, server-validated position and work claims, idempotent payouts, XP, and a tax receipt.
- Daily school credits, home decorations, a bicycle speed upgrade, and a shared pocket park.
- One-second presence updates with interpolated avatars, named NPCs, and shared visibility of home improvements.

## Deliberate limits

This is a first playable version, not the full long-term design. The other fifteen starter jobs, distinct advanced career gameplay, elections, expanded town stages, home interiors, chat, moderation tooling, and key rotation remain future milestones. Presence uses HTTP polling, not a WebSocket simulation. Fifty-account API concurrency has been exercised; sustained fifty-device rendering and mobile GPU performance have not yet been measured.

The published Site is owner-private initially. Its access policy must include friends before invitation keys can let them join a town. Town keys do not bypass Site access or sign-in. Signed-in identity comes only from the trusted Sites dispatcher. The local Vite preview supplies its own single local test identity through the provided sign-in path.

## Development

Use `npm install`, `npm run dev`, and `npm run build`. The project uses the generated Vinext and Cloudflare Worker structure, with `DB` as the logical D1 binding. Apply local schema migrations with `npx wrangler d1 migrations apply DB --local --config wrangler.local.json`. Never edit an already published migration.

For service integration tests, build and run the Worker locally with `npx wrangler dev --config dist/server/wrangler.json --port 3002 --persist-to .wrangler/state`, then run `TOWNIES_TEST_URL=http://localhost:3002 node tests/game-api.mjs`. Tests inject distinct simulated dispatcher identities into the local Worker only; this test entry point is not a production authentication mechanism. Tests deliberately create local test towns and residents. The test runner refuses non-local URLs.

Run `node tests/pathfinding.mjs` for obstacle routing checks, and `npx tsc --noEmit` for types. The local development preview and production Worker use the same schema but separate serving modes. Site publishing packages only the built output and schema migrations, never local test state.

## Validation notes

The service checks cover private invitations, home claim races, persistence, purchases, duplicate rewards, donation limits, daily school credit, isolation, 50 resident slots, and concurrent presence updates. Browser interaction and visual QA were not run in this task. The optional WebMCP progress and navigation tools are feature-detected; no supported WebMCP validation context was available, so their runtime contracts remain unverified.

## Visual direction

Warm low-poly geometry, colorful cottage roofs, striped bazaar awnings, textured silhouettes, soft shadows, and cream-and-forest game UI. All models are generated in Three.js; no commercial game assets are included. Static geometry is merged by material to reduce draw calls. Townies uses an angled orthographic camera rather than a flat top-down view.
