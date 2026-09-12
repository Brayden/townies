import assert from 'node:assert/strict';
import { GrassSync } from '../app/game/grassSync.ts';
const day = 86400000,
  now = 1800000000000;
const g = new GrassSync();
assert.equal(g.predict('a', now), true);
const first = g.movementSequence;
for (const delay of [2200, 5000, 30000, 180000]) {
  g.merge([]);
  assert.ok(
    g.isCut('a', now + delay),
    'Delayed/missing response cannot expire a prediction',
  );
}
assert.equal(g.predict('b', now + 500), true);
const second = g.movementSequence;
g.settle(first, [{ cell: 'a', cut_at: now + 1000 }]);
assert.deepEqual(
  [...g.cuts(now + 5000)].sort(),
  ['a', 'b'],
  'Acknowledgment keeps newer in-flight cuts hidden',
);
g.merge([]);
g.settle(first, []);
assert.ok(
  g.isCut('a', now + 6000),
  'Older snapshots cannot undo a confirmed cut',
);
assert.ok(g.isCut('b', now + 6000));
g.settle(second, [
  { cell: 'a', cut_at: now + 1000 },
  { cell: 'b', cut_at: now + 2000 },
]);
g.merge([{ cell: 'a', cut_at: now - day }]);
assert.equal(g.cutAt('a'), now + 1000);
assert.ok(g.isCut('b', now + 10000));
assert.ok(g.isCut('a', now + 1000 + day - 1));
assert.equal(
  g.isCut('a', now + 1000 + day),
  false,
  'Confirmed grass regrows at 24 hours',
);
assert.equal(g.nextRegrowth(now + day + 1000), now + day + 2000);
assert.equal(g.predict('a', now + day + 1001), true);
const recut = g.movementSequence;
g.merge([{ cell: 'a', cut_at: now + 1000 }]);
assert.ok(
  g.isCut('a', now + day + 9000),
  'Old cut timestamp does not acknowledge today’s new cut',
);
g.settle(recut, [{ cell: 'a', cut_at: now + day + 2000 }]);
assert.ok(g.isCut('a', now + 2 * day));
const corrected = new GrassSync();
corrected.predict('bad-path', now);
const rejected = corrected.movementSequence;
corrected.predict('new-path', now + 1);
corrected.settle(rejected, []);
assert.equal(
  corrected.isCut('bad-path', now + 2),
  false,
  'An authoritative correction restores genuinely unsaved grass',
);
assert.ok(corrected.isCut('new-path', now + 2));
const race = new GrassSync();
race.predict('early', now);
const early = race.movementSequence;
race.predict('late', now + 1);
race.settle(race.movementSequence, [
  { cell: 'early', cut_at: now + 2 },
  { cell: 'late', cut_at: now + 3 },
]);
race.settle(early, []);
assert.deepEqual([...race.cuts(now + 4000)].sort(), ['early', 'late']);
console.log(
  'PASS: slow and missing replies, stale snapshots, in-flight cuts, out-of-order acknowledgments, authoritative corrections, repeated mowing days, and exact 24-hour regrowth.',
);
