import assert from 'node:assert/strict';
import { diff, applyPatch } from '../shared/town-wire.ts';
const before = {
  peers: [
    { id: 'a', x: 1 },
    { id: 'b', x: 3 },
  ],
  grassHistory: Array.from({ length: 4000 }, (_, i) => ({
    cell: String(i),
    cut_at: 1,
  })),
  lawnCuts: ['a', 'b'],
  room: null,
};
const after = structuredClone(before);
after.peers[1].x = 9;
after.grassHistory.push({ cell: '4000', cut_at: 2 });
after.lawnCuts.shift();
after.room = { owner: 'a', peers: [] };
const original = JSON.stringify(before),
  patch = diff(before, after);
assert.deepEqual(applyPatch(before, patch), after);
assert.equal(JSON.stringify(before), original);
assert.ok(JSON.stringify(patch).length < 500);
assert.throws(() =>
  applyPatch({}, [{ path: ['__proto__', 'polluted'], value: true }]),
);
for (let i = 0; i < 100; i++) {
  const a = { a: [i, { n: i + 1 }], b: { v: i } },
    b = { a: [i + 2, { n: i }, 'added'], c: null };
  assert.deepEqual(applyPatch(a, diff(a, b)), b);
}
console.log(
  'PASS: compact peer/grass deltas, array insertion/removal, immutable snapshots, nested fields, and prototype-path rejection.',
);
