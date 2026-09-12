// Game fixtures use town SQLite migrations; 0016+ are shared-directory migrations.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { readElection, electionAction } from '../db/elections.ts';
import {
  readCivic,
  syncGovernance,
  civicAction,
  payPolicy,
} from '../db/governance.ts';
import { CIVIC_PROJECTS, workPay } from '../app/game/civicProjects.ts';
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
for (const id of ['town', 'other'])
  sqlite
    .prepare('INSERT INTO towns(id,name,treasury,created) VALUES(?,?,10000,0)')
    .run(id, id);
const a = { id: 'alice', name: 'Alice', town_id: 'town', home: 0, job: 'mow' },
  b = { id: 'bea', name: 'Bea', town_id: 'town', home: 1, job: 'garden' },
  outsider = {
    id: 'other',
    name: 'Other',
    town_id: 'other',
    home: 0,
    job: 'paper',
  };
for (const r of [a, b, outsider])
  sqlite
    .prepare(
      'INSERT INTO residents(id,token_hash,name,town_id,color,home,job,seen,created) VALUES(?,?,?,?,?,?,?,0,0)',
    )
    .run(r.id, r.id, r.name, r.town_id, '#fff', r.home, r.job);
const pre = Date.parse('2026-09-10T00:00:00Z'),
  open = Date.parse('2026-09-21T00:00:00Z'),
  close = Date.parse('2026-10-01T00:00:00Z');
assert.equal(
  (
    await electionAction(
      d,
      a,
      'nominate',
      '2026-09',
      null,
      pre,
      'park-stage',
      99,
    )
  ).status,
  400,
);
assert.equal(
  await electionAction(d, a, 'nominate', '2026-09', null, pre, 'park-stage', 2),
  null,
);
assert.equal(
  await electionAction(
    d,
    a,
    'platform',
    '2026-09',
    null,
    pre,
    'flower-walk',
    1,
  ),
  null,
);
assert.equal(
  await electionAction(d, a, 'platform', '2026-09', null, pre, 'park-stage', 2),
  null,
);
assert.equal(
  (await readElection(d, b, pre)).candidates[0].platform,
  'park-stage',
);
assert.equal(
  await electionAction(
    d,
    a,
    'platform',
    '2026-09',
    null,
    open - 1,
    'park-stage',
    2,
  ),
  null,
  'Can edit until the instant voting opens',
);
assert.equal(
  (
    await electionAction(
      d,
      a,
      'platform',
      '2026-09',
      null,
      open,
      'flower-walk',
      0,
    )
  ).status,
  409,
  'Cannot change promises during voting',
);
await electionAction(d, a, 'nominate', '2026-09', null, open, 'flower-walk', 0);
assert.equal(
  (await readElection(d, b, open)).candidates[0].platform,
  'park-stage',
  'Re-nomination cannot replace a locked pledge',
);
assert.equal(
  (await readElection(d, b, open)).candidates[0].tax,
  2,
  'Re-nomination cannot replace a locked tax promise',
);
assert.equal(
  (
    await electionAction(
      d,
      a,
      'platform',
      '2026-09',
      null,
      close,
      'flower-walk',
      0,
    )
  ).status,
  409,
  'Closing the election never unlocks its promise',
);
const locked = sqlite
  .prepare(
    'SELECT platform,tax FROM election_candidates WHERE resident_id=? AND cycle=?',
  )
  .get(a.id, '2026-09');
assert.equal(locked.platform, 'park-stage');
assert.equal(locked.tax, 2);

await electionAction(d, b, 'vote', '2026-09', a.id, open);
assert.equal(
  (
    await civicAction(
      d,
      a,
      { action: 'set-tax', term: '2026-09', tax: 2, previousTax: 1 },
      open,
    )
  ).status,
  403,
  'No mayor powers before election closes',
);
await Promise.all([
  syncGovernance(d, a.town_id, close),
  syncGovernance(d, a.town_id, close),
]);
let c = await readCivic(d, a.town_id);
assert.equal(c.featured, 'park-stage');
assert.equal(c.tax, 2);
assert.equal(c.term, '2026-09');
assert.equal(
  c.history.filter((h) => h.kind === 'elected').length,
  1,
  'Term activates exactly once',
);
assert.equal(
  (
    await civicAction(
      d,
      b,
      {
        action: 'fund-project',
        term: c.term,
        project: 'park-stage',
        funded: 0,
        amount: 100,
      },
      close,
    )
  ).status,
  403,
);
assert.equal(
  (
    await civicAction(
      d,
      outsider,
      { action: 'set-tax', term: c.term, tax: 0, previousTax: 2 },
      close,
    )
  ).status,
  403,
);
assert.equal(
  (
    await civicAction(
      d,
      a,
      {
        action: 'fund-project',
        term: 'old',
        project: 'park-stage',
        funded: 0,
        amount: 100,
      },
      close,
    )
  ).status,
  409,
);
assert.equal(
  (
    await civicAction(
      d,
      a,
      { action: 'feature-project', term: c.term, project: 'flower-walk' },
      close,
    )
  ).status,
  409,
  'Must deliver featured promise first',
);
const fund = {
  action: 'fund-project',
  term: c.term,
  project: 'park-stage',
  funded: 0,
  amount: 100,
};
const race = await Promise.all([
  civicAction(d, a, fund, close),
  civicAction(d, a, fund, close),
]);
assert.equal(
  race.filter((r) => r === null).length,
  1,
  'Duplicate spend only applies once',
);
c = await readCivic(d, a.town_id);
assert.equal(c.projects[0].funded, 100);
assert.equal(
  sqlite.prepare('SELECT treasury FROM towns WHERE id=?').get(a.town_id)
    .treasury,
  9900,
);
assert.equal(
  (await civicAction(d, a, { ...fund, funded: 100, amount: -100 }, close))
    .status,
  400,
);
assert.equal(
  (await civicAction(d, a, { ...fund, funded: 100, amount: 501 }, close))
    .status,
  400,
);
// Failure anywhere in the audit batch rolls back the spend and project progress.
sqlite.exec(
  "CREATE TRIGGER reject_audit BEFORE INSERT ON civic_history BEGIN SELECT RAISE(ABORT,'test rollback'); END",
);
await assert.rejects(
  civicAction(d, a, { ...fund, funded: 100, amount: 100 }, close),
);
assert.equal((await readCivic(d, a.town_id)).projects[0].funded, 100);
assert.equal(
  sqlite.prepare('SELECT treasury FROM towns WHERE id=?').get(a.town_id)
    .treasury,
  9900,
);
sqlite.exec('DROP TRIGGER reject_audit');
assert.equal(
  await civicAction(d, a, { ...fund, funded: 100, amount: 500 }, close),
  null,
);
c = await readCivic(d, a.town_id);
assert.ok(c.projects[0].completed);
assert.equal(c.projects[0].mayorName, 'Alice');
assert.equal(
  (
    await electionAction(
      d,
      b,
      'nominate',
      '2026-10',
      null,
      close,
      'park-stage',
      1,
    )
  ).status,
  409,
  'No promises for already-built projects',
);
for (const id of ['flower-walk', 'orchard-picnic', 'garden-terrace']) {
  assert.equal(
    await civicAction(
      d,
      a,
      { action: 'feature-project', term: c.term, project: id },
      close,
    ),
    null,
  );
  assert.equal(
    await civicAction(
      d,
      a,
      {
        action: 'fund-project',
        term: c.term,
        project: id,
        funded: 0,
        amount: CIVIC_PROJECTS.find((p) => p.id === id).cost,
      },
      close,
    ),
    null,
  );
}
assert.equal(
  (await payPolicy(d, a.town_id)).bonus,
  1,
  'Four completed upgrades improve every job',
);
assert.equal(
  await civicAction(
    d,
    a,
    { action: 'set-tax', term: c.term, tax: 0, previousTax: 2 },
    close,
  ),
  null,
);
await syncGovernance(d, a.town_id, close);
assert.equal(
  (await readCivic(d, a.town_id)).tax,
  0,
  'Reading state does not overwrite the mayor’s later decisions',
);
assert.equal(
  (
    await civicAction(
      d,
      a,
      { action: 'set-tax', term: c.term, tax: 2, previousTax: 2 },
      close,
    )
  ).status,
  409,
);
const donated = await civicAction(d, b, { action: 'support-project' }, close);
assert.equal(donated, null);
assert.equal(
  sqlite
    .prepare('SELECT donated FROM contributions WHERE resident_id=?')
    .get(b.id).donated,
  25,
);
assert.equal(
  sqlite.prepare('SELECT xp FROM residents WHERE id=?').get(b.id).xp,
  0,
);
await civicAction(
  d,
  a,
  { action: 'feature-project', term: c.term, project: 'hall-restoration' },
  close,
);
await civicAction(
  d,
  a,
  {
    action: 'fund-project',
    term: c.term,
    project: 'hall-restoration',
    funded: 0,
    amount: 100,
  },
  close,
);
// A new elected mayor takes control; unfinished funding and completed improvements survive.
await electionAction(
  d,
  b,
  'nominate',
  '2026-10',
  null,
  close,
  'school-court',
  1,
);
await electionAction(
  d,
  a,
  'vote',
  '2026-10',
  b.id,
  Date.parse('2026-10-21T00:00:00Z'),
);
const handover = Date.parse('2026-10-31T00:00:00Z');
await syncGovernance(d, a.town_id, handover);
c = await readCivic(d, a.town_id);
assert.equal(c.featured, 'school-court');
assert.equal(c.tax, 1);
assert.equal(c.projects.find((p) => p.id === 'hall-restoration').funded, 100);
assert.equal(c.projects.filter((p) => p.completed).length, 4);
assert.equal(
  (
    await civicAction(
      d,
      a,
      { action: 'set-tax', term: c.term, tax: 2, previousTax: 1 },
      handover,
    )
  ).status,
  403,
);
await electionAction(
  d,
  a,
  'nominate',
  '2026-11',
  null,
  handover,
  'library-court',
  0,
);
assert.equal((await readElection(d, b, handover)).candidates[0].delivered, 4);
for (const base of [1, 2, 3, 4, 6, 8, 24, 29])
  for (const tax of [0, 1, 2])
    for (const bonus of [0, 1, 2, 3]) {
      const p = workPay(base, tax, bonus);
      assert.equal(p.coins + p.tax, base + 1 + bonus);
      assert.ok(p.coins >= 1);
      assert.ok(p.tax <= tax);
    }
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
console.log(
  'PASS: campaign validation/locking, election activation and handover, mayor-only actions, town isolation, atomic/idempotent spending, audit rollback, persistent project progress, tax changes, donations, four-upgrade earnings milestone, and delivered-promise records.',
);
