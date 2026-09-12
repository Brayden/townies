import assert from 'node:assert/strict';
import { findPath } from '../app/game/pathfinding.ts';
const obstacle = (x, z) => Math.abs(x) < 2 && Math.abs(z) < 2;
const path = findPath({ x: 0, z: 6 }, { x: 0, z: -19 }, obstacle);
assert.ok(path.length);
assert.deepEqual(path.at(-1), { x: 0, z: -19 });
assert.ok(path.every((p) => !obstacle(p.x, p.z)));
let prev = { x: 0, z: 6 };
for (const p of path) {
  assert.ok(Math.hypot(p.x - prev.x, p.z - prev.z) <= Math.SQRT2 + 0.01);
  prev = p;
}
const inside = findPath({ x: 0, z: 6 }, { x: 0, z: 0 }, obstacle);
assert.ok(inside.length);
assert.ok(!obstacle(inside.at(-1).x, inside.at(-1).z));
assert.deepEqual(
  findPath({ x: 0, z: 6 }, { x: 0, z: 0 }, () => true),
  [],
);
console.log(
  'PASS: paths route around the fountain, stay connected, approach solid targets safely, and stop when no route exists.',
);
