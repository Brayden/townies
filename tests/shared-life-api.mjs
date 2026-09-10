import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {FARM_BEDS,FARM_ORDER,PICNIC,PICNIC_BASKET} from '../app/game/sharedLife.ts';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Disposable local towns only.');
const prefix=`shared-life-${Date.now()}`;
async function game(who,action,body={}){const response=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':prefix+who,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})});return {status:response.status,data:await response.json()};}
async function ok(who,action,body={}){const r=await game(who,action,body);assert.equal(r.status,200,JSON.stringify(r));return r.data;}
function local(sql){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',sql],{stdio:'pipe'});}
await ok('a','join',{mode:'private',name:'Garden Alice'});let a=await ok('a','setup',{home:0,job:'mow'});
await ok('b','join',{mode:'key',key:a.town.key,name:'Picnic Bob'});let b=await ok('b','setup',{home:1,job:'paper'});
await ok('c','join',{mode:'private',name:'Other Carol'});let c=await ok('c','setup',{home:0,job:'garden'});
assert.equal(a.life.plots.length,0);assert.equal(a.life.picnicGuests.length,0);
const bed=FARM_BEDS[0],ids=[a.resident.id,b.resident.id].map(id=>`'${id}'`).join(',');
local(`UPDATE towns SET farm_funded=6000 WHERE id='${a.town.id}';UPDATE residents SET x=${bed.x},z=${bed.z},seen=${Date.now()} WHERE id IN (${ids})`);
const plant={target:bed.id,crop:'radish',revision:0};
const racing=await Promise.all([game('a','life-plant',plant),game('b','life-plant',plant)]);assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);
b=await ok('b');assert.equal(b.life.plots[0].crop,'radish');assert.equal(b.life.plots[0].revision,1);assert.equal((await game('c','life-water',{target:bed.id,revision:1})).status,400);
b=await ok('b','life-water',{target:bed.id,revision:1});a=await ok('a');assert.equal(a.life.plots[0].revision,2);assert.ok(a.peers.find(p=>p.id===b.resident.id).emoteUntil>Date.now());assert.equal(a.peers.find(p=>p.id===b.resident.id).emote,'water');
assert.equal((await game('a','life-harvest',{...plant,revision:2})).status,409);
local(`UPDATE farm_plots SET watered=${Date.now()-600100} WHERE town_id='${a.town.id}' AND plot_id='${bed.id}'`);
const harvesting=await Promise.all([game('a','life-harvest',{...plant,revision:2}),game('b','life-harvest',{...plant,revision:2})]);assert.deepEqual(harvesting.map(r=>r.status).sort(),[200,409]);
a=await ok('a');b=await ok('b');assert.equal(a.life.pantry.radish,4);assert.deepEqual(a.life.pantry,b.life.pantry);assert.equal(a.resident.coins,150);
local(`UPDATE residents SET x=${FARM_ORDER.x},z=${FARM_ORDER.z} WHERE id IN (${ids});`+Object.entries(PICNIC_BASKET).map(([crop,amount])=>`INSERT INTO farm_pantry(town_id,crop,amount) VALUES('${a.town.id}','${crop}',${amount}) ON CONFLICT(town_id,crop) DO UPDATE SET amount=${amount};`).join(''));
const baskets=await Promise.all([game('a','life-basket'),game('b','life-basket')]);assert.deepEqual(baskets.map(r=>r.status).sort(),[200,409]);a=await ok('a');assert.equal(a.town.treasury,150);assert.ok(Object.values(a.life.pantry).every(n=>n===0));assert.ok((await ok('b')).life.basketCompleted);
local(`UPDATE residents SET x=${PICNIC.x},z=${PICNIC.z} WHERE id IN (${ids},'${c.resident.id}')`);
a=await ok('a','life-picnic');await ok('a','life-picnic');b=await ok('b','life-picnic');assert.equal(b.life.picnicGuests.length,2);assert.equal((await ok('a')).life.visited,true);assert.equal((await ok('b')).peers.find(p=>p.id===a.resident.id).emote,'sit');a=await ok('a','life-picnic',{stand:true});assert.equal(a.resident.emote,null);a=await ok('a','life-picnic');a=await ok('a','heartbeat',{x:PICNIC.x+.2,z:PICNIC.z});assert.equal(a.resident.emote,null,'Moving stands up');
c=await ok('c','life-picnic');assert.equal(c.life.picnicGuests.length,1);assert.equal(c.life.basketCompleted,0);assert.deepEqual(c.life.pantry,{});
local(`UPDATE residents SET emote_until=0 WHERE id='${a.resident.id}'`);a=await ok('a','life-emote',{gesture:'wave'});assert.equal((await ok('b')).peers.find(p=>p.id===a.resident.id).emote,'wave');assert.equal((await game('a','life-emote',{gesture:'arbitrary'})).status,400);
console.log('PASS: real Worker multi-resident crop races, neighbor watering and shared animation, trusted harvest time, one shared pantry/reward, concurrent basket delivery, picnic persistence and town isolation, live peer gestures.');
