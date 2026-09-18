import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { COMMUNITY_BUILDINGS } from '../app/game/communityBuildings.ts';
import { SQUARE_LOTS } from '../app/game/communitySquare.ts';
import {
  townBuildings,
  townLayout,
  plotOccupied,
  locationOf,
  marketStalls,
} from '../app/game/charters.ts';
import {
  BUILDINGS,
  entrance,
  isTownBlocked,
  HOME_LOTS,
} from '../app/game/townLayout.ts';
import {
  placementError,
  initialPlacement,
  overlaps,
} from '../app/game/placement.ts';
import { readPlanning, planningAction, validatePlan } from '../db/planning.ts';
import { findPath } from '../app/game/pathfinding.ts';
import {
  STATIONS,
  workStations,
  WORK_TARGETS,
} from '../app/game/workTargets.ts';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const f of readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql') && Number(f.slice(0, 4)) <= 15)
  .sort())
  sqlite.exec(readFileSync('drizzle/' + f, 'utf8'));
sqlite.exec(
  "INSERT INTO towns(id,name,created,treasury) VALUES('old','Existing town',0,9000)",
);
sqlite.exec(readFileSync('drizzle/0020_tired_nehzno.sql', 'utf8'));
assert.equal(
  sqlite.prepare("SELECT square_version FROM towns WHERE id='old'").get()
    .square_version,
  0,
);
assert.equal(
  sqlite.prepare("SELECT treasury FROM towns WHERE id='old'").get().treasury,
  9000,
);
const d = {
  prepare(sql) {
    const stmt = sqlite.prepare(sql);
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
    sqlite.exec('BEGIN');
    try {
      const results = statements.map((s) => s.execute());
      sqlite.exec('COMMIT');
      return results;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
};

const now = Date.parse('2026-09-10T12:00:00Z'),
  week = 7 * 86400000;
sqlite.exec(
  "INSERT INTO towns(id,name,created,treasury,square_version) VALUES('new','New town',0,9000,1)",
);
const mayor = {
    id: 'mayor',
    town_id: 'new',
    name: 'Mayor',
    job: 'mow',
    home: 0,
  },
  neighbor = { ...mayor, id: 'neighbor', name: 'Neighbor', home: 1 },
  outsider = { ...mayor, id: 'outsider', town_id: 'old' };
for (const r of [mayor, neighbor, outsider])
  sqlite
    .prepare(
      'INSERT INTO residents(id,token_hash,town_id,name,color,job,home,seen,created) VALUES(?,?,?,?,?,?,?,?,0)',
    )
    .run(r.id, r.id, r.town_id, r.name, '#fff', r.job, r.home, now);
sqlite.exec(
  "INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at) VALUES('new','2026-08','mayor',1)",
);
sqlite.exec(
  "INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) VALUES('new','2026-08','neighbor','mayor',1)",
);
const legacy = await readPlanning(d, 'old', 'outsider', now),
  state = await readPlanning(d, 'new', 'mayor', now);
assert.deepEqual(
  townBuildings(legacy).find((b) => b.id === 'school'),
  BUILDINGS.find((b) => b.id === 'school'),
);
assert.equal(legacy.squareVersion, 0);
assert.equal(state.squareVersion, 1);
assert.equal(COMMUNITY_BUILDINGS.length, 12);
assert.equal(SQUARE_LOTS.length, 4);
assert.deepEqual(
  workStations(legacy),
  STATIONS,
  'Existing towns keep their supply stand',
);
const stand = workStations(state).find((s) => s.id === 'supplies');
const postDoor = entrance(townBuildings(state).find((b) => b.id === 'post'));
assert.ok(
  Math.hypot(stand.x - postDoor.x, stand.z - postDoor.z) <= 2.1,
  'Supplies sit beside the new Post Office',
);
assert.equal(new Set(COMMUNITY_BUILDINGS.map((b) => b.id)).size, 12);
for (const b of COMMUNITY_BUILDINGS)
  assert.ok(b.job && b.work && b.activity && b.outcome && b.future);
const buildings = townBuildings(state),
  blocked = (x, z) => isTownBlocked(x, z, townLayout(state));
assert.ok(!blocked(0, 6), 'Arrival point is open');
assert.ok(!blocked(0.6, 6), 'New arrivals can move immediately');
for (let z = 3; z <= 12; z += 0.5)
  assert.ok(!blocked(0, z), 'Market keeps the central walkway open');
const general = buildings.find((b) => b.id === 'general');
const post = buildings.find((b) => b.id === 'post');
assert.equal(
  buildings.find((b) => b.id === 'clothing').z,
  buildings.find((b) => b.id === 'cafe').z,
);
assert.equal(buildings.find((b) => b.id === 'gardenclub').z, general.z);
assert.ok(
  post.z - post.depth / 2 - (general.z + general.depth / 2) >= 4,
  'Post Office corner has a generous passage',
);
for (const b of buildings) {
  const door = entrance(b);
  assert.ok(!blocked(door.x, door.z), b.name + ' entrance');
  assert.ok(
    findPath({ x: 0, z: -5 }, door, blocked).length,
    b.name + ' reachable',
  );
  for (const other of buildings.filter((v) => v.id !== b.id))
    assert.ok(!overlaps(b, other, 0.25), b.name + ' spaced from ' + other.name);
}
for (const target of WORK_TARGETS)
  assert.ok(!blocked(target.x, target.z), target.id + ' remains accessible');
for (const station of workStations(state))
  assert.ok(!blocked(station.x, station.z), station.title + ' reachable');
for (const stall of marketStalls(state))
  assert.ok(
    !buildings.some((b) => overlaps({ ...stall, width: 3, depth: 2 }, b)),
    'Market stays clear of buildings',
  );
for (const h of HOME_LOTS)
  assert.ok(
    !buildings.some((b) => overlaps({ ...h, width: 8, depth: 8.4 }, b)),
    'Residents keep their homes',
  );
for (const lot of SQUARE_LOTS)
  for (const building of COMMUNITY_BUILDINGS) {
    const choice = {
      kind: 'build',
      institution: null,
      option: building.id,
      fromPlot: lot.id,
    };
    assert.equal(
      placementError(state, choice, initialPlacement(state, choice)),
      null,
      building.name + ' fits ' + lot.name,
    );
    assert.ok(
      placementError(state, choice, {
        ...initialPlacement(state, choice),
        x: lot.x + 1,
      }),
    );
    assert.ok(
      placementError(state, choice, {
        ...initialPlacement(state, choice),
        rotation: (lot.rotation + 90) % 360,
      }),
    );
    assert.ok(
      'error' in validatePlan(legacy, choice),
      'Legacy towns cannot reserve absent lots',
    );
  }
const draft = {
  action: 'plan-propose',
  kind: 'build',
  option: 'bakery',
  fromPlot: SQUARE_LOTS[0].id,
};
assert.equal((await planningAction(d, neighbor, draft, now)).status, 403);
assert.equal(await planningAction(d, mayor, draft, now), null);
let p = (await readPlanning(d, 'new', 'mayor', now)).proposals[0];
assert.equal(p.fromPlot, SQUARE_LOTS[0].id);
assert.equal(
  sqlite.prepare("SELECT treasury FROM towns WHERE id='new'").get().treasury,
  9000,
);
assert.equal(
  (await planningAction(d, mayor, draft, now)).status,
  409,
  'Only one active project',
);
assert.equal(
  (
    await planningAction(
      d,
      outsider,
      { action: 'plan-vote', plan: p.id, vote: true },
      now,
    )
  ).status,
  409,
);
for (const r of [mayor, neighbor])
  assert.equal(
    await planningAction(
      d,
      r,
      { action: 'plan-vote', plan: p.id, vote: true },
      now,
    ),
    null,
  );
assert.equal(
  (
    await planningAction(
      d,
      mayor,
      { action: 'plan-place', plan: p.id, ...SQUARE_LOTS[0] },
      now,
    )
  ).status,
  409,
  'Approval and funding required',
);
p = (await readPlanning(d, 'new', 'mayor', now + week)).proposals[0];
assert.equal(p.status, 'approved');
assert.equal(
  await planningAction(
    d,
    mayor,
    { action: 'plan-fund', plan: p.id, funded: 0, amount: p.cost },
    now + week,
  ),
  null,
);
const ready = await readPlanning(d, 'new', 'mayor', now + week);
p = ready.proposals[0];
assert.equal(p.status, 'ready');
const site = initialPlacement(ready, p);
assert.equal(
  (
    await planningAction(
      d,
      mayor,
      { action: 'plan-place', plan: p.id, ...site, x: site.x + 1 },
      now + week,
    )
  ).status,
  400,
  'Cannot move a voted lot',
);
assert.equal(
  await planningAction(
    d,
    mayor,
    { action: 'plan-place', plan: p.id, ...site },
    now + week,
  ),
  null,
);
const done = await readPlanning(d, 'new', 'mayor', now + week);
assert.ok(plotOccupied(p.fromPlot, done));
assert.equal(done.buildings[0].plot, p.fromPlot);
const built = townBuildings(done).find((b) => b.id === `site-${p.fromPlot}`);
assert.equal(built.modelWidth, 7, 'Built width matches the voted preview');
assert.equal(built.modelDepth, 4, 'Built depth matches the voted preview');
assert.deepEqual(locationOf(done.buildings[0]), {
  ...site,
  name: 'Custom town site',
});
assert.ok(
  'error' in validatePlan(done, draft),
  'Occupied lot cannot be sold twice',
);
assert.equal(
  (
    await planningAction(
      d,
      mayor,
      { action: 'plan-place', plan: p.id, ...site },
      now + week,
    )
  ).status,
  409,
  'Placement is idempotent',
);
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
console.log(
  'PASS: legacy migration, inward-facing accessible square, preserved homes/stations, 48 lot/building choices, locked sites, owner permissions, town isolation, votes, funding, and duplicate protection.',
);
