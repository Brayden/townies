import assert from 'node:assert/strict';
import {
  paperPose,
  paperDestination,
  PAPER_TIMING,
} from '../app/game/paperDelivery.ts';
import { HOMES } from '../app/game/data.ts';
import { isTownBlocked } from '../app/game/townLayout.ts';
for (const home of HOMES) {
  const origin = { x: home.x + 3.2, y: 1.35, z: home.z + 3 },
    destination = paperDestination(home);
  assert.deepEqual(paperPose(0, origin, home).position, origin);
  assert.deepEqual(
    paperPose(PAPER_TIMING.impact, origin, home).position,
    destination.door,
  );
  assert.deepEqual(
    paperPose(PAPER_TIMING.end, origin, home).position,
    destination.porch,
  );
  assert.equal(paperPose(PAPER_TIMING.end - 1, origin, home).landed, false);
  assert.equal(paperPose(PAPER_TIMING.end, origin, home).landed, true);
  assert.equal(
    paperPose(PAPER_TIMING.end + 500, origin, home).phase,
    'settled',
  );
  assert.ok(
    paperPose(PAPER_TIMING.impact, origin, home).scale.y < 1,
    'Door impact compresses the folded paper',
  );
  const hop = paperPose(
    (PAPER_TIMING.drop + PAPER_TIMING.land) / 2,
    origin,
    home,
  );
  assert.ok(
    hop.position.y > destination.porch.y,
    'A small porch bounce follows the door bounce',
  );
  for (const boundary of [
    PAPER_TIMING.release,
    PAPER_TIMING.impact,
    PAPER_TIMING.drop,
    PAPER_TIMING.land,
    PAPER_TIMING.end,
  ]) {
    const before = paperPose(boundary - 0.01, origin, home),
      after = paperPose(boundary, origin, home);
    assert.ok(
      Math.hypot(
        before.position.x - after.position.x,
        before.position.y - after.position.y,
        before.position.z - after.position.z,
      ) < 0.002,
      'No position jump at a phase transition',
    );
  }
  for (let time = 0; time < 1500; time += 10) {
    const pose = paperPose(time, origin, home);
    assert.ok(Object.values(pose.position).every(Number.isFinite));
    assert.ok(pose.position.y >= destination.porch.y - 0.001);
  }
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const start = {
      x: home.x + 2.65 + Math.cos(angle) * 1.8,
      y: 1.35,
      z: home.z + 2.1 + Math.sin(angle) * 1.8,
    };
    if (isTownBlocked(start.x, start.z)) continue;
    for (let time = 100; time <= PAPER_TIMING.impact; time += 10) {
      const q = paperPose(time, start, home).position;
      assert.ok(
        !(
          Math.abs(q.x - home.x) < 2.15 &&
          Math.abs(q.z - home.z) < 1.75 &&
          q.y < 2.8
        ),
        'Side-on mailbox throws must not cut through cottage walls',
      );
    }
  }
  const reduced = paperPose(220, origin, home, true);
  assert.equal(reduced.landed, true);
  assert.deepEqual(reduced.position, destination.porch);
  assert.deepEqual(reduced.rotation, { x: 0, y: 0.25, z: 0 });
}
// A flight uses a captured release point, so further rider movement cannot drag its trajectory.
const captured = { x: 3, y: 1.35, z: 4 },
  home = { x: 0, z: 0 };
const pose = paperPose(400, captured, home);
assert.deepEqual(paperPose(400, { ...captured }, home), pose);
console.log(
  'PASS: all 50 doors/porches, continuous flight phases, door impact, bounce and settle, no wall crossing from reachable mailbox approaches, no below-porch clipping, stable release origin, and reduced-motion landing.',
);
