import assert from 'node:assert/strict';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Local test towns only');
const prefix = `election-${Date.now()}`;
async function call(who, action, body = {}) {
  const r = await fetch(base + '/api/game', {
    method: action ? 'POST' : 'GET',
    headers: {
      ...(who ? { 'oai-authenticated-user-id': prefix + who } : {}),
      'Content-Type': 'application/json',
    },
    ...(action ? { body: JSON.stringify({ action, ...body }) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
async function ok(who, action, body = {}) {
  const r = await call(who, action, body);
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.data;
}
assert.equal((await call(null, 'nominate', { cycle: '2026-09' })).status, 401);
let a = await ok('a', 'join', { mode: 'private', name: 'Nominee A' }),
  cycle = a.election.cycle;
assert.equal(
  (await call('a', 'nominate', { cycle })).status,
  400,
  'Setup required',
);
a = await ok('a', 'setup', { home: 0, job: 'paper' });
await ok('b', 'join', { mode: 'key', key: a.town.key, name: 'Nominee B' });
let b = await ok('b', 'setup', { home: 1, job: 'garden' });
await ok('c', 'join', { mode: 'private', name: 'Separate Town' });
const c = await ok('c', 'setup', { home: 0, job: 'clean' });
const race = await Promise.all([
  call('a', 'nominate', { cycle, candidate: b.resident.id }),
  call('a', 'nominate', { cycle }),
]);
assert.ok(race.every((r) => r.status === 200));
a = await ok('a');
assert.equal(a.election.candidates.length, 1);
assert.equal(
  a.election.candidates[0].id,
  a.resident.id,
  'Nomination is always for the signed-in resident',
);
assert.equal(a.election.nominated, true);
b = await ok('b');
assert.equal(b.election.candidates[0].id, a.resident.id);
assert.equal(b.election.nominated, false);
assert.equal((await ok('c')).election.candidates.length, 0);
await ok('b', 'nominate', { cycle });
await ok('c', 'nominate', { cycle });
assert.equal((await call('a', 'nominate', { cycle: '1900-01' })).status, 409);
assert.notEqual(
  (await call('a', 'vote', { cycle, candidate: c.resident.id })).status,
  200,
  'Cannot vote for another town',
);
if (a.election.active) {
  const vote = await ok('a', 'vote', { cycle, candidate: b.resident.id });
  assert.equal(vote.election.myVote, b.resident.id);
  await ok('a', 'vote', { cycle, candidate: a.resident.id });
  assert.equal((await ok('a')).election.myVote, a.resident.id);
  assert.equal(
    (await ok('b')).election.myVote,
    null,
    'Neighbor sees only their own vote',
  );
} else
  assert.equal(
    (
      await call('a', 'vote', {
        cycle,
        candidate: a.resident.id,
        now: a.election.opensAt,
      })
    ).status,
    409,
    'Client cannot move the election clock',
  );
a = await ok('a');
assert.equal(a.resident.coins, 150);
assert.equal(a.resident.home, 0);
assert.equal(a.election.candidates.length, 2);
console.log(
  'PASS: authenticated local election API, home/job eligibility, duplicate nominations, own-resident nominations, neighbor persistence, private town isolation, stale cycles, vote timing and unchanged belongings.',
);
