# Camera continuity

The outdoor camera used to start from default settings every time static town
scenery rebuilt. Its layout dependency also treated reordered snapshot rows as
layout changes. Panning disabled follow temporarily, but an authoritative player
position correction could enable it again. Recentring with a selected house
could replay the same focus on the next frame, and following copied the avatar's
vertical walking bounce.

The scene now uses a deterministic key for static scenery. Live names, funding,
decorations and reordered rows do not recreate it. Actual changes such as house
upgrades preserve angle, zoom, smoothed target, desired target, inspection mode,
selected-house ring and placement mode across effect cleanup/setup. Local player
position, unsent movement trail and held movement keys survive too; any active
walking route is recalculated against the new layout. Continuity is scoped to
the resident and mounted town scene; changing towns still mounts a fresh scene.

Panning enters inspection mode, and `setPosition` changes only the character's
position and movement trail. Explicit navigation, center and reset still return
to following. Focus records cleared selections and is consumed by center/reset so an unchanged
selection cannot steal the camera back. Explicitly selecting the same address
again still refocuses it.
Following uses ground coordinates without copying the avatar's animated height.

Validation: `npx tsc --noEmit`, `node tests/camera-browser.mjs`,
`node tests/graphics-browser.mjs`, and `npm run build`.
The browser tests use isolated local scenery and test-only camera observation;
they never join a town or modify a saved game. They cover real drag gestures,
position corrections, snapshot reordering, genuine house upgrades, focus/reset,
held walking input and mobile inspection. The graphics suite also checks context
loss, restoration, retries and disposal after these lifecycle changes.

This addresses reproducible reset paths in the code, not every possible source
of uneven frames. GPU load and large geometry changes can still cause a frame
pause; genuine server corrections still correct the character's position.

Frame durations are clamped to zero when a queued animation timestamp predates a scene rebuild. This prevents a negative movement step immediately after rebuilding while a key is held.
