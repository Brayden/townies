import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const base = 'http://localhost:3003',
  prefix = `social-${Date.now()}`;
async function api(who, path, body) {
  const response = await fetch(base + path, {
    headers: {
      'oai-authenticated-user-id': prefix + who,
      'Content-Type': 'application/json',
    },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function ok(who, path, body) {
  const v = await api(who, path, body);
  assert.equal(v.status, 200, JSON.stringify(v));
  return v.data;
}
const game = (who, action, body = {}) =>
  ok(who, '/api/game', action ? { action, ...body } : undefined);
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
let a = await game('a', 'join', { mode: 'private', name: 'Social Alice' });
a = await game('a', 'setup', { home: 0, job: 'mow' });
let b = await game('b', 'join', {
  mode: 'key',
  key: a.town.key,
  name: 'Social Bob',
});
b = await game('b', 'setup', { home: 1, job: 'paper' });
let c = await game('c', 'join', {
  mode: 'key',
  key: a.town.key,
  name: 'Social Cara',
});
c = await game('c', 'setup', { home: 2, job: 'garden' });
const social = (who, action, body = {}) =>
  ok(who, '/api/social', { action, town: a.town.id, ...body });
let s = await ok('a', '/api/social');
assert.ok(s.people.some((p) => p.id === b.resident.id));
assert.equal(s.access, 'nobody');
assert.equal(
  (await api('b', '/api/game', { action: 'home-visit', host: a.resident.id }))
    .status,
  403,
);
await social('a', 'request', { to: b.resident.id });
s = await ok('b', '/api/social');
assert.ok(s.friends.some((f) => f.requester === a.resident.id && !f.accepted));
await social('b', 'accept', { to: a.resident.id });
await social('a', 'access', { access: 'friends' });
await social('a', 'invite', { to: b.resident.id });
s = await ok('b', '/api/social');
assert.ok(s.invitations.some((i) => i.host === a.resident.id));
b = await game('b', 'home-visit', { host: a.resident.id, invitation: true });
assert.equal(b.room.owner, a.resident.id);
assert.equal(b.resident.inside, true);
assert.equal(b.resident.visitHost, a.resident.id);
assert.ok(b.room.peers.some((p) => p.id === b.resident.id));
assert.equal(
  (
    await api('b', '/api/game', {
      action: 'home-place',
      item: 'plant-flowers',
      x: 0,
      z: 0,
      rotation: 0,
      revision: b.resident.interiorRevision,
    })
  ).status,
  403,
);
assert.equal(
  (await api('c', '/api/game', { action: 'home-visit', host: a.resident.id }))
    .status,
  403,
);
// Host joins their own home and both residents see each other, including another floor.
local(
  `UPDATE residents SET x=-77.45,z=-69,house='meadow-3' WHERE id='${a.resident.id}'`,
);
// Use the real door coordinates instead of depending on the map layout.
const { HOMES } = await import('../app/game/data.ts');
const { homeDoor } = await import('../app/game/interiors.ts');
const door = homeDoor(HOMES[0]);
local(
  `UPDATE residents SET x=${door.x},z=${door.z} WHERE id='${a.resident.id}'`,
);
a = await game('a', 'home-enter', { home: 0 });
assert.ok(a.room.peers.some((p) => p.id === b.resident.id));
b = await game('b');
assert.ok(b.room.peers.some((p) => p.id === a.resident.id));
b = await game('b', 'heartbeat', {
  room: a.resident.id,
  roomRevision: b.resident.interiorRevision,
  indoorX: 2,
  indoorZ: 1,
  level: 1,
});
a = await game('a');
assert.equal(a.room.peers.find((p) => p.id === b.resident.id).level, 1);
assert.equal(a.room.peers.find((p) => p.id === b.resident.id).x, 2);
b = await game('b', 'life-emote', { gesture: 'wave' });
a = await game('a');
assert.equal(a.room.peers.find((p) => p.id === b.resident.id).emote, 'wave');
const id = crypto.randomUUID();
await social('a', 'message', { to: b.resident.id, text: 'Welcome over!', id });
await social('a', 'message', { to: b.resident.id, text: 'Welcome over!', id });
let dm = await ok('b', '/api/social?to=' + a.resident.id);
assert.equal(dm.messages.length, 1);
assert.equal(dm.messages[0].text, 'Welcome over!');
assert.equal((await api('c', '/api/social?to=' + a.resident.id)).status, 403);
await social('b', 'read', {
  to: a.resident.id,
  through: dm.messages[0].created,
});
assert.equal((await ok('b', '/api/social')).unread.length, 0);
await social('a', 'access', { access: 'nobody' });
b = await game('b');
assert.equal(b.resident.inside, false);
assert.equal(b.room, null);
await social('a', 'access', { access: 'everyone' });
c = await game('c', 'home-visit', { host: a.resident.id });
assert.equal(c.room.owner, a.resident.id);
c = await game('c', 'home-exit');
assert.equal(c.resident.x, door.x);
assert.equal(c.resident.z, door.z);
await social('a', 'remove', { to: b.resident.id });
assert.equal((await api('b', '/api/social?to=' + a.resident.id)).status, 403);
console.log(
  'PASS: real multiplayer API discovery, friends, invitations, visiting permissions, shared floor movement and gestures, owner-only editing, DM privacy and retries, read receipts, permission revocation and exits.',
);
