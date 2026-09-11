import {DurableObject} from 'cloudflare:workers';
import {hash,type Call} from './Town';
import {HOMES,COLORS} from '../../app/game/data';
import {socialState,socialAction,messages} from '../../db/social';

type Member={id:string;town:string;identity:string};
type Transfer={id:string;source:string;destination:string;membership:number;home:number;key:string;row?:Record<string,any>;next?:Record<string,any>};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
// This small per-account object serializes joins, session revocations, and
// recoverable cross-town moves. Simulation/storage remain one object per town.
export class ResidentCoordinator extends DurableObject<Cloudflare.Env>{
 private tail:Promise<unknown>=Promise.resolve();
 private serial<T>(fn:()=>Promise<T>):Promise<T>{const p=this.tail.then(fn);this.tail=p.catch(()=>{});return p}
 private town(id:string){return this.env.TOWNS!.getByName(id) as unknown as import('./Town').Town}
 async establish(identity:string,session:string,expires:number){return this.serial(async()=>{const known=this.ctx.storage.kv.get<string>('identity');if(known&&known!==identity)throw new Error('Identity mismatch');this.ctx.storage.kv.put('identity',identity);for(const [key,expires]of this.ctx.storage.kv.list<number>({prefix:'session:'}))if(expires<Date.now())this.ctx.storage.kv.delete(key);this.ctx.storage.kv.put('session:'+session,expires)})}
 async revoke(session:string){return this.serial(async()=>{this.ctx.storage.kv.delete('session:'+session)})}
 async revokeAll(){return this.serial(async()=>{for(const [key] of this.ctx.storage.kv.list({prefix:'session:'}))this.ctx.storage.kv.delete(key)})}
 private async member(identity:string):Promise<Member|null>{const saved=this.ctx.storage.kv.get<Member>('member');if(saved)return saved;const row=await this.env.DB.prepare('SELECT id,town_id FROM residents WHERE token_hash=?').bind(await hash(identity)).first<{id:string;town_id:string}>();if(!row)return null;if(this.ctx.storage.kv.get('joining')){try{await this.town(row.town_id).admit(row.town_id,await this.env.DB.prepare('SELECT * FROM residents WHERE id=?').bind(row.id).first<Record<string,any>>() as Record<string,any>)}catch(e){if(/reached 50/.test((e as Error).message)){await this.env.DB.prepare('DELETE FROM residents WHERE id=? AND home IS NULL AND job IS NULL').bind(row.id).run();this.ctx.storage.kv.delete('joining');return null}throw e}this.ctx.storage.kv.delete('joining')}const m={id:row.id,town:row.town_id,identity};this.ctx.storage.kv.put('member',m);return m}
 async request(session:string,call:Call){return this.serial(async()=>{
  if(this.ctx.storage.kv.get<string>('identity')!==call.identity||(this.ctx.storage.kv.get<number>('session:'+session)??0)<=Date.now())return json({error:'Please log in again.'},401);
  let member=await this.member(call.identity);
  if(this.ctx.storage.kv.get('transfer')){await this.resumeMove(member!);member=this.ctx.storage.kv.get<Member>('member')!;}
  let b:Record<string,any>={};if(call.method==='POST'){try{b=JSON.parse(call.body??'{}')}catch{return json({error:'Invalid request.'},400)}}
  if(!member){if(call.path==='/api/game'&&call.method==='GET')return json({resident:null});if(call.path!=='/api/game'||b.action!=='join')return json({error:'Join a town first.'},401);try{member=await this.join(call.identity,b)}catch(e){return json({error:(e as Error).message},409)}}
  if(call.path==='/api/game'&&b.action==='move-options')return this.options(member,b);
  if(call.path==='/api/game'&&b.action==='move-town'){
   if(b.fromTown!==member.town||typeof b.destination!=='string'||b.destination===member.town||!HOMES.some(h=>h.id===b.home)||!Number.isInteger(b.membership))return json({error:'Choose another town and a vacant address.'},400);
   const transfer:Transfer={id:crypto.randomUUID(),source:member.town,destination:b.destination,membership:b.membership,home:b.home,key:String(b.key??'').trim().toUpperCase()};
   // Persist intent before the first remote call. Any following request resumes.
   this.ctx.storage.kv.put('transfer',transfer);
   try{await this.resumeMove(member)}catch(e){return json({error:(e as Error).message,refreshTown:true},409)}
   member=this.ctx.storage.kv.get<Member>('member')!;call={...call,method:'GET',body:undefined};
  }
  if(call.path==='/api/social')return this.social(member,call,b);
  return this.town(member.town).handle(member.town,call);
 })}
 private async join(identity:string,b:Record<string,any>){
  const pending=this.ctx.storage.kv.get<{town:string;row?:Record<string,any>}>('joining');
  let town=pending?.town;
  const name=String(b.name??'').trim().slice(0,24);if(name.length<2)throw new Error('Please enter a name with at least two letters.');
  if(!town){if(b.mode==='private'){
   town=crypto.randomUUID();await this.env.DB.prepare('INSERT INTO towns(id,name,invite,private,created) VALUES(?,?,?,?,?)').bind(town,String(b.townName||`${name}’s Hollow`).trim().slice(0,32),crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),1,Date.now()).run();
  }else if(b.mode==='key'){
   const found=await this.env.DB.prepare('SELECT id FROM towns WHERE invite=?').bind(String(b.key??'').trim().toUpperCase()).first<{id:string}>();if(!found)throw new Error('No town has that invitation key.');town=found.id;
  }else{
   await this.env.DB.prepare("INSERT OR IGNORE INTO towns(id,name,private,created) VALUES('willowbrook','Willowbrook',0,?)").bind(Date.now()).run();
   const found=await this.env.DB.prepare('SELECT t.id FROM towns t LEFT JOIN residents r ON r.town_id=t.id WHERE t.private=0 GROUP BY t.id HAVING COUNT(r.id)<50 ORDER BY COUNT(r.id) DESC,t.created LIMIT 1').first<{id:string}>();town=found?.id;
   if(!town){town=crypto.randomUUID();await this.env.DB.prepare('INSERT INTO towns(id,name,private,created) VALUES(?,?,0,?)').bind(town,'Willowbrook '+Date.now().toString().slice(-4),Date.now()).run()}
  }this.ctx.storage.kv.put('joining',{town});}
  const identityHash=await hash(identity);
  let row=pending?.row??await this.env.DB.prepare('SELECT * FROM residents WHERE token_hash=?').bind(identityHash).first<Record<string,any>>();
  if(!row){row=await this.env.DB.prepare('INSERT INTO residents(id,token_hash,town_id,name,color,seen,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM residents WHERE town_id=?)<50 RETURNING *').bind(crypto.randomUUID(),identityHash,town,name,COLORS.includes(b.color)?b.color:COLORS[0],Date.now(),Date.now(),town).first<Record<string,any>>();if(!row){this.ctx.storage.kv.delete('joining');throw new Error('This town has reached 50 residents. Choose another town.')}}
  this.ctx.storage.kv.put('joining',{town,row});try{await this.town(town).admit(town,row)}catch(e){if(/reached 50/.test((e as Error).message)){await this.env.DB.prepare('DELETE FROM residents WHERE id=? AND home IS NULL AND job IS NULL').bind(row.id).run();this.ctx.storage.kv.delete('joining')}throw e}
  const m={id:row.id,town,identity};this.ctx.storage.kv.put('member',m);this.ctx.storage.kv.delete('joining');return m;
 }
 private async options(m:Member,b:Record<string,any>){
  if(b.mode==='public'){
   const towns=(await this.env.DB.prepare('SELECT t.id FROM towns t LEFT JOIN residents r ON r.town_id=t.id WHERE t.private=0 AND t.id<>? GROUP BY t.id HAVING COUNT(r.id)<50 ORDER BY COUNT(r.id) DESC LIMIT 12').bind(m.town).all<{id:string}>()).results;
   const summaries=await Promise.all(towns.map(async t=>{const s=await this.town(t.id).summary(t.id);return {id:t.id,name:s.name,private:s.private,project:s.project,farm_funded:s.farm_funded,residents:s.residents,online:s.online}}));return json({towns:summaries.filter(t=>t.residents<50)});
  }
  const key=String(b.key??'').trim().toUpperCase();const t=await this.env.DB.prepare("SELECT id FROM towns WHERE id<>? AND ((?<>'' AND invite=?) OR (?='' AND private=0 AND id=?))").bind(m.town,key,key,key,String(b.destination??'')).first<{id:string}>();if(!t)return json({error:'No other town matches that code.'},404);
  const s=await this.town(t.id).summary(t.id);if(s.residents>=50)return json({error:'That town has 50 residents.'},409);return json({destination:{id:t.id,name:s.name,private:s.private,project:s.project,farm_funded:s.farm_funded,residents:s.residents,online:s.online},homes:HOMES.filter(h=>!s.occupied.includes(h.id)).map(h=>({id:h.id,name:h.name}))});
 }
 private async resumeMove(m:Member){
  const tx=this.ctx.storage.kv.get<Transfer>('transfer')!;
  if(!tx.row){try{tx.row=await this.town(tx.source).freeze(tx.source,m.identity,tx.id,tx.membership);this.ctx.storage.kv.put('transfer',tx)}catch(e){if(/Step outside/.test((e as Error).message))this.ctx.storage.kv.delete('transfer');throw e}}
  if(!tx.next){try{tx.next=await this.town(tx.destination).reserve(tx.destination,tx.row!,tx.id,tx.home,tx.key);this.ctx.storage.kv.put('transfer',tx)}catch(e){
   // Only a definitive validation failure may cancel. Transport failures retain
   // intent: the destination might already have reserved the home.
   if(/filled up|town code|Town not found/.test((e as Error).message)){await this.town(tx.source).cancel(tx.source,tx.id);this.ctx.storage.kv.delete('transfer')}throw e;
  }}
  const row=tx.next!,columns=Object.keys(row).filter(k=>k!=='id');
  await this.env.DB.prepare(`UPDATE residents SET ${columns.map(c=>`"${c}"=?`).join(',')} WHERE id=? AND town_id IN (?,?)`).bind(...columns.map(c=>row[c]),m.id,tx.source,tx.destination).run();
  await this.town(tx.source).depart(tx.source,tx.id,tx.destination);
  await this.town(tx.destination).activate(tx.destination,tx.id);
  this.ctx.storage.kv.put('member',{...m,town:tx.destination});this.ctx.storage.kv.delete('transfer');
 }
 private async social(m:Member,call:Call,b:Record<string,any>){
  const local=await this.town(m.town).resident(m.town,m.identity);if(!local||local.home===null)return json({error:'Choose a home first.'},401);
  const localActions=['access','invite','dismiss'];
  if(call.method==='POST'&&localActions.includes(b.action))return this.town(m.town).handle(m.town,call);
  // Friendships and DMs span towns, so these remain in the shared directory.
  // Refresh only the profile used by this explicit social request.
  if(call.method==='POST')await this.env.DB.prepare('UPDATE residents SET name=?,color=?,home=?,home_access=?,inside=?,seen=?,house=? WHERE id=? AND town_id=?').bind(local.name,local.color,local.home,local.home_access,local.inside,local.seen,local.house,m.id,m.town).run();
  if(call.method==='POST'){
   if(b.town!==m.town)return json({error:'Your town changed. Reopen neighbors.'},409);
   const target=typeof b.to==='string'?await this.env.DB.prepare('SELECT town_id,token_hash FROM residents WHERE id=?').bind(b.to).first<{town_id:string;token_hash:string}>():null;
   if(b.action==='request'&&target?.town_id===m.town){const summary=await this.town(m.town).handle(m.town,{...call,method:'GET',body:undefined});const live=await summary.json() as any;const person=live.people?.find((p:any)=>p.id===b.to);if(person)await this.env.DB.prepare('UPDATE residents SET home=?,seen=?,home_access=? WHERE id=? AND town_id=?').bind(person.home,person.seen,person.access,b.to,m.town).run()}
   const error=await socialAction(this.env.DB,local as any,b);if(error)return json(error,error.status);
   if(['request','accept','remove'].includes(b.action)){await this.town(m.town).syncFriends(m.town);if(target&&target.town_id!==m.town)await this.town(target.town_id).syncFriends(target.town_id)}return json({saved:true});
  }
  const to=new URL(call.url).searchParams.get('to');if(to){const result=await messages(this.env.DB,local as any,to);return json(result,'status'in result?result.status:200)}
  const [links,unread]=await this.env.DB.batch([this.env.DB.prepare('SELECT f.requester,f.accepted,r.id,r.name,r.color,r.home,r.home_access AS access,r.inside,r.seen,r.town_id AS town FROM friendships f JOIN residents r ON r.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY r.name').bind(m.id,m.id,m.id),this.env.DB.prepare('SELECT sender,COUNT(*) AS count FROM direct_messages WHERE recipient=? AND read=0 AND EXISTS(SELECT 1 FROM friendships WHERE a=MIN(sender,recipient) AND b=MAX(sender,recipient) AND accepted=1) GROUP BY sender').bind(m.id)]);const global={self:m.id,friends:links.results,unread:unread.results,now:Date.now()};const response=await this.town(m.town).handle(m.town,call);const current=await response.json() as any;const friends=global.friends as Record<string,any>[];const groups=new Map<string,string[]>();for(const friend of friends)groups.set(friend.town,[...(groups.get(friend.town)??[]),friend.id]);const profiles=(await Promise.all([...groups].map(([town,ids])=>this.town(town).profiles(town,ids)))).flat();return json({...global,friends:friends.map(f=>({...f,...profiles.find(p=>p.id===f.id)})),people:current.people,invitations:current.invitations,access:local.home_access});
 }
}
