import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import {
  MAINTENANCE_TARGETS,
  workDuration,
  sweptStreet,
} from '../app/game/maintenance.ts';
import { WORK_DAY_MS } from '../app/game/workTargets.ts';

// Actual game handler and migrations, with an isolated in-memory town database.
const database = new DatabaseSync(':memory:');
for (const file of (await readdir('drizzle'))
  .filter((f) => /^00\d\d.*\.sql$/.test(f) && Number(f.slice(0, 4)) <= 15)
  .sort())
  database.exec(await readFile('drizzle/' + file, 'utf8'));
class Statement {
  constructor(sql, values = []) {
    this.sql = sql;
    this.values = values;
  }
  bind(...values) {
    return new Statement(this.sql, values);
  }
  execute() {
    const results = database.prepare(this.sql).all(...this.values);
    return {
      results,
      success: true,
      meta: {
        changes: Number(database.prepare('SELECT changes() AS n').get().n),
      },
    };
  }
  async first(column) {
    const row = this.execute().results[0];
    return row ? (column ? row[column] : row) : null;
  }
  async all() {
    return this.execute();
  }
  async run() {
    return this.execute();
  }
}
globalThis.maintenanceDb = {
  prepare: (sql) => new Statement(sql),
  async batch(statements) {
    database.exec('BEGIN');
    try {
      const results = statements.map((s) => s.execute());
      database.exec('COMMIT');
      return results;
    } catch (e) {
      database.exec('ROLLBACK');
      throw e;
    }
  },
};
const result = await build({
  entryPoints: ['server/game.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [
    {
      name: 'local-town',
      setup(b) {
        b.onResolve({ filter: /^@\/db\/(raw|auth)$/ }, (a) => ({
          path: a.path,
          namespace: 'fixture',
        }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, (a) => ({
          contents: a.path.endsWith('/raw')
            ? 'export const db=()=>globalThis.maintenanceDb'
            : 'export const gameIdentity=async req=>req.headers.get("test-user")',
          loader: 'js',
        }));
      },
    },
  ],
});
const { GET, POST } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(result.outputFiles[0].text).toString('base64')
);
const originalNow = Date.now;
let now = Date.UTC(2026, 8, 11, 12);
Date.now = () => now;
const states = new Map();
async function call(user, action, args = {}) {
  now += 10;
  const state = states.get(user);
  const req = new Request('https://townies.test/api/game', {
    method: action ? 'POST' : 'GET',
    headers: { 'test-user': user, 'content-type': 'application/json' },
    ...(action
      ? {
          body: JSON.stringify({
            action,
            device: 'test-device-control-' + user,
            moveEpoch: state?.resident.moveEpoch ?? 0,
            ...args,
          }),
        }
      : {}),
  });
  const response = await (action ? POST(req) : GET(req)),
    data = await response.json();
  if (data.resident) states.set(user, data);
  return { status: response.status, data };
}
async function ok(user, action, args) {
  const result = await call(user, action, args);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data;
}
function place(user, target) {
  const id = states.get(user).resident.id;
  database
    .prepare('UPDATE residents SET x=?,z=?,seen=?,move_updated=? WHERE id=?')
    .run(target.x, target.z, now - 500, now - 500, id);
}
try {
  const first = await ok('aster', 'join', { mode: 'private', name: 'Aster' });
  await ok('birch', 'join', {
    mode: 'key',
    key: first.town.key,
    name: 'Birch',
  });
  await ok('clover', 'join', { mode: 'private', name: 'Clover' });
  for (const [i, user] of ['aster', 'birch', 'clover'].entries()) {
    await ok(user, 'setup', { home: i, job: 'wash' });
    await ok(user, 'movement-control');
  }
  for (const job of ['wash', 'trim', 'rake']) {
    const target = MAINTENANCE_TARGETS.find(
        (t) => t.job === job && Math.abs(t.x) < 50,
      ),
      coins = [];
    for (const user of ['aster', 'birch']) {
      await ok(user, 'job', { job });
      await ok(user, 'shift', { job });
      place(user, target);
      coins.push((await ok(user)).resident.coins);
    }
    assert.equal(
      (await call('aster', 'use', { target: target.id })).status,
      400,
      'Cannot skip tool animation',
    );
    const other = MAINTENANCE_TARGETS.find(
      (t) => t.job === job && Math.hypot(t.x - target.x, t.z - target.z) > 10,
    );
    assert.equal(
      (await call('aster', 'water-start', { target: other.id })).status,
      400,
      'No distant work',
    );
    assert.equal(
      (
        await call('aster', 'water-start', {
          target: target.id,
          device: 'stale-device',
        })
      ).status,
      409,
      'Only controlling device can use maintenance tools',
    );
    for (const user of ['aster', 'birch'])
      await ok(user, 'water-start', { target: target.id });
    assert.equal(
      (await call('aster', 'use', { target: target.id })).status,
      400,
      'Server enforces tool duration',
    );
    now += workDuration(job) + 100;
    const race = await Promise.all([
      call('aster', 'use', { target: target.id }),
      call('birch', 'use', { target: target.id }),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    const winner = race.find((r) => r.status === 200).data;
    const a = await ok('aster'),
      b = await ok('birch');
    assert.equal(
      a.resident.coins + b.resident.coins - coins[0] - coins[1],
      winner.workReward.coins,
      'Exactly one payout',
    );
    assert.equal(a.worldWork.filter((w) => w.id === target.id).length, 1);
    assert.deepEqual(a.worldWork, b.worldWork, 'Shared completion');
    assert.equal((await ok('clover')).worldWork.length, 0, 'Town isolation');
    assert.equal(
      a.resident.water,
      8,
      'Tools do not consume gardening supplies',
    );
    await ok('aster', 'shift', { job: null });
    await ok('aster', 'shift', { job });
    assert.equal(
      (await call('aster', 'water-start', { target: target.id })).status,
      409,
      'Restarting does not reset work',
    );
    const completed = winner.worldWork.find(
      (w) => w.id === target.id,
    ).completed;
    now = completed + WORK_DAY_MS - 100;
    assert.equal(
      (await call('aster', 'water-start', { target: target.id })).status,
      409,
      'Still completed before 24h',
    );
    now = completed + WORK_DAY_MS + 1;
    await ok('aster', 'water-start', { target: target.id });
    now += workDuration(job) + 100;
    assert.ok((await ok('aster', 'use', { target: target.id })).workReward);
    console.log(
      `PASS: ${job} proximity, device ownership, timed interaction, shared race, pay, supplies, town isolation and 24-hour reset.`,
    );
  }
  const target = MAINTENANCE_TARGETS.find(
      (t) => t.job === 'sweep' && Math.abs(t.x) < 15 && t.z === 21,
    ),
    start = { x: target.x - 0.5, z: target.z },
    end = { x: target.x + 0.5, z: target.z };
  assert.ok(target);
  assert.ok(sweptStreet(start.x, start.z, end.x, end.z).length);
  const balances = [];
  for (const user of ['aster', 'birch']) {
    await ok(user, 'job', { job: 'sweep' });
    await ok(user, 'shift', { job: 'sweep' });
    place(user, start);
    balances.push((await ok(user)).resident.coins);
  }
  assert.equal(
    (await call('aster', 'use', { target: target.id })).status,
    400,
    'Sweeper cannot claim by use',
  );
  const invalid = await ok('aster', 'heartbeat', {
    x: target.x + 30,
    z: target.z,
  });
  assert.equal(invalid.corrected, true);
  assert.equal(invalid.sweepReward, null, 'Invalid paths earn nothing');
  place('aster', start);
  const race = await Promise.all([
    ok('aster', 'heartbeat', end),
    ok('birch', 'heartbeat', end),
  ]);
  const count = race.reduce((n, r) => n + (r.sweepReward?.count ?? 0), 0),
    reward = race.reduce((n, r) => n + (r.sweepReward?.coins ?? 0), 0);
  assert.ok(count > 0);
  const a = await ok('aster'),
    b = await ok('birch');
  assert.equal(
    a.resident.coins + b.resident.coins - balances[0] - balances[1],
    reward,
  );
  assert.equal(
    a.worldWork.filter((w) => w.id.startsWith('sweep:')).length,
    count,
  );
  assert.equal(
    (await ok('aster', 'heartbeat', end)).sweepReward,
    null,
    'Standing still earns nothing',
  );
  place('aster', start);
  assert.equal(
    (await ok('aster', 'heartbeat', end)).sweepReward,
    null,
    'Repeated pass earns nothing',
  );
  const before = database
    .prepare('SELECT COUNT(*) AS n FROM world_work')
    .get().n;
  place('aster', { x: 0, z: 6 });
  assert.equal(
    (await ok('aster', 'heartbeat', { x: 0, z: 6.3 })).sweepReward,
    null,
    'No rewards off road debris',
  );
  assert.equal(
    database.prepare('SELECT COUNT(*) AS n FROM world_work').get().n,
    before,
  );
  const contributions = database
    .prepare(
      'SELECT SUM(clean) AS clean,SUM(garden) AS garden,SUM(tax) AS tax FROM contributions',
    )
    .get();
  assert.ok(
    contributions.clean > 0 &&
      contributions.garden > 0 &&
      contributions.tax > 0,
  );
  console.log(
    'PASS: sweepers earn only on validated road movement, shared cells pay once, repeat/idle/off-road passes earn nothing, and civic contributions accrue.',
  );
} finally {
  Date.now = originalNow;
  database.close();
  delete globalThis.maintenanceDb;
}
