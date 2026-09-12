import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('outputs/work-qa', { recursive: true });
await build({
  stdin: {
    contents:
      "export * from './app/game/townWork';export {EMPTY_PLANNING} from './app/game/charters';export {LAWN_CELLS} from './app/game/data';export {WORK_TARGETS,WORK_DAY_MS} from './app/game/workTargets';export {dayStart,parcelHomes} from './app/game/lifestyle';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'outputs/work-qa/test.mjs',
});
const {
  townWorkCatalog,
  townWorkProgress,
  EMPTY_PLANNING,
  LAWN_CELLS,
  WORK_TARGETS,
  WORK_DAY_MS,
  dayStart,
  parcelHomes,
} = await import('../outputs/work-qa/test.mjs');
const now = Date.UTC(2026, 8, 11, 12),
  catalog = townWorkCatalog(EMPTY_PLANNING),
  state = {
    town: { id: 'test-town' },
    worldWork: [],
    lawnCuts: [],
    grassHistory: [],
  };
const progress = () => townWorkProgress(state, catalog, now);
const job = (id, p = progress()) => p.jobs.find((j) => j.id === id);
assert.equal(progress().jobs.length, 9);
assert.equal(progress().jobsRemaining, 9);
assert.ok(job('mow').remaining > 0);
assert.equal(
  job('paper').total,
  50,
  'Door and mailbox share one house delivery',
);
assert.equal(job('deliver').total, 38, 'Only the daily parcel subset counts');
assert.equal(job('mow').percent, 0);
const paper = catalog.find((j) => j.id === 'paper').targets[0];
state.worldWork.push({ id: paper.id, completed: now, target: 'any' });
assert.equal(job('paper').completed, 1);
assert.equal(job('clean').completed, 0);
state.worldWork.push({ id: paper.id, completed: now, target: 'duplicate' });
assert.equal(job('paper').completed, 1);
const lawn = catalog.find((j) => j.id === 'mow').targets[0];
state.grassHistory.push({ cell: lawn.id, cut_at: now - WORK_DAY_MS + 1 });
assert.equal(job('mow').completed, 1);
state.grassHistory[0].cut_at = now - WORK_DAY_MS;
assert.equal(job('mow').completed, 0, 'Grass returns at 24 hours');
const parcel = catalog
  .find((j) => j.id === 'deliver')
  .targets.find((t) => parcelHomes(state.town.id, now).includes(t.home));
state.worldWork.push({
  id: parcel.id,
  completed: dayStart(now) - 1,
  target: 'yesterday',
});
assert.equal(
  job('deliver').completed,
  0,
  'Yesterday parcels cannot complete today’s route',
);
state.worldWork.push({
  id: parcel.id,
  completed: dayStart(now),
  target: 'today',
});
assert.equal(job('deliver').completed, 1);
const completed = {
  ...state,
  worldWork: catalog.flatMap((j) =>
    j.id === 'mow'
      ? []
      : j.targets.map((t) => ({ id: t.id, target: t.id, completed: now })),
  ),
  grassHistory: catalog
    .find((j) => j.id === 'mow')
    .targets.map((t) => ({ cell: t.id, cut_at: now })),
};
const all = townWorkProgress(completed, catalog, now);
assert.equal(all.remaining, 0);
assert.equal(all.jobsRemaining, 0);
assert.ok(all.jobs.every((j) => j.percent === 100));
const again = townWorkProgress(completed, catalog, now + WORK_DAY_MS);
assert.equal(
  again.jobsRemaining,
  9,
  'Work returning automatically reopens the checklist',
);
for (const row of catalog)
  assert.equal(new Set(row.targets.map((t) => t.id)).size, row.targets.length);
const grassPoint = LAWN_CELLS.find((c) => c.id === lawn.id);
const redeveloped = structuredClone(EMPTY_PLANNING);
redeveloped.buildings.push({
  plot: 'test-site',
  kind: 'craft',
  x: grassPoint.x,
  z: grassPoint.z,
  rotation: 0,
});
assert.ok(
  !townWorkCatalog(redeveloped)
    .find((j) => j.id === 'mow')
    .targets.some((t) => t.id === lawn.id),
  'Grass underneath new buildings is excluded',
);
console.log(
  'PASS: all nine professions, deduplicated deliveries, daily parcel route, channel-independent counts, 24-hour regrowth, and all-jobs-complete state.',
);
