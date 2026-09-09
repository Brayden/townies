# Townies

An original Three.js town game with an angled orthographic camera and responsive desktop and touch controls. This first playable edition implements the cooperative foundation of the gameplay design in the parent `design` directory.

## Playable now

- Sign-in-bound residents with persistent D1 state across devices.
- Fixed public towns or private towns with an invitation key, capped at 50 resident accounts.
- Five starter jobs, fifty individually claimable cottages, camera previews, and an onboarding flow.
- WASD, arrows, click/tap pathfinding, and mobile steering stay relative to the camera. Drag to pan; right-drag or choose Camera → Drag to rotate for 360-degree orbit and tilt. Two-finger pinch/twist zooms and rotates. Q/R rotates, Alt+arrows pans, and follow/reset controls restore your view.
- Town → Copy town code / Copy invite link works in public and private towns. Invite links prefill the welcome screen, existing codes are preserved, and joining still enforces the 50-resident cap. Preview access must separately include friends.
- Start a shift from the persistent “Start my job” button or Work panel. Your regular career is pinned first in Work; the mower starts at your current position without setting a destination. Riding mowers cut almost 9,000 shared grass patches across town, leaving stripes and clippings; WASD/arrows, touch steering, or tap-to-drive all work.
- Mowing earns 2 coins per fresh patch in the mowing career (1 for helpers), plus 1 XP and 1 town coin. Each grass patch regrows 24 hours after it was cut. Standing still, walking without a mower, duplicate passes, and offline movement earn nothing.
- Paper carriers ride a delivery bicycle and leave newspapers in mailboxes or at doors (4 coins each). Delivery helpers pull a handcart and leave parcels at doors (8 coins each). Paper baskets hold 12 and carts hold 6; restock at the town supply stand.
- Street cleaners use a picker to collect individual litter (3 coins each), then empty their 8-item bag at the recycling station. Gardeners pour water onto dry beds over two seconds (6 coins each), leaving dark soil and blooming flowers; refill the 8-use can at the fountain.
- All jobs operate on real objects: click/tap a nearby object or press E, with optional “Find next” guidance. Helpers earn one fewer coin per action. Each completed action earns XP and a town coin; shared results persist for 24 hours. Supplies persist between shifts, and concurrent claims cannot pay twice for the same object. A house accepts one newspaper per day, whether left at its door or mailbox.
- Paper and gardening shifts switch the zoomable minimap to shared delivery or watering status. Green checked markers are complete; gray markers need care. Four communal gardens at Pocket Park, the school, the riverside, and Meadow Commons add 24 reachable beds with paths, timber borders, and benches. Their ground is protected from mowing.
- Daily school credits, home decorations, a bicycle speed upgrade, and a shared pocket park.
- One-second presence updates with interpolated avatars, named NPCs, and shared visibility of home improvements.

## Deliberate limits

This is a first playable version, not the full long-term design. The other fifteen starter jobs, distinct advanced career gameplay, elections, expanded town stages, home interiors, chat, moderation tooling, and key rotation remain future milestones. Presence uses HTTP polling, not a WebSocket simulation. Fifty-account API concurrency has been exercised; sustained fifty-device rendering and mobile GPU performance have not yet been measured.

The published Site is owner-private initially. Its access policy must include friends before invitation keys can let them join a town. Town keys do not bypass Site access or sign-in. Signed-in identity comes only from the trusted Sites dispatcher. The local Vite preview supplies its own single local test identity through the provided sign-in path.

## Development

Use `npm install`, `npm run dev`, and `npm run build`. The project uses the generated Vinext and Cloudflare Worker structure, with `DB` as the logical D1 binding. Apply local schema migrations with `npx wrangler d1 migrations apply DB --local --config wrangler.local.json`. Never edit an already published migration.

For service integration tests, build and run the Worker locally with `npx wrangler dev --config dist/server/wrangler.json --port 3002 --persist-to .wrangler/state`, then run `TOWNIES_TEST_URL=http://localhost:3002 node tests/game-api.mjs`. Tests inject distinct simulated dispatcher identities into the local Worker only; this test entry point is not a production authentication mechanism. Tests deliberately create local test towns and residents. The test runner refuses non-local URLs.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/mowing-api.mjs` for mowing rates, shared patch races, mounted peer state, duplicate and invalid movements, dismounting, and 24-hour regrowth (ages only the test town’s local grass timestamps to check the boundary without waiting a day). Mowing motion uses a bounded trail of positions so turns cut the actual driven route; the server validates its length and collisions.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/mowing-route.mjs` for turns, route length validation, and collision checks.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/field-work-api.mjs` for physical job rewards, shared claims, watering duration, supply limits, refills, gear transitions, and town isolation. It adjusts supplies only for its newly created local test residents. Run `node tests/work-targets.mjs` to verify all 324 work objects and refill stations are reachable, with unique targets and shared newspaper claims.

Run `node tests/pathfinding.mjs` for obstacle routing checks, and `npx tsc --noEmit` for types. The local development preview and production Worker use the same schema but separate serving modes. Site publishing packages only the built output and schema migrations, never local test state.

## Validation notes

The service checks cover private invitations, home claim races, persistence, purchases, duplicate rewards, donation limits, daily school credit, isolation, 50 resident slots, and concurrent presence updates. Browser interaction and visual QA were not run in this task. The optional WebMCP progress and navigation tools are feature-detected; no supported WebMCP validation context was available, so their runtime contracts remain unverified.

## Visual direction

Warm low-poly geometry, colorful cottage roofs, striped bazaar awnings, textured silhouettes, soft shadows, and cream-and-forest game UI. All models are generated in Three.js; no commercial game assets are included. Static geometry is merged by material to reduce draw calls. Townies uses an angled orthographic camera rather than a flat top-down view.

Run `node tests/town-grass.mjs` to verify grass coverage and indexed cutting queries, and `TOWNIES_TEST_URL=http://localhost:3002 node tests/freeroam-api.mjs` to check shared mowing income away from designated task sites. Roads, river, buildings, doorstep paths, and planted gardens are excluded from new grass.

Run `node tests/camera.mjs` for camera-relative controls, rotation/tilt bounds, click-versus-drag separation, two-finger gestures, cancellation, and listener cleanup. The game API tests also cover public-town invitation generation and concurrent requests.
