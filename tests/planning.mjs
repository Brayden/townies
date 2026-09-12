// Game fixtures use town SQLite migrations; 0016+ are shared-directory migrations.
import { placementError, initialPlacement } from '../app/game/placement.ts';
import { locationOf, plotOccupied } from '../app/game/charters.ts';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { planningAction, readPlanning, validatePlan } from '../db/planning.ts';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const f of readdirSync(new URL('../drizzle/', import.meta.url))
  .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 4)) <= 15)
  .sort())
  sqlite.exec(
    readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'),
  );
const d = {
  prepare(sql) {
    const stmt = sqlite.prepare(sql);
    let args = [];
    return {
      bind(...a) {
        args = a;
        return this;
      },
      async first() {
        return stmt.get(...args) ?? null;
      },
      async all() {
        return { results: stmt.all(...args) };
      },
      execute() {
        return { meta: { changes: Number(stmt.run(...args).changes) } };
      },
      async run() {
        return this.execute();
      },
    };
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = statements.map((s) => s.execute());
      sqlite.exec('COMMIT');
      return results;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
};
const now = Date.parse('2026-09-10T12:00:00Z'),
  week = 7 * 86400000;
for (const id of ['town', 'other'])
  sqlite
    .prepare('INSERT INTO towns(id,name,treasury,created) VALUES(?,?,50000,0)')
    .run(id, id);
const people = Array.from({ length: 7 }, (_, i) => ({
  id: 'r' + i,
  name: 'Resident ' + i,
  town_id: i === 6 ? 'other' : 'town',
  job: 'mow',
  home: i,
  seen: i === 4 ? now - 15 * 86400000 : now,
}));
people[5].home = null;
for (const r of people)
  sqlite
    .prepare(
      'INSERT INTO residents(id,token_hash,name,town_id,color,home,job,seen,created) VALUES(?,?,?,?,?,?,?,?,0)',
    )
    .run(r.id, r.id, r.name, r.town_id, '#fff', r.home, r.job, r.seen);
const mayor = people[0],
  neighbor = people[1],
  outsider = people[6];
sqlite
  .prepare(
    'INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at,platform,tax) VALUES(?,?,?,?,?,1)',
  )
  .run('town', '2026-08', mayor.id, 1, 'park-stage');
sqlite
  .prepare(
    'INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) VALUES(?,?,?,?,1)',
  )
  .run('town', '2026-08', neighbor.id, mayor.id);
const act = (r, b, t = now) => planningAction(d, r, b, t),
  state = () => readPlanning(d, 'town', mayor.id, now),
  coins = () =>
    sqlite.prepare('SELECT treasury FROM towns WHERE id=?').get('town')
      .treasury;
assert.equal(
  (
    await act(neighbor, {
      action: 'plan-propose',
      kind: 'expand',
      option: 'north',
      mayorId: mayor.id,
    })
  ).status,
  403,
);
assert.equal(
  (
    await act(outsider, {
      action: 'plan-propose',
      kind: 'expand',
      option: 'north',
      townId: 'town',
    })
  ).status,
  403,
);
assert.equal(
  (await act(people[5], { action: 'plan-vote', plan: 'x', vote: true })).status,
  400,
);
async function propose(spec) {
  assert.equal(await act(mayor, { action: 'plan-propose', ...spec }), null);
  return (await state()).proposals.find((p) => p.status === 'voting');
}
async function close(p, yes = 2, no = 0) {
  for (let i = 0; i < yes + no; i++)
    assert.equal(
      await act(people[i], { action: 'plan-vote', plan: p.id, vote: i < yes }),
      null,
    );
  sqlite.prepare('UPDATE town_plans SET closes=? WHERE id=?').run(now, p.id);
  return (await state()).proposals.find((x) => x.id === p.id);
}
async function fund(p, amount = p.cost - p.funded) {
  return act(mayor, {
    action: 'plan-fund',
    plan: p.id,
    funded: p.funded,
    amount,
  });
}
let p = await propose({ kind: 'expand', option: 'north' });
assert.equal(p.closes - p.created, week);
assert.equal(p.electorate, 4);
assert.equal(p.quorum, 2);
assert.equal(coins(), 50000);
assert.equal(
  (await act(mayor, { action: 'plan-propose', kind: 'expand', option: 'east' }))
    .status,
  409,
  'Only one live development',
);
assert.equal((await fund(p)).status, 409, 'Voting is not permission to spend');
for (const r of [people[4], outsider])
  assert.equal(
    (await act(r, { action: 'plan-vote', plan: p.id, vote: true })).status,
    409,
  );
assert.equal(
  await act(mayor, { action: 'plan-vote', plan: p.id, vote: true }),
  null,
);
assert.equal(
  await act(mayor, { action: 'plan-vote', plan: p.id, vote: false }),
  null,
);
let votes = (await state()).proposals[0];
assert.equal(votes.yes, 0);
assert.equal(votes.no, 1, 'Replacing a vote does not add a ballot');
sqlite.prepare('UPDATE residents SET seen=? WHERE id=?').run(now, people[4].id);
assert.equal(
  (await act(people[4], { action: 'plan-vote', plan: p.id, vote: true }))
    .status,
  409,
  'Roll remains fixed after residents return',
);
p = await close(p, 1, 1);
assert.equal(p.status, 'rejected', '50% does not reach 60%');
assert.equal((await fund(p)).status, 409);
assert.equal(
  (await act(mayor, { action: 'plan-vote', plan: p.id, vote: true }, now))
    .status,
  409,
  'Vote closes at its exact deadline',
);
sqlite
  .prepare('UPDATE residents SET seen=? WHERE id=?')
  .run(now - 15 * 86400000, people[4].id);
p = await propose({ kind: 'expand', option: 'north' });
p = await close(p, 1);
assert.equal(p.status, 'rejected', 'One ballot fails two-person quorum');
p = await propose({ kind: 'expand', option: 'north' });
p = await close(p);
assert.equal(p.status, 'approved');
assert.equal(
  (
    await act(neighbor, {
      action: 'plan-fund',
      plan: p.id,
      funded: 0,
      amount: 100,
    })
  ).status,
  403,
);
const race = await Promise.all([fund(p, 100), fund(p, 100)]);
assert.equal(race.filter((r) => r === null).length, 1);
assert.equal(coins(), 49900);
assert.equal(
  (await state()).territories.length,
  0,
  'Partial funding does not open land',
);
p = (await state()).proposals.find((x) => x.id === p.id);
assert.equal((await fund(p, -1)).status, 400);
assert.equal((await fund(p, p.cost)).status, 400);
sqlite.exec(
  "CREATE TRIGGER fail_territory BEFORE INSERT ON town_territories BEGIN SELECT RAISE(ABORT,'test apply rollback'); END",
);
await assert.rejects(fund(p));
assert.equal(coins(), 49900);
assert.equal((await state()).proposals.find((x) => x.id === p.id).funded, 100);
sqlite.exec('DROP TRIGGER fail_territory');
assert.equal(await fund(p), null);
assert.deepEqual((await state()).territories, ['north']);
assert.equal(coins(), 47600);
assert.ok(
  validatePlan(await state(), { kind: 'expand', option: 'north' }).error,
);
const place = (p, v, r = mayor) =>
  act(r, { action: 'plan-place', plan: p.id, ...v });
p = await propose({
  kind: 'branch',
  institution: 'library',
  option: 'academy',
});
assert.equal(
  (await place(p, { x: -16, z: 9, rotation: 0 })).status,
  409,
  'Cannot place during voting',
);
p = await close(p);
assert.equal(
  (await place(p, { x: -16, z: 9, rotation: 0 })).status,
  409,
  'Cannot place before funding',
);
assert.equal(await fund(p), null);
let s = await state();
assert.equal(
  s.institutions[0].node,
  'root',
  'Fully funded building still waits for placement',
);
assert.equal(s.proposals.find((x) => x.id === p.id).status, 'ready');
assert.equal(
  (await act(mayor, { action: 'plan-propose', kind: 'expand', option: 'east' }))
    .status,
  409,
  'Ready building holds the active project slot',
);
assert.equal(
  (await place(p, { x: -16, z: 9, rotation: 0 }, neighbor)).status,
  403,
);
for (const v of [
  { x: 999, z: 999, rotation: 0 },
  { x: 0, z: 0, rotation: 0 },
  { x: -16, z: 9, rotation: 45 },
  { x: -16.5, z: 9, rotation: 0 },
  { x: 73, z: -37, rotation: 0 },
])
  assert.equal((await place(p, v)).status, 400, 'Invalid placement rejected');
sqlite.exec(
  "CREATE TRIGGER fail_placement BEFORE INSERT ON charter_institutions BEGIN SELECT RAISE(ABORT,'test placement rollback'); END",
);
await assert.rejects(place(p, { x: -16, z: -70, rotation: 0 }));
assert.equal(
  (await state()).proposals.find((x) => x.id === p.id).status,
  'ready',
);
sqlite.exec('DROP TRIGGER fail_placement');
const beforePlace = coins(),
  placements = await Promise.all([
    place(p, { x: -16, z: -70, rotation: 0 }),
    place(p, { x: -16, z: -70, rotation: 0 }),
  ]);
assert.equal(placements.filter((r) => r === null).length, 1);
assert.equal(coins(), beforePlace, 'Placement never spends twice');
s = await state();
assert.equal(s.institutions[0].node, 'academy');
for (const option of ['root', 'culture', 'mall'])
  assert.ok(
    validatePlan(s, { kind: 'branch', institution: 'library', option }).error,
  );
p = await propose({ kind: 'relocate', institution: 'library', option: 'free' });
p = await close(p);
assert.equal(await fund(p, 100), null);
assert.equal(locationOf((await state()).institutions[0]).x, -16);
p = (await state()).proposals.find((x) => x.id === p.id);
assert.equal(await fund(p), null);
assert.equal(
  locationOf((await state()).institutions[0]).x,
  -16,
  'Old facility stays until mayor places it',
);
assert.equal(await place(p, { x: -43, z: -70, rotation: 90 }), null);
s = await state();
assert.equal(s.institutions[0].x, -43);
assert.equal(s.institutions[0].rotation, 90);
assert.equal(s.institutions[0].node, 'academy');
assert.equal(
  plotOccupied('library-site', s),
  false,
  'Old site really becomes free',
);
p = await propose({
  kind: 'branch',
  institution: 'library',
  option: 'conservatory',
});
p = await close(p);
assert.equal(await fund(p), null);
assert.equal(await place(p, { x: -43, z: -70, rotation: 0 }), null);
s = await state();
assert.equal(s.institutions[0].node, 'conservatory');
assert.ok(
  validatePlan(s, {
    kind: 'branch',
    institution: 'library',
    option: 'institute',
  }).error,
  'Other final outcome remains permanently closed',
);
p = await propose({ kind: 'build', option: 'garden' });
p = await close(p);
assert.equal(await fund(p), null);
assert.equal(await place(p, { x: -16, z: 9, rotation: 0 }), null);
s = await state();
assert.equal(s.buildings[0].kind, 'garden');
assert.equal(s.buildings[0].x, -16);
assert.equal(plotOccupied('library-site', s), true);
assert.ok(
  placementError(
    s,
    { kind: 'relocate', institution: 'harbor', option: 'free' },
    { x: -16, z: 9, rotation: 0 },
  ),
);
assert.equal(
  (await readPlanning(d, 'other', outsider.id, now)).proposals.length,
  0,
);
// A 5-person roll requires 3 ballots. Exactly 3 yes out of 5 passes.
sqlite.prepare('UPDATE residents SET seen=? WHERE id=?').run(now, people[4].id);
p = await propose({ kind: 'expand', option: 'east' });
assert.equal(p.electorate, 5);
assert.equal(p.quorum, 3);
p = await close(p, 3, 2);
assert.equal(p.status, 'approved');
assert.equal(
  coins(),
  50000 - 2400 - 1600 - 1400 - 3400 - 600,
  'Ledger matches exactly the completed budgets',
);
assert.equal(await fund(p), null);
// Emulate another development completing between validation reads and proposal insertion.
const originalBatch = d.batch;
d.batch = async (statements) => {
  d.batch = originalBatch;
  sqlite.exec(
    "INSERT INTO town_plans(id,town_id,kind,option,cost,funded,status,created,closes,electorate,quorum,name) VALUES('interleaved-completion','town','build','garden',0,0,'completed',0,0,1,1,'Fixture')",
  );
  return originalBatch(statements);
};
assert.equal(
  (
    await act(mayor, {
      action: 'plan-propose',
      kind: 'expand',
      option: 'island',
    })
  ).status,
  409,
  'A stale layout cannot open a proposal after another project changes it',
);
assert.equal(
  (await state()).proposals.filter((p) => p.status === 'voting').length,
  0,
);
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
console.log(
  'PASS: migrations, mayor and town authorization, frozen voter roll, quorum, 60% boundary, deadline locking, one active plan, duplicate spending, atomic rollback, permanent branches, relocation continuity, vacated-site redevelopment, and conserved treasury.',
);
