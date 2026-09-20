import {publicTownPage,townSummary} from './townDirectory.ts';
import {HOMES} from '../app/game/data.ts';
type Citizen={id:string;town_id:string;town_joined_at?:number;home:number|null;job:string|null;name:string};
export async function movingOptions(d:D1Database,r:Citizen,b:Record<string,unknown>,now=Date.now()){
 if(b.mode==='public'){
  const page=await publicTownPage(d,r.town_id,b.cursor);if('error' in page)return page;
  const towns=await Promise.all(page.towns.map(t=>townSummary(d,t.id,now)));
  return {towns:towns.filter(t=>t!==null&&!t.private),nextCursor:page.nextCursor};
 }
 const key=typeof b.key==='string'?b.key.trim().toUpperCase():'';
 const match=await d.prepare("SELECT id FROM towns WHERE id<>? AND ((?<>'' AND invite=?) OR (?='' AND private=0 AND id=?))").bind(r.town_id,key,key,key,typeof b.destination==='string'?b.destination:'').first<{id:string}>();
 const target=match?await townSummary(d,match.id,now):null;
 if(!target)return {error:'No other town matches. Check your friend’s code or choose a public town.',status:404};
 if(target.residents>=50)return {error:'That town has 50 residents. Your current home is safe; try another town.',status:409};
 const occupied=(await d.prepare('SELECT home FROM residents WHERE town_id=? AND home IS NOT NULL').bind(target.id).all<{home:number}>()).results.map(v=>v.home);
 return {destination:target,homes:HOMES.filter(h=>!occupied.includes(h.id)).map(h=>({id:h.id,name:h.name}))};
}
export async function moveTown(d:D1Database,r:Citizen,b:Record<string,unknown>,now=Date.now()){
 if(r.home===null||!r.job)return {error:'Choose your first home and job before moving towns.',status:400};
 if(b.fromTown!==r.town_id||b.membership!==(r.town_joined_at??0))return {error:'Your town changed. Refresh before planning another move.',status:409};
 if(typeof b.destination!=='string'||b.destination===r.town_id||!HOMES.some(h=>h.id===b.home))return {error:'Choose another town and a vacant address.',status:400};
 const key=typeof b.key==='string'?b.key.trim().toUpperCase():'';
 const stamp=Math.max(now,(r.town_joined_at??0)+1),departure=crypto.randomUUID(),arrival=crypto.randomUUID();
 const guard='EXISTS(SELECT 1 FROM events WHERE id=?)';
 const result=await d.batch([
  // Capacity, private access, home reservation and membership change are one write.
  d.prepare(`UPDATE residents SET inside=0,interior_revision=interior_revision+1,emote=NULL,emote_until=0,town_id=?,town_joined_at=?,home=?,x=0,z=6,seen=?,shift=NULL,mowing=0,riding=0,action_target=NULL,action_started=0 WHERE id=? AND town_id=? AND town_joined_at=? AND EXISTS(SELECT 1 FROM towns WHERE id=? AND (private=0 OR invite=?)) AND (SELECT COUNT(*) FROM residents WHERE town_id=?)<50 AND NOT EXISTS(SELECT 1 FROM residents WHERE town_id=? AND home=?)`).bind(b.destination,stamp,b.home,now,r.id,r.town_id,r.town_joined_at??0,b.destination,key,b.destination,b.destination,b.home),
  d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(departure,r.town_id,r.name,'moved to another town; their old address is now available',now),
  d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(arrival,b.destination,r.name,`arrived at ${HOMES.find(h=>h.id===b.home)!.name}. Welcome, neighbor!`,now),
  // Keep historical ballots and contributions, but never restore a departed campaign.
  d.prepare(`UPDATE election_candidates SET withdrawn_at=? WHERE town_id=? AND resident_id=? AND withdrawn_at=0 AND ${guard}`).bind(stamp,r.town_id,r.id,departure),
  d.prepare(`DELETE FROM work WHERE town_id=? AND resident_id=? AND completed=0 AND ${guard}`).bind(r.town_id,r.id,departure)
 ]);
 return result[0].meta.changes?null:{error:'That address or town filled up, or your membership changed. Nothing was moved. Refresh the available homes.',status:409};
}
