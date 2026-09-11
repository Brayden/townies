# Street and garden maintenance

Four new shifts are available directly from Work and as regular career choices:

| Shift | Interaction | Base pay before town policy |
| --- | --- | --- |
| Street sweeper | Drive the compact sweeper across debris on roads | 2 coins per section |
| Sidewalk powerwasher | Tap a nearby dirty sidewalk or press Space/E; spray reveals clean strips over 3 seconds | 7 coins |
| Hedge trimmer | Tap a nearby hedge or press Space/E; blades shape the overgrowth over 2.5 seconds | 8 coins |
| Leaf raker | Tap a nearby leaf patch or press Space/E; leaves gather and disappear into the cleanup over 2.2 seconds | 6 coins |

Helping outside the resident's regular job reduces base pay by one coin, as with
existing jobs. Town tax and prosperity bonuses apply. Tools are provided for the
shift; these jobs do not consume paper, parcels, gardening water or litter-bag
capacity. Finish returns the player to normal movement. The job dock keeps its
existing height, with Next and a nearby Wash/Trim/Rake action instead of refill.

There are 565 road debris sections, 560 sidewalk sections, 65 hedges and 81 leaf
patches across the original streets, neighborhood yards and community park.
Stable coordinate IDs keep them consistent between players and reconnects.
Every completion stays tidy for 24 hours; restarting a shift does not reset it.
Existing grass regrowth is unchanged. This expands finite shared maintenance;
it does not introduce endlessly generated private service contracts.

The minimap displays the current job's work areas: gray needs work, green is
complete. Next walks to a reachable edge for handheld work. Ray/box picking
supports tapping the actual raised hedge or sidewalk. Areas underneath newly
placed town buildings are hidden, omitted from route suggestions, and rejected
by the server. Town members see tools and timed progress through existing peer
updates; durable completions use the existing `world_work` table in the town DO.
No database migration or resource replacement is needed.

Sweep rewards come only from the server-validated movement trail, while the
resident owns movement, is outside, and has the sweep shift active. Stationary,
invalid and repeated passes cannot earn. Timed work validates matching shift,
proximity, controlling device, duration and shared completion. The existing
transactional claim ensures one payment when neighbors finish the same target.
New cleanup contributes to the clean civic metric; trimming contributes to the
garden metric. XP and tax contributions count toward candidate effort records.

New scenery uses six instanced draw batches with throttled progress updates.
Tools and effects reuse the existing Three.js scene lifecycle. Geometry follows
the established warm, low-poly game palette; no new runtime dependencies.

Validation:

- `tests/maintenance-api.mjs`: actual game handler and migrations against isolated
  in-memory SQLite; timing, proximity, ownership, races, pay, supply preservation,
  town isolation, shift restarts, 24-hour reset, sweep movement and contributions.
- `tests/maintenance-scene.mjs`: geometry coverage, reachable approaches, swept
  footprint correctness, picking, progress, completion/regrowth, equipment and
  rendered job dock/minimap output, including existing jobs.
- Existing work-target, town-grass and grass-sync regression suites.
- TypeScript check and Cloudflare production build.
