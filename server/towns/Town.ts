import {DurableObject} from 'cloudflare:workers';
import {townContext} from '../../db/context';
import {TownDatabase} from './sqlite';
import {migrate,townTables,upsert} from './schema';
import * as game from '../game';
import * as chat from '../chat';
import * as social from '../social';
import {syncVisit} from '../../db/social';

type Row=Record<string,any>;
export type Call={identity:string;path:string;method:string;body?:string;url:string};
export class Town extends DurableObject<Cloudflare.Env>{
 private database:TownDatabase;private tail:Promise<unknown>=Promise.resolve();private ready=false;private townId='';private profileDue=0;
 constructor(ctx:DurableObjectState,env:Cloudflare.Env){super(ctx,env);this.database=new TownDatabase(ctx.storage);migrate(ctx.storage)}
 private serial<T>(fn:()=>Promise<T>):Promise<T>{const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next}
 private rows(sql:string,...args:any[]){return this.ctx.storage.sql.exec(sql,...args).toArray() as Row[]}
 private async init(id:string){
  if(this.ready){if(id!==this.townId)throw new Error('Town identity mismatch');return}
  const saved=this.rows("SELECT value FROM _meta WHERE key='town'")[0];if(saved){if(saved.value!==id)throw new Error('Town identity mismatch');this.townId=id;this.ready=true;return}
  // One D1 batch is a consistent snapshot. No game writes use D1 after cutover.
  const statements=townTables.map(table=>this.env.DB.prepare(table==='towns'?'SELECT * FROM towns WHERE id=?':table==='plan_voters'?'SELECT * FROM plan_voters WHERE plan_id IN (SELECT id FROM town_plans WHERE town_id=?)':`SELECT * FROM ${table} WHERE town_id=?`).bind(id));
  const snapshots=await this.env.DB.batch(statements);if(!snapshots[0].results.length)throw new Error('Town not found');
  const residentIds=new Set<string>();for(const snap of snapshots)for(const row of snap.results as Row[])for(const [key,value]of Object.entries(row))if(['resident_id','voter_id','candidate_id','mayor_id','host','guest'].includes(key)&&typeof value==='string')residentIds.add(value);
  const locals=snapshots[townTables.indexOf('residents')].results as Row[];for(const r of locals)residentIds.delete(r.id);
  const historical:Row[]=[];for(const resident of residentIds){const row=await this.env.DB.prepare('SELECT * FROM residents WHERE id=?').bind(resident).first<Row>();if(row)historical.push(row)}
  const extraTowns:Row[]=[];for(const other of new Set(historical.map(r=>r.town_id).filter(t=>t!==id))){const row=await this.env.DB.prepare('SELECT * FROM towns WHERE id=?').bind(other).first<Row>();if(row)extraTowns.push(row)}
  this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec('PRAGMA defer_foreign_keys=ON');for(const row of extraTowns)upsert(this.ctx.storage,'towns',row);for(const row of historical)upsert(this.ctx.storage,'residents',row);for(let i=0;i<townTables.length;i++)for(const row of snapshots[i].results as Row[])upsert(this.ctx.storage,townTables[i],row);this.ctx.storage.sql.exec("INSERT INTO _meta VALUES('town',?)",id)});
  this.townId=id;this.ready=true;
  await this.friends();
 }
 private async friends(){
  const ids=this.rows('SELECT id FROM residents WHERE town_id=?',this.townId).map(r=>r.id);if(!ids.length)return;
  const placeholders=ids.map(()=>'?').join(',');
  const links=(await this.env.DB.prepare(`SELECT * FROM friendships WHERE a IN (${placeholders}) AND b IN (${placeholders})`).bind(...ids,...ids).all()).results as Row[];
  this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec('DELETE FROM friendships');for(const row of links)upsert(this.ctx.storage,'friendships',row)});
 }
 async syncFriends(id:string){return this.serial(async()=>{await this.init(id);await this.friends();for(const r of this.rows('SELECT * FROM residents WHERE town_id=? AND inside=1',id))await syncVisit(this.database.asD1(),r as any)})}
 async summary(id:string):Promise<{name:string;private:number;project:number;farm_funded:number;residents:number;online:number;occupied:number[]}>{return this.serial(async()=>{await this.init(id);const t=this.rows('SELECT * FROM towns WHERE id=?',id)[0];return {name:t.name,private:t.private,project:t.project,farm_funded:t.farm_funded,residents:this.rows('SELECT COUNT(*) AS n FROM residents WHERE town_id=?',id)[0].n,online:this.rows('SELECT COUNT(*) AS n FROM residents WHERE town_id=? AND seen>?',id,Date.now()-12000)[0].n,occupied:this.rows('SELECT home FROM residents WHERE town_id=? AND home IS NOT NULL',id).map(r=>r.home)}})}
 async profiles(id:string,ids:string[]){return this.serial(async()=>{await this.init(id);return this.rows('SELECT id,name,color,home,home_access AS access,inside,seen,town_id AS town FROM residents WHERE town_id=?',id).filter(r=>ids.includes(r.id))})}
 async resident(id:string,identity:string){return this.serial(async()=>{await this.init(id);return this.rows('SELECT * FROM residents WHERE token_hash=? AND town_id=?',await hash(identity),id)[0]??null})}
 async admit(id:string,row:Row){return this.serial(async()=>{await this.init(id);const old=this.rows('SELECT * FROM residents WHERE id=? AND town_id=?',row.id,id)[0];if(old)return old;if(this.rows('SELECT COUNT(*) AS n FROM residents WHERE town_id=?',id)[0].n>=50)throw new Error('This town has reached 50 residents.');upsert(this.ctx.storage,'residents',row);return row})}
 async handle(id:string,call:Call){return this.serial(async()=>{
  await this.init(id);const r=this.rows('SELECT * FROM residents WHERE token_hash=? AND town_id=?',await hash(call.identity),id)[0];if(!r)return Response.json({error:'Your resident has moved.',refreshTown:true},{status:409});
  if(this.rows("SELECT 1 FROM _transfers WHERE resident=? AND status='prepared'",r.id).length)return Response.json({error:'Your move is being completed. Please try again.',refreshTown:true},{status:409});
  const route=call.path==='/api/chat'?chat:call.path==='/api/social'?social:game;
  const req=new Request(call.url,{method:call.method,headers:{Origin:new URL(call.url).origin,'Content-Type':'application/json'},...(call.method==='POST'?{body:call.body}: {})});
  const response=await townContext.run({database:this.database.asD1(),identity:call.identity},()=>call.method==='POST'?route.POST(req):route.GET(req));
  if(call.method==='POST'&&JSON.parse(call.body??'{}').action==='invite'&&response.ok){const t=this.rows('SELECT invite FROM towns WHERE id=?',id)[0];await this.env.DB.prepare('UPDATE towns SET invite=? WHERE id=?').bind(t.invite,id).run()}
  // Low-frequency social directory only. Coins, movement, work, and town state
  // are never written back to D1. Alarm persistence survives object eviction.
  if(Date.now()>this.profileDue){this.profileDue=Date.now()+60000;await this.ctx.storage.setAlarm(Date.now()+1000)}
  return response;
 })}
 async alarm(){return this.serial(async()=>{const saved=this.rows("SELECT value FROM _meta WHERE key='town'")[0];if(!saved)return;try{const statements=this.rows('SELECT * FROM residents WHERE town_id=?',saved.value).map(r=>this.env.DB.prepare('UPDATE residents SET name=?,color=?,job=?,home=?,home_access=?,inside=?,seen=?,house=? WHERE id=? AND town_id=?').bind(r.name,r.color,r.job,r.home,r.home_access,r.inside,r.seen,r.house,r.id,saved.value));if(statements.length)await this.env.DB.batch(statements)}catch(error){console.error('Town directory sync failed',error);await this.ctx.storage.setAlarm(Date.now()+30000)}})}
 async freeze(id:string,identity:string,tx:string,membership:number){return this.serial(async()=>{await this.init(id);const old=this.rows('SELECT * FROM _transfers WHERE id=?',tx)[0];if(old)return JSON.parse(old.payload);const r=this.rows('SELECT * FROM residents WHERE token_hash=? AND town_id=?',await hash(identity),id)[0];if(!r||r.home===null||!r.job||r.inside||r.town_joined_at!==membership)throw new Error('Step outside and refresh your town before moving.');this.ctx.storage.sql.exec("INSERT INTO _transfers VALUES(?,?,'outgoing',?,'prepared')",tx,r.id,JSON.stringify(r));return r})}
 async reserve(id:string,row:Row,tx:string,home:number,key:string){return this.serial(async()=>{await this.init(id);const old=this.rows('SELECT * FROM _transfers WHERE id=?',tx)[0];if(old)return JSON.parse(old.payload);const t=this.rows('SELECT * FROM towns WHERE id=?',id)[0];if(t.private&&t.invite!==key)throw new Error('Check your destination town code.');if(this.rows('SELECT COUNT(*) AS n FROM residents WHERE town_id=?',id)[0].n>=50||this.rows('SELECT 1 FROM residents WHERE town_id=? AND home=?',id,home).length)throw new Error('That address or town filled up. Please choose another.');
 const next={...row,town_id:id,town_joined_at:Math.max(Date.now(),row.town_joined_at+1),home,inside:0,visit_host:null,indoor_level:0,interior_revision:row.interior_revision+1,x:0,z:6,seen:0,shift:null,mowing:0,riding:0,action_target:null,action_started:0,emote:null,emote_until:0,move_owner:'',move_epoch:row.move_epoch+1,move_updated:0};this.ctx.storage.transactionSync(()=>{upsert(this.ctx.storage,'residents',next);this.ctx.storage.sql.exec("INSERT INTO _transfers VALUES(?,?,'incoming',?,'prepared')",tx,row.id,JSON.stringify(next))});return next;
 })}
 async cancel(id:string,tx:string){return this.serial(async()=>{await this.init(id);this.ctx.storage.sql.exec("UPDATE _transfers SET status='cancelled' WHERE id=? AND kind='outgoing' AND status='prepared'",tx)})}
 async depart(id:string,tx:string,destination:string){return this.serial(async()=>{await this.init(id);const t=this.rows('SELECT * FROM _transfers WHERE id=?',tx)[0];if(!t||t.status==='done')return;const r=JSON.parse(t.payload);this.ctx.storage.transactionSync(()=>{
  // Retain a historical resident row for ballots and contribution references.
  this.ctx.storage.sql.exec("INSERT OR IGNORE INTO towns(id,name,private,created) VALUES(?, 'Former neighbors',1,?)",`departed:${destination}`,Date.now());
  this.ctx.storage.sql.exec('UPDATE residents SET town_id=?,home=NULL,seen=0,inside=0,visit_host=NULL WHERE id=?',`departed:${destination}`,r.id);
  this.ctx.storage.sql.exec('UPDATE election_candidates SET withdrawn_at=? WHERE town_id=? AND resident_id=? AND withdrawn_at=0',Date.now(),id,r.id);
  this.ctx.storage.sql.exec('DELETE FROM work WHERE resident_id=? AND completed=0',r.id);
  this.ctx.storage.sql.exec('DELETE FROM home_invitations WHERE host=? OR guest=?',r.id,r.id);
  this.ctx.storage.sql.exec('INSERT INTO events VALUES(?,?,?,?,?)',`depart:${tx}`,id,r.name,'moved to another town; their old address is now available',Date.now());
  this.ctx.storage.sql.exec("UPDATE _transfers SET status='done' WHERE id=?",tx);
 });for(const guest of this.rows('SELECT * FROM residents WHERE visit_host=? AND inside=1',r.id))await syncVisit(this.database.asD1(),guest as any);
 })}
 async activate(id:string,tx:string){return this.serial(async()=>{await this.init(id);const t=this.rows('SELECT * FROM _transfers WHERE id=?',tx)[0];if(!t||t.status==='done')return;const r=JSON.parse(t.payload);this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec('UPDATE residents SET seen=? WHERE id=?',Date.now(),r.id);this.ctx.storage.sql.exec('INSERT INTO events VALUES(?,?,?,?,?)',`arrive:${tx}`,id,r.name,'arrived in town. Welcome, neighbor!',Date.now());this.ctx.storage.sql.exec("UPDATE _transfers SET status='done' WHERE id=?",tx)});await this.friends()})}
}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
