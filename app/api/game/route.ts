import {movementOwner,claimMovement,presenceOnly} from '@/db/movementControl';
import {syncVisit,sharedRoom,indoorHeartbeat,visitHome} from '@/db/social';
import {interiorAction} from '@/db/interiors';
import {readInterior} from '@/app/game/interiors';
import {readSharedLife,sharedLifeAction} from '@/db/sharedLife';
import {petAction} from '@/db/pets';
import {movingOptions,moveTown} from '@/db/moving';
import {farmAction} from '@/db/townFarm';
import {maintainHomes,lifestyleAction} from '@/db/lifestyle';
import {parcelHomes,dayStart,DAY_MS,capacity} from '@/app/game/lifestyle';
import {readPlanning,planningAction} from '@/db/planning';
import {townLayout,FERRY_STOPS,nodeById,type PlanningState} from '@/app/game/charters';
import {syncGovernance,readCivic,civicAction,payPolicy} from '@/db/governance';
import {CIVIC_PROJECTS,workPay} from '@/app/game/civicProjects';
import {recordContribution} from '@/db/contributions';
import {readElection,electionAction} from '@/db/elections';
import {isTownBlocked,safeTownPosition,BUILDINGS,entrance} from '@/app/game/townLayout';
import {OUTFITS} from '@/app/game/outfits';
import {TARGET_BY_ID,WORK_DAY_MS,WORK_PAY,CAPACITY,STATIONS,type FieldJob} from '@/app/game/workTargets';
import {db} from '@/db/raw';
import {HOMES,JOBS,TASKS,SHOP,SCHOOL,PARK,COLORS,GRASS_REGROW_MS,sweptGrass} from '@/app/game/data';
type Row={move_owner:string;move_epoch:number;move_updated:number;visit_host:string|null;home_access:string;indoor_x:number;indoor_z:number;indoor_level:number;inside:number;interior:string;interior_revision:number;emote:string|null;emote_until:number;cat_pet:string|null;dog_pet:string|null;town_joined_at:number;house:string;upkeep_due:number;upkeep_note:string;riding:number;outfit:string;hat:string;accessory:string;planning?:PlanningState;id:string;token_hash:string;town_id:string;name:string;color:string;home:number|null;job:string|null;coins:number;xp:number;education:number;last_study:string|null;x:number;z:number;items:string;shift:FieldJob|null;papers:number;parcels:number;water:number;bag:number;action_target:string|null;action_started:number;mowing:number;seen:number;created:number};
const json=(body:unknown,status=200,cookie?:string)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('')}
async function auth(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)return null;let r=await db().prepare('SELECT * FROM residents WHERE token_hash=?').bind(await hash(id)).first<Row>();if(r){await maintainHomes(db(),r.town_id,Date.now());r=(await db().prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;r=await syncVisit(db(),r) as Row;r.planning=await readPlanning(db(),r.town_id,r.id);}
if(r&&isTownBlocked(r.x,r.z,townLayout(r.planning!))){const p=safeTownPosition(r.x,r.z,townLayout(r.planning!));await db().prepare('UPDATE residents SET x=?,z=? WHERE id=? AND x=? AND z=?').bind(p.x,p.z,r.id,r.x,r.z).run();return await db().prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>()}return r}
async function state(r:Row){const d=db();r=await syncVisit(d,r) as Row;const now=Date.now(),planning=r.planning??await readPlanning(d,r.town_id,r.id,now);await syncGovernance(d,r.town_id,now);const [town,people,completed,history,grass,worldWork,election,civic,life]=await Promise.all([d.prepare('SELECT * FROM towns WHERE id=?').bind(r.town_id).first<any>(),d.prepare('SELECT id,name,color,home,inside,emote,emote_until AS emoteUntil,items,cat_pet,dog_pet,house,riding,outfit,hat,accessory,x,z,seen,mowing,shift,papers,parcels,water,bag,action_target,action_started FROM residents WHERE town_id=?').bind(r.town_id).all<any>(),d.prepare('SELECT task FROM work WHERE town_id=? AND completed>?').bind(r.town_id,now-120000).all<{task:string}>(),d.prepare('SELECT name,text FROM events WHERE town_id=? ORDER BY created DESC LIMIT 6').bind(r.town_id).all(),d.prepare('SELECT cell,cut_at FROM lawn_cells WHERE town_id=?').bind(r.town_id).all<{cell:string;cut_at:number}>(),d.prepare("SELECT object_id AS id,target_id AS target,completed FROM world_work WHERE town_id=? AND ((object_id LIKE 'parcel-%' AND completed>=?) OR (object_id NOT LIKE 'parcel-%' AND completed>?))").bind(r.town_id,dayStart(now),now-WORK_DAY_MS).all(),readElection(d,r,now),readCivic(d,r.town_id),readSharedLife(d,r.town_id,r.id,now)]);return {room:await sharedRoom(d,r,now),election,civic,planning,life,resident:{moveOwner:r.move_owner,moveEpoch:r.move_epoch,moveUpdated:r.move_updated,visitHost:r.visit_host,homeAccess:r.home_access,indoorX:r.indoor_x,indoorZ:r.indoor_z,indoorLevel:r.indoor_level,inside:!!r.inside,interior:readInterior(r.interior),interiorRevision:r.interior_revision,emote:r.emote,emoteUntil:r.emote_until,catPet:r.cat_pet,dogPet:r.dog_pet,townJoinedAt:r.town_joined_at,house:r.house,upkeepDue:r.upkeep_due,upkeepNote:r.upkeep_note,riding:!!r.riding,outfit:r.outfit,hat:r.hat,accessory:r.accessory,id:r.id,name:r.name,color:r.color,home:r.home,job:r.job,coins:r.coins,xp:r.xp,education:r.education,lastStudy:r.last_study,x:r.x,z:r.z,items:JSON.parse(r.items),mowing:!!r.mowing,shift:r.shift,papers:r.papers,parcels:r.parcels,water:r.water,bag:r.bag,wateringTarget:r.action_target,wateringStarted:r.action_started},town:{id:town.id,name:town.name,private:!!town.private,key:town.invite??undefined,treasury:town.treasury,project:town.project,prosperity:Math.min(100,50+planning.institutions.reduce((sum,i)=>sum+(i.node==='root'?0:nodeById(i.node)?.parent==='root'?4:8),0)+planning.territories.length*2+CIVIC_PROJECTS.filter(p=>civic.projects.some(done=>done.id===p.id&&done.completed>0)).reduce((n,p)=>n+p.prosperity,0)+Math.floor(town.project/4)+completed.results.length*2+Math.floor(grass.results.filter(c=>c.cut_at>now-GRASS_REGROW_MS).length/8)+Math.floor(worldWork.results.length/6)),residents:people.results.length},peers:people.results.filter(p=>p.seen>now-12000&&!p.inside).map(({seen,home,items,action_target,action_started,...p})=>({...p,wateringTarget:action_target,wateringStarted:action_started})),properties:people.results.filter(p=>p.home!==null).map(p=>({id:p.id,catPet:p.cat_pet,dogPet:p.dog_pet,house:p.house,home:p.home,items:JSON.parse(p.items),name:p.name})),occupied:people.results.filter(p=>p.home!==null).map(p=>p.home),completed:completed.results.map(t=>t.task),worldWork:worldWork.results,parcelHomes:parcelHomes(r.town_id,now),parcelResets:dayStart(now)+DAY_MS,townCreated:town.created,grassHistory:grass.results,lawnCuts:grass.results.filter(c=>c.cut_at>now-GRASS_REGROW_MS).map(c=>c.cell),events:history.results}}
export async function GET(req:Request){try{const r=await auth(req);return json(r?await state(r):{resident:null})}catch(e){console.error('town state',e);return json({error:'The town is taking a moment to connect. Please try again.'},503)}}
export async function POST(req:Request){try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return json({error:'Please use this town’s own game page.'},403);const b=await req.json() as Record<string,any>;const d=db(),now=Date.now();let r=await auth(req);
if(b.action==='join'){const account=req.headers.get('oai-authenticated-user-id');if(!account)return json({error:'Sign in to keep your resident and town saved across devices.'},401);if(r)return json(await state(r));const name=String(b.name??'').trim().slice(0,24);if(name.length<2)return json({error:'Please enter a name with at least two letters.'},400);let townId:string;const mode=b.mode;if(mode==='private'){townId=crypto.randomUUID();const invite=token().slice(0,16).toUpperCase();await d.prepare('INSERT INTO towns(id,name,invite,private,created) VALUES(?,?,?,?,?)').bind(townId,String(b.townName||`${name}’s Hollow`).trim().slice(0,32),invite,1,now).run()}else if(mode==='key'){const town=await d.prepare('SELECT id FROM towns WHERE invite=?').bind(String(b.key??'').trim().toUpperCase()).first<{id:string}>();if(!town)return json({error:'No town has that invitation key. Check it and try again.'},404);townId=town.id}else{await d.prepare("INSERT OR IGNORE INTO towns(id,name,private,created) VALUES('willowbrook','Willowbrook',0,?)").bind(now).run();const town=await d.prepare('SELECT t.id FROM towns t LEFT JOIN residents r ON r.town_id=t.id WHERE t.private=0 GROUP BY t.id HAVING COUNT(r.id)<50 ORDER BY COUNT(r.id) DESC,t.created LIMIT 1').first<{id:string}>();if(town)townId=town.id;else{townId=crypto.randomUUID();await d.prepare('INSERT INTO towns(id,name,private,created) VALUES(?,?,0,?)').bind(townId,`Willowbrook ${now.toString().slice(-4)}`,now).run()}}
const id=crypto.randomUUID();const result=await d.prepare('INSERT INTO residents(id,token_hash,town_id,name,color,seen,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM residents WHERE town_id=?)<50 RETURNING *').bind(id,await hash(account),townId,name,COLORS.includes(b.color)?b.color:COLORS[0],now,now,townId).first<Row>();if(!result)return json({error:'This town has reached 50 residents. Please choose another town.'},409);return json(await state(result))}
if(!r)return json({error:'Join a town or enter your resident pass first.'},401);
if(b.townId!==undefined&&b.townId!==r.town_id)return json({error:'Your resident has moved. Loading your current town.',refreshTown:true},409);
if(b.membership!==undefined&&b.action!=='move-town'&&b.membership!==r.town_joined_at)return json({error:'Your town membership changed. Loading your current town.',refreshTown:true},409);
if(b.action==='movement-control'){const controlAccepted=await claimMovement(d,r,b,now);r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;return json({...await state(r),controlAccepted});}
if(b.action==='heartbeat'&&!movementOwner(r,b)){await presenceOnly(d,r,now);r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;return json({...await state(r),controlFollower:true});}
if(r.inside&&b.action==='heartbeat'){await indoorHeartbeat(d,r,b,now);r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;return json(await state(r));}
if(r.inside&&!['home-enter','home-exit','home-place','home-store','home-finish','home-visit','life-emote'].includes(b.action))return json({error:'Step outside to take part in town activities.'},409);
if(b.action==='move-options'){const options=await movingOptions(d,r,b,now);return json(options,'status'in options?options.status:200);}
const policy=['heartbeat','use','finish'].includes(b.action)?(await syncGovernance(d,r.town_id,now),await payPolicy(d,r.town_id)):null;
if(b.action==='home-visit'){const error=await visitHome(d,r,b,now);if(error)return json(error,error.status);}
else if(['home-enter','home-exit','home-place','home-store','home-finish'].includes(b.action)){const error=await interiorAction(d,r,b,now);if(error)return json(error,error.status);}
else if(['life-emote','life-picnic','life-basket','life-plant','life-water','life-harvest'].includes(b.action)){const error=await sharedLifeAction(d,r,b,now);if(error)return json(error,error.status);}
else if(b.action==='pet'){const error=await petAction(d,r,b);if(error)return json(error,error.status);}
else if(b.action==='move-town'){const error=await moveTown(d,r,b,now);if(error)return json(error,error.status);}
else if(b.action==='fund-farm'){const error=await farmAction(d,r,b,now);if(error)return json(error,error.status);r!.planning=undefined;}
else if(['house','move-home','bike','wardrobe'].includes(b.action)){const error=await lifestyleAction(d,r,b,now);if(error)return json(error,error.status);}
else if(['plan-propose','plan-vote','plan-fund','plan-place'].includes(b.action)){const error=await planningAction(d,r,b,now);if(error)return json({error:error.error},error.status);}
else if(b.action==='ferry'){const planning=r.planning??await readPlanning(d,r.town_id,r.id,now);if(!planning.territories.includes('island'))return json({error:'The town must approve and fund Sunrise Island first.'},409);const from=FERRY_STOPS.findIndex(p=>Math.hypot(p.x-r!.x,p.z-r!.z)<=2);if(from<0)return json({error:'Visit a ferry landing to board.'},400);const to=FERRY_STOPS[1-from];await d.prepare('UPDATE residents SET x=?,z=?,seen=?,riding=0,shift=NULL,mowing=0,action_target=NULL,action_started=0 WHERE id=?').bind(to.x,to.z,now,r.id).run();}
else if(['set-tax','fund-project','feature-project','support-project'].includes(b.action)){const error=await civicAction(d,r,b,now);if(error)return json({error:error.error},error.status);}
else if(b.action==='setup'){const job=JOBS.find(j=>j.id===b.job);const h=HOMES.find(h=>h.id===b.home);if(!job||!h)return json({error:'Choose one of the available jobs and homes.'},400);if(r.home!==null)return json(await state(r));try{await d.prepare('UPDATE residents SET job=?,home=? WHERE id=? AND home IS NULL').bind(job.id,h.id,r.id).run()}catch{return json({error:'A neighbor just chose that home. Please choose another.'},409)}await d.prepare('INSERT INTO events(id,town_id,name,text,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),r.town_id,r.name,`moved into ${h.name}`,now).run()}
else if(b.action==='nominate'||b.action==='vote'||b.action==='platform'){
 const error=await electionAction(d,r,b.action,b.cycle,b.candidate,now,b.platform,b.tax);if(error)return json({error:error.error},error.status);
}
else if(b.action==='invite'){
 await d.prepare('UPDATE towns SET invite=COALESCE(invite,?) WHERE id=?').bind(token().slice(0,16).toUpperCase(),r.town_id).run();
}
else if(b.action==='mower'){
 if(r.home===null)return json({error:'Choose your home and job first.'},400);
 await d.prepare('UPDATE residents SET mowing=?,riding=0,shift=NULL,action_target=NULL,action_started=0 WHERE id=?').bind(b.active===true?1:0,r.id).run();
}
else if(b.action==='shift'){
 if(r.home===null)return json({error:'Choose your home and job first.'},400);
 const shift=b.job===null?null:JOBS.find(j=>j.id===b.job&&j.id!=='mow')?.id;
 if(shift===undefined)return json({error:'Choose one of the available jobs.'},400);
 await d.prepare('UPDATE residents SET shift=?,riding=0,mowing=0,action_target=NULL,action_started=0 WHERE id=?').bind(shift,r.id).run();
}
else if(b.action==='cancel-water'){
 await d.prepare('UPDATE residents SET action_target=NULL,action_started=0 WHERE id=?').bind(r.id).run();
}
else if(b.action==='refill'){
 const station=STATIONS.find(s=>s.id===b.station);if(!station||!r.shift||!station.jobs.includes(r.shift)||Math.hypot(r.x-station.x,r.z-station.z)>2)return json({error:'Visit the matching supply or recycling station to refill.'},400);
 const column={paper:'papers',deliver:'parcels',garden:'water',clean:'bag'}[r.shift],amount=r.shift==='clean'?0:capacity(r.shift,JSON.parse(r.items));
 await d.prepare(`UPDATE residents SET ${column}=? WHERE id=? AND shift=?`).bind(amount,r.id,r.shift).run();
}
else if(b.action==='water-start'||b.action==='use'){
 const target=TARGET_BY_ID.get(String(b.target));
 if(!target||r.shift!==target.job||r.mowing||Math.hypot(r.x-target.x,r.z-target.z)>2)return json({error:'Start the matching job and get close to that object.'},400);
 if(target.job==='deliver'&&!parcelHomes(r.town_id,now).includes(target.home!))return json({error:'This home has no parcel on today’s route.'},409);
 const field={paper:'papers',deliver:'parcels',garden:'water',clean:'bag'}[target.job];
 if(target.job==='clean'?r.bag>=capacity('clean',JSON.parse(r.items)):r[field as 'papers'|'parcels'|'water']<1)return json({error:target.job==='clean'?'Your bag is full. Empty it at the recycling station.':'You are out of supplies. Visit the supply stand or fountain to refill.'},409);
 if(b.action==='water-start'){
  if(target.job!=='garden')return json({error:'Choose a flower bed to water.'},400);
  if(await d.prepare('SELECT key FROM world_work WHERE key=? AND completed>?').bind(`${r.town_id}:${target.group}`,now-WORK_DAY_MS).first())return json({error:'This bed has already been watered today.'},409);
  if(r.action_target!==target.id||r.action_started<now-15000)await d.prepare("UPDATE residents SET action_target=?,action_started=? WHERE id=? AND shift='garden'").bind(target.id,now,r.id).run();
 }else{
  if(target.job==='garden'&&(r.action_target!==target.id||now-r.action_started<2000||now-r.action_started>15000))return json({error:'Keep watering this bed for two seconds to soak the soil.'},400);
  const wage=workPay(WORK_PAY[target.job]-(r.job===target.job?0:1),policy!.tax,policy!.bonus),pay=wage.coins,xp=target.job==='garden'?3:2;
  const supplyCheck=target.job==='clean'?`bag<${capacity('clean',JSON.parse(r.items))}`:`${field}>0`;
  const waterCheck=target.job==='garden'?`AND action_target=? AND action_started=?`:'';
  const claim=d.prepare(`INSERT INTO world_work(key,town_id,object_id,target_id,completed) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM residents WHERE id=? AND shift=? AND mowing=0 AND ${supplyCheck} AND (x-?)*(x-?)+(z-?)*(z-?)<=4 ${waterCheck}) ON CONFLICT(key) DO UPDATE SET target_id=excluded.target_id,completed=excluded.completed WHERE world_work.completed<?`).bind(`${r.town_id}:${target.group}`,r.town_id,target.group,target.id,now,r.id,target.job,target.x,target.x,target.z,target.z,...(target.job==='garden'?[target.id,r.action_started]:[]),target.job==='deliver'?dayStart(now):now-WORK_DAY_MS);
  const results=await d.batch([claim,d.prepare(`UPDATE residents SET coins=coins+?,xp=xp+?,${field}=${field}${target.job==='clean'?'+1':'-1'},action_target=NULL,action_started=0 WHERE id=? AND changes()=1`).bind(pay,xp,r.id),d.prepare('UPDATE towns SET treasury=treasury+? WHERE id=? AND changes()=1').bind(wage.tax,r.town_id),recordContribution(d,r,now,target.job,xp,wage.tax)]);
  if(!results[0].meta.changes)return json({error:'A neighbor already took care of this one, or you moved away. Try another.'},409);
  r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;
  return json({...await state(r),workReward:{coins:pay,tax:wage.tax,xp,target:target.id,job:target.job}});
 }
}
else if(b.action==='heartbeat'){
 const x=Number(b.x),z=Number(b.z);
 if(!Number.isFinite(x)||!Number.isFinite(z)||x< -117||x>113||z< -97||z>99)return json({error:'Stay inside the town boundary.'},400);
 const elapsed=Math.max(.1,Math.min((now-(r.move_updated||r.seen))/1000,3));
 const layout=townLayout(r.planning??await readPlanning(d,r.town_id,r.id,now));const blocked=(x:number,z:number)=>isTownBlocked(x,z,layout);
 const trail=Array.isArray(b.path)?b.path:[];
 if(trail.length>32||trail.some((p:any)=>!p||typeof p.x!=='number'||typeof p.z!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x< -117||p.x>113||p.z< -97||p.z>99))return json({error:'That movement path is not valid.'},400);
 const path=[{x:r.x,z:r.z},...trail,{x,z}],segments=path.slice(1).map((p,i)=>({a:path[i],b:p}));
 const distance=segments.reduce((n,{a,b})=>n+Math.hypot(b.x-a.x,b.z-a.z),0);
 const allowed=distance<=6*elapsed+1&&segments.every(({a,b})=>{const samples=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25));return Array.from({length:samples},(_,i)=>{const t=(i+1)/samples;return !blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)}).every(Boolean)});
 // Only the request which advances this saved position may cut its path.
 const standing=r.emote==='sit'&&allowed&&distance>.05;
 const moved=await d.prepare('UPDATE residents SET emote=CASE WHEN ? THEN NULL ELSE emote END,emote_until=CASE WHEN ? THEN 0 ELSE emote_until END,x=?,z=?,seen=MAX(seen,?),move_updated=MAX(?,move_updated+1) WHERE id=? AND town_id=? AND town_joined_at=? AND inside=0 AND move_updated=? AND x=? AND z=? AND move_owner=? AND move_epoch=? RETURNING *').bind(standing?1:0,standing?1:0,allowed?x:r.x,allowed?z:r.z,now,now,r.id,r.town_id,r.town_joined_at,r.move_updated,r.x,r.z,r.move_owner,r.move_epoch).first<Row>();
 let cut=0;const mowWage=workPay(r.job==='mow'?2:1,policy!.tax,policy!.bonus);
 if(moved&&allowed&&distance>.05&&r.mowing&&now-(r.move_updated||r.seen)<4000){
  const patches=[...new Map(segments.flatMap(({a,b})=>sweptGrass(a.x,a.z,b.x,b.z)).filter(c=>!blocked(c.x,c.z)).map(c=>[c.id,c])).values()];
  if(patches.length){const pay=mowWage.coins;const statements=patches.flatMap(c=>[
   d.prepare('INSERT INTO lawn_cells(key,town_id,cell,cut_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET cut_at=excluded.cut_at WHERE lawn_cells.cut_at<?').bind(`${r!.town_id}:${c.id}`,r!.town_id,c.id,now,now-GRASS_REGROW_MS),
   d.prepare('UPDATE residents SET coins=coins+?,xp=xp+1 WHERE id=? AND changes()=1').bind(pay,r!.id),
   d.prepare('UPDATE towns SET treasury=treasury+? WHERE id=? AND changes()=1').bind(mowWage.tax,r!.town_id),
   recordContribution(d,r!,now,'mow',1,mowWage.tax)
  ]);const results=await d.batch(statements);cut=results.filter((_,i)=>i%4===0).reduce((n,v)=>n+v.meta.changes,0);}
 }
 r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;
 return json({...await state(r),corrected:!allowed||!moved,mowReward:cut?{patches:cut,coins:cut*mowWage.coins,tax:cut*mowWage.tax}:null});
}
else if(b.action==='begin'){if(r.home===null)return json({error:'Choose a home and job first.'},400);const t=TASKS.find(t=>t.id===b.task);if(t?.job==='mow')return json({error:'Hop on a mower and drive over fresh grass to earn your pay.'},400);if(!t||Math.hypot(t.x-r.x,t.z-r.z)>2.7)return json({error:'Walk a little closer to the work site.'},400);const key=`${r.town_id}:${t.id}`;const claim=await d.prepare('INSERT INTO work(key,town_id,task,resident_id,started) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET resident_id=excluded.resident_id,started=excluded.started,steps=0,last_step=0,completed=0 WHERE (work.completed>0 AND work.completed<?) OR (work.completed=0 AND MAX(work.started,work.last_step)<?) RETURNING *').bind(key,r.town_id,t.id,r.id,now,now-120000,now-60000).first();if(!claim){const existing=await d.prepare('SELECT * FROM work WHERE key=? AND resident_id=? AND completed=0').bind(key,r.id).first();if(!existing)return json({error:'A neighbor is taking care of this one. Try another nearby task.'},409);return json({work:existing})}return json({work:claim})}
else if(b.action==='step'){const t=TASKS.find(t=>t.id===b.task);if(t?.job==='mow')return json({error:'Hop on a mower and drive over fresh grass to earn your pay.'},400);if(!t||Math.hypot(t.x-r.x,t.z-r.z)>2.7)return json({error:'Stay near the work site to finish.'},400);const w=await d.prepare('UPDATE work SET steps=MIN(5,steps+1),last_step=? WHERE key=? AND resident_id=? AND completed=0 AND started>? AND last_step<? RETURNING *').bind(now,`${r.town_id}:${t.id}`,r.id,now-180000,now-600).first<any>();if(!w)return json({error:'Take a moment between actions, then try again.'},409);return json({work:w})}
else if(b.action==='finish'){const t=TASKS.find(t=>t.id===b.task);if(t?.job==='mow')return json({error:'Hop on a mower and drive over fresh grass to earn your pay.'},400);if(!t||Math.hypot(t.x-r.x,t.z-r.z)>2.7)return json({error:'Walk back to your task to finish.'},400);const key=`${r.town_id}:${t.id}`;const w=await d.prepare('SELECT * FROM work WHERE key=? AND resident_id=?').bind(key,r.id).first<any>();if(!w||w.steps<5||now-w.started<5000)return json({error:'Finish all five steps before collecting your pay.'},400);if(w.completed)return json({...await state(r),reward:null});const wage=workPay(r.job===t.job?29:24,policy!.tax,policy!.bonus),pay=wage.coins;await d.batch([d.prepare('UPDATE residents SET coins=coins+?,xp=xp+10 WHERE id=? AND EXISTS(SELECT 1 FROM work WHERE key=? AND resident_id=? AND completed=0)').bind(pay,r.id,key,r.id),d.prepare('UPDATE towns SET treasury=treasury+? WHERE id=? AND EXISTS(SELECT 1 FROM work WHERE key=? AND resident_id=? AND completed=0)').bind(wage.tax,r.town_id,key,r.id),d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM work WHERE key=? AND resident_id=? AND completed=0)').bind(crypto.randomUUID(),r.town_id,r.name,`finished ${t.title.toLowerCase()}`,now,key,r.id),d.prepare('UPDATE work SET completed=? WHERE key=? AND resident_id=? AND completed=0').bind(now,key,r.id),recordContribution(d,r,now,'task',10,wage.tax)]);r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;return json({...await state(r),reward:{coins:pay,xp:10,tax:wage.tax}})}
else if(b.action==='buy'){const item=SHOP.find(s=>s.id===b.item);if(!item)return json({error:'That item is not in the shop.'},400);const items=JSON.parse(r.items) as string[];if(items.includes(item.id))return json({error:'You already own this.'},409);const updated=await d.prepare('UPDATE residents SET coins=coins-?,items=json_insert(items,\'$[#]\',?) WHERE id=? AND coins>=? AND NOT EXISTS(SELECT 1 FROM json_each(residents.items) WHERE value=?) RETURNING *').bind(item.price,item.id,r.id,item.price,item.id).first<Row>();if(!updated)return json({error:'Save a few more coins for this one.'},409)}
else if(b.action==='outfit'){
 const outfit=OUTFITS.find(o=>o.id===b.outfit),door=entrance(BUILDINGS.find(b=>b.id==='clothing')!);
 if(!outfit)return json({error:'Choose an outfit from the clothing shop.'},400);
 if(Math.hypot(r.x-door.x,r.z-door.z)>2.5)return json({error:'Visit Thread & Thistle to try on or buy an outfit.'},400);
 const owns=`EXISTS(SELECT 1 FROM json_each(residents.items) WHERE value=?)`;
 const updated=await d.prepare(`UPDATE residents SET outfit='',color=?,coins=coins-CASE WHEN ${owns} THEN 0 ELSE ? END,items=CASE WHEN ${owns} OR ?=0 THEN items ELSE json_insert(items,'$[#]',?) END WHERE id=? AND coins>=CASE WHEN ${owns} THEN 0 ELSE ? END RETURNING *`).bind(outfit.color,outfit.id,outfit.price,outfit.id,outfit.price,outfit.id,r.id,outfit.id,outfit.price).first<Row>();
 if(!updated)return json({error:'Save a few more coins for this outfit.'},409);
}
else if(b.action==='donate'){if(r.coins<25)return json({error:'You need 25 coins to sponsor a garden bed.'},400);const town=await d.prepare('SELECT project FROM towns WHERE id=?').bind(r.town_id).first<{project:number}>();if(!town||town.project>=100)return json({error:'The pocket park is already open. Thank you!' },409);await d.batch([d.prepare('UPDATE residents SET coins=coins-25 WHERE id=? AND coins>=25 AND EXISTS(SELECT 1 FROM towns WHERE id=? AND project<100)').bind(r.id,r.town_id),d.prepare('UPDATE towns SET project=MIN(100,project+10) WHERE id=? AND project<100 AND changes()=1').bind(r.town_id),recordContribution(d,r,now,'donated',0,0)]);}
else if(b.action==='study'){if(Math.hypot(r.x-SCHOOL.x,r.z-SCHOOL.z)>3)return json({error:'Visit the school entrance for today’s lesson.'},400);if(b.answer!=='everyone')return json({error:'Try again: public projects belong to the whole town.'},400);const today=new Date().toISOString().slice(0,10);const updated=await d.prepare('UPDATE residents SET education=MIN(30,education+1),last_study=? WHERE id=? AND (last_study IS NULL OR last_study<>?) RETURNING *').bind(today,r.id,today).first();if(!updated)return json({error:'You have already completed today’s lesson. Come back tomorrow.'},409)}
else if(b.action==='job'){if(!JOBS.some(j=>j.id===b.job))return json({error:'Choose a job on the board.'},400);await d.prepare('UPDATE residents SET job=?,riding=0,mowing=0,shift=NULL,action_target=NULL,action_started=0 WHERE id=?').bind(b.job,r.id).run()}

else return json({error:'That town action is not available.'},400);
r=(await d.prepare('SELECT * FROM residents WHERE id=?').bind(r.id).first<Row>())!;return json(await state(r));
}catch(e){console.error('town action',e);return json({error:'That action could not be saved. Please try again.'},500)}}
