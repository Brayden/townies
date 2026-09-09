# Approved grid concept translated into the playable town

Reference: `../concept-art/town-layout-v2-grid.png` in the parent Townies workspace.

## Composition

- Keep north at the top and south-facing building entrances readable from the angled orthographic camera.
- Center the civic square on the fountain. Town Hall anchors its northern edge, between the General Store and Thread & Thistle. The café and post office enclose the sides. The library, Garden Club, and two rows of market stalls frame the southern approach.
- Place the large rectangular community park west of the square. Give it straight connected paths, a gazebo, playground, seating, flower borders and shared gardening beds. Move the two original mowing lawns here while keeping their patch IDs.
- Place the school and learning garden directly north of the civic block. Reserve the northwest outer block for the windmill and orchard, without residential streets cutting through it.
- Run a straight river down the east side of the square, with a promenade on each bank and five aligned bridge crossings. Clip road surfaces at the water so only actual bridge decks imply a crossing.
- Put compact cottage neighborhoods on the east bank and south of the civic/park blocks. Align each cottage with a street, fenced plot and front path. Retain 50 home IDs to preserve resident ownership.
- Finish the south edge with a waterfront, boat shed, boardwalk, decorative pier, boats, coast stones and an open river mouth.

## Shared gameplay geometry

`townLayout.ts` owns home coordinates, roads, civic buildings, bridge openings and solid building footprints. Rendering, pathfinding and server movement checks consume this shared data. Garden targets derive from `gardenAreas.ts`; their spacing adapts to the smaller riverside garden strip. No schema migration or resident reset is required.

The whole-town camera fits its width to the current screen, removes dense floating labels at distant zoom levels and retains the existing orbit, pan and minimap inspection controls. Follow restores the regular close playing view.

## Validation

- Every one of the 50 home frontages meets a street; no home, civic building or greenhouse footprint overlaps a road.
- All public entrances, 349 job targets and supply stations have navigable routes.
- All five bridges have connected ramps, blocked adjacent water and paths in both directions.
- Over 4,000 mowable patches remain distributed through neighborhoods, the orchard and park lawns. The original patch IDs and 24-hour regrowth interval remain stable.
- Browser review covered setup, town overview, square detail and minimap inspection of the orchard/windmill district.
- Local service checks cover shared mowing pay, regrowth, route validation, bridge traversal, purchases and safe relocation with retained belongings.

The art remains procedural low-poly Three.js geometry. Pier/boats, greenhouses, playground and gazebo are scenery; this layout update does not introduce boat gameplay or building interiors.
