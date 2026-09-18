# Community square prototype

New towns start with a central green, fountain and four market stalls. The town hall, school, library, café, general store, clothing shop, Garden Club and post office face inward around the square. Four vacant lots, marked with lightly disturbed soil tiles, corner stakes and small stacks of supplies, give residents a choice about what the town becomes. Their invitation text appears only while hovering the lot; clicking or tapping anywhere on the lot opens planning. The shops on both sides align across the square, with wide corner passages beside the Post Office and fourth southeast lot. The supply stand sits beside the Post Office; paper and parcel restocking follows this location. Homes and the surrounding neighborhoods keep their existing locations.

Existing towns retain their saved layout, buildings and progress. They can use the expanded building catalog on suitable owned land, but do not acquire the new square's reserved lots.

## Try it locally

Run `npm run setup` and `npm run dev`, then create a new private town with a local account. A previously created local town retains its original layout. Open Town Hall's planning view or select a vacant lot's sign to explore the choices. Everyone can inspect full-size building previews; an elected mayor is required to open a proposal and confirm construction.

## Town menu

The bottom Town button opens Overview with prosperity, residents, funds and shortcuts to projects, planning and elections. Projects groups the founding park/farm initiatives and civic upgrades. Town Hall contains taxes, donations, elections and public spending history. Neighbors contains town life, chat, invitations, recent events and moving towns. Places is the walking directory and pet-shop entry. Farm-project links open Projects directly; entering Town Hall opens its governance tab.

## Planning navigation

The planning menu opens on Overview, with the active project, vote/funding/construction step, treasury and previous decisions. New places contains lot and venue comparisons. Upgrades shows one public institution at a time, including its branch tree and relocation. More land contains territory expansion and ferry access. Clicking a vacant lot opens New places directly. Choosing a proposal opens its review in Overview; a visible current-project link lets residents return from any other tab.

## Resident decisions

1. Choose one of four square lots, then compare twelve buildings, prices, potential careers and community activities.
2. Inspect the building's footprint in the town's grid view. Square lots have fixed centers and inward-facing entrances. Other development and relocation proposals retain free placement on suitable owned land.
3. The mayor opens the existing seven-day resident vote. Its building, lot and budget are fixed. Settled residents active in the preceding fourteen days form the voter roll; the mayor is included. Residents can change their votes until the deadline.
4. A proposal needs at least half the voter roll participating, rounded up, and at least 60% support among votes cast. Only one planning proposal can be active at a time.
5. After approval, the mayor funds it from the town treasury. Residents can contribute to the town fund. Full funding unlocks construction confirmation; it does not place a building automatically.
6. The mayor confirms the reserved site. The building appears for the town, and the lot becomes occupied. Server checks reject changed sites, duplicate placement, unauthorized spending and votes from another town.

There is one building per square lot, not one per category. The library, town center and harbor retain their separate irreversible branch trees and relocation options. Community venue future paths described in the catalog are proposals for later development; they do not add working branch trees yet.

## Places and their potential gameplay

All twelve places can be funded and built. The Pet Store retains its existing cat and dog purchases. **The new careers and activities below are design previews, not playable jobs or minigames.** Every building option shows its potential job and community activity directly on the card, before selection. Both the catalog and venue panels label unfinished gameplay as planned; pet purchases are marked available when built. No extra wages or rewards are granted for opening these panels.

| Place                        | Town coins | Potential work                               | Potential shared activity                                  |
| ---------------------------- | ---------: | -------------------------------------------- | ---------------------------------------------------------- |
| Paws & Porches Pet Store     |      1,800 | Animal care, grooming and adoption baskets   | Cat and dog purchases already work; care tasks are planned |
| Civic garden                 |        600 | Seedlings, potting and shared planters       | Seed swaps and seasonal flower displays                    |
| Neighborhood food hall       |      1,200 | Produce displays, pantry orders and tables   | A communal dinner filled with residents' dishes            |
| Community craft studio       |      1,400 | Sorting, sanding and furniture repairs       | Build decorations for public gathering places              |
| Morningbell Bakery           |      1,600 | Mix dough, shape loaves and load ovens       | Prepare a neighborhood breakfast                           |
| Clover Music Club            |      2,100 | Chairs, stage preparation and lights         | Short cooperative rhythm performances                      |
| Neighborhood Recreation Hall |      2,200 | Equipment, courts and match preparation      | Table games and team challenges                            |
| The Little Looking Glass     |      1,700 | Styling stations, towels and assistance      | Fashion shows and a rotating resident showcase             |
| Good Neighbor Clinic         |      2,000 | Supplies, care packages and courtyard upkeep | A community care shelf                                     |
| Firefly Volunteer Station    |      2,400 | Equipment, supplies and training courses     | Cooperative rescue drills and preparedness pennants        |
| Little Museum of Town Life   |      2,000 | Donations, cleaning and display arrangement  | Curate exhibits about the town's history                   |
| Neighbor Exchange            |      1,500 | Donation sorting and repairs                 | Swap meets and cooperative repair challenges               |

The first art pass reuses existing building styles with distinct palettes, names and site labels. Bespoke interiors, props and animations remain future work.

## Next playable slice

The bakery is a useful first end-to-end implementation: a shared ingredient station, dough preparation, an oven timer and a serving counter that visibly fills. Work should happen at world objects, with small useful contributions possible in a short session. Residents should see one another preparing a communal breakfast.

That slice needs town-owned station state, authoritative completion and rewards, simultaneous-interaction rules, reconnect handling, daily replenishment, physical animations and touch controls. Building ownership must gate the activity. The work list and minimap should surface the new tasks only after construction. Its community progress should also appear when residents compare a future town project.

After proving that loop, the craft studio and music club can introduce distinct mechanics instead of turning every venue into the same collection task.

## Persistence and release notes

Migration `0020_tired_nehzno.sql` adds `towns.square_version` with a default of zero. It applies to **both shared D1 and town-local Durable Object SQLite**. The town migration allowlist includes it explicitly. All new-town creation paths set version one; existing rows remain zero, including towns imported from old D1 saves.

Apply the shared migration through the normal approved release process before running this code against a deployed directory. Durable Objects apply their local migration during initialization. This feature branch does not migrate or rearrange production towns.

The focused tests cover migration preservation, all 48 building/lot combinations, entrances, work stations, home footprints, the arrival point and central walkway, proposal permissions, town isolation, voting, funding, locked placement and duplicate prevention. Run the normal type, lint, format, unit, build, browser and local integration checks before release.
