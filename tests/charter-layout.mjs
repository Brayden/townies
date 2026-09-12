import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  EMPTY_PLANNING,
  CHARTER_NODES,
  TERRITORIES,
  PLOTS,
  townLayout,
  townBuildings,
  plotById,
  FERRY_STOPS,
  expansionRoads,
} from '../app/game/charters.ts';
import {
  isTownBlocked,
  entrance,
  safeTownPosition,
} from '../app/game/townLayout.ts';
import { findPath } from '../app/game/pathfinding.ts';
import { charterScenery } from '../app/game/charterScenery.ts';
const clone = () => structuredClone(EMPTY_PLANNING),
  full = clone();
full.territories = TERRITORIES.map((t) => t.id);
const baseBlocked = (x, z) => isTownBlocked(x, z, townLayout(EMPTY_PLANNING));
for (const t of TERRITORIES)
  assert.ok(baseBlocked(t.x, t.z), 'Unowned land is blocked');
const blocked = (x, z) => isTownBlocked(x, z, townLayout(full));
for (const p of PLOTS.filter((p) => p.territory !== 'core')) {
  const origin = p.territory === 'island' ? FERRY_STOPS[1] : { x: 0, z: 6 },
    path = findPath(origin, { x: p.x, z: p.z }, blocked);
  assert.ok(path.length, `${p.name} reachable`);
  assert.deepEqual(path.at(-1), { x: p.x, z: p.z });
  assert.ok(path.every((p) => !blocked(p.x, p.z)));
}
for (const f of FERRY_STOPS)
  assert.ok(!blocked(f.x, f.z), 'Ferry landing walkable');
assert.equal(
  findPath(FERRY_STOPS[0], FERRY_STOPS[1], blocked).length,
  0,
  'Ocean cannot be crossed on foot',
);
for (const node of CHARTER_NODES) {
  const s = clone();
  s.territories = ['north'];
  s.institutions.find((i) => i.id === node.institution).node = node.id;
  s.institutions.find((i) => i.id === node.institution).plot = 'north-0-0';
  const b = townBuildings(s).find((b) => b.id === node.institution),
    layout = townLayout(s),
    door = entrance(b),
    isBlocked = (x, z) => isTownBlocked(x, z, layout);
  assert.ok(isBlocked(b.x, b.z));
  assert.ok(!isBlocked(door.x, door.z));
  assert.ok(!isBlocked(...Object.values(safeTownPosition(b.x, b.z, layout))));
  assert.deepEqual(
    findPath({ x: 0, z: 6 }, door, isBlocked).at(-1),
    { x: Math.round(door.x), z: Math.round(door.z) },
    `${node.name} entrance reachable`,
  );
  for (const r of expansionRoads(s))
    assert.ok(
      Math.abs(b.x - r.x) >= (b.width + r.width) / 2 ||
        Math.abs(b.z - r.z) >= (b.depth + r.depth) / 2,
      `${node.name} clear of streets`,
    );
  if (node.institution === 'library')
    assert.ok(!isBlocked(-16, 9), 'Relocation frees old footprint');
}
const material = new THREE.MeshBasicMaterial();
const make = (w, h, d, x, y, z, p) => {
  assert.ok(p);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  p.add(m);
  return m;
};
const kit = {
  box: (w, h, d, c, x, y, z, p) => make(w, h, d, x, y, z, p),
  ball: (r, c, x, y, z, p) => make(r * 2, r * 2, r * 2, x, y, z, p),
  cylinder: (r, h, c, x, y, z, p) => make(r * 2, h, r * 2, x, y, z, p),
  roof: (w, d, h, c, x, y, z, p) => make(w, h, d, x, y, z, p),
  bench: (x, z, p) => make(1.5, 1, 0.5, x, 0.5, z, p),
  flower: (x, z, c, p) => make(0.2, 0.6, 0.2, x, 0.3, z, p),
};
for (const node of CHARTER_NODES) {
  const s = structuredClone(full),
    i = s.institutions.find((i) => i.id === node.institution);
  i.node = node.id;
  i.plot = 'north-0-0';
  const art = charterScenery(kit, s),
    landmark = art.children.find(
      (g) =>
        g instanceof THREE.Group &&
        g.position.x === -44 &&
        g.position.z === -70,
    );
  assert.ok(landmark && landmark.children.length > 20);
  const bounds = new THREE.Box3().setFromObject(landmark);
  assert.ok(bounds.max.y > node.height);
  const parcel = plotById(i.plot);
  assert.ok(
    bounds.min.x >= parcel.x - parcel.width / 2 &&
      bounds.max.x <= parcel.x + parcel.width / 2,
  );
  assert.ok(
    bounds.min.z >= parcel.z - parcel.depth / 2 &&
      bounds.max.z <= parcel.z + parcel.depth / 2 + 1,
  );
  art.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
console.log(
  'PASS: 16 reachable expansion parcels, locked unowned land, ferry-only island access, all 27 landmark entrances, cleared old footprints, aligned streets, and nonempty 3D branch models.',
);
