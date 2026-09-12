import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sweptGrass } from '../app/game/data.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Local towns only');
const id = `route-${Date.now()}`,
  pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(action, args = {}) {
  const r = await fetch(base + '/api/game', {
    method: 'POST',
    headers: {
      'oai-authenticated-user-id': id,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...args }),
  });
  const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  return d;
}
await post('join', { mode: 'private', name: 'Corner Cutter' });
const setup = await post('setup', { home: 0, job: 'mow' });
assert.match(setup.resident.id, /^[0-9a-f-]{36}$/);
function position(x, z) {
  execFileSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      'wrangler.local.json',
      '--command',
      `UPDATE residents SET x=${x},z=${z} WHERE id='${setup.resident.id}'`,
    ],
    { stdio: 'pipe' },
  );
}
position(-36.6, -9.3);
await pause(1200);
await post('heartbeat', { x: -36.6, z: -9.3 });
await post('mower', { active: true });
await pause(1600);
const a = { x: -36.6, z: -9.3 },
  corner = { x: -31.5, z: -9.3 },
  b = { x: -31.5, z: -6.7 };
const driven = await post('heartbeat', { ...b, path: [corner] });
assert.equal(driven.corrected, false);
const expected = [
  ...new Set(
    [
      ...sweptGrass(a.x, a.z, corner.x, corner.z),
      ...sweptGrass(corner.x, corner.z, b.x, b.z),
    ].map((c) => c.id),
  ),
].sort();
assert.deepEqual(
  driven.lawnCuts.sort(),
  expected,
  'The bent route, not the endpoint diagonal, determines cutting',
);
assert.equal(driven.mowReward.coins, expected.length * 2);
await pause(1600);
const invalid = await post('heartbeat', {
  x: -31.5,
  z: -6.7,
  path: [
    { x: 20, z: -6.7 },
    { x: -31.5, z: -6.7 },
  ],
});
assert.equal(
  invalid.corrected,
  true,
  'A short endpoint displacement cannot hide an overlong path',
);
assert.equal(invalid.mowReward, null);
position(-56, -47);
await pause(1600);
const wall = await post('heartbeat', {
  x: -50,
  z: -47,
  path: [{ x: -53, z: -47 }],
});
assert.equal(
  wall.corrected,
  true,
  'The entire movement route must avoid solid obstacles',
);
assert.equal(wall.mowReward, null);
console.log(
  'PASS: turns cut the driven route, path length prevents hidden extra movement, and solid obstacles block shortcut earnings.',
);
