import assert from 'node:assert/strict';
import { SCHOOL } from '../app/game/data.ts';
import { isTownBlocked } from '../app/game/townLayout.ts';
import { findPath } from '../app/game/pathfinding.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3001';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Integration checks only run against a local town.');
const runId = Date.now().toString(36),
  user = (i) => `test-${runId}-${i}`;
async function api(who, body) {
  const res = await fetch(base + '/api/game', {
    method: body ? 'POST' : 'GET',
    headers: {
      'oai-authenticated-user-id': who,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}
const post = (i, action, b = {}) => api(user(i), { action, ...b });
const a = await post(0, 'join', {
  mode: 'private',
  name: 'Test Alder',
  townName: 'Test Grove',
});
assert.equal(a.status, 200, JSON.stringify(a));
const key = a.data.town.key;
assert.ok(key);
assert.equal(a.data.town.residents, 1);
const b = await post(1, 'join', { mode: 'key', key, name: 'Test Birch' });
assert.equal(b.data.town.id, a.data.town.id);
assert.notEqual(b.data.resident.id, a.data.resident.id);
const race = await Promise.all([
  post(0, 'setup', { home: 0, job: 'paper' }),
  post(1, 'setup', { home: 0, job: 'clean' }),
]);
assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
const loser = race[0].status === 409 ? 0 : 1;
assert.equal(
  (await post(loser, 'setup', { home: 1, job: 'clean' })).status,
  200,
);
assert.equal(
  (await api(user(0))).data.resident.home,
  race[0].status === 200 ? 0 : 1,
);
assert.equal((await post(0, 'buy', { item: 'home' })).status, 409);
const shop = await Promise.all([
  post(0, 'buy', { item: 'flowers' }),
  post(0, 'buy', { item: 'flowers' }),
]);
assert.deepEqual(shop.map((r) => r.status).sort(), [200, 409]);
assert.equal((await api(user(0))).data.resident.coins, 70);
// The server refuses distant interactions and impossible position jumps.
assert.equal((await post(0, 'begin', { task: 'paper-1' })).status, 400);
assert.equal(
  (await post(0, 'heartbeat', { x: 59, z: 50 })).data.corrected,
  true,
);
// Move a short valid distance to a cleaning site near spawn.
await new Promise((r) => setTimeout(r, 1100));
let moved = await post(0, 'heartbeat', { x: 2, z: 8 });
assert.equal(moved.data.corrected, false);
let started = await post(0, 'begin', { task: 'clean-2' });
assert.equal(started.status, 200, JSON.stringify(started));
assert.equal((await post(0, 'finish', { task: 'clean-2' })).status, 400);
for (let i = 0; i < 5; i++) {
  await new Promise((r) => setTimeout(r, 1050));
  assert.equal((await post(0, 'step', { task: 'clean-2' })).status, 200);
}
const before = (await api(user(0))).data.resident.coins;
const finish = await Promise.all([
  post(0, 'finish', { task: 'clean-2' }),
  post(0, 'finish', { task: 'clean-2' }),
]);
assert.equal(finish[0].status, 200);
assert.equal(finish[1].status, 200);
const after = (await api(user(0))).data;
assert.ok([24, 29].includes(after.resident.coins - before));
assert.equal(after.resident.xp, 10);
assert.equal(after.town.treasury, 1);
assert.ok(after.completed.includes('clean-2'));
// Donations never spend below zero, even with concurrent requests.
const donated = await Promise.all(
  Array.from({ length: 6 }, () => post(0, 'donate')),
);
const afterDonations = (await api(user(0))).data;
assert.ok(afterDonations.resident.coins >= 0);
assert.equal(
  afterDonations.town.project,
  Math.floor(after.resident.coins / 25) * 10,
);
// School credit is saved once per real date; other town invitations are isolated.
{
  const current = (await api(user(1))).data.resident;
  const path = findPath(current, SCHOOL, isTownBlocked);
  let chunk = [],
    distance = 0,
    last = current;
  for (const point of path) {
    const step = Math.hypot(point.x - last.x, point.z - last.z);
    if (distance + step > 7 && chunk.length) {
      await new Promise((r) => setTimeout(r, 1500));
      assert.equal(
        (await post(1, 'heartbeat', { ...chunk.at(-1), path: chunk })).data
          .corrected,
        false,
      );
      chunk = [];
      distance = 0;
    }
    chunk.push(point);
    distance += step;
    last = point;
  }
  if (chunk.length) {
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(
      (await post(1, 'heartbeat', { ...chunk.at(-1), path: chunk })).data
        .corrected,
      false,
    );
  }
}
assert.equal((await post(1, 'study', { answer: 'mayor' })).status, 400);
assert.equal((await post(1, 'study', { answer: 'everyone' })).status, 200);
assert.equal((await post(1, 'study', { answer: 'everyone' })).status, 409);
assert.equal((await api(user(1))).data.resident.education, 1);
assert.ok(
  (await api(user(0))).data.properties.some((p) => p.items.includes('flowers')),
);
const isolated = await post(90, 'join', {
  mode: 'private',
  name: 'Isolated Resident',
});
assert.notEqual(isolated.data.town.id, a.data.town.id);
assert.equal(isolated.data.town.residents, 1);
// Fill all fifty resident slots, then verify the fixed membership cap.
for (let i = 2; i < 50; i += 8) {
  await Promise.all(
    Array.from({ length: Math.min(8, 50 - i) }, (_, j) =>
      post(i + j, 'join', { mode: 'key', key, name: `Test Neighbor ${i + j}` }),
    ).map(async (p) => assert.equal((await p).status, 200)),
  );
}
assert.equal(
  (await post(50, 'join', { mode: 'key', key, name: 'Overflow Neighbor' }))
    .status,
  409,
);
const states = await Promise.all(
  Array.from({ length: 50 }, (_, i) => api(user(i))),
);
assert.ok(
  states.every((r) => r.status === 200 && r.data.town.residents === 50),
);
assert.equal(new Set(states.map((r) => r.data.resident.id)).size, 50);
const hearts = await Promise.all(
  Array.from({ length: 50 }, (_, i) =>
    post(i, 'heartbeat', { x: i === 0 ? 2 : 0, z: i === 0 ? 8 : 6 }),
  ),
);
assert.ok(hearts.every((r) => r.status === 200));
// Invite codes also work for public towns, remain stable, and respect the same cap.
const publicTown = await post(91, 'join', {
  mode: 'public',
  name: 'Public Host',
});
assert.equal(publicTown.status, 200);
const codes = await Promise.all([post(91, 'invite'), post(91, 'invite')]);
assert.equal(codes[0].status, 200);
assert.match(codes[0].data.town.key, /^[0-9A-F]{16}$/);
assert.equal(codes[0].data.town.key, codes[1].data.town.key);
const friend = await post(92, 'join', {
  mode: 'key',
  key: codes[0].data.town.key.toLowerCase(),
  name: 'Public Friend',
});
assert.equal(friend.status, 200);
assert.equal(friend.data.town.id, publicTown.data.town.id);
assert.equal(
  (await post(0, 'invite')).data.town.key,
  key,
  'Existing private codes stay unchanged',
);
assert.equal(
  (await post(93, 'join', { mode: 'key', key, name: 'Full Town Friend' }))
    .status,
  409,
);
console.log(
  'PASS: public-town codes, concurrent code creation, code persistence, private code preservation, and full-town invitation rejection.',
);
const invalidKey = await post(99, 'join', {
  mode: 'key',
  key: 'WRONG',
  name: 'Nope',
});
assert.equal(invalidKey.status, 404);
console.log(
  'PASS: private invitations, fixed membership, two-player home race, saved state, atomic purchases, proximity validation, movement validation, five-step jobs, duplicate reward protection, concurrent donation limits, 50 distinct residents, full-town rejection, and 50 concurrent presence updates.',
);
