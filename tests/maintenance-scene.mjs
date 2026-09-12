import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import {
  MAINTENANCE_TARGETS,
  maintenanceApproach,
  sweptStreet,
  workDuration,
} from '../app/game/maintenance.ts';
import { isTownBlocked } from '../app/game/townLayout.ts';
import { findPath } from '../app/game/pathfinding.ts';
import { WORK_DAY_MS } from '../app/game/workTargets.ts';
await mkdir('outputs/maintenance-qa', { recursive: true });
await build({
  stdin: {
    contents: `export {maintenanceScenery,maintenanceEquipment} from './app/game/maintenanceScenery';export {default as JobDock} from './app/game/JobDock';export {default as MiniMap} from './app/game/MiniMap';export {EMPTY_PLANNING} from './app/game/charters';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  outfile: 'outputs/maintenance-qa/test.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  banner: {
    js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);",
  },
  external: ['react', 'react-dom', 'three'],
});
const {
  maintenanceScenery,
  maintenanceEquipment,
  JobDock,
  MiniMap,
  EMPTY_PLANNING,
} = await import('../outputs/maintenance-qa/test.mjs');
assert.equal(
  new Set(MAINTENANCE_TARGETS.map((t) => t.id)).size,
  MAINTENANCE_TARGETS.length,
);
for (const job of ['sweep', 'wash', 'trim', 'rake']) {
  const targets = MAINTENANCE_TARGETS.filter((t) => t.job === job);
  assert.ok(targets.length >= 35);
  assert.ok(targets.every((t) => !isTownBlocked(t.x, t.z)));
  for (
    let i = 0;
    i < targets.length;
    i += Math.max(1, Math.floor(targets.length / 16))
  ) {
    const t = targets[i],
      approach = maintenanceApproach(t, { x: 0, z: 6 });
    assert.ok(Math.hypot(approach.x - t.x, approach.z - t.z) < 1.9);
    assert.ok(
      findPath({ x: 0, z: 6 }, approach, isTownBlocked).length > 0,
      `${t.id} has a reachable approach`,
    );
  }
}
// Fast sweep lookup must match an independent full geometric scan.
for (let i = 0; i < 100; i++) {
  const ax = -57 + ((i * 13.41) % 114),
    az = -51 + ((i * 6.31) % 102),
    bx = ax + Math.sin(i) * 5,
    bz = az + Math.cos(i) * 5,
    dx = bx - ax,
    dz = bz - az;
  const expected = MAINTENANCE_TARGETS.filter((t) => {
    const f = Math.max(
      0,
      Math.min(1, ((t.x - ax) * dx + (t.z - az) * dz) / (dx * dx + dz * dz)),
    );
    return (
      t.job === 'sweep' &&
      Math.hypot(t.x - ax - f * dx, t.z - az - f * dz) <= 1.2
    );
  })
    .map((t) => t.id)
    .sort();
  assert.deepEqual(
    sweptStreet(ax, az, bx, bz)
      .map((t) => t.id)
      .sort(),
    expected,
  );
}
assert.deepEqual(sweptStreet(0, 0, 0, 0), []);
const scene = new THREE.Scene(),
  art = maintenanceScenery(scene, isTownBlocked),
  meshes = scene.children;
for (const job of ['wash', 'trim', 'rake']) {
  const t = MAINTENANCE_TARGETS.find((t) => t.job === job);
  const ray = new THREE.Ray(
    new THREE.Vector3(t.x, 10, t.z),
    new THREE.Vector3(0, -1, 0),
  );
  assert.equal(art.pick(ray, job, new Set())?.id, t.id);
  assert.equal(art.pick(ray, job, new Set([t.id])), undefined);
}
assert.equal(
  meshes.length,
  6,
  'All scenery is rendered in six instance batches',
);
const matrix = new THREE.Matrix4(),
  scale = new THREE.Vector3();
function visible(mesh, start = 0, count = mesh.count) {
  let n = 0;
  for (let i = start; i < start + count; i++) {
    mesh.getMatrixAt(i, matrix);
    scale.setFromMatrixScale(matrix);
    if (scale.length() > 0.01) n++;
  }
  return n;
}
let now = 1_800_000_000_000;
art.update([], [], now);
const versions = () => meshes.map((m) => m.instanceMatrix.version);
const stable = versions();
art.update([], [], now + 60000);
assert.deepEqual(
  versions(),
  stable,
  'Idle scenery does not rewrite or upload instance buffers',
);
art.update([{ id: 'paper-unrelated', completed: now }], [], now + 61000);
assert.deepEqual(
  versions(),
  stable,
  'Other professions do not upload maintenance scenery',
);
const washTarget = MAINTENANCE_TARGETS.find((t) => t.job === 'wash');
art.update(
  [],
  [
    {
      shift: 'wash',
      wateringTarget: washTarget.id,
      wateringStarted: now - 1000,
    },
  ],
  now + 1,
);
assert.notDeepEqual(versions(), stable, 'Starting work updates immediately');
const workingVersion = versions();
art.update([], [], now + 2);
assert.notDeepEqual(
  versions(),
  workingVersion,
  'Cancelling work resets partial art immediately',
);

const jobs = {
  wash: { mesh: meshes[1], pieces: 12 },
  sweep: { mesh: meshes[2], pieces: 4 },
  trim: { mesh: meshes[4], pieces: 7 },
  rake: { mesh: meshes[5], pieces: 14 },
};
for (const [job, { mesh, pieces }] of Object.entries(jobs)) {
  const target = MAINTENANCE_TARGETS.find((t) => t.job === job);
  assert.equal(visible(mesh, 0, pieces), pieces);
  if (job === 'wash') {
    now += 400;
    art.update(
      [],
      [
        {
          shift: job,
          wateringTarget: target.id,
          wateringStarted: now - workDuration(job) * 0.5,
        },
      ],
      now,
    );
    assert.ok(
      visible(mesh, 0, pieces) > 0 && visible(mesh, 0, pieces) < pieces,
      'Spray reveals individual clean strips before completion',
    );
  }
  now += 400;
  const work = [{ id: target.id, completed: now }];
  art.update(work, [], now);
  assert.equal(visible(mesh, 0, pieces), 0, `${job} visibly clears`);
  art.update(work, [], now + WORK_DAY_MS - 1);
  assert.equal(visible(mesh, 0, pieces), 0, 'Completion lasts 24h');
  art.update(work, [], now + WORK_DAY_MS + 300);
  assert.equal(visible(mesh, 0, pieces), pieces, 'Work returns after 24h');
  now += WORK_DAY_MS + 600;
  art.update([], [], now);
}
const avatar = new THREE.Group(),
  equipment = maintenanceEquipment(avatar);
for (const shift of ['sweep', 'wash', 'trim', 'rake']) {
  equipment.update(shift, true, true, now);
  assert.equal(
    avatar.children[0].children.filter((g) => g.visible).length,
    1,
    'Only current equipment is visible',
  );
}
equipment.update(null, false, false, now);
assert.equal(avatar.children[0].children.filter((g) => g.visible).length, 0);
for (const shift of [
  'sweep',
  'wash',
  'trim',
  'rake',
  'garden',
  'paper',
  'clean',
  'deliver',
]) {
  const resident = {
    id: 'local',
    name: 'Local',
    job: shift,
    shift,
    x: 0,
    z: 6,
    items: [],
    mowing: false,
    papers: 12,
    water: 8,
    bag: 0,
    parcels: 6,
    wateringTarget: null,
  };
  const dock = renderToStaticMarkup(
    React.createElement(JobDock, {
      resident,
      busy: false,
      patches: 0,
      coins: 0,
      completed: 0,
      waterProgress: 0,
      onFindNext() {},
      onVisitStation() {},
      onFinish() {},
      onAction() {},
      canAction: true,
    }),
  );
  assert.ok(dock.includes('Job shift controls'));
  if (['sweep', 'wash', 'trim', 'rake'].includes(shift)) {
    assert.ok(!dock.includes('0/0 litter'));
    assert.ok(!dock.includes('Restock'));
  }
  const data = {
    resident,
    planning: EMPTY_PLANNING,
    worldWork: [],
    peers: [],
    civic: { projects: [] },
  };
  const map = renderToStaticMarkup(
    React.createElement(MiniMap, {
      data,
      getPosition: () => undefined,
      onLook() {},
    }),
  );
  if (['sweep', 'wash', 'trim', 'rake'].includes(shift))
    assert.ok(
      map.includes('Maintenance job minimap') && map.includes('Needs work'),
    );
}
console.log(
  `PASS: ${MAINTENANCE_TARGETS.length} distinct accessible work locations, swept geometry, batched scenery, visible progress/completion/regrowth, equipment switching and all job HUD/minimap rendering.`,
);
