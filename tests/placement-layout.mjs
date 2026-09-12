import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  EMPTY_PLANNING,
  CHARTER_NODES,
  townBuildings,
  townLayout,
  locationOf,
  oriented,
  marketStalls,
} from '../app/game/charters.ts';
import {
  placementError,
  placementBuilding,
  initialPlacement,
} from '../app/game/placement.ts';
import { entrance, isTownBlocked, HOME_LOTS } from '../app/game/townLayout.ts';
import { findPath } from '../app/game/pathfinding.ts';
import { buildingModel } from '../app/game/charterScenery.ts';
const full = structuredClone(EMPTY_PLANNING);
full.territories = ['north', 'east', 'island'];
const material = new THREE.MeshStandardMaterial();
const make = (w, h, d, x, y, z, p) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  p.add(mesh);
  return mesh;
};
const kit = {
  box: (w, h, d, c, x, y, z, p) => make(w, h, d, x, y, z, p),
  ball: (r, c, x, y, z, p) => make(r * 2, r * 2, r * 2, x, y, z, p),
  cylinder: (r, h, c, x, y, z, p) => make(r * 2, h, r * 2, x, y, z, p),
  roof: (w, d, h, c, x, y, z, p) => make(w, h, d, x, y, z, p),
  bench: (x, z, p) => make(1.5, 1, 0.5, x, 0.5, z, p),
  flower: (x, z, c, p) => make(0.2, 0.6, 0.2, x, 0.3, z, p),
};
for (const n of CHARTER_NODES)
  for (const rotation of [0, 90, 180, 270]) {
    const s = structuredClone(full),
      choice = { kind: 'branch', institution: n.institution, option: n.id },
      v = { x: 73, z: -35, rotation };
    assert.equal(
      placementError(s, choice, v),
      null,
      `${n.name} ${rotation}° fits the chosen free grid location`,
    );
    const b = placementBuilding(s, choice, v),
      model = buildingModel(kit, b, n.style),
      bounds = new THREE.Box3().setFromObject(model);
    assert.ok(model.children.length > 20);
    assert.equal(model.rotation.y, (rotation * Math.PI) / 180);
    assert.deepEqual(
      { width: b.width, depth: b.depth },
      oriented(n.width, n.depth, rotation),
    );
    const i = s.institutions.find((i) => i.id === n.institution);
    Object.assign(i, { node: n.id, ...v });
    const built = townBuildings(s).find((b) => b.id === n.institution),
      door = entrance(built),
      blocked = (x, z) => isTownBlocked(x, z, townLayout(s));
    assert.ok(blocked(v.x, v.z));
    assert.ok(!blocked(door.x, door.z));
    assert.ok(
      findPath({ x: 62, z: -21 }, door, blocked).length,
      `${n.name} rotated entrance accessible`,
    );
    assert.ok(
      bounds.min.x >= v.x - b.width / 2 - 2 &&
        bounds.max.x <= v.x + b.width / 2 + 2,
    );
    assert.ok(
      bounds.min.z >= v.z - b.depth / 2 - 2 &&
        bounds.max.z <= v.z + b.depth / 2 + 2,
    );
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
const choice = { kind: 'branch', institution: 'library', option: 'academy' };
for (const h of HOME_LOTS)
  assert.ok(
    placementError(full, choice, { x: h.x, z: h.z, rotation: 0 }),
    'Every home is protected',
  );
for (const [x, z] of [
  [28, 21],
  [-41, 0],
  [0, 0],
  [0, -21],
  [-35, 54],
  [70, 94],
  [200, 200],
])
  assert.ok(
    placementError(full, choice, { x, z, rotation: 0 }),
    'River, bridge, park, fountain, street, ferry and boundary protection',
  );
assert.ok(
  placementError(EMPTY_PLANNING, choice, { x: 73, z: -35, rotation: 0 }),
  'Unowned territory remains unavailable',
);
assert.match(
  placementError(full, choice, { x: -16, z: 9, rotation: 0 }),
  /job activity/,
  'Expanded footprint must preserve the new maintenance job locations',
);
const relocated = structuredClone(full);
Object.assign(
  relocated.institutions.find((i) => i.id === 'library'),
  { x: 73, z: -35, rotation: 0 },
);
assert.equal(
  placementError(relocated, choice, { x: 73, z: -35, rotation: 0 }),
  null,
  'Upgrade can replace its own old footprint when surrounding land is clear',
);
const preview = JSON.stringify(full);
initialPlacement(full, choice);
placementBuilding(full, choice, { x: 73, z: -35, rotation: 90 });
assert.equal(
  JSON.stringify(full),
  preview,
  'Preview never mutates shared state',
);
const market = full.institutions.find((i) => i.id === 'towncenter');
Object.assign(market, { x: 73, z: -35, rotation: 90 });
const stalls = marketStalls(full);
assert.ok(
  stalls.every((p) => Math.abs(p.x - 73) <= 3.1 && Math.abs(p.z + 35) <= 6.1),
  'Market stalls rotate about their institution',
);
assert.equal(
  locationOf(full.institutions[0]).x,
  -16,
  'Legacy parcel-only records still resolve',
);
console.log(
  'PASS: all 27 models at four facings, shared preview/build footprints, accessible rotated entrances, protected homes and public land, unowned boundaries, replace-in-place upgrades, pure previews, legacy locations, and rotated market stalls.',
);
