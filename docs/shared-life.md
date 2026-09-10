# Shared life: first playable installment

The town farm and neighborhood picnic give residents something to do between work shifts. This installment includes shared farming, a persistent town pantry, a daily community basket, an informal gathering spot, sitting, and visible social gestures. Home interiors and collaborative construction remain future installments.

## Getting there

Open the heart beside town chat, or Town → Town life. The same overview is available from the farm barn and the café. Pick seeds or a destination there; planting, watering, harvesting, and basket delivery happen beside their physical objects with E or the mobile action button.

The park picnic is always open. The farm remains behind the existing 6,000-coin founding initiative. Funding opens 24 shared beds in the six western fields. No career or equipment purchase is required, but residents finish their active work shift before using the farm or sitting down.

## Shared farm

- Seeds are free: radishes grow in 10 real minutes, strawberries in 30 minutes, and pumpkins in 2 hours.
- Planting creates seedlings. Watering starts their growth clock. Anyone can water or harvest any bed.
- Each harvest contributes 4 produce to the town pantry. There is no personal wage or career XP.
- Blue markers mean water is needed; gold markers mean ready to harvest. Growing crops increase in height. The minimap shows corresponding bed states.
- Ready crops never wither. Unwatered seedlings wait. Missing a day has no penalty.
- Beds cannot be cleared early, and changing the selected seeds cannot replace someone else's crop.
- One daily basket uses 8 radishes, 8 strawberries, and 4 pumpkins. Deliver it at the farm pantry stand to add food to the park blanket and 150 coins to the town treasury.
- Only one basket per town per UTC calendar day. The panel shows the next reset in the player's local time. Leftover pantry contents and all growing crops persist across resets.

## Community picnic

The blanket is on an open patch of the community park, away from roads, gardens, and civic project footprints. Residents can sit and use existing town chat. E/the action button stands them up, as does movement; a seated pose expires after ten minutes. The daily guest book records each visitor once and includes residents who have since logged off. It never implies those visitors are currently present.

The wave, cheer, and dance controls broadcast short gestures to online neighbors. Reduced-motion mode keeps gestures calmer and omits water/harvest particles. Food supplied by the farm appears for everyone for the remainder of that UTC day.

## Persistence and correctness

New tables: `farm_plots`, `farm_pantry`, `community_baskets`, `picnic_visits`. Residents gain `emote` and `emote_until` fields. No existing homes, inventories, towns, or projects are replaced.

Farm claims recheck position, membership, shift status, farm funding, crop identity, readiness, and bed revision on the server. Atomic batches connect the winning harvest to its pantry deposit, or the winning basket to all ingredient deductions and its town reward. Competing requests cannot collect the same crop or basket twice. Failed batches roll back fully. Client bed revisions reject older snapshots that would restore a harvested crop.

Moving towns clears the current gesture. Pantry supplies, crops, and old picnic records stay with the original town. A stale request cannot interact with the previous town after moving.

## Verification

`tests/shared-life.mjs` covers crop stages and time boundaries, competing claims, neighbor watering, no withering, basket deductions and rollback, picnic resets, gestures, stale membership, cross-town isolation, all 24 paths, scenery, and cleanup.

`tests/shared-life-api.mjs` runs the main loop with three residents in two disposable local towns through the real Worker API, including simultaneous harvests/baskets and standing up on movement. It intentionally refuses non-local URLs.

Existing farm unlock, pets/moving, and grass consistency tests also pass. Browser/device playtesting and a 50-player load test remain separate validation work.
