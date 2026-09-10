import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {townLayout} from '../app/game/charters.ts';
import {isTownBlocked} from '../app/game/townLayout.ts';
import {homeDoor} from '../app/game/interiors.ts';
import {HOMES} from '../app/game/data.ts';
const base='http://localhost:3003',account=`handoff-${Date.now()}`,desktop=crypto.randomUUID(),mobile=crypto.randomUUID();
async function call(body){const res=await fetch(base+'/api/game',{headers:{'oai-authenticated-user-id':account,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const v=await res.json();assert.equal(res.status,200,JSON.stringify(v));return v;}
function local(sql){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.local.json','--command',sql],{stdio:'pipe'});}
let s=await call({action:'join',mode:'private',name:'Device test'});s=await call({action:'setup',home:0,job:'mow'});
s=await call({action:'movement-control',device:desktop,moveEpoch:0});assert.equal(s.controlAccepted,true);assert.equal(s.resident.moveOwner,desktop);const oldEpoch=s.resident.moveEpoch;
s=await call({action:'movement-control',device:mobile,moveEpoch:oldEpoch});assert.equal(s.controlAccepted,true);const epoch=s.resident.moveEpoch,start={x:s.resident.x,z:s.resident.z};
const layout=townLayout(s.planning);const target=[{x:start.x+3,z:start.z},{x:start.x-3,z:start.z},{x:start.x,z:start.z+3},{x:start.x,z:start.z-3}].find(p=>Array.from({length:13},(_,i)=>!isTownBlocked(start.x+(p.x-start.x)*i/12,start.z+(p.z-start.z)*i/12,layout)).every(Boolean));assert.ok(target);
// An idle tab can refresh presence immediately before a legitimate 3-unit move.
local(`UPDATE residents SET move_updated=${Date.now()-1200} WHERE id='${s.resident.id}'`);
let standby=await call({action:'heartbeat',device:desktop,moveEpoch:oldEpoch,...start,path:[]});assert.equal(standby.controlFollower,true);
s=await call({action:'heartbeat',device:mobile,moveEpoch:epoch,...target,path:[]});assert.equal(s.corrected,false,'Idle heartbeat must not reset movement allowance');assert.equal(s.resident.x,target.x);assert.equal(s.resident.z,target.z);
for(let i=0;i<5;i++){const packet=i%2?{device:desktop,moveEpoch:oldEpoch}:{};standby=await call({action:'heartbeat',...packet,...start,path:[]});assert.equal(standby.controlFollower,true);assert.equal(standby.resident.x,target.x);assert.equal(standby.resident.z,target.z);assert.equal(standby.resident.moveOwner,mobile);}
standby=await call({action:'movement-control',device:desktop,moveEpoch:oldEpoch});assert.equal(standby.controlAccepted,false,'Delayed takeover may not steal control');
s=await call({action:'movement-control',device:desktop,moveEpoch:epoch});assert.equal(s.controlAccepted,true);assert.equal(s.resident.moveOwner,desktop);const newEpoch=s.resident.moveEpoch;
standby=await call({action:'heartbeat',device:mobile,moveEpoch:epoch,...start,path:[]});assert.equal(standby.controlFollower,true);assert.equal(standby.resident.x,target.x);
const door=homeDoor(HOMES[0]);local(`UPDATE residents SET x=${door.x},z=${door.z},house='meadow-3' WHERE id='${s.resident.id}'`);s=await call({action:'home-enter',home:0});
s=await call({action:'movement-control',device:mobile,moveEpoch:newEpoch});const indoorEpoch=s.resident.moveEpoch,revision=s.resident.interiorRevision,room=s.resident.id;
s=await call({action:'heartbeat',device:mobile,moveEpoch:indoorEpoch,room,roomRevision:revision,indoorX:2,indoorZ:1,level:1});assert.equal(s.resident.indoorX,2);assert.equal(s.resident.indoorLevel,1);
standby=await call({action:'heartbeat',device:desktop,moveEpoch:newEpoch,room,roomRevision:revision,indoorX:0,indoorZ:2.5,level:0});assert.equal(standby.controlFollower,true);assert.equal(standby.resident.indoorX,2);assert.equal(standby.resident.indoorLevel,1);
console.log('PASS: one account on desktop/mobile, interleaved idle and legacy heartbeats, movement validation, stale takeover rejection, fresh takeover back, and indoor floor/position ownership.');
