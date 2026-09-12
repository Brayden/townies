import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Disposable local towns only.');
const prefix = `farm-${Date.now()}`;
async function game(who, action, body = {}) {
  const response = await fetch(base + '/api/game', {
    method: action ? 'POST' : 'GET',
    headers: {
      'oai-authenticated-user-id': prefix + who,
      'Content-Type': 'application/json',
    },
    ...(action ? { body: JSON.stringify({ action, ...body }) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function ok(who, action, body = {}) {
  const r = await game(who, action, body);
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.data;
}
function local(sql) {
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
      sql,
    ],
    { stdio: 'pipe' },
  );
}
let a = await ok('a', 'join', { mode: 'private', name: 'Farm Neighbor' });
a = await ok('a', 'setup', { home: 0, job: 'mow' });
await ok('b', 'join', { mode: 'key', key: a.town.key, name: 'Farm Friend' });
await ok('b', 'setup', { home: 1, job: 'paper' });
await ok('c', 'join', { mode: 'private', name: 'Other Town' });
await ok('c', 'setup', { home: 0, job: 'mow' });
assert.equal(a.planning.farmFunded, 0);
const initialPark = a.town.project,
  initialCoins = a.resident.coins;
a = await ok('a', 'fund-farm', { source: 'personal', funded: 0, amount: 6000 });
assert.equal(a.planning.farmFunded, 50);
assert.equal(a.resident.coins, initialCoins - 50);
assert.equal(a.town.project, initialPark);
assert.equal((await ok('b')).planning.farmFunded, 50);
assert.equal((await ok('c')).planning.farmFunded, 0);
assert.equal(
  (await game('a', 'fund-farm', { source: 'personal', funded: 0 })).status,
  409,
);
assert.equal(
  (await game('b', 'fund-farm', { source: 'treasury', funded: 50 })).status,
  403,
);
a = await ok('a', 'donate');
assert.equal(a.town.project, initialPark + 10);
assert.equal(a.planning.farmFunded, 50);
local(
  `UPDATE residents SET x=-58,z=-21,seen=${Date.now() - 1000} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'heartbeat', { x: -62, z: -21 });
assert.equal(a.corrected, true);
assert.equal(
  a.resident.x,
  -58,
  'Construction boundary rejects entry on the server',
);
local(`UPDATE towns SET farm_funded=5950 WHERE id='${a.town.id}'`);
a = await ok('a', 'fund-farm', { source: 'personal', funded: 5950 });
assert.equal(a.planning.farmFunded, 6000);
assert.equal(a.town.project, initialPark + 10);
assert.equal((await ok('b')).planning.farmFunded, 6000);
assert.equal((await ok('c')).planning.farmFunded, 0);
assert.equal(
  (await game('a', 'fund-farm', { source: 'personal', funded: 6000 })).status,
  409,
);
local(
  `UPDATE residents SET x=-58,z=-21,seen=${Date.now() - 1000} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'heartbeat', { x: -62, z: -21 });
assert.equal(a.corrected, false);
assert.equal(
  a.resident.x,
  -62,
  'The same west road becomes crossable after funding',
);
assert.equal((await ok('b')).peers.find((p) => p.id === a.resident.id).x, -62);
console.log(
  'PASS: live Worker default initiatives, exact personal debit, stale fund protection, mayor authority, shared progress, independent park funding, server-enforced closed gate, immediate funded road access, and cross-town isolation.',
);
