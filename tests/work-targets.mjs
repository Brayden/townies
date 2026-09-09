import assert from 'node:assert/strict';
import {WORK_TARGETS,STATIONS,workPointOpen} from '../app/game/workTargets.ts';
import {findPath} from '../app/game/pathfinding.ts';
assert.equal(new Set(WORK_TARGETS.map(t=>t.id)).size,WORK_TARGETS.length);
for(const job of ['paper','clean','garden','deliver'])assert.ok(WORK_TARGETS.filter(t=>t.job===job).length>=40);
for(const t of [...WORK_TARGETS,...STATIONS]){assert.ok(workPointOpen(t.x,t.z),t.id);const path=findPath({x:0,z:6},t,(x,z)=>!workPointOpen(x,z));assert.ok(path.length,`No route to ${t.id}`)}
const paper=WORK_TARGETS.filter(t=>t.job==='paper'&&t.home===4);assert.equal(paper.length,2);assert.equal(paper[0].group,paper[1].group);assert.ok(WORK_TARGETS.some(t=>t.job==='deliver'&&t.home===4&&t.group!==paper[0].group));
console.log(`PASS: ${WORK_TARGETS.length} reachable work objects, reachable service stations, shared door/mailbox household identity, and distinct parcel deliveries.`);
