import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { electionWindow } from '../app/game/elections.ts';
import { FERRY_STOPS } from '../app/game/charters.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Disposable local test towns only');
const prefix = `planning-${Date.now()}`;
async function call(who, action, body = {}) {
  const response = await fetch(base + '/api/game', {
    method: action ? 'POST' : 'GET',
    headers: {
      ...(who ? { 'oai-authenticated-user-id': prefix + who } : {}),
      'Content-Type': 'application/json',
    },
    ...(action ? { body: JSON.stringify({ action, ...body }) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function ok(who, action, body = {}) {
  const r = await call(who, action, body);
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
assert.equal(
  (await call(null, 'plan-propose', { kind: 'expand', option: 'north' }))
    .status,
  401,
);
let a = await ok('a', 'join', { mode: 'private', name: 'Planning Mayor' });
a = await ok('a', 'setup', { home: 0, job: 'paper' });
await ok('b', 'join', {
  mode: 'key',
  key: a.town.key,
  name: 'Planning Neighbor',
});
const b = await ok('b', 'setup', { home: 1, job: 'garden' });
await ok('c', 'join', { mode: 'private', name: 'Separate Town' });
await ok('c', 'setup', { home: 0, job: 'mow' });
for (const id of [a.town.id, a.resident.id, b.resident.id])
  assert.match(id, /^[0-9a-f-]{36}$/);
const closed = electionWindow().lastClosedCycle;
assert.match(closed, /^\d{4}-\d{2}$/);
local(
  `INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at,platform,tax) VALUES('${a.town.id}','${closed}','${a.resident.id}',1,'hall-restoration',1); INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) VALUES('${a.town.id}','${closed}','${b.resident.id}','${a.resident.id}',2); UPDATE towns SET treasury=30000 WHERE id='${a.town.id}'`,
);
assert.equal(
  (
    await call('b', 'plan-propose', {
      kind: 'expand',
      option: 'north',
      mayorId: a.resident.id,
    })
  ).status,
  403,
);
assert.equal((await call('a', 'ferry')).status, 409);
async function propose(spec) {
  a = await ok('a', 'plan-propose', spec);
  return a.planning.proposals.find((p) => p.status === 'voting');
}
async function approve(p) {
  assert.equal(
    (
      await call('c', 'plan-vote', {
        plan: p.id,
        vote: true,
        townId: a.town.id,
      })
    ).status,
    409,
  );
  await ok('b', 'plan-vote', { plan: p.id, vote: true });
  assert.match(p.id, /^[0-9a-f-]{36}$/);
  local(`UPDATE town_plans SET closes=${Date.now() - 1} WHERE id='${p.id}'`);
  a = await ok('a');
  return a.planning.proposals.find((x) => x.id === p.id);
}
async function complete(p) {
  a = await ok('a', 'plan-fund', {
    plan: p.id,
    funded: p.funded,
    amount: p.cost - p.funded,
  });
  return a;
}
let p = await propose({
  kind: 'expand',
  option: 'north',
  cost: 1,
  closes: 0,
  now: 9999999999999,
});
assert.equal(p.cost, 2400);
assert.equal(p.closes - p.created, 7 * 86400000);
assert.equal(p.status, 'voting');
assert.equal(
  (await call('a', 'plan-fund', { plan: p.id, funded: 0, amount: 2400 }))
    .status,
  409,
);
p = await approve(p);
assert.equal(p.status, 'approved');
const race = await Promise.all([
  call('a', 'plan-fund', { plan: p.id, funded: 0, amount: 100 }),
  call('a', 'plan-fund', { plan: p.id, funded: 0, amount: 100 }),
]);
assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
a = await ok('a');
assert.equal(a.town.treasury, 29900);
assert.deepEqual(a.planning.territories, []);
p = a.planning.proposals.find((x) => x.id === p.id);
await complete(p);
assert.deepEqual((await ok('b')).planning.territories, ['north']);
assert.deepEqual((await ok('c')).planning.territories, []);
local(
  `UPDATE residents SET x=-44,z=-57,seen=${Date.now() - 2500} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'heartbeat', { x: -44, z: -61 });
assert.equal(a.corrected, false);
assert.equal(a.resident.z, -61, 'Movement reaches newly acquired land');
p = await propose({
  kind: 'branch',
  institution: 'library',
  option: 'academy',
});
const premature = await call('a', 'plan-place', {
  plan: p.id,
  x: -16,
  z: 9,
  rotation: 0,
});
assert.equal(premature.status, 409, JSON.stringify(premature));
await complete(await approve(p));
assert.equal(a.planning.proposals.find((x) => x.id === p.id).status, 'ready');
assert.equal(a.planning.institutions[0].node, 'root');
assert.equal(
  (
    await call('b', 'plan-place', {
      plan: p.id,
      x: -16,
      z: 9,
      rotation: 0,
      mayorId: a.resident.id,
    })
  ).status,
  403,
);
assert.equal(
  (await call('a', 'plan-place', { plan: p.id, x: 0, z: 0, rotation: 0 }))
    .status,
  400,
);
a = await ok('a', 'plan-place', { plan: p.id, x: -16, z: 9, rotation: 0 });
p = await propose({
  kind: 'relocate',
  institution: 'library',
  option: 'north-0-0',
});
p = await approve(p);
a = await ok('a', 'plan-fund', { plan: p.id, funded: 0, amount: 100 });
assert.equal(
  a.planning.institutions.find((i) => i.id === 'library').plot,
  'library-site',
);
p = a.planning.proposals.find((x) => x.id === p.id);
await complete(p);
const before = a.town.treasury;
const places = await Promise.all([
  call('a', 'plan-place', { plan: p.id, x: -43, z: -70, rotation: 90 }),
  call('a', 'plan-place', { plan: p.id, x: -43, z: -70, rotation: 90 }),
]);
assert.deepEqual(places.map((r) => r.status).sort(), [200, 409]);
assert.equal((await ok('a')).town.treasury, before);
const shared = (await ok('b')).planning.institutions.find(
  (i) => i.id === 'library',
);
assert.equal(shared.node, 'academy');
assert.equal(shared.x, -43);
assert.equal(shared.z, -70);
assert.equal(shared.rotation, 90);
local(
  `UPDATE residents SET x=-16,z=9,seen=${Date.now() - 2000} WHERE id='${a.resident.id}'`,
);
a = await ok('a');
assert.equal(a.resident.x, -16);
assert.equal(a.resident.z, 9, 'Old collision footprint is removed');
local(`UPDATE residents SET x=-43,z=-70 WHERE id='${a.resident.id}'`);
a = await ok('a');
assert.ok(
  a.resident.x !== -43 || a.resident.z !== -70,
  'Resident inside new building is safely moved out',
);
p = await propose({ kind: 'expand', option: 'island' });
await complete(await approve(p));
assert.equal(
  (await call('a', 'ferry', { x: 70, z: 94 })).status,
  400,
  'Cannot board remotely',
);
const main = FERRY_STOPS[0],
  island = FERRY_STOPS[1];
local(
  `UPDATE residents SET x=${main.x},z=${main.z} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'ferry', { destination: { x: 0, z: 0 } });
assert.equal(a.resident.x, island.x);
assert.equal(a.resident.z, island.z);
assert.equal(a.resident.shift, null);
assert.equal(
  (await ok('b')).peers.find((p) => p.id === a.resident.id).x,
  island.x,
);
a = await ok('a', 'ferry');
assert.equal(a.resident.x, main.x);
assert.equal(a.resident.z, main.z, 'Ferry returns to town');
console.log(
  'PASS: live Worker authenticated planning, trusted budgets/deadlines, votes, concurrent funding, shared land and relocation, dynamic movement and collision correction, isolated towns, and proximity-gated return ferry.',
);
