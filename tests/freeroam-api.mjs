import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { TASKS } from '../app/game/data.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Local test towns only');
const id = `freeroam-${Date.now()}`,
  pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(i, action, args = {}) {
  const r = await fetch(base + '/api/game', {
    method: action ? 'POST' : 'GET',
    headers: {
      'oai-authenticated-user-id': `${id}-${i}`,
      ...(action ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(action ? { body: JSON.stringify({ action, ...args }) } : {}),
  });
  const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  return d;
}
const town = await api(0, 'join', { mode: 'private', name: 'Free Mower' });
await api(1, 'join', {
  mode: 'key',
  key: town.town.key,
  name: 'Helpful Neighbor',
});
for (let i = 0; i < 2; i++) {
  await api(i, 'setup', { home: i, job: i ? 'clean' : 'mow' });
  const mounted = await api(i, 'mower', { active: true });
  assert.equal(mounted.resident.x, 0);
  assert.equal(mounted.resident.z, 6);
  assert.equal(mounted.resident.mowing, true);
  assert.match(mounted.resident.id, /^[0-9a-f-]{36}$/);
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
      `UPDATE residents SET x=-51,z=-36 WHERE id='${mounted.resident.id}'`,
    ],
    { stdio: 'pipe' },
  );
}
const destination = { x: -49, z: -34 };
assert.ok(
  TASKS.filter((t) => t.job === 'mow').every(
    (t) => Math.hypot(t.x - destination.x, t.z - destination.z) > 5,
  ),
);
await pause(1300);
const cut = await Promise.all([
  api(0, 'heartbeat', destination),
  api(1, 'heartbeat', destination),
]);
assert.ok(cut.every((d) => !d.corrected));
const a = await api(0),
  b = await api(1);
assert.ok(a.lawnCuts.length > 0);
assert.ok(a.lawnCuts.every((id) => id.startsWith('town-grass:')));
assert.deepEqual(a.lawnCuts.sort(), b.lawnCuts.sort());
assert.equal(
  (a.resident.coins - 150) / 2 + b.resident.coins - 150,
  a.lawnCuts.length,
  'Every shared patch is paid once at the worker’s career rate',
);
assert.equal(a.town.treasury, a.lawnCuts.length);
await pause(1100);
const explored = await api(0, 'heartbeat', { x: -49, z: -31 });
assert.ok(explored.mowReward?.patches > 0);
assert.equal(explored.mowReward.coins, explored.mowReward.patches * 2);
await pause(1100);
const again = await api(0, 'heartbeat', destination);
assert.equal(again.mowReward, null);
await api(0, 'mower', { active: false });
await pause(1100);
assert.equal((await api(0, 'heartbeat', { x: -47, z: -31 })).mowReward, null);
console.log(
  'PASS: mount at your current location, mow and earn away from all task markers, shared neighborhood grass and payouts, explore onward, no duplicate pay, and stop working anywhere.',
);
