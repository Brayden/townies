# Townies

An original Three.js town game with an angled orthographic camera and responsive desktop and touch controls. This first playable edition implements the cooperative foundation of the gameplay design in the parent `design` directory.

## Playable now

- Sign-in-bound residents with persistent D1 state across devices.
- Fixed public towns or private towns with an invitation key, capped at 50 resident accounts.
- Five starter jobs, fifty individually claimable cottages, camera previews, and an onboarding flow.
- WASD, arrows, click/tap pathfinding, and mobile steering stay relative to the camera. Drag to pan; right-drag or choose Camera → Drag to rotate for 360-degree orbit and tilt. Two-finger pinch/twist zooms and rotates. Q/R rotates, Alt+arrows pans, and follow/reset controls restore your view.
- Town → Copy town code / Copy invite link works in public and private towns. Invite links prefill the welcome screen, existing codes are preserved, and joining still enforces the 50-resident cap. Preview access must separately include friends.
- Start a shift from the persistent “Start my job” button or Work panel. Your regular career is pinned first in Work; the mower starts at your current position without setting a destination. Riding mowers cut over 4,000 shared grass patches across town, leaving stripes and clippings; WASD/arrows, touch steering, or tap-to-drive all work.
- Mowing earns 2 coins per fresh patch in the mowing career (1 for helpers), plus 1 XP and 1 town coin. Each grass patch regrows 24 hours after it was cut. Standing still, walking without a mower, duplicate passes, and offline movement earn nothing.
- Paper carriers ride a delivery bicycle and target mailboxes or doors to throw newspapers onto the front porch (4 coins each at balanced tax). Delivery helpers pull a handcart and leave parcels at doors (8 coins each). Paper baskets hold 12 and carts hold 6; restock at the town supply stand.
- Street cleaners use a picker to collect individual litter (3 coins each), then empty their 8-item bag at the recycling station. Gardeners pour water onto dry beds over two seconds (6 coins each), leaving dark soil and blooming flowers; refill the 8-use can at the fountain.
- All jobs operate on real objects: click/tap a nearby object or press E, with optional “Find next” guidance. Helpers earn one fewer coin per action. Each completed action earns XP and a town coin; shared results persist for 24 hours. Supplies persist between shifts, and concurrent claims cannot pay twice for the same object. A house accepts one newspaper per day, whether left at its door or mailbox.
- Paper and gardening shifts switch the zoomable minimap to shared delivery or watering status. Green checked markers are complete; gray markers need care. Four communal gardens at Pocket Park, the school, the riverside, and Meadow Commons add 24 reachable beds with paths, timber borders, and benches. Their ground is protected from mowing.
- Daily school credits, home decorations, a bicycle speed upgrade, and a shared pocket park.
- One-second presence updates with interpolated avatars, named NPCs, and shared visibility of home improvements.

Click or tap anywhere on the minimap, including building icons, to quickly aim the camera there without changing the character’s route. The follow-camera button returns to the resident; the Town directory still provides walking directions.

The map follows the approved straight-grid concept: a central civic square with Town Hall and shops across the northern frontage, café and post office at the sides, library and Garden Club framing the southern market stalls. A rectangular park occupies the western block, with a gazebo, playground, planted boundaries, paths, and communal beds. The school and its learning garden sit north of the square, the windmill and orchard occupy the northwest corner, and riverside cottages occupy the eastern bank. South Orchard and Harbor Lane lead to a boat shed, promenade, decorative pier and boats. Fifty homes retain their stable IDs, ownership, and purchased items, with consistent south-facing entrances, fenced lots and street access.

Five bridges use the same collision definition in rendering, navigation and server validation. Roads are clipped at the river, banks have bridge openings, and decks have ramps that avatar height follows. Residents inside newly placed buildings are moved to nearby safe ground. The new Town overview camera button fits the layout to the available screen; Follow my character restores the close playing view.

Thread & Thistle sells five additional shirt colors, alongside five free starter shirts. Purchases and wardrobe changes happen at its entrance, persist on the resident, and update peer outfits. Owned shirts can be worn again for free, and concurrent purchases charge only once.

## Deliberate limits

This is a first playable version, not the full long-term design. The other fifteen starter jobs, distinct advanced career gameplay, expanded town stages, home interiors, chat, moderation tooling, and key rotation remain future milestones. Presence uses HTTP polling, not a WebSocket simulation. Fifty-account API concurrency has been exercised; sustained fifty-device rendering and mobile GPU performance have not yet been measured.

The published Site is owner-private initially. Its access policy must include friends before invitation keys can let them join a town. Town keys do not bypass Site access or sign-in. Signed-in identity comes only from the trusted Sites dispatcher. The local Vite preview supplies its own single local test identity through the provided sign-in path.

## Development

Use `npm install`, `npm run dev`, and `npm run build`. The project uses the generated Vinext and Cloudflare Worker structure, with `DB` as the logical D1 binding. Apply local schema migrations with `npx wrangler d1 migrations apply DB --local --config wrangler.local.json`. Never edit an already published migration.

For service integration tests, build and run the Worker locally with `npx wrangler dev --config dist/server/wrangler.json --port 3002 --persist-to .wrangler/state`, then run `TOWNIES_TEST_URL=http://localhost:3002 node tests/game-api.mjs`. Tests inject distinct simulated dispatcher identities into the local Worker only; this test entry point is not a production authentication mechanism. Tests deliberately create local test towns and residents. The test runner refuses non-local URLs.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/mowing-api.mjs` for mowing rates, shared patch races, mounted peer state, duplicate and invalid movements, dismounting, and 24-hour regrowth (ages only the test town’s local grass timestamps to check the boundary without waiting a day). Mowing motion uses a bounded trail of positions so turns cut the actual driven route; the server validates its length and collisions.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/mowing-route.mjs` for turns, route length validation, and collision checks.

Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/field-work-api.mjs` for physical job rewards, shared claims, watering duration, supply limits, refills, gear transitions, and town isolation. It adjusts supplies only for its newly created local test residents. Run `node tests/work-targets.mjs` to verify all 349 work objects and refill stations are reachable, with unique targets and shared newspaper claims.

Run `node tests/pathfinding.mjs` for obstacle routing checks, and `npx tsc --noEmit` for types. The local development preview and production Worker use the same schema but separate serving modes. Site publishing packages only the built output and schema migrations, never local test state.

## Validation notes

The service checks cover private invitations, home claim races, persistence, purchases, duplicate rewards, donation limits, daily school credit, isolation, 50 resident slots, and concurrent presence updates. The concept-layout update was visually checked in the local browser at overview and street scale, including onboarding, minimap camera inspection, the civic center and windmill district. The optional WebMCP progress and navigation tools are feature-detected; their runtime contracts remain unverified beyond registration.

## Visual direction

Warm low-poly geometry, colorful cottage roofs, striped bazaar awnings, textured silhouettes, soft shadows, and cream-and-forest game UI. All models are generated in Three.js; no commercial game assets are included. Static geometry is merged by material to reduce draw calls. Townies uses an angled orthographic camera rather than a flat top-down view.

Run `node tests/town-grass.mjs` to verify grass coverage and indexed cutting queries, and `TOWNIES_TEST_URL=http://localhost:3002 node tests/freeroam-api.mjs` to check shared mowing income away from designated task sites. Roads, river, buildings, doorstep paths, and planted gardens are excluded from new grass.

Run `node tests/camera.mjs` for camera-relative controls, rotation/tilt bounds, click-versus-drag separation, two-finger gestures, cancellation, and listener cleanup. The game API tests also cover public-town invitation generation and concurrent requests.

Run `node tests/town-layout.mjs` for bridge paths, ramps, all home delivery/garden targets, public entrances, and safe positions. Run `TOWNIES_TEST_URL=http://localhost:3002 node tests/town-layout-api.mjs` for actual server crossings on foot/bike/mower, water rejection, atomic outfit purchases, visible peer colors, item ownership, and relocation. Its small fixtures affect only a newly created local test resident.


## Mayoral elections and HUD

The transparent town header shows the season, the sitting mayor when there is one, and a countdown / nomination link before voting. During voting it opens the ballot and indicates whether this resident has saved a vote. The coin counter shares a fixed control height with Settings (44px desktop, 38px mobile). Header spacing, modal typography, shared button states and compact-screen control placement use one consistent HUD layout.

Elections use UTC, with voting from the 21st through the 30th inclusive, ending on February's last day. Residents who have selected a home and job may nominate themselves, including during voting, and have one changeable vote per monthly election. Each town has its own candidates and ballots. The highest vote total wins after polls close; ties go to the earliest nomination, then resident ID for identical timestamps. If an election receives no votes, the previous mayor remains. The elected mayor controls the featured project budget and work taxes; campaign pledges are saved with the ballot.

New migration `0003_volatile_shen.sql` adds candidates and votes with composite uniqueness and a candidate foreign key. Server time determines eligibility windows; client-supplied dates cannot change them. `node tests/elections.mjs` tests the real SQL on a migrated in-memory SQLite database with explicit calendar boundaries, ties, eligibility, deduplication and isolation. `node tests/elections-api.mjs` checks the built local Worker's authenticated nomination and ballot routes against disposable test towns. UI changes were build/type-checked; this pass did not include a device rendering benchmark.


### Candidate contributions

“Meet the candidates” compares work XP and days worked for the current UTC calendar month and overall, with expandable counts for grass patches, newspapers, litter, garden beds, parcels, town tasks, taxes, and donated coins. The current month remains separate from the next ballot cycle on a month's 31st day. Candidate join dates provide tenure context. Donations do not earn work XP or create a worked day; online or idle time does not count.

Migration `0004_orange_blob.sql` adds a daily contribution summary keyed by town, resident, and UTC date. Each completed action records its contribution in the same D1 batch as its guarded payout/completion, so duplicates and shared-target races cannot claim extra credit. Records accumulate before nomination and across job changes. Queries include only the current town's candidates and use the summary's composite primary key.

Existing resident XP remains the complete overall work-XP total because residents are fixed to their town. Older job counts, work dates, taxes, and donations were not retained with resident attribution and cannot be reconstructed; the ballot explicitly says detailed and monthly records begin with this update. No historical monthly credit is invented.

`node tests/contributions.mjs` verifies actual SQL with month boundaries, the 31st, earlier XP, pre-nomination activity, town isolation and empty records. `node tests/contributions-api.mjs` verifies all reward paths, duplicate/shared-target races, timed gardening, donations, task completion, and mower totals against disposable local towns.


### Campaign promises and town government

Candidates choose one of 12 permanent town upgrades and one of three work-tax policies (0, 1, or 2 coins per completed action). Promises can be edited only before voting begins and remain permanently locked for that election afterward, including after polls close. A later election has its own separate campaign. Existing candidacies without a project remain readable. The elected winner’s project and tax policy activate once when the closed election is first observed; no votes retain the prior mayor. A new term never removes built upgrades or existing project funding.

The featured project appears in the HUD and Town Hall, with a camera link to its location. Mayors allocate town coins in installments or complete the remaining budget. They must finish the featured project before selecting another. Residents can contribute 25 personal coins to the general town fund. Original pocket-park sponsorship remains available separately. Each allocation, completion, tax change, term activation, and fund donation is retained in a civic ledger; Town Hall shows the 20 most recent decisions. Completed projects credit the commissioning mayor in the town and future ballots.

Projects: park bandstand (600), blossom walk (400), orchard picnic grove (500), Garden Club terrace (650), Town Hall restoration (900), market square renewal (750), Main Street shopfronts (700), library reading court (500), school discovery court (600), riverside lantern walk (800), neighborhood welcome lights (1,000), harbor sunset terrace (850). Each has a distinct permanent Three.js addition and a construction marker before completion, and contributes 2–5 base prosperity points. Every four upgrades adds one permanent pre-tax coin to every completed work action, up to +3 at 12 upgrades. Town levels are Growing village, Flourishing town, Thriving town, and Town of distinction. The sitting mayor has a public character title. There is no personal mayor salary or power to transfer public coins into a personal balance.

Tax replaces the previous fixed one-coin town share. Gross pay is the previous take-home payout plus the previous town coin plus the current milestone bonus. The configured tax is withheld from that gross pay, capped so a worker always keeps at least one coin; both payouts and contribution records use the actual withheld amount. Default balanced tax preserves existing earnings. Clients show current take-home rates, and the server validates all budgets, policies, term and mayor identity. Expected project funding / previous-tax checks reject duplicate or stale mutations. Allocation, project progress and audit rows share a D1 transaction.

Migration `0005_futuristic_jack_flag.sql` adds campaign policy fields, town governance fields, permanent projects, and the civic ledger without rewriting earlier migrations. `tests/governance.mjs` exercises real SQL for policy locking, elections, handover, budget races, authorization, transaction rollback, retained progress, donations, and milestone economics. The build and geometry checks validate the rendering integration; no browser/device visual QA was requested.


### Paper throw feel

Newspaper throws use their own overlapping flight state, leaving bicycle steering active. A brief hand flick releases a folded, banded newspaper into a frontward arc; it taps the front door, compresses slightly, drops back to the porch, makes a small hop, and settles at the same position and rotation as the saved paper. Targeting a mailbox still uses the shared household claim and now ends at that home’s porch. No server reward or cooldown rules change.

Door impacts have a short visual pulse, and confirmed landings show a small sparkle burst and a floating delivery reward. Optional release/impact sounds and the existing reward chime respect the sound setting. Coins and supplies save immediately; celebration waits for both server confirmation and the completed landing. Failed deliveries remove their pending flight. Individual flights can overlap and clean up their geometry and labels independently. Reduced motion removes spinning, impacts, and bouncing in favor of a short smooth placement.

`node tests/paper-delivery.mjs` checks continuous phase positions, contact and porch coordinates for all 50 homes, side-on approaches against cottage walls, final alignment, and reduced-motion completion. The build/type checks validate integration; no browser visual testing was requested.


### Town charters, land, and relocation

Town → Town planning opens the shared planning screen. Library, town center, and harbor each have three permanent first forks with two final outcomes per fork (27 options in total). Branches change the complete Three.js landmark and collision footprint, add permanent prosperity, and close sibling paths. Larger library and harbor outcomes require relocation to a larger site first. Institution identity and specialization are independent of parcel ownership.

The elected mayor proposes one development at a time: a charter branch, relocation, territorial acquisition, or vacant-site redevelopment. Proposals lock immediately and run for seven real days. A frozen roll includes settled residents active during the preceding 14 days plus the proposing mayor. Approval needs at least half that roll voting (rounded up, minimum one) and 60% support among ballots cast. Residents may change their own ballot until the deadline. Server time decides closure on the next town read; no scheduled job or client clock is trusted.

Approved projects accept mayor-controlled town treasury installments. Only full funding applies the new geometry; old facilities remain available until then. A relocation preserves the institution’s node and opens its old parcel for civic gardens, neighborhood food halls, or craft studios. The treasury debit, project progress, public ledger, and resulting world change commit atomically. The shared layout handles updated entrances, collision, pathfinding, minimap positions, and safe recovery for anyone standing inside a newly completed footprint. Proposed parcels have visible survey boundaries.

Northern Meadows (2,400 coins) has six parcels, Eastern Fields (3,200) six, and Sunrise Island (4,800) four. The island purchase includes permanent ferry landings; travel requires being at a landing and returns to the opposite landing. Mainland expansions connect to existing walkable territory. Roads stay straight and civic parcels align to them. Camera bounds and overview accommodate the expanded map.

This first charter release implements public land, buildings, votes, and relocation. It does not move resident homes, increase the 50-resident cap, generate new work targets on acquired land, or add interior activities to the landmarks. Campaign pledges still use the original civic project catalog. Newly developed gardens and studios occupy their parcel permanently; relocation currently applies to the three charter institutions.

Migration 0006 adds institutions, land ownership, parcel buildings, planning proposals, and frozen voter rolls. `tests/planning.mjs` verifies SQL authority, quorum/support thresholds, vote closure, unique active proposals, funding concurrency and rollback, irreversible branches, relocation, and redevelopment. `tests/charter-layout.mjs` verifies all parcels, landmark entrances, island separation, and generated models. `tests/planning-api.mjs` exercises the built Worker using disposable local towns.
