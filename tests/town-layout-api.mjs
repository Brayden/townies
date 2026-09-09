import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {BUILDINGS,entrance,BRIDGES,isTownBlocked} from '../app/game/townLayout.ts';
import {findPath} from '../app/game/pathfinding.ts';
import {OUTFITS} from '../app/game/outfits.ts';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local test towns only');
const identity=`layout-${Date.now()}`,pause=ms=>new Promise(r=>setTimeout(r,ms));let state;
async function call(action,body={},who=identity){const r=await fetch(base+'/api/game',{method:action?'POST':'GET',headers:{'oai-authenticated-user-id':who,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action,...body})}:{})});const data=await r.json();if(who===identity&&data.resident)state=data;return{status:r.status,data}}
async function ok(action,body={}){const r=await call(action,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
async function move(goal){const start={x:state.resident.x,z:state.resident.z};const path=findPath(start,goal,isTownBlocked);assert.ok(path.length);let last=start,batch=[],distance=0;
 for(const next of path){const step=Math.hypot(next.x-last.x,next.z-last.z);if(distance+step>2.8&&batch.length){await pause(480);const result=await ok('heartbeat',{...batch.at(-1),path:batch});assert.equal(result.corrected,false,`Unexpected correction en route to ${JSON.stringify(goal)}`);batch=[];distance=0}batch.push(next);distance+=step;last=next}
 if(batch.length){await pause(480);const result=await ok('heartbeat',{...batch.at(-1),path:batch});assert.equal(result.corrected,false)}
}
function fixture(sql){assert.match(state.resident.id,/^[0-9a-f-]{36}$/);execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',`UPDATE residents SET ${sql} WHERE id='${state.resident.id}'`],{stdio:'pipe'});}
await ok('join',{mode:'private',name:'Town Explorer'});await ok('setup',{home:0,job:'paper'});
assert.equal((await call('outfit',{outfit:'outfit-crimson'})).status,400,'Cannot buy clothing from across town');
for(const [i,bridge]of BRIDGES.entries()){
 if(i===0)await ok('shift',{job:null});else if(i===1)await ok('shift',{job:'paper'});else await ok('mower',{active:true});
 await move({x:20,z:bridge.z});await move({x:36,z:bridge.z});await move({x:20,z:bridge.z});
 await move({x:28,z:bridge.z});await pause(1100);const invalid=await ok('heartbeat',{x:28,z:bridge.z+(bridge.z>45?-5:5)});assert.equal(invalid.corrected,true,'River outside the deck stays blocked');assert.equal(invalid.resident.z,bridge.z);await move({x:20,z:bridge.z});
 console.log(`PASS: ${bridge.id} bridge crosses both ways ${i===0?'on foot':i===1?'by bicycle':'on a mower'}; adjacent water is blocked.`);
}
await ok('mower',{active:false});await move(entrance(BUILDINGS.find(b=>b.id==='clothing')));fixture('coins=1000');await ok();
const race=await Promise.all([call('outfit',{outfit:'outfit-crimson'}),call('outfit',{outfit:'outfit-crimson'})]);assert.ok(race.every(r=>r.status===200));await ok();assert.equal(state.resident.coins,910);assert.equal(state.resident.items.filter(i=>i==='outfit-crimson').length,1);assert.equal(state.resident.color,OUTFITS.find(o=>o.id==='outfit-crimson').color);
await ok('outfit',{outfit:'outfit-blue'});assert.equal(state.resident.coins,910);await ok('outfit',{outfit:'outfit-crimson'});assert.equal(state.resident.coins,910);
await call('join',{mode:'key',key:state.town.key,name:'Outfit Neighbor'},identity+'-peer');const neighbor=await call(undefined,{},identity+'-peer');assert.equal(neighbor.data.peers.find(p=>p.id===state.resident.id).color,state.resident.color);
await move(entrance(BUILDINGS.find(b=>b.id==='general')));await ok('buy',{item:'bike'});assert.equal(state.resident.coins,560);assert.ok(state.resident.items.includes('bike'));assert.equal((await call('buy',{item:'bike'})).status,409);
await move(entrance(BUILDINGS.find(b=>b.id==='clothing')));fixture('coins=0');await ok();assert.equal((await call('outfit',{outfit:'outfit-teal'})).status,409);assert.equal((await call('outfit',{outfit:'invented-outfit'})).status,400);await ok('outfit',{outfit:'outfit-crimson'});assert.equal(state.resident.coins,0);
fixture('x=0,z=-11');await ok();assert.ok(!isTownBlocked(state.resident.x,state.resident.z));assert.equal(state.resident.home,0);assert.ok(state.resident.items.includes('bike'));assert.ok(state.resident.items.includes('outfit-crimson'));
console.log('PASS: atomic clothing purchases, free wardrobe changes, visible peer outfits, general-store bikes, insufficient funds, and safe relocation without losing ownership.');
