// Game fixtures use town SQLite migrations; 0016+ are shared-directory migrations.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';
import { interiorAction } from '../db/interiors.ts';
import { moveTown } from '../db/moving.ts';
import { HOMES } from '../app/game/data.ts';
import { HOUSES } from '../app/game/lifestyle.ts';
import {
  FURNITURE,
  roomSize,
  floorCount,
  floorFinishes,
  stairwell,
  starterInterior,
  readInterior,
  firstFurnitureSpot,
  fittedFurniture,
  placementIssue,
  homeDoor,
  furnitureRect,
} from '../app/game/interiors.ts';
import {
  interiorKit,
  furnitureModel,
  staircaseModel,
  disposeGeometry,
} from '../app/game/interiorModels.ts';
import { EMPTY_PLANNING, townLayout } from '../app/game/charters.ts';
import { isTownBlocked } from '../app/game/townLayout.ts';
import { findPath } from '../app/game/pathfinding.ts';
const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for (const f of readdirSync(new URL('../drizzle/', import.meta.url))
  .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 4)) <= 15)
  .sort())
  sql.exec(readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'));
const d = {
  prepare(query) {
    const stmt = sql.prepare(query);
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
    sql.exec('BEGIN');
    try {
      const results = statements.map((s) => s.execute());
      sql.exec('COMMIT');
      return results;
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  },
};

const now = Date.now();
sql.exec(
  "INSERT INTO towns(id,name,created) VALUES('town','Town',0),('other','Other',0);INSERT INTO residents(id,token_hash,town_id,name,color,home,job,coins,seen,created) VALUES('a','a','town','Alice','#fff',0,'mow',1000,0,0),('b','b','town','Bob','#fff',1,'paper',1000,0,0)",
);
const row = (id) => sql.prepare('SELECT * FROM residents WHERE id=?').get(id),
  at = (id, p) =>
    sql.prepare('UPDATE residents SET x=?,z=? WHERE id=?').run(p.x, p.z, id),
  act = (id, action, body = {}) =>
    interiorAction(d, row(id), { action, ...body }, now);
assert.equal(
  (await act('a', 'home-enter', { home: 0 })).status,
  400,
  'Must visit the door',
);
at('a', homeDoor(HOMES[1]));
assert.equal(
  (await act('a', 'home-enter', { home: 1 })).status,
  403,
  'Own house only',
);
assert.equal(
  (
    await act('a', 'home-place', {
      item: 'plant-flowers',
      revision: 0,
      x: 0,
      z: 0,
      rotation: 0,
    })
  ).status,
  403,
);
at('a', homeDoor(HOMES[0]));
sql.exec(
  "UPDATE residents SET mowing=1,riding=1,shift='garden',action_target='garden-a',emote='wave' WHERE id='a'",
);
assert.equal(await act('a', 'home-enter', { home: 0 }), null);
assert.equal(row('a').inside, 1);
assert.equal(row('a').mowing, 0);
assert.equal(row('a').shift, null);
assert.equal(row('a').emote, null);
assert.equal(row('a').interior_revision, 1);
const current = readInterior(row('a').interior),
  spot = firstFurnitureSpot('plant-flowers', current.placed, row('a').house);
assert.ok(spot);
const buy = { item: 'plant-flowers', revision: 1, ...spot, price: 0 };
const results = await Promise.all([
  act('a', 'home-place', buy),
  act('a', 'home-place', buy),
]);
assert.equal(results.filter((v) => v === null).length, 1);
assert.equal(row('a').coins, 915);
assert.equal(
  readInterior(row('a').interior).owned.filter((i) => i === 'plant-flowers')
    .length,
  1,
);
let rev = row('a').interior_revision;
assert.equal(
  await act('a', 'home-store', { item: 'plant-flowers', revision: rev }),
  null,
);
let interior = readInterior(row('a').interior);
assert.ok(interior.owned.includes('plant-flowers'));
assert.ok(!interior.placed.some((p) => p.id === 'plant-flowers'));
assert.equal(
  await act('a', 'home-place', {
    ...buy,
    revision: row('a').interior_revision,
  }),
  null,
);
assert.equal(row('a').coins, 915, 'Moving and replacing owned items is free');
rev = row('a').interior_revision;
assert.equal(
  (await act('a', 'home-place', { ...buy, x: 100, revision: rev })).status,
  400,
);
assert.equal(
  (await act('a', 'home-place', { ...buy, x: NaN, revision: rev })).status,
  400,
);
assert.equal(
  (await act('a', 'home-place', { ...buy, rotation: 45, revision: rev }))
    .status,
  400,
);
assert.equal(
  (await act('a', 'home-place', { ...buy, x: 0, z: 3, revision: rev })).status,
  400,
  'Door cannot be blocked',
);
assert.equal(
  (await act('a', 'home-place', { ...buy, x: -3, z: -2, revision: rev }))
    .status,
  400,
  'Furniture cannot overlap bed',
);
assert.equal(
  await act('a', 'home-finish', {
    wall: 'rose',
    floor: 'walnut',
    revision: rev,
  }),
  null,
);
assert.equal(readInterior(row('a').interior).wall, 'rose');
assert.equal(row('a').coins, 915);
assert.equal(
  (
    await act('a', 'home-finish', {
      wall: 'arbitrary',
      floor: 'walnut',
      revision: row('a').interior_revision,
    })
  ).status,
  400,
);
assert.equal(
  (
    await act('b', 'home-finish', {
      wall: 'rose',
      floor: 'walnut',
      revision: 0,
    })
  ).status,
  403,
  'Another player cannot decorate through owner parameters',
);
sql.exec("UPDATE residents SET coins=0 WHERE id='a'");
const f = 'lamp-amber',
  pos = firstFurnitureSpot(
    f,
    readInterior(row('a').interior).placed,
    row('a').house,
  );
assert.equal(
  (
    await act('a', 'home-place', {
      item: f,
      ...pos,
      revision: row('a').interior_revision,
    })
  ).status,
  409,
);
assert.ok(!readInterior(row('a').interior).owned.includes(f));
const before = readInterior(row('a').interior);
await act('a', 'home-exit');
assert.equal(row('a').inside, 0);
assert.equal(row('a').x, homeDoor(HOMES[0]).x);
assert.equal(row('a').z, homeDoor(HOMES[0]).z);
assert.equal(
  await moveTown(
    d,
    row('a'),
    { fromTown: 'town', membership: 0, destination: 'other', home: 2 },
    now,
  ),
  null,
);
assert.deepEqual(readInterior(row('a').interior), before);
assert.equal(row('a').inside, 0);
const starter = starterInterior();
assert.equal(FURNITURE.length, 22);
assert.equal(starter.owned.length, 5);
assert.equal(fittedFurniture(starter, 'meadow-1').length, 5);
for (const house of HOUSES) {
  assert.ok(roomSize(house.id).width >= 8);
  assert.equal(fittedFurniture(starter, house.id).length, 5);
  for (const f of FURNITURE) {
    assert.ok(
      firstFurnitureSpot(f.id, [], house.id),
      `${f.id} fits ${house.id}`,
    );
  }
}
const packed = {
  ...starter,
  owned: [...starter.owned, 'shelf-books'],
  placed: [...starter.placed, { id: 'shelf-books', x: 6, z: -4, rotation: 0 }],
};
assert.equal(fittedFurniture(packed, 'meadow-5').length, 6);
assert.equal(fittedFurniture(packed, 'meadow-1').length, 5);
assert.equal(packed.placed.length, 6, 'Downgrade never deletes furniture');
const layout = townLayout(EMPTY_PLANNING),
  blocked = (x, z) => isTownBlocked(x, z, layout);
for (const h of HOMES) {
  const door = homeDoor(h);
  assert.equal(blocked(door.x, door.z), false, h.name);
  const path = findPath({ x: 0, z: 6 }, door, blocked);
  assert.ok(path.length, h.name);
  assert.ok(
    Math.hypot(path.at(-1).x - door.x, path.at(-1).z - door.z) < 1.8,
    h.name,
  );
}
// Story counts mirror the existing exterior: Nook/Cottage 1, House/Villa 2, Manor 3.
for (const h of HOUSES) {
  assert.equal(floorCount(h.id), 1 + Math.floor((h.level - 1) / 2));
  for (let level = 0; level < floorCount(h.id); level++) {
    for (const f of FURNITURE)
      assert.ok(firstFurnitureSpot(f.id, [], h.id, level));
    if (floorCount(h.id) > 1) {
      const w = stairwell(h.id);
      assert.match(
        placementIssue(
          {
            id: 'plant-fern',
            x: Math.round(w.x * 2) / 2,
            z: w.z,
            rotation: 0,
            level,
          },
          [],
          h.id,
        ),
        /stairs/,
      );
    }
  }
}
sql.exec(
  "UPDATE residents SET house='meadow-3',inside=1,interior='{}',interior_revision=0,coins=1000 WHERE id='b'",
);
assert.equal(
  await act('b', 'home-place', {
    item: 'bed-meadow',
    x: -3,
    z: -2,
    rotation: 0,
    level: 1,
    revision: 0,
  }),
  null,
);
let upstairs = readInterior(row('b').interior);
assert.ok(
  !fittedFurniture(upstairs, 'meadow-3', 0).some((p) => p.id === 'bed-meadow'),
);
assert.ok(
  fittedFurniture(upstairs, 'meadow-3', 1).some((p) => p.id === 'bed-meadow'),
);
assert.equal(row('b').coins, 1000, 'Moving upstairs costs nothing');
assert.equal(
  await act('b', 'home-finish', {
    wall: 'sky',
    floor: 'walnut',
    level: 1,
    revision: 1,
  }),
  null,
);
upstairs = readInterior(row('b').interior);
assert.equal(floorFinishes(upstairs, 0).wall, 'house');
assert.equal(floorFinishes(upstairs, 1).wall, 'sky');
assert.equal(
  (
    await act('b', 'home-place', {
      item: 'plant-fern',
      x: 0,
      z: 0,
      rotation: 0,
      level: 2,
      revision: 2,
    })
  ).status,
  400,
  'Cannot place on nonexistent third floor',
);
sql.exec("UPDATE residents SET house='meadow-1' WHERE id='b'");
upstairs = readInterior(row('b').interior);
assert.equal(fittedFurniture(upstairs, 'meadow-1', 1).length, 0);
assert.ok(upstairs.owned.includes('bed-meadow'));
assert.equal(
  floorFinishes(upstairs, 1).wall,
  'sky',
  'Downsizing preserves upper-floor finishes',
);
assert.equal(
  (
    await act('b', 'home-finish', {
      wall: 'rose',
      floor: 'oak',
      level: 1,
      revision: 2,
    })
  ).status,
  400,
);
assert.equal(
  await act('b', 'home-place', {
    item: 'bed-meadow',
    x: -3,
    z: -2,
    rotation: 0,
    level: 0,
    revision: 2,
  }),
  null,
  'Packed upstairs furniture can return downstairs',
);
sql.exec("UPDATE residents SET house='meadow-5' WHERE id='b'");
assert.equal(
  await act('b', 'home-place', {
    item: 'bed-meadow',
    x: -3,
    z: -2,
    rotation: 0,
    level: 2,
    revision: 3,
  }),
  null,
);
assert.equal(
  fittedFurniture(readInterior(row('b').interior), 'meadow-5', 2).length,
  1,
);
const legacy = readInterior(JSON.stringify(starterInterior()));
assert.equal(
  fittedFurniture(legacy, 'meadow-3').length,
  5,
  'Legacy layouts stay downstairs',
);
const kit = interiorKit();
for (const f of FURNITURE) {
  const g = furnitureModel(f, kit);
  const bounds = new THREE.Box3().setFromObject(g);
  assert.ok(bounds.min.y > -0.03, f.id);
  assert.ok(bounds.max.y < 2.9, f.id);
  assert.ok(bounds.max.x - bounds.min.x <= f.w + 0.02, f.id);
  assert.ok(bounds.max.z - bounds.min.z <= f.d + 0.02, f.id);
  disposeGeometry(g);
}
for (const count of [2, 3])
  for (let level = 0; level < count; level++) {
    const stairs = staircaseModel(kit, level, count),
      bounds = new THREE.Box3().setFromObject(stairs);
    assert.ok(bounds.max.y < 2.9);
    assert.ok(bounds.max.x - bounds.min.x < 2.1);
    assert.ok(bounds.max.z - bounds.min.z < 3.6);
    disposeGeometry(stairs);
  }
kit.dispose();
console.log(
  'PASS: 50 reachable own doors, private entry, job shutdown, starter furniture, atomic purchase and retry, free rearrangement/storage, invalid and blocked placements, finish persistence, insufficient funds, preserved furniture on moves/downgrades, all 50 house sizes and 22 models.',
);
