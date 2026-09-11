import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import WebSocket from 'ws';
import {build} from 'esbuild';
import {applyPatch} from '../shared/town-wire.ts';
const base=process.env.TOWNIES_TEST_URL??'http://localhost:3002';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local test worlds only.');
const root=process.env.TOWNIES_STATE_DIR??'.wrangler/state/v3';
function database(folder,predicate){for(const file of readdirSync(folder).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){const d=new DatabaseSync(`${folder}/${file}`);try{if(predicate(d))return d}catch{}d.close()}throw Error('Database not found')}
const d1=database(root+'/d1/miniflare-D1DatabaseObject',d=>d.prepare("SELECT 1 FROM sqlite_master WHERE name='auth_users'").get());
d1.prepare("DELETE FROM auth_rate_limits WHERE key LIKE '%|/sign-up/email'").run();
const stamp=Date.now();
function client(name){const cookies=new Map();return {name,cookies,cookie(){return [...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},async api(path='/api/game',body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,Cookie:this.cookie(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});for(const line of r.headers.getSetCookie()){const p=line.split(';')[0],i=p.indexOf('=');cookies.set(p.slice(0,i),p.slice(i+1))}return {status:r.status,value:await r.json()}},async ok(body){const r=await this.api('/api/game',body);assert.equal(r.status,200,JSON.stringify(r.value));return r.value}}}
const clients=['Ash','Birch','Clover'].map(client),[a,b,c]=clients;
for(const p of clients)assert.equal((await p.api('/api/auth/sign-up/email',{name:p.name,email:`ws-${p.name}-${stamp}@example.com`,password:'Testing sockets in town 42!'})).status,200);
const first=await a.ok({action:'join',name:a.name,mode:'private'});await a.ok({action:'setup',job:'mow',home:0});
await b.ok({action:'join',name:b.name,mode:'key',key:first.town.key});const bs=await b.ok({action:'setup',job:'paper',home:1});
const second=await c.ok({action:'join',name:c.name,mode:'private'});await c.ok({action:'setup',job:'garden',home:0});
const sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label){const end=Date.now()+7000;while(!check()){if(Date.now()>end)throw Error('Timed out: '+label);await delay(20)}}
async function rejected(cookie,origin){return new Promise((resolve,reject)=>{const ws=new WebSocket(base.replace('http','ws')+'/api/town-socket',{headers:{Cookie:cookie,Origin:origin}});ws.on('open',()=>{ws.close();reject(Error('Unexpected connection'))});ws.on('unexpected-response',(_,res)=>{res.resume();resolve(res.statusCode)});ws.on('error',reject);setTimeout(()=>reject(Error('Upgrade rejection timeout')),7000).unref()})}
assert.equal(await rejected('',base),401);assert.equal(await rejected(a.cookie(),'https://evil.example'),403);
async function connect(p){const ws=new WebSocket(base.replace('http','ws')+'/api/town-socket',{headers:{Cookie:p.cookie(),Origin:base}});const s={ws,messages:[],world:null,personal:null,id:0,closed:null,state(){return {...this.world,...this.personal}},send(value){ws.send(JSON.stringify(value))},async req(body,path='/api/game',search=''){const id=++this.id;this.send({type:'request',id,path,search,method:body?'POST':'GET',body});await until(()=>this.messages.some(m=>m.type==='response'&&m.id===id),'response '+id);const m=this.messages.find(m=>m.type==='response'&&m.id===id);return {status:m.status,value:m.value??{...this.state(),...m.extras}}},async ok(body){const r=await this.req(body);assert.equal(r.status,200,JSON.stringify(r.value));return r.value}};
 sockets.push(s);let ack=0;ws.on('message',raw=>{const m=JSON.parse(raw);s.messages.push(m);if(m.type==='welcome'){s.world=m.world;s.personal=m.personal}if(m.type==='world')s.world=m.patch?applyPatch(s.world,m.patch):m.value;if((m.type==='personal'||m.type==='response')&&(m.patch||m.personal))s.personal=m.patch?applyPatch(s.personal,m.patch):m.personal;if(Date.now()-ack>1000){ack=Date.now();s.send({type:'ack'})}});ws.on('close',(code)=>s.closed=code);ws.on('error',e=>{s.error=e});await until(()=>s.world||s.error,'welcome');if(s.error)throw s.error;return s}
try{
const [sa,sb,sc]=await Promise.all(clients.map(connect));assert.equal(sa.world.town.id,first.town.id);assert.equal(sc.world.town.id,second.town.id);assert.equal(sb.personal.resident.id,bs.resident.id);
const device='ws-'+randomUUID();const control=await sa.ok({action:'movement-control',device,moveEpoch:0});await delay(300);const movement=await sa.ok({action:'heartbeat',device,moveEpoch:control.resident.moveEpoch,x:0.6,z:6});assert.equal(movement.corrected,false);await until(()=>sb.world.peers.some(p=>p.id===first.resident.id&&p.x===0.6),'movement broadcast');assert.ok(!sc.world.peers.some(p=>p.id===first.resident.id));
// Public patches never include personal wallets, votes, or home interiors.
for(const m of sb.messages.filter(m=>m.type==='world')){const value=JSON.stringify(m);assert.ok(!/"(coins|interior|moveOwner|moveEpoch)"/.test(value),value)}
const sa2=await connect(a);const phone=await sa2.ok({action:'movement-control',device:'phone-'+randomUUID(),moveEpoch:control.resident.moveEpoch});await until(()=>sa.personal.resident.moveEpoch===phone.resident.moveEpoch,'device takeover pushed');assert.equal((await sa.ok({action:'heartbeat',device,moveEpoch:control.resident.moveEpoch,x:1,z:6})).controlFollower,true);
assert.equal((await sa.req({channel:'town',text:'Hello over a socket!',id:randomUUID()},'/api/chat')).status,200);await until(()=>sb.messages.some(m=>m.type==='changed'&&m.topic==='chat'&&m.channel==='town'),'chat push');assert.equal((await sb.req(undefined,'/api/chat','?channel=town')).value.messages.at(-1).text,'Hello over a socket!');assert.equal((await sb.req(undefined,'/api/chat','?channel=mow')).status,403);assert.ok(!sc.messages.some(m=>m.type==='changed'&&m.topic==='chat'));
// Duplicate request IDs cannot execute a second action.
const duplicate=sa.id;sa.send({type:'request',id:duplicate,path:'/api/game',method:'POST',body:{action:'mower',active:true}});await until(()=>sa.messages.some(m=>m.id===duplicate&&m.status===409),'duplicate rejected');assert.equal((await sa.ok()).resident.mowing,false);
const townDB=database(root+'/do/townies-Town',d=>d.prepare("SELECT 1 FROM _meta WHERE key='town' AND value=?").get(first.town.id));townDB.prepare('UPDATE residents SET x=-36.6,z=-9.3,seen=?,move_updated=? WHERE id=?').run(Date.now()-1200,Date.now()-1200,first.resident.id);await sa2.ok({action:'mower',active:true});const before=(await sa2.ok()).resident.coins;const cut=await sa2.ok({action:'heartbeat',device:phone.resident.moveOwner,moveEpoch:phone.resident.moveEpoch,x:-31.5,z:-9.3});assert.ok(cut.lawnCuts.length>0);assert.ok(cut.resident.coins>before);await until(()=>sb.world.lawnCuts.length===cut.lawnCuts.length,'grass push');assert.equal(sb.personal.resident.coins,bs.resident.coins);townDB.close();
// Global friendships and DMs still notify socket clients.
assert.equal((await a.api('/api/social',{action:'request',town:first.town.id,to:bs.resident.id})).status,200);assert.equal((await b.api('/api/social',{action:'accept',town:first.town.id,to:first.resident.id})).status,200);const n=sb.messages.length;assert.equal((await a.api('/api/social',{action:'message',town:first.town.id,to:bs.resident.id,text:'Private hello',id:randomUUID()})).status,200);await until(()=>sb.messages.slice(n).some(m=>m.type==='changed'&&m.topic==='social'),'DM push');
// Moving revokes both devices in the old town; reconnect gets destination.
const as=await a.ok();await a.ok({action:'move-town',destination:second.town.id,key:second.town.key,home:2,fromTown:first.town.id,membership:as.resident.townJoinedAt});await until(()=>sa.closed===4409&&sa2.closed===4409,'transfer disconnect');const moved=await connect(a);assert.equal(moved.world.town.id,second.town.id);assert.equal(moved.personal.resident.coins,cut.resident.coins);
const oldCookie=a.cookie();assert.equal((await a.api('/api/auth/sign-out',{})).status,200);await until(()=>moved.closed===4401,'logout disconnect');assert.equal(await rejected(oldCookie,base),401);
const broken=await connect(b);broken.ws.send('{');await until(()=>broken.closed===1007,'invalid JSON');const large=await connect(b);large.ws.send('x'.repeat(32769));await until(()=>large.closed===1009,'oversized packet');
const binary=await connect(b);binary.ws.send(Buffer.from([1,2,3]));await until(()=>binary.closed===1003,'binary frame');const flood=await connect(b);for(let i=0;i<25;i++)flood.send({type:'request',id:0});await until(()=>flood.closed===1008,'replay flood limit');
sb.ws.close(1000,'Test leaving');await until(()=>sb.closed!==null,'disconnect');const returned=await connect(b);assert.equal(returned.personal.resident.id,bs.resident.id);assert.equal(returned.world.lawnCuts.length,cut.lawnCuts.length);
// Exercise the actual browser transport without a browser or UI automation.
const bundle=await build({entryPoints:['app/game/town-connection.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const {townConnection,townFetch}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const nativeFetch=globalThis.fetch;const nativeSocket=globalThis.WebSocket;const browserSockets=[];
globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=new EventTarget();globalThis.location={origin:base};
globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{headers:{Cookie:b.cookie(),Origin:base}});browserSockets.push(this)}};
globalThis.fetch=(url,init={})=>nativeFetch(new URL(url,base),{...init,headers:{...init.headers,Cookie:b.cookie(),Origin:base}});
try{let updates=0;townConnection.on('state',()=>updates++);townConnection.start();await until(()=>townConnection.connected(),'browser transport welcome');const response=await townFetch('/api/game');assert.equal(response.headers.get('x-townies-transport'),'websocket');const value=await response.json();assert.equal(value.resident.id,bs.resident.id);assert.equal(value.lawnCuts.length,cut.lawnCuts.length);await until(()=>updates>0,'coalesced state delivery');
 browserSockets.at(-1).terminate();await until(()=>browserSockets.length===2&&townConnection.connected(),'automatic browser reconnect');assert.equal(townConnection.snapshot().resident.id,bs.resident.id);
 townConnection.stop();const count=browserSockets.length;let release;globalThis.fetch=()=>new Promise(resolve=>release=resolve);townConnection.start();townConnection.stop();release(Response.json(value));await delay(100);assert.equal(browserSockets.length,count,'Logout during bootstrap must not open a socket');assert.equal(townConnection.snapshot().resident,undefined);
}finally{townConnection.stop();for(const ws of browserSockets)ws.terminate();globalThis.fetch=nativeFetch;globalThis.WebSocket=nativeSocket}
console.log('PASS: real WebSocket upgrades, auth/origin guards, movement and grass broadcasts, private-state isolation, device takeover, chat/DM notifications, replay protection, town transfer, logout, malformed/oversized frames, reconnect snapshots, actual client state delivery, automatic reconnect, and logout during bootstrap.');
}finally{for(const s of sockets)s.ws.terminate();d1.close()}
