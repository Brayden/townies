import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { electionWindow } from '../app/game/elections.ts';
import { TARGET_BY_ID } from '../app/game/workTargets.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Local test towns only');
const prefix = `government-${Date.now()}`;
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
  (await call(null, 'fund-project', { project: 'park-stage', amount: 1 }))
    .status,
  401,
);
let a = await ok('a', 'join', { mode: 'private', name: 'Mayor Candidate' });
a = await ok('a', 'setup', { home: 0, job: 'paper' });
await ok('b', 'join', { mode: 'key', key: a.town.key, name: 'Neighbor' });
const b = await ok('b', 'setup', { home: 1, job: 'garden' });
await ok('c', 'join', { mode: 'private', name: 'Other Town' });
const c = await ok('c', 'setup', { home: 0, job: 'mow' });
a = await ok('a', 'nominate', {
  cycle: a.election.cycle,
  platform: 'park-stage',
  tax: 1,
});
assert.equal(a.election.candidates[0].platform, 'park-stage');
if (!a.election.active) {
  a = await ok('a', 'platform', {
    cycle: a.election.cycle,
    platform: 'flower-walk',
    tax: 0,
  });
  assert.equal(a.election.candidates[0].tax, 0);
}
for (const id of [a.town.id, a.resident.id, b.resident.id])
  assert.match(id, /^[0-9a-f-]{36}$/);
// Seed a closed election only in this disposable local town; production time is never overridden.
const closed = electionWindow().lastClosedCycle;
assert.match(closed, /^\d{4}-\d{2}$/);
local(
  `INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at,platform,tax) VALUES('${a.town.id}','${closed}','${a.resident.id}',1,'hall-restoration',2)`,
);
local(
  `INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) VALUES('${a.town.id}','${closed}','${b.resident.id}','${a.resident.id}',2)`,
);
local(`UPDATE towns SET treasury=2000 WHERE id='${a.town.id}'`);
a = await ok('a');
assert.equal(a.election.mayor.id, a.resident.id);
assert.equal(a.civic.featured, 'hall-restoration');
assert.equal(a.civic.tax, 2);
assert.equal(a.civic.history.filter((h) => h.kind === 'elected').length, 1);
const term = a.civic.term,
  fund = { term, project: 'hall-restoration', funded: 0, amount: 100 };
assert.equal(
  (await call('b', 'fund-project', { ...fund, mayorId: a.resident.id })).status,
  403,
);
assert.equal(
  (await call('c', 'fund-project', { ...fund, townId: a.town.id })).status,
  403,
);
const spending = await Promise.all([
  call('a', 'fund-project', fund),
  call('a', 'fund-project', fund),
]);
assert.deepEqual(spending.map((r) => r.status).sort(), [200, 409]);
a = await ok('a');
assert.equal(a.town.treasury, 1900);
assert.equal(a.civic.projects[0].funded, 100);
a = await ok('a', 'fund-project', { ...fund, funded: 100, amount: 800 });
assert.equal(a.town.treasury, 1100);
assert.ok(a.civic.projects[0].completed);
assert.equal(a.civic.projects[0].mayorName, a.resident.name);
assert.equal(a.election.candidates[0].delivered, 1);
assert.equal(
  (await call('a', 'set-tax', { term, tax: 99, previousTax: 2 })).status,
  400,
);
assert.equal((await call('a', 'set-tax', { term, tax: 0 })).status, 400);
a = await ok('a', 'set-tax', { term, tax: 0, previousTax: 2 });
assert.equal(a.civic.tax, 0);
await ok('a', 'shift', { job: 'paper' });
const target = TARGET_BY_ID.get('paper-4-mailbox');
local(
  `UPDATE residents SET x=${target.x},z=${target.z} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'use', { target: target.id });
assert.equal(a.workReward.coins, 5);
assert.equal(a.workReward.tax, 0);
assert.equal(a.town.treasury, 1100);
assert.equal(a.election.candidates[0].contributions.month.tax, 0);
await ok('a', 'set-tax', { term, tax: 2, previousTax: 0 });
const second = TARGET_BY_ID.get('paper-5-mailbox');
local(
  `UPDATE residents SET x=${second.x},z=${second.z} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'use', { target: second.id });
assert.equal(a.workReward.coins, 3);
assert.equal(a.workReward.tax, 2);
assert.equal(a.town.treasury, 1102);
assert.equal(a.election.candidates[0].contributions.month.tax, 2);
await ok('b', 'support-project');
a = await ok('a');
assert.equal(a.town.treasury, 1127);
assert.equal(a.civic.history[0].kind, 'donation');
await ok('a', 'feature-project', { term, project: 'park-stage' });
const neighbor = await ok('b');
assert.equal(neighbor.civic.featured, 'park-stage');
assert.equal(
  neighbor.civic.projects.find((p) => p.id === 'hall-restoration').completed,
  a.civic.projects[0].completed,
);
assert.equal((await ok('c')).civic.projects.length, 0);
assert.equal((await ok('c')).town.treasury, 0);
console.log(
  'PASS: authenticated campaign promises, automatic term activation, mayor/town authorization, duplicate spending, completed render state, tax-to-pay/contribution reconciliation, donations, shared featured projects, and isolated towns.',
);
