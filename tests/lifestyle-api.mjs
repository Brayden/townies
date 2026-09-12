import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { WORK_TARGETS, STATIONS } from '../app/game/workTargets.ts';
import { dayStart, DAY_MS, parcelHomes } from '../app/game/lifestyle.ts';
const base = process.env.TOWNIES_TEST_URL ?? 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))
  throw new Error('Disposable local towns only.');
const prefix = `lifestyle-${Date.now()}`;
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
let a = await ok('a', 'join', { mode: 'private', name: 'Lifestyle Resident' });
a = await ok('a', 'setup', { home: 0, job: 'deliver' });
await ok('b', 'join', { mode: 'key', key: a.town.key, name: 'Same Town' });
let b = await ok('b', 'setup', { home: 1, job: 'paper' });
await ok('c', 'join', { mode: 'private', name: 'Separate Town' });
const c = await ok('c', 'setup', { home: 0, job: 'deliver' });
assert.equal(a.parcelHomes.length, 38);
assert.deepEqual(a.parcelHomes, b.parcelHomes);
assert.equal(a.parcelResets, dayStart(Date.now()) + DAY_MS);
assert.equal(a.resident.house, 'meadow-1');
assert.equal(a.resident.upkeepDue, 0);
assert.equal(
  (await game('a', 'house', { house: 'pearl-5', coins: 999999, price: 0 }))
    .status,
  409,
);
assert.equal((await game('a', 'bike', { active: true })).status, 409);
local(
  `UPDATE residents SET coins=30000 WHERE id IN ('${a.resident.id}','${b.resident.id}')`,
);
a = await ok('a', 'house', { house: 'rose-4' });
assert.equal(a.resident.house, 'rose-4');
assert.equal(a.resident.coins, 24300);
assert.ok(a.resident.upkeepDue > Date.now() + 27 * DAY_MS);
const due = a.resident.upkeepDue;
b = await ok('b');
assert.equal(b.properties.find((p) => p.home === 0).house, 'rose-4');
assert.equal((await game('a', 'move-home', { home: 1 })).status, 409);
const movers = await Promise.all([
  game('a', 'move-home', { home: 2 }),
  game('b', 'move-home', { home: 2 }),
]);
assert.deepEqual(movers.map((r) => r.status).sort(), [200, 409]);
a = await ok('a');
assert.equal(a.resident.house, 'rose-4');
assert.equal(a.resident.upkeepDue, due);
a = await ok('a', 'buy', { item: 'bike' });
a = await ok('a', 'bike', { active: true });
assert.equal(a.resident.riding, true);
assert.equal(
  (await ok('b')).peers.find((p) => p.id === a.resident.id).riding,
  1,
);
a = await ok('a', 'shift', { job: 'deliver' });
assert.equal(a.resident.riding, false);
assert.equal((await game('a', 'bike', { active: true })).status, 409);
await ok('a', 'shift', { job: null });
a = await ok('a', 'wardrobe', { item: 'suit-midnight' });
const afterSuit = a.resident.coins;
a = await ok('a', 'wardrobe', { item: 'suit-midnight' });
assert.equal(a.resident.coins, afterSuit);
a = await ok('a', 'wardrobe', { item: 'hat-top' });
a = await ok('a', 'wardrobe', { item: 'accessory-glasses' });
const peer = (await ok('b')).peers.find((p) => p.id === a.resident.id);
assert.equal(peer.outfit, 'suit-midnight');
assert.equal(peer.hat, 'hat-top');
assert.equal(peer.accessory, 'accessory-glasses');
const beforeMaintenance = a.resident.coins;
local(
  `UPDATE residents SET upkeep_due=${Date.now() - 1} WHERE id='${a.resident.id}'`,
);
const paid = await Promise.all([ok('a'), ok('b')]);
a = await ok('a');
assert.equal(a.resident.coins, beforeMaintenance - 240);
assert.equal(a.resident.house, 'rose-4');
local(
  `UPDATE residents SET upkeep_due=${Date.now() - 1},coins=0 WHERE id='${a.resident.id}'`,
);
a = await ok('a');
assert.equal(a.resident.house, 'rose-3');
assert.equal(a.resident.coins, 0);
a = await ok('a');
assert.equal(a.resident.house, 'rose-3', 'No duplicate downgrade');
local(`UPDATE residents SET coins=5000 WHERE id='${a.resident.id}'`);
const supply = STATIONS.find((s) => s.id === 'supplies');
local(
  `UPDATE residents SET x=${supply.x},z=${supply.z} WHERE id='${a.resident.id}'`,
);
await ok('a', 'buy', { item: 'delivery-crate' });
await ok('a', 'shift', { job: 'deliver' });
a = await ok('a', 'refill', { station: 'supplies' });
assert.equal(a.resident.parcels, 12);
const eligible = WORK_TARGETS.find(
    (t) => t.job === 'deliver' && a.parcelHomes.includes(t.home),
  ),
  ineligible = WORK_TARGETS.find(
    (t) => t.job === 'deliver' && !a.parcelHomes.includes(t.home),
  );
local(
  `UPDATE residents SET x=${ineligible.x},z=${ineligible.z} WHERE id='${a.resident.id}'`,
);
assert.equal(
  (await game('a', 'use', { target: ineligible.id, eligible: true })).status,
  409,
);
local(
  `UPDATE residents SET x=${eligible.x},z=${eligible.z} WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'use', { target: eligible.id });
assert.equal(a.resident.parcels, 11);
assert.equal(a.workReward.coins, 8);
assert.equal((await game('a', 'use', { target: eligible.id })).status, 409);
assert.ok((await ok('b')).worldWork.some((w) => w.id === eligible.group));
local(
  `UPDATE world_work SET completed=${dayStart(Date.now()) - 1} WHERE key='${a.town.id}:${eligible.group}'`,
);
a = await ok('a');
assert.ok(!a.worldWork.some((w) => w.id === eligible.group));
a = await ok('a', 'use', { target: eligible.id });
assert.equal(
  a.resident.parcels,
  10,
  'New calendar day resets parcel eligibility even within 24 hours',
);
await ok('a', 'buy', { item: 'cleanup-bag' });
await ok('a', 'shift', { job: 'clean' });
const litter = WORK_TARGETS.find((t) => t.job === 'clean');
local(
  `UPDATE residents SET x=${litter.x},z=${litter.z},bag=15 WHERE id='${a.resident.id}'`,
);
a = await ok('a', 'use', { target: litter.id });
assert.equal(a.resident.bag, 16);
assert.equal((await game('a', 'use', { target: litter.id })).status, 409);
async function chat(who, channel, body) {
  const response = await fetch(base + '/api/chat?channel=' + channel, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(who ? { 'oai-authenticated-user-id': prefix + who } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify({ channel, ...body }) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
assert.equal((await chat(null, 'town')).status, 401);
assert.equal((await chat('b', 'deliver')).status, 403);
const message = {
  id: crypto.randomUUID(),
  text: 'Hello neighbors! <script>plain text</script>',
};
assert.equal((await chat('a', 'town', message)).status, 200);
assert.equal(
  (await chat('a', 'town', message)).status,
  200,
  'Retry does not duplicate',
);
let shared = await chat('b', 'town');
assert.equal(shared.data.messages.length, 1);
assert.equal(shared.data.messages[0].name, a.resident.name);
assert.equal(shared.data.messages[0].text, message.text);
assert.equal((await chat('c', 'town')).data.messages.length, 0);
assert.equal(
  (await chat('a', 'town', { id: crypto.randomUUID(), text: 'Too fast' }))
    .status,
  429,
);
assert.equal(
  (await chat('a', 'town', { id: crypto.randomUUID(), text: 'x'.repeat(301) }))
    .status,
  400,
);
assert.equal(
  (
    await chat('a', 'paper', {
      id: crypto.randomUUID(),
      text: 'Spoofed channel',
    })
  ).status,
  403,
);
local(
  `UPDATE chat_messages SET created=${Date.now() - 3000} WHERE resident_id='${a.resident.id}'`,
);
assert.equal(
  (
    await chat('a', 'deliver', {
      id: crypto.randomUUID(),
      text: 'Parcel route is looking tidy.',
    })
  ).status,
  200,
);
assert.equal((await chat('a', 'deliver')).data.messages.length, 1);
assert.equal((await chat('c', 'deliver')).data.messages.length, 0);
await ok('b', 'job', { job: 'deliver' });
assert.equal((await chat('b', 'deliver')).data.messages.length, 1);
console.log(
  'PASS: live Worker shared home appearance, vacant-lot races, exact upkeep charges and degradation, visible wardrobe/bikes, paid supply upgrades, town/day parcel eligibility, daily reset, enlarged trash bag, persistent chat, retry deduplication, rate limits, profession access, and cross-town isolation.',
);
