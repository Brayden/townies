import assert from 'node:assert/strict';
import {
  BRIDGES,
  BUILDINGS,
  entrance,
  isTownBlocked,
  groundHeight,
  safeTownPosition,
  HOME_LOTS,
  ROADS,
  SOLID_PROPS,
} from '../app/game/townLayout.ts';
import { WORK_TARGETS } from '../app/game/workTargets.ts';
import { GARDEN_AREAS } from '../app/game/gardenAreas.ts';
import { findPath } from '../app/game/pathfinding.ts';
assert.equal(HOME_LOTS.length, 50);
assert.equal(new Set(HOME_LOTS.map((p) => `${p.x}:${p.z}`)).size, 50);
for (const [i, h] of HOME_LOTS.entries()) {
  assert.ok(
    !BUILDINGS.some(
      (b) =>
        Math.abs(h.x - b.x) < b.width / 2 + 3 &&
        Math.abs(h.z - b.z) < b.depth / 2 + 3,
    ),
  );
  assert.ok(
    WORK_TARGETS.some((t) => t.id === `paper-${i}-mailbox`),
    `Mailbox for home ${i}`,
  );
  assert.ok(
    WORK_TARGETS.some((t) => t.id === `bed-${i}`),
    `Garden for home ${i}`,
  );
}
for (const b of [
  ...HOME_LOTS.map((h, i) => ({
    ...h,
    width: 4.9,
    depth: 4.2,
    id: `home ${i}`,
  })),
  ...BUILDINGS,
  ...SOLID_PROPS,
]) {
  for (const r of ROADS)
    assert.ok(
      Math.abs(b.x - r.x) >= (b.width + r.width) / 2 ||
        Math.abs(b.z - r.z) >= (b.depth + r.depth) / 2,
      `Street overlaps ${b.id ?? JSON.stringify(b)}`,
    );
}
for (const h of HOME_LOTS)
  assert.ok(
    ROADS.some(
      (r) =>
        r.width > r.depth &&
        Math.abs(h.z + 4 - r.z) <= 1.1 &&
        Math.abs(h.x - r.x) < r.width / 2,
    ),
    'Each home faces a street',
  );
assert.equal(BRIDGES.length, 5);
for (const area of GARDEN_AREAS)
  assert.equal(
    WORK_TARGETS.filter((t) => t.id.startsWith(area.id + '-bed-')).length,
    6,
    area.name,
  );
for (const b of BUILDINGS) {
  const door = entrance(b);
  assert.ok(isTownBlocked(b.x, b.z));
  assert.ok(!isTownBlocked(door.x, door.z));
  assert.ok(
    findPath({ x: 0, z: 6 }, door, isTownBlocked).length,
    `${b.name} entrance reachable`,
  );
  const safe = safeTownPosition(b.x, b.z);
  assert.ok(!isTownBlocked(safe.x, safe.z));
}
for (const bridge of BRIDGES) {
  for (const direction of [1, -1]) {
    const start = { x: direction === 1 ? 20 : 36, z: bridge.z },
      goal = { x: direction === 1 ? 36 : 20, z: bridge.z };
    const path = findPath(start, goal, isTownBlocked);
    assert.ok(path.length);
    assert.deepEqual(path.at(-1), goal);
    assert.ok(path.every((p) => !isTownBlocked(p.x, p.z)));
    assert.ok(path.some((p) => p.x === 28));
  }
  for (let x = 21; x <= 35; x += 0.1) {
    assert.ok(!isTownBlocked(x, bridge.z));
    assert.ok(
      groundHeight(x, bridge.z) >= 0 && groundHeight(x, bridge.z) <= 0.4,
    );
  }
  assert.equal(groundHeight(21, bridge.z), 0);
  assert.equal(groundHeight(28, bridge.z), 0.4);
  assert.equal(groundHeight(35, bridge.z), 0);
  assert.ok(
    isTownBlocked(28, bridge.z + 4),
    'Cannot walk into water beside a bridge',
  );
}
console.log(
  'PASS: all 50 homes have delivery and gardening access, shops are reachable, communal gardens survive, and all five bridges cross in both directions with ramps and blocked water.',
);
