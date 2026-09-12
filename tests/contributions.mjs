// Game fixtures use town SQLite migrations; 0016+ are shared-directory migrations.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { recordContribution } from '../db/contributions.ts';
import { readElection, electionAction } from '../db/elections.ts';
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
    const statement = sqlite.prepare(sql);
    let args = [];
    return {
      bind(...a) {
        args = a;
        return this;
      },
      async first() {
        return statement.get(...args) ?? null;
      },
      async all() {
        return { results: statement.all(...args) };
      },
      async run() {
        return { meta: { changes: Number(statement.run(...args).changes) } };
      },
    };
  },
};
for (const id of ['a', 'b'])
  sqlite
    .prepare('INSERT INTO towns(id,name,created) VALUES(?,?,0)')
    .run(id, id);
for (const [id, town] of [
  ['worker', 'a'],
  ['idle', 'a'],
  ['neighbor', 'b'],
])
  sqlite
    .prepare(
      'INSERT INTO residents(id,token_hash,town_id,name,color,home,job,seen,created,xp) VALUES(?,?,?,?,?, ?,?,0,0,?)',
    )
    .run(
      id,
      id,
      town,
      id,
      '#fff',
      id === 'idle' ? 1 : 0,
      'mow',
      id === 'worker' ? 100 : 0,
    );
const worker = { id: 'worker', town_id: 'a', job: 'mow', home: 0 },
  idle = { ...worker, id: 'idle', home: 1 },
  neighbor = { ...worker, id: 'neighbor', town_id: 'b' };
async function credit(r, date, kind, xp, tax = 1, success = true) {
  const now = Date.parse(date + 'Z');
  await d
    .prepare('UPDATE residents SET xp=xp+? WHERE id=? AND ?=1')
    .bind(xp, r.id, success ? 1 : 0)
    .run();
  await recordContribution(d, r, now, kind, xp, tax).run();
}
await credit(worker, '2026-09-30T23:59:59.999', 'paper', 2);
await credit(worker, '2026-10-01T00:00:00', 'mow', 1);
await credit(worker, '2026-10-01T00:00:01', 'garden', 3);
await credit(worker, '2026-10-01T00:00:02', 'garden', 3, 1, false);
await credit(worker, '2026-10-02T00:00:00', 'donated', 0, 0);
await credit(worker, '2026-10-31T12:00:00', 'clean', 2);
await credit(neighbor, '2026-10-31T12:00:00', 'deliver', 2);
const now = Date.parse('2026-10-31T13:00:00Z');
for (const r of [worker, idle, neighbor])
  await electionAction(d, r, 'nominate', '2026-11', null, now);
const e = await readElection(d, worker, now),
  c = e.candidates.find((c) => c.id === worker.id);
assert.equal(e.cycle, '2026-11');
assert.equal(
  e.contributionMonth,
  '2026-10',
  'Calendar month does not advance with the nomination cycle on the 31st',
);
assert.deepEqual(c.contributions.month, {
  xp: 6,
  mow: 1,
  paper: 0,
  clean: 1,
  garden: 1,
  deliver: 0,
  task: 0,
  tax: 3,
  donated: 25,
  days: 2,
});
assert.deepEqual(c.contributions.overall, {
  xp: 108,
  mow: 1,
  paper: 1,
  clean: 1,
  garden: 1,
  deliver: 0,
  task: 0,
  tax: 4,
  donated: 25,
  days: 3,
});
assert.equal(
  e.candidates.find((c) => c.id === idle.id).contributions.month.xp,
  0,
  'Missing records return zero, without excluding the candidate',
);
assert.equal(e.candidates.length, 2, 'Only this town’s candidates');
assert.equal(
  (await readElection(d, neighbor, now)).candidates[0].contributions.month
    .deliver,
  1,
);
const next = await readElection(d, worker, Date.parse('2026-11-01T00:00:00Z'));
assert.equal(
  next.candidates.find((c) => c.id === worker.id).contributions.month.xp,
  0,
);
assert.equal(
  next.candidates.find((c) => c.id === worker.id).contributions.overall.xp,
  108,
);
// Contribution query uses the composite primary key; its first two fields isolate town/resident.
const plan = sqlite
  .prepare(
    'EXPLAIN QUERY PLAN SELECT * FROM contributions WHERE town_id=? AND resident_id=? AND day<=?',
  )
  .all('a', 'worker', '2026-10-31');
assert.ok(plan.some((p) => p.detail.includes('INDEX')));
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
console.log(
  'PASS: real migrations, guarded recording, pre-nomination work, UTC month boundary and 31st, preserved historic XP, daily deduplication, donation-only days, town isolation, empty candidates, and indexed lookup.',
);
