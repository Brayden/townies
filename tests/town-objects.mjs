import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Local test worlds only.');
const root = process.env.TOWNIES_STATE_DIR ?? 'outputs/local/state/v3';
function database(folder, predicate) {
  for (const file of readdirSync(folder).filter(
    (f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite',
  )) {
    const db = new DatabaseSync(`${folder}/${file}`);
    try {
      if (predicate(db)) return db;
    } catch {}
    db.close();
  }
  throw new Error(`Test database not found in ${folder}`);
}
const d1 = database(root + '/d1/miniflare-D1DatabaseObject', (d) =>
  d.prepare("SELECT 1 FROM sqlite_master WHERE name='auth_users'").get(),
);
function townDB(id) {
  return database(
    root +
      '/do/' +
      (process.env.TOWNIES_TEST_WORKER ?? 'townies-local') +
      '-Town',
    (d) =>
      d.prepare("SELECT 1 FROM _meta WHERE key='town' AND value=?").get(id),
  );
}
const stamp = Date.now();
function client(name) {
  const cookies = new Map();
  return {
    cookies,
    name,
    async api(path = '/api/game', body) {
      const r = await fetch(base + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          Origin: base,
          Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      for (const line of r.headers.getSetCookie()) {
        const part = line.split(';')[0],
          i = part.indexOf('=');
        cookies.set(part.slice(0, i), part.slice(i + 1));
      }
      return { status: r.status, data: await r.json(), headers: r.headers };
    },
    async ok(body) {
      const r = await this.api('/api/game', body);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.headers.get('x-townies-storage'), 'durable-object');
      return r.data;
    },
  };
}
const [a, b, c] = ['Alder', 'Birch', 'Clover'].map(client);
// Reset only the localhost registration limiter between isolated test suites.
d1.prepare(
  "DELETE FROM auth_rate_limits WHERE key LIKE '%|/sign-up/email'",
).run();
for (const player of [a, b, c]) {
  const r = await player.api('/api/auth/sign-up/email', {
    name: player.name,
    email: `do-${player.name}-${stamp}@example.com`,
    password: 'Testing three durable towns 42!',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}
let first = await a.ok({ action: 'join', mode: 'private', name: 'Alder' });
await b.ok({ action: 'join', mode: 'key', key: first.town.key, name: 'Birch' });
const claims = await Promise.all([
  a.api('/api/game', { action: 'setup', job: 'mow', home: 0 }),
  b.api('/api/game', { action: 'setup', job: 'paper', home: 0 }),
]);
assert.deepEqual(claims.map((c) => c.status).sort(), [200, 409]);
const loser = claims[0].status === 409 ? a : b;
await loser.ok({ action: 'setup', job: 'mow', home: 1 });
first = await a.ok();
let second = await c.ok({ action: 'join', mode: 'private', name: 'Clover' });
second = await c.ok({ action: 'setup', job: 'garden', home: 0 });
const old = first.town.id,
  next = second.town.id,
  oldDb = townDB(old),
  nextDb = townDB(next),
  rid = first.resident.id;
assert.notEqual(old, next);
// Directory metrics must use the town object, even while D1 is stale.
const founded = stamp - 40 * 86400000;
nextDb.prepare('UPDATE towns SET created=? WHERE id=?').run(founded, next);
nextDb
  .prepare('UPDATE residents SET seen=? WHERE id=?')
  .run(stamp - 3600000, second.resident.id);
nextDb
  .prepare('UPDATE residents SET seen=0 WHERE id=?')
  .run(second.resident.id);
d1.prepare('UPDATE residents SET last_active=0,seen=0 WHERE id=?').run(
  second.resident.id,
);
const destination = (
  await a.ok({ action: 'move-options', key: second.town.key })
).destination;
assert.equal(destination.created, founded);
assert.equal(destination.residents, 1);
assert.equal(destination.online, 0);
assert.equal(
  destination.active72h,
  1,
  'Disconnect preserves recent activity in the DO',
);
assert.ok(!('invite' in destination));
const privatePage = await a.ok({ action: 'move-options', mode: 'public' });
assert.ok(!privatePage.towns.some((t) => t.id === next || t.id === old));
// Expose this synthetic town temporarily to exercise the public directory path.
d1.prepare('UPDATE towns SET private=0 WHERE id=?').run(next);
nextDb.prepare('UPDATE towns SET private=0 WHERE id=?').run(next);
const publicPage = await a.ok({ action: 'move-options', mode: 'public' });
assert.equal(publicPage.towns.find((t) => t.id === next).active72h, 1);
assert.equal(publicPage.towns.find((t) => t.id === next).created, founded);
d1.prepare('UPDATE towns SET private=1 WHERE id=?').run(next);
nextDb.prepare('UPDATE towns SET private=1 WHERE id=?').run(next);
assert.equal(
  (
    await a.api('/api/game', {
      action: 'move-options',
      mode: 'public',
      cursor: { created: -1, id: 'bad' },
    })
  ).status,
  400,
);
// Simultaneous mowers still award each shared patch exactly once.
for (const player of [a, b]) {
  const state = await player.ok({ action: 'job', job: 'mow' });
  oldDb
    .prepare(
      'UPDATE residents SET x=-36.6,z=-9.3,seen=?,move_updated=? WHERE id=?',
    )
    .run(Date.now() - 1200, Date.now() - 1200, state.resident.id);
  await player.ok({ action: 'mower', active: true });
}
const mowing = await Promise.all([
  a.ok({ action: 'heartbeat', x: -31.5, z: -9.3 }),
  b.ok({ action: 'heartbeat', x: -31.5, z: -9.3 }),
]);
assert.ok(mowing.every((r) => !r.corrected));
const mowed = await a.ok(),
  otherMower = await b.ok();
assert.ok(mowed.lawnCuts.length > 0);
assert.equal(
  mowed.resident.coins + otherMower.resident.coins - 300,
  mowed.lawnCuts.length * 2,
);
assert.equal(mowed.town.treasury, mowed.lawnCuts.length);
oldDb
  .prepare('UPDATE lawn_cells SET cut_at=? WHERE town_id=?')
  .run(Date.now() - 86400000 + 60000, old);
assert.ok((await a.ok()).lawnCuts.length > 0);
oldDb
  .prepare('UPDATE lawn_cells SET cut_at=? WHERE town_id=?')
  .run(Date.now() - 86400000 - 1000, old);
assert.equal((await a.ok()).lawnCuts.length, 0);
const desktop = 'desktop-' + randomUUID(),
  phone = 'phone-' + randomUUID();
const control = await a.ok({
  action: 'movement-control',
  device: desktop,
  moveEpoch: 0,
});
assert.equal(control.controlAccepted, true);
const takeover = await a.ok({
  action: 'movement-control',
  device: phone,
  moveEpoch: control.resident.moveEpoch,
});
assert.equal(takeover.controlAccepted, true);
const follower = await a.ok({
  action: 'heartbeat',
  device: desktop,
  moveEpoch: control.resident.moveEpoch,
  x: 0,
  z: 6,
});
assert.equal(follower.controlFollower, true);
assert.equal(follower.resident.x, takeover.resident.x);
oldDb
  .prepare(
    "UPDATE residents SET coins=8000,xp=850,education=30,house='rose-4',upkeep_due=?,items='[\"bike\",\"hat-top\"]',hat='hat-top' WHERE id=?",
  )
  .run(Date.now() + 86400000, rid);
oldDb
  .prepare('UPDATE towns SET farm_funded=250,project=40 WHERE id=?')
  .run(old);
// D1 is now directory data: changing its stale world copy cannot alter play.
d1.prepare('UPDATE residents SET coins=1 WHERE id=?').run(rid);
first = await a.ok();
assert.equal(first.resident.coins, 8000);
assert.equal(first.town.project, 40);
assert.equal((await c.ok()).town.project, 0);
const job = await a.ok({ action: 'mower', active: true });
assert.equal(job.resident.mowing, true);
const move = {
  action: 'move-town',
  destination: next,
  key: second.town.key,
  home: 2,
  fromTown: old,
  membership: first.resident.townJoinedAt,
  townId: old,
};
assert.equal((await a.api('/api/game', { ...move, home: 0 })).status, 409);
assert.equal((await a.ok()).town.id, old);
// Force the cross-town directory step to fail after both objects prepared.
assert.match(rid, /^[a-z0-9-]+$/);
d1.exec(
  `CREATE TRIGGER test_transfer_${stamp} BEFORE UPDATE OF town_id ON residents WHEN OLD.id='${rid}' BEGIN SELECT RAISE(ABORT,'test interrupted transfer'); END`,
);
assert.equal((await a.api('/api/game', move)).status, 409);
assert.equal(
  oldDb
    .prepare(
      "SELECT COUNT(*) AS n FROM _transfers WHERE resident=? AND status='prepared'",
    )
    .get(rid).n,
  1,
);
assert.equal(
  nextDb
    .prepare(
      "SELECT COUNT(*) AS n FROM _transfers WHERE resident=? AND status='prepared'",
    )
    .get(rid).n,
  1,
);
d1.exec(`DROP TRIGGER test_transfer_${stamp}`);
const after = await a.ok();
assert.equal(after.town.id, next);
assert.equal(after.resident.home, 2);
assert.equal(after.resident.coins, 8000);
assert.equal(after.resident.xp, 850);
assert.equal(after.resident.house, 'rose-4');
assert.equal(after.resident.mowing, false);
assert.equal(after.resident.moveOwner, '');
assert.equal((await b.ok()).town.residents, 1);
assert.equal((await c.ok()).town.residents, 2);
assert.equal((await b.ok()).town.project, 40);
assert.equal(
  (await a.api('/api/game', { ...move, action: 'heartbeat', x: 1, z: 6 }))
    .status,
  409,
);
assert.equal(
  (
    await a.api('/api/chat', {
      townId: old,
      channel: 'town',
      text: 'stale',
      id: randomUUID(),
    })
  ).status,
  409,
);
// Two independent account coordinators may exchange towns without deadlock.
const bs = await b.ok(),
  cs = await c.ok();
const exchange = await Promise.all([
  b.api('/api/game', {
    ...move,
    home: 3,
    membership: bs.resident.townJoinedAt,
  }),
  c.api('/api/game', {
    action: 'move-town',
    destination: old,
    key: bs.town.key,
    home: 0,
    fromTown: next,
    membership: cs.resident.townJoinedAt,
  }),
]);
assert.ok(
  exchange.every((v) => v.status === 200),
  JSON.stringify(exchange),
);
assert.equal((await a.ok()).town.id, next);
// Global friendships/DMs survive a move; same-town access follows local state.
const astate = await a.ok(),
  bstate = await b.ok();
assert.equal(
  (
    await a.api('/api/social', {
      action: 'request',
      town: next,
      to: bstate.resident.id,
    })
  ).status,
  200,
);
assert.equal(
  (
    await b.api('/api/social', {
      action: 'accept',
      town: next,
      to: astate.resident.id,
    })
  ).status,
  200,
);
assert.equal(
  (
    await a.api('/api/social', {
      action: 'message',
      town: next,
      to: bstate.resident.id,
      text: 'Hello neighbor!',
      id: randomUUID(),
    })
  ).status,
  200,
);
const inbox = await b.api('/api/social?to=' + astate.resident.id);
assert.equal(inbox.status, 200);
assert.equal(inbox.data.messages.at(-1).text, 'Hello neighbor!');
// The destination object, not an approximate directory count, enforces 50.
const active = await c.ok(),
  source = await a.ok();
const filler = oldDb
  .prepare('SELECT * FROM residents WHERE id=?')
  .get(active.resident.id);
const fillerIds = [];
const cols = Object.keys(filler);
const insert = oldDb.prepare(
  `INSERT INTO residents(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`,
);
for (
  let i = Number(
    oldDb
      .prepare('SELECT COUNT(*) AS n FROM residents WHERE town_id=?')
      .get(old).n,
  );
  i < 50;
  i++
) {
  const id = randomUUID();
  fillerIds.push(id);
  const row = { ...filler, id, token_hash: randomUUID(), home: null, seen: 0 };
  insert.run(...cols.map((k) => row[k]));
}
const full = await a.api('/api/game', {
  action: 'move-town',
  destination: old,
  key: active.town.key,
  home: 4,
  fromTown: next,
  membership: source.resident.townJoinedAt,
});
assert.equal(full.status, 409);
assert.equal((await a.ok()).town.id, next);
assert.equal((await a.ok()).resident.coins, 8000);
const late = client('Late Neighbor');
const registered = await late.api('/api/auth/sign-up/email', {
  name: 'Late Neighbor',
  email: `do-late-${stamp}@example.com`,
  password: 'Testing three durable towns 42!',
});
assert.equal(registered.status, 200);
assert.equal(
  (
    await late.api('/api/game', {
      action: 'join',
      mode: 'key',
      key: active.town.key,
      name: 'Late Neighbor',
    })
  ).status,
  409,
);
for (const id of fillerIds)
  oldDb.prepare('DELETE FROM residents WHERE id=?').run(id);
assert.equal(
  (
    await late.api('/api/game', {
      action: 'join',
      mode: 'key',
      key: active.town.key,
      name: 'Late Neighbor',
    })
  ).status,
  200,
  'A failed full-town join must not strand the account',
);
// Twenty overlapping requests remain isolated across the two actors.
const reads = await Promise.all(
  Array.from({ length: 20 }, (_, i) => (i % 2 ? a : c).ok()),
);
for (let i = 0; i < reads.length; i++)
  assert.equal(reads[i].town.id, i % 2 ? next : old);
// A session revoked on another request cannot reuse a previously issued ticket.
const oldCookies = [...a.cookies];
assert.equal((await a.api('/api/auth/sign-out', {})).status, 200);
a.cookies.clear();
for (const [k, v] of oldCookies) a.cookies.set(k, v);
assert.equal((await a.api()).status, 401);
console.log(
  'PASS: distinct SQLite towns; concurrent home claims; no D1 world authority; preserved progress; failed reservation safety; recoverable interrupted transfer; concurrent opposite transfers; stale movement/chat rejection; friends and DMs; persisted session revocation; shared mower rewards; 24-hour regrowth; device takeover.',
);
oldDb.close();
nextDb.close();
d1.close();
