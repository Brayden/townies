import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {GRASS_REGROW_MS} from '../app/game/data.ts';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local test towns only.');
const prefix=`mowing-${Date.now()}`,pause=ms=>new Promise(r=>setTimeout(r,ms));
async function api(i,action,args={}){const response=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':`${prefix}-${i}`,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,...args})}:{})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data}
const town=await api(0,'join',{mode:'private',name:'Mower One'});
await api(1,'join',{mode:'key',key:town.town.key,name:'Mower Two'});
for(let i=0;i<2;i++)await api(i,'setup',{home:i,job:'mow'});
await pause(1200);
for(let i=0;i<2;i++){assert.equal((await api(i,'heartbeat',{x:5.4,z:3.7})).corrected,false);await api(i,'mower',{active:true})}
assert.ok((await api(0)).peers.every(p=>p.mowing));
assert.equal((await api(0,'heartbeat',{x:5.4,z:3.7})).mowReward,null,'A parked mower earns nothing');
await pause(1100);
const race=await Promise.all([api(0,'heartbeat',{x:10.5,z:3.7}),api(1,'heartbeat',{x:10.5,z:3.7})]);
assert.ok(race.every(r=>!r.corrected));
const a=await api(0),b=await api(1);assert.ok(a.lawnCuts.length>5);assert.deepEqual(a.lawnCuts,b.lawnCuts);
assert.equal(a.resident.coins+b.resident.coins-300,a.lawnCuts.length*2,'Only one worker is paid per shared patch');
assert.equal(a.resident.xp+b.resident.xp,a.lawnCuts.length);
assert.equal(a.town.treasury,a.lawnCuts.length);
await pause(1100);
const repeat=await api(0,'heartbeat',{x:5.4,z:3.7});assert.equal(repeat.mowReward,null,'Cut stripes cannot pay again');
await api(0,'mower',{active:false});await pause(1100);
const walking=await api(0,'heartbeat',{x:10.5,z:5});assert.equal(walking.mowReward,null,'Walking does not cut grass');
await api(0,'mower',{active:true});const jump=await api(0,'heartbeat',{x:55,z:50});assert.ok(jump.corrected);assert.equal(jump.mowReward,null);
await pause(1100);
const concurrent=await Promise.all([api(0,'heartbeat',{x:5.4,z:5}),api(0,'heartbeat',{x:5.4,z:5})]);
const newState=await api(0);const added=newState.lawnCuts.length-a.lawnCuts.length;assert.ok(added>0);assert.equal(newState.resident.coins-a.resident.coins,added*2);
await api(0,'job',{job:'clean'});assert.equal((await api(0)).resident.mowing,false);
await api(0,'mower',{active:true});await pause(1100);
const helper=await api(0,'heartbeat',{x:10.5,z:6.3});assert.ok(helper.mowReward?.patches>0);assert.equal(helper.mowReward.coins,helper.mowReward.patches,'Non-career mowing pays one coin per patch');
await pause(4200);
const stale=await api(0,'heartbeat',{x:5.4,z:6.3});assert.equal(stale.mowReward,null,'Offline gaps cannot sweep unsent paths for money');
console.log('PASS: mounting, visible peer mower state, shared grass persistence, per-patch coins/XP/tax, two-resident payout race, duplicate heartbeats, already-cut grass, dismount, job changes, helper rates, teleport rejection, and offline gaps. Checking the 24-hour regrowth boundary…');
// Age only this newly-created local test town's grass, never production data.
assert.equal(GRASS_REGROW_MS,86400000);
assert.match(town.town.id,/^[0-9a-f-]{36}$/);
function ageGrass(age){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',`UPDATE lawn_cells SET cut_at=${Date.now()-age} WHERE town_id='${town.town.id}'`],{cwd:new URL('..',import.meta.url),stdio:'pipe'})}
ageGrass(GRASS_REGROW_MS-60000);
assert.ok((await api(0)).lawnCuts.length>0,'Grass stays cut just before 24 hours');
ageGrass(GRASS_REGROW_MS+1000);
const regrown=await api(0);assert.equal(regrown.lawnCuts.length,0,'Grass regrows after 24 hours');
await api(0,'heartbeat',{x:5.4,z:6.3});await pause(1100);
const recut=await api(0,'heartbeat',{x:10.5,z:6.3});assert.ok(recut.mowReward?.patches>0,'Regrown grass can be cut for income again');
console.log('PASS: grass stays cut before 24 hours, regrows after 24 hours, and can earn income again.');
