import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Disposable local towns only.');
const prefix=`moving-${Date.now()}`;
async function game(who,action,body={}){const response=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':prefix+who,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})});return {status:response.status,data:await response.json()};}
async function ok(who,action,body={}){const r=await game(who,action,body);assert.equal(r.status,200,JSON.stringify(r));return r.data;}
function local(sql){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',sql],{stdio:'pipe'});}
await ok('a','join',{mode:'private',name:'Moving Neighbor'});let a=await ok('a','setup',{home:0,job:'mow'});
await ok('b','join',{mode:'key',key:a.town.key,name:'Old Neighbor'});const b=await ok('b','setup',{home:1,job:'paper'});
await ok('c','join',{mode:'private',name:'New Neighbor'});const c=await ok('c','setup',{home:0,job:'garden'});
const old=a.town.id,next=c.town.id,key=c.town.key;
local(`UPDATE residents SET coins=8000,xp=850,education=30,house='rose-4',upkeep_due=${Date.now()+86400000},items='["bike","hat-top"]',hat='hat-top' WHERE id='${a.resident.id}'; UPDATE towns SET farm_funded=250,project=40 WHERE id='${old}'`);
a=await ok('a','shift',{job:'paper'});const before=a.resident;
assert.equal((await game('a','move-options',{destination:next})).status,404);
const preview=await ok('a','move-options',{key});assert.equal(preview.destination.id,next);assert.equal(preview.homes.length,49);assert.ok(!preview.homes.some(h=>h.id===0));
const move={destination:next,key,home:2,fromTown:old,membership:0,townId:old};
assert.equal((await game('a','move-town',{...move,home:0})).status,409);assert.equal((await ok('a')).town.id,old);
a=await ok('a','move-town',move);assert.equal(a.town.id,next);assert.equal(a.resident.home,2);assert.ok(a.resident.townJoinedAt>0);assert.equal(a.resident.shift,null);assert.equal(a.planning.farmFunded,0);
for(const field of ['id','coins','xp','education','house','upkeepDue','job','hat'])assert.equal(a.resident[field],before[field],field);assert.deepEqual(a.resident.items,before.items);
const previous=await ok('b'),destination=await ok('c');assert.equal(previous.town.residents,1);assert.ok(!previous.occupied.includes(0));assert.ok(!previous.peers.some(p=>p.id===a.resident.id));assert.equal(previous.planning.farmFunded,250);assert.equal(previous.town.project,40);assert.equal(destination.town.residents,2);assert.ok(destination.peers.some(p=>p.id===a.resident.id));assert.equal(destination.properties.find(p=>p.home===2).house,'rose-4');
const stale=await game('a','heartbeat',{townId:old,membership:0,x:4,z:6});assert.equal(stale.status,409);assert.equal(stale.data.refreshTown,true);assert.equal((await ok('a')).resident.x,0);
assert.equal((await game('a','move-town',move)).status,409);
const chat=await fetch(base+'/api/chat',{method:'POST',headers:{'oai-authenticated-user-id':prefix+'a','Content-Type':'application/json'},body:JSON.stringify({townId:old,channel:'town',text:'This must not reach the new town',id:crypto.randomUUID()})});assert.equal(chat.status,409);
// Independent transfers between the towns can complete concurrently.
const contenders=await Promise.all([game('b','move-town',{...move,fromTown:b.town.id,home:3}),game('c','move-town',{destination:old,key:previous.town.key,home:0,fromTown:next,townId:next,membership:0})]);assert.ok(contenders.every(v=>v.status===200),JSON.stringify(contenders));
assert.equal((await ok('a')).town.id,next,'A fresh login remains assigned to the destination');
console.log('PASS: live Worker private previews, failed-move safety, progression and upgraded home transfer, released old address, shared destination presence, isolated town projects, stale movement/chat rejection, concurrent transfers, and persistent membership.');
