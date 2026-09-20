import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { publicTownPage, townSummary } from '../db/townDirectory.ts';
import { ACTIVITY_WINDOW_MS, townAge } from '../shared/town-directory.ts';
const sql = new DatabaseSync(':memory:');
for (const f of readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 4)) <= 15)
  .sort())
  sql.exec(readFileSync('drizzle/' + f, 'utf8'));
const now = Date.parse('2026-09-18T12:00:00Z');
sql
  .prepare('INSERT INTO towns(id,name,private,created) VALUES(?,?,?,?)')
  .run('home', 'Home', 0, 1);
sql
  .prepare(
    'INSERT INTO residents(id,token_hash,town_id,name,color,seen,created,move_updated) VALUES(?,?,?,?,?,?,?,?)',
  )
  .run(
    'legacy',
    'legacy',
    'home',
    'Legacy',
    '#fff',
    0,
    now - 86400000 * 10,
    now - 3600000,
  );
sql.exec(readFileSync('drizzle/0020_town_activity.sql', 'utf8'));
assert.equal(
  sql.prepare('SELECT last_active FROM residents').get().last_active,
  now - 3600000,
  'Migration recovers movement after old disconnects',
);
const d = {
  prepare(query) {
    let args = [];
    return {
      bind(...a) {
        args = a;
        return this;
      },
      async all() {
        return { results: sql.prepare(query).all(...args) };
      },
      async first() {
        return sql.prepare(query).get(...args) ?? null;
      },
    };
  },
};
for (let i = 0; i < 26; i++)
  sql
    .prepare('INSERT INTO towns(id,name,private,created) VALUES(?,?,?,?)')
    .run(
      `town-${String(i).padStart(2, '0')}`,
      `Town ${i}`,
      i === 25 ? 1 : 0,
      now - 86400000 * 40,
    );
function add(id, seen, town = 'town-00') {
  sql
    .prepare(
      'INSERT INTO residents(id,token_hash,town_id,name,color,seen,created) VALUES(?,?,?,?,?,?,?)',
    )
    .run(id, id, town, id, '#fff', seen, 1);
}
add('online', now);
add('offline', now - 3600000);
add('edge', now - ACTIVITY_WINDOW_MS);
add('old', now - ACTIVITY_WINDOW_MS - 1);
add('never', 0);
add('other', now, 'town-01');
sql.exec("UPDATE residents SET seen=0 WHERE id='offline'");
sql
  .prepare('UPDATE residents SET seen=? WHERE id=?')
  .run(now - 7200000, 'offline');
assert.equal(
  sql.prepare("SELECT last_active FROM residents WHERE id='offline'").get()
    .last_active,
  now - 3600000,
  'Stale presence cannot regress activity',
);
sql.exec("UPDATE residents SET seen=0 WHERE id='offline'");
const stats = await townSummary(d, 'town-00', now);
assert.equal(stats.residents, 5);
assert.equal(stats.active72h, 3);
assert.equal(stats.online, 1);
assert.equal(stats.created, now - 40 * 86400000);
assert.ok(!('invite' in stats));
assert.equal(
  (await townSummary(d, 'town-00', now + 1)).active72h,
  2,
  '72h edge expires',
);
sql.exec("UPDATE residents SET town_id='home' WHERE id='offline'");
assert.equal(
  (await townSummary(d, 'town-00', now)).active72h,
  2,
  'Departed residents do not count',
);
let cursor;
const ids = [];
do {
  const page = await publicTownPage(d, 'home', cursor);
  assert.ok(page.towns.length <= 12);
  ids.push(...page.towns.map((t) => t.id));
  cursor = page.nextCursor;
} while (cursor);
assert.equal(ids.length, 25);
assert.equal(new Set(ids).size, 25);
assert.ok(!ids.includes('home') && !ids.includes('town-25'));
for (const cursor of [
  'bad',
  false,
  { created: -1, id: 'x' },
  { created: now, id: 2 },
])
  assert.equal((await publicTownPage(d, 'home', cursor)).status, 400);
assert.equal(townAge(now, now), 'Less than an hour');
assert.equal(townAge(now - 3600000, now), '1 hour');
assert.equal(townAge(now - 86400000, now), '1 day');
assert.equal(townAge(now - 40 * 86400000, now), '40 days');
assert.equal(townAge(now - 366 * 86400000, now), '1 year, 1 day');
sql.close();
console.log(
  'PASS: migration, offline activity, unique residents, 72-hour boundary, town isolation, public pagination, and town age.',
);
