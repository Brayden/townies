import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {HOMES} from '../app/game/data.ts';
import {homeDoor,firstFurnitureSpot} from '../app/game/interiors.ts';
const base='http://localhost:3002',prefix=`interiors-${Date.now()}`;
async function game(who,action,body={}){const response=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':prefix+who,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})});return {status:response.status,data:await response.json()};}
async function ok(who,action,body={}){const result=await game(who,action,body);assert.equal(result.status,200,JSON.stringify(result));return result.data;}
function local(sql){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',sql],{stdio:'pipe'});}
await ok('a','join',{mode:'private',name:'Home Alice'});let a=await ok('a','setup',{home:0,job:'mow'});
await ok('b','join',{mode:'key',key:a.town.key,name:'Neighbor Bob'});let b=await ok('b','setup',{home:1,job:'garden'});
assert.equal((await game('a','home-enter',{home:1})).status,403);assert.equal((await game('a','home-enter',{home:0})).status,400);
const door=homeDoor(HOMES[0]);local(`UPDATE residents SET x=${door.x},z=${door.z},coins=1000 WHERE id='${a.resident.id}'`);
a=await ok('a','mower',{active:true});a=await ok('a','home-enter',{home:0});assert.equal(a.resident.inside,true);assert.equal(a.resident.mowing,false);assert.equal(a.resident.interior.placed.length,5);
b=await ok('b');assert.ok(!b.peers.some(p=>p.id===a.resident.id),'Inside resident disappears from streets');assert.equal(b.properties.find(p=>p.home===0).name,'Home Alice','Offline and indoor owners still label houses');assert.ok(!('interior' in b.properties[0]),'Other residents cannot read interior inventory through properties');
assert.equal((await game('a','mower',{active:true})).status,409);a=await ok('a','heartbeat',{x:9999,z:9999});assert.equal(a.resident.inside,true);assert.equal(a.resident.x,door.x,'Indoor heartbeat cannot walk or teleport outside');
const spot=firstFurnitureSpot('plant-flowers',a.resident.interior.placed,a.resident.house),purchase={item:'plant-flowers',...spot,revision:a.resident.interiorRevision,price:1};
const race=await Promise.all([game('a','home-place',purchase),game('a','home-place',purchase)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);a=await ok('a');assert.equal(a.resident.coins,915);assert.ok(a.resident.interior.owned.includes('plant-flowers'));
a=await ok('a','home-finish',{revision:a.resident.interiorRevision,wall:'sky',floor:'walnut'});assert.equal((await ok('a')).resident.interior.wall,'sky');
a=await ok('a','home-store',{revision:a.resident.interiorRevision,item:'plant-flowers'});assert.ok(!a.resident.interior.placed.some(p=>p.id==='plant-flowers'));assert.ok(a.resident.interior.owned.includes('plant-flowers'));
a=await ok('a','home-place',{...purchase,revision:a.resident.interiorRevision});assert.equal(a.resident.coins,915);
a=await ok('a','home-exit');assert.equal(a.resident.inside,false);assert.equal(a.resident.x,door.x);assert.equal(a.resident.z,door.z);b=await ok('b');assert.ok(b.peers.some(p=>p.id===a.resident.id),'Neighbor sees owner come back outside');
assert.equal((await game('b','home-place',{...purchase,owner:a.resident.id})).status,403);
a=await ok('a','home-enter',{home:0});assert.equal(a.resident.interior.wall,'sky');assert.ok(a.resident.interior.placed.some(p=>p.id==='plant-flowers'));
// Existing room data remains downstairs; upper floors gain independent saved layouts.
local(`UPDATE residents SET house='meadow-3' WHERE id='${a.resident.id}'`);a=await ok('a');
a=await ok('a','home-place',{item:'bed-meadow',x:-3,z:-2,rotation:0,level:1,revision:a.resident.interiorRevision});assert.equal(a.resident.interior.placed.find(p=>p.id==='bed-meadow').level,1);assert.equal(a.resident.coins,915);
a=await ok('a','home-finish',{wall:'rose',floor:'birch',level:1,revision:a.resident.interiorRevision});assert.equal(a.resident.interior.wall,'sky');assert.equal(a.resident.interior.upperFinishes['1'].wall,'rose');
assert.equal((await game('a','home-place',{item:'plant-fern',x:0,z:0,rotation:0,level:2,revision:a.resident.interiorRevision})).status,400);
a=await ok('a','home-exit');a=await ok('a','home-enter',{home:0});assert.equal(a.resident.interior.placed.find(p=>p.id==='bed-meadow').level,1);assert.equal(a.resident.interior.upperFinishes['1'].floor,'birch');
console.log('PASS: live Worker private doors, indoor presence, owner labels, blocked outdoor work and teleporting, concurrent purchase, decoration persistence, furniture storage, free replacement, and exit/return.');
