import {HOMES} from '../app/game/data.ts';
type Citizen={id:string;town_id:string;town_joined_at?:number;home:number|null;job:string|null;name:string};
type Destination={id:string;name:string;private:number;project:number;farm_funded:number;residents:number;online:number};
const summary=`SELECT t.id,t.name,t.private,t.project,t.farm_funded,COUNT(r.id) AS residents,COUNT(CASE WHEN r.seen>? THEN 1 END) AS online FROM towns t LEFT JOIN residents r ON r.town_id=t.id`;
export async function movingOptions(d:D1Database,r:Citizen,b:Record<string,unknown>,now=Date.now()){
 if(b.mode==='public')return {towns:(await d.prepare(`${summary} WHERE t.private=0 AND t.id<>? GROUP BY t.id HAVING COUNT(r.id)<50 ORDER BY online DESC,residents DESC,t.created LIMIT 12`).bind(now-12000,r.town_id).all<Destination>()).results};
 const key=typeof b.key==='string'?b.key.trim().toUpperCase():'';
 const target=await d.prepare(`${summary} WHERE t.id<>? AND ((?<>'' AND t.invite=?) OR (?='' AND t.private=0 AND t.id=?)) GROUP BY t.id`).bind(now-12000,r.town_id,key,key,key,typeof b.destination==='string'?b.destination:'').first<Destination>();
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
  d.prepare(`UPDATE residents SET emote=NULL,emote_until=0,town_id=?,town_joined_at=?,home=?,x=0,z=6,seen=?,shift=NULL,mowing=0,riding=0,action_target=NULL,action_started=0 WHERE id=? AND town_id=? AND town_joined_at=? AND EXISTS(SELECT 1 FROM towns WHERE id=? AND (private=0 OR invite=?)) AND (SELECT COUNT(*) FROM residents WHERE town_id=?)<50 AND NOT EXISTS(SELECT 1 FROM residents WHERE town_id=? AND home=?)`).bind(b.destination,stamp,b.home,now,r.id,r.town_id,r.town_joined_at??0,b.destination,key,b.destination,b.destination,b.home),
  d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(departure,r.town_id,r.name,'moved to another town; their old address is now available',now),
  d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(arrival,b.destination,r.name,`arrived at ${HOMES.find(h=>h.id===b.home)!.name}. Welcome, neighbor!`,now),
  // Keep historical ballots and contributions, but never restore a departed campaign.
  d.prepare(`UPDATE election_candidates SET withdrawn_at=? WHERE town_id=? AND resident_id=? AND withdrawn_at=0 AND ${guard}`).bind(stamp,r.town_id,r.id,departure),
  d.prepare(`DELETE FROM work WHERE town_id=? AND resident_id=? AND completed=0 AND ${guard}`).bind(r.town_id,r.id,departure)
 ]);
 return result[0].meta.changes?null:{error:'That address or town filled up, or your membership changed. Nothing was moved. Refresh the available homes.',status:409};
}
