import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {WORK_TARGETS,TARGET_BY_ID} from '../app/game/workTargets.ts';
import {TASKS} from '../app/game/data.ts';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local test towns only');
const prefix=`contributions-${Date.now()}`,pause=ms=>new Promise(r=>setTimeout(r,ms)),states=new Map();
async function call(who,action,body={}){const response=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':prefix+who,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})});const data=await response.json();if(data.resident)states.set(who,data);return {status:response.status,data};}
async function ok(who,action,body={}){const r=await call(who,action,body);assert.equal(r.status,200,JSON.stringify(r));return r.data;}
// Move only test residents in the local fixture database to exercise reward paths quickly.
function local(sql){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',sql],{stdio:'pipe'});}
function position(who,p,extra=''){const id=states.get(who).resident.id;assert.match(id,/^[0-9a-f-]{36}$/);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));local(`UPDATE residents SET x=${p.x},z=${p.z}${extra} WHERE id='${id}'`);}
function stats(state,id=state.resident.id){return state.election.candidates.find(c=>c.id===id).contributions;}
let a=await ok('a','join',{mode:'private',name:'Candidate A'});await ok('b','join',{mode:'key',key:a.town.key,name:'Candidate B'});
for(const [who,home] of [['a',0],['b',1]]){await ok(who,'setup',{home,job:'paper'});await ok(who,'nominate',{cycle:a.election.cycle});await ok(who,'shift',{job:'paper'});position(who,TARGET_BY_ID.get('paper-4-mailbox'));}
const race=await Promise.all([call('a','use',{target:'paper-4-mailbox'}),call('b','use',{target:'paper-4-mailbox'})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
a=await ok('a');let b=await ok('b');assert.equal(stats(a).month.paper+stats(b).month.paper,1);assert.equal(stats(a).month.xp+stats(b).month.xp,2);assert.equal(stats(a).month.tax+stats(b).month.tax,1);
const winner=race[0].status===200?'a':'b';assert.equal((await call(winner,'use',{target:'paper-4-mailbox',xp:999,contributions:{paper:999}})).status,409);assert.equal(stats(await ok(winner)).month.paper,1);
for(const job of ['deliver','clean','garden']){
 await ok('a','shift',{job});const target=WORK_TARGETS.find(t=>t.job===job);position('a',target);
 if(job==='garden'){await ok('a','water-start',{target:target.id});assert.equal((await call('a','use',{target:target.id})).status,400);await pause(2100);}
 const done=await ok('a','use',{target:target.id});assert.equal(stats(done).month[job],1);assert.equal((await call('a','use',{target:target.id})).status,job==='garden'?400:409);
}
a=await ok('a');const before=stats(a).month;
await ok('a','donate');a=await ok('a');assert.equal(stats(a).month.donated,25);assert.equal(stats(a).month.xp,before.xp);assert.equal(stats(a).month.days,1);
// Finish a completed local task twice concurrently: only one completion counts.
const task=TASKS.find(t=>t.job!=='mow');position('a',task);await ok('a','begin',{task:task.id});const rid=a.resident.id;local(`UPDATE work SET steps=5,started=${Date.now()-6000} WHERE resident_id='${rid}'`);
await Promise.all([ok('a','finish',{task:task.id}),ok('a','finish',{task:task.id})]);assert.equal(stats(await ok('a')).month.task,1);
// A parked mower earns no contribution; duplicate movement can only credit fresh patches once.
await ok('a','mower',{active:true});position('a',{x:-36.6,z:-9.3},`,seen=${Date.now()}`);await ok('a','heartbeat',{x:-36.6,z:-9.3});assert.equal(stats(await ok('a')).month.mow,0);
await pause(1100);await Promise.all([ok('a','heartbeat',{x:-31.5,z:-9.3}),ok('a','heartbeat',{x:-31.5,z:-9.3})]);a=await ok('a');assert.ok(stats(a).month.mow>0);assert.equal(stats(a).month.mow,a.lawnCuts.length);assert.equal(stats(a).month.xp,a.resident.xp);assert.equal(stats(a).overall.xp,a.resident.xp);assert.equal(stats(a).month.days,1);
b=await ok('b');assert.deepEqual(stats(b,a.resident.id),stats(a),'Neighbors see saved candidate contribution totals');
const totalTax=stats(a).month.tax+stats(b).month.tax;assert.equal(totalTax,a.town.treasury);
await ok('c','join',{mode:'private',name:'Another Town'});await ok('c','setup',{home:0,job:'mow'});await ok('c','nominate',{cycle:a.election.cycle});const c=await ok('c');assert.equal(c.election.candidates.length,1);assert.equal(stats(c).overall.xp,0);
console.log('PASS: persisted ballot records, shared-target races, rejected/repeated work, all field jobs, timed gardening, donations, concurrent task completion, parked mower, duplicate movement, XP/tax reconciliation, neighbor reads, and town isolation.');
