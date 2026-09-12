import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { electionWindow } from '../app/game/elections.ts';
import { initialPlacement } from '../app/game/placement.ts';
import { PETS } from '../app/game/pets.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Disposable local towns only.');
const prefix = `pets-${Date.now()}`;
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
await ok('a', 'join', { mode: 'private', name: 'Pet Mayor' });
let a = await ok('a', 'setup', { home: 0, job: 'mow' });
await ok('b', 'join', { mode: 'key', key: a.town.key, name: 'Pet Neighbor' });
const b = await ok('b', 'setup', { home: 1, job: 'paper' });
await ok('c', 'join', { mode: 'private', name: 'Other Town' });
const c = await ok('c', 'setup', { home: 0, job: 'garden' });
const closed = electionWindow().lastClosedCycle;
local(
  `INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at) VALUES('${a.town.id}','${closed}','${a.resident.id}',1); INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) VALUES('${a.town.id}','${closed}','${b.resident.id}','${a.resident.id}',2); UPDATE towns SET treasury=5000 WHERE id='${a.town.id}'; UPDATE residents SET coins=5000 WHERE id='${a.resident.id}'`,
);
const cat = PETS[0],
  dog = PETS.find((p) => p.kind === 'dog'),
  choice = { kind: 'build', institution: null, option: 'pets' };
assert.equal((await game('a', 'pet', { pet: cat.id })).status, 409);
assert.equal((await game('b', 'plan-propose', choice)).status, 403);
a = await ok('a', 'plan-propose', { ...choice, cost: 1 });
let plan = a.planning.proposals.find((p) => p.status === 'voting');
assert.equal(plan.cost, 1800);
await ok('b', 'plan-vote', { plan: plan.id, vote: true });
local(`UPDATE town_plans SET closes=${Date.now() - 1} WHERE id='${plan.id}'`);
a = await ok('a');
assert.equal(
  a.planning.proposals.find((p) => p.id === plan.id).status,
  'approved',
);
a = await ok('a', 'plan-fund', { plan: plan.id, funded: 0, amount: 1800 });
assert.equal(
  a.planning.proposals.find((p) => p.id === plan.id).status,
  'ready',
);
assert.equal(
  (await game('a', 'pet', { pet: cat.id })).status,
  409,
  'Paid store still needs placement',
);
const position = initialPlacement(a.planning, choice);
a = await ok('a', 'plan-place', { plan: plan.id, ...position });
assert.ok(a.planning.buildings.some((p) => p.kind === 'pets'));
assert.ok((await ok('b')).planning.buildings.some((p) => p.kind === 'pets'));
a = await ok('a', 'pet', { pet: cat.id, price: 0 });
assert.equal(a.resident.coins, 5000 - cat.price);
a = await ok('a', 'pet', { pet: cat.id });
assert.equal(a.resident.coins, 5000 - cat.price);
a = await ok('a', 'pet', { pet: dog.id });
assert.equal(a.resident.catPet, cat.id);
assert.equal(a.resident.dogPet, dog.id);
local(`UPDATE residents SET seen=0 WHERE id='${a.resident.id}'`);
let neighbor = await ok('b');
assert.ok(!neighbor.peers.some((p) => p.id === a.resident.id));
assert.equal(
  neighbor.properties.find((p) => p.home === 0).catPet,
  cat.id,
  'Owner can be offline',
);
assert.equal(neighbor.properties.find((p) => p.home === 0).dogPet, dog.id);
a = await ok('a', 'move-home', { home: 2 });
neighbor = await ok('b');
assert.ok(!neighbor.properties.some((p) => p.home === 0));
assert.equal(neighbor.properties.find((p) => p.home === 2).dogPet, dog.id);
assert.equal((await game('c', 'pet', { pet: cat.id })).status, 409);
assert.ok(!(await ok('c')).properties.some((p) => p.catPet));
a = await ok('a', 'pet', { pet: null, slot: 'cat' });
assert.equal((await ok('b')).properties.find((p) => p.home === 2).catPet, null);
assert.equal(a.resident.dogPet, dog.id);
a = await ok('a', 'move-town', {
  fromTown: a.town.id,
  membership: a.resident.townJoinedAt,
  destination: c.town.id,
  key: c.town.key,
  home: 3,
});
a = await ok('a', 'pet', { pet: cat.id });
assert.equal(a.resident.catPet, cat.id);
assert.equal(
  (await ok('c')).properties.find((p) => p.home === 3).dogPet,
  dog.id,
);
assert.ok(!(await ok('b')).properties.some((p) => p.dogPet));
console.log(
  'PASS: live Worker Pet Store vote, trusted price, funding and placement unlock, shared shop, duplicate purchase, both pets, offline owner visibility, address relocation, indoor state, town isolation, and cross-town pet ownership.',
);
