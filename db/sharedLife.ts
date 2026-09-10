import {CROPS,FARM_BEDS,FARM_ORDER,PICNIC,PICNIC_BASKET,BASKET_REWARD,GESTURES,cropById,type FarmPlot,type SharedLifeState} from '../app/game/sharedLife.ts';
import {TOWN_FARM} from '../app/game/townFarm.ts';
type Resident={id:string;town_id:string;town_joined_at:number;name:string;home:number|null;x:number;z:number;shift:string|null;mowing:number};
export async function readSharedLife(d:D1Database,town:string,resident:string,now:number):Promise<SharedLifeState>{
 const day=new Date(now).toISOString().slice(0,10);
 const [plots,pantry,basket,guests]=await Promise.all([
 d.prepare('SELECT plot_id AS id,crop,planted,watered,revision FROM farm_plots WHERE town_id=?').bind(town).all<FarmPlot>(),
 d.prepare('SELECT crop,amount FROM farm_pantry WHERE town_id=?').bind(town).all<{crop:string;amount:number}>(),
 d.prepare('SELECT completed FROM community_baskets WHERE town_id=? AND day=?').bind(town,day).first<{completed:number}>(),
 d.prepare('SELECT resident_id AS id,name FROM picnic_visits WHERE town_id=? AND day=? ORDER BY created').bind(town,day).all<{id:string;name:string}>()]);
 return {serverNow:now,plots:plots.results,pantry:Object.fromEntries(pantry.results.map(p=>[p.crop,p.amount])),basketCompleted:basket?.completed??0,picnicGuests:guests.results,visited:guests.results.some(p=>p.id===resident),resets:Date.parse(day+'T00:00:00Z')+86400000};
}
export async function sharedLifeAction(d:D1Database,r:Resident,b:Record<string,unknown>,now:number){
 const fail=(error:string,status=409)=>({error,status});
 if(r.home===null)return fail('Choose a home before joining town activities.',400);
 const day=new Date(now).toISOString().slice(0,10),isEmote=b.action==='life-emote';
 const target=isEmote?null:b.action==='life-picnic'?PICNIC:b.action==='life-basket'?FARM_ORDER:FARM_BEDS.find(p=>p.id===b.target);
 if(!isEmote&&!target)return fail('Choose a shared farm bed or the picnic spot.',400);
 if(!isEmote&&(r.shift||r.mowing))return fail('Finish your work shift, then take some time for yourself.');
 if(target&&Math.hypot(r.x-target.x,r.z-target.z)>2)return fail('Walk closer to this spot first.',400);
 if(isEmote&&!GESTURES.some(g=>g.id===b.gesture))return fail('Choose wave, cheer, or dance.',400);
 // Every claim rechecks town membership and physical position inside the same transaction.
 const guard=`EXISTS(SELECT 1 FROM residents WHERE id=? AND town_id=? AND town_joined_at=? AND home IS NOT NULL ${isEmote?'':`AND shift IS NULL AND mowing=0 AND (x-?)*(x-?)+(z-?)*(z-?)<=4`})`;
 const args=[r.id,r.town_id,r.town_joined_at,...(target?[target.x,target.x,target.z,target.z]:[])];
 const farmGuard=`EXISTS(SELECT 1 FROM towns WHERE id=? AND farm_funded>=?)`;
 const farmArgs=[r.town_id,TOWN_FARM.cost];
 const gesture=(kind:string)=>d.prepare(`UPDATE residents SET emote=?,emote_until=?,riding=0 WHERE id=? AND changes()=1`).bind(kind,now+5000,r.id);
 const event=(text:string)=>d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,text,now);
 if(isEmote){const result=await d.prepare(`UPDATE residents SET emote=?,emote_until=? WHERE id=? AND (emote='sit' OR emote_until<=?) AND ${guard}`).bind(b.gesture,now+5000,r.id,now+3000,...args).run();return result.meta.changes?null:fail('Give your last gesture a moment to finish.');}
 if(b.action==='life-picnic'){
  // Rejoining is a gesture; guest records are one resident per calendar day.
  const results=await d.batch([d.prepare(`INSERT OR IGNORE INTO picnic_visits(town_id,day,resident_id,name,created) SELECT ?,?,?,?,? WHERE ${guard}`).bind(r.town_id,day,r.id,r.name,now,...args),event('joined the neighborhood picnic'),d.prepare(`UPDATE residents SET emote=?,emote_until=?,riding=0 WHERE id=? AND ${guard}`).bind(b.stand===true?null:'sit',b.stand===true?0:now+600000,r.id,...args)]);
  return results[2].meta.changes?null:fail('Walk back to the picnic to join your neighbors.');
 }
 if(b.action==='life-basket'){
  const needs=CROPS.map(c=>`COALESCE((SELECT amount FROM farm_pantry WHERE town_id=? AND crop=?),0)>=?`).join(' AND ');
  const neededArgs=CROPS.flatMap(c=>[r.town_id,c.id,PICNIC_BASKET[c.id]]);
  const result=await d.batch([
   d.prepare(`INSERT OR IGNORE INTO community_baskets(town_id,day,completed) SELECT ?,?,? WHERE ${guard} AND ${farmGuard} AND ${needs}`).bind(r.town_id,day,now,...args,...farmArgs,...neededArgs),
   ...CROPS.map(c=>d.prepare('UPDATE farm_pantry SET amount=amount-? WHERE town_id=? AND crop=? AND changes()=1').bind(PICNIC_BASKET[c.id],r.town_id,c.id)),
   d.prepare('UPDATE towns SET treasury=treasury+? WHERE id=? AND changes()=1').bind(BASKET_REWARD,r.town_id),gesture('cheer'),event(`filled the picnic basket together · +${BASKET_REWARD} town coins`)]);
  return result[0].meta.changes?null:fail('Today’s basket is already filled, or the shared pantry still needs more produce.');
 }
 const crop=cropById(b.crop),revision=Number(b.revision);
 if(!Number.isSafeInteger(revision)||revision<0)return fail('Refresh this bed before tending it.',400);
 let claim:D1PreparedStatement,kind:string;
 if(b.action==='life-plant'){
  if(!crop)return fail('Choose one of the farm’s free seed varieties.',400);
  claim=d.prepare(`INSERT INTO farm_plots(town_id,plot_id,crop,planted,watered,revision) SELECT ?,?,?,?,0,1 WHERE ${guard} AND ${farmGuard} ON CONFLICT(town_id,plot_id) DO UPDATE SET crop=excluded.crop,planted=excluded.planted,watered=0,revision=farm_plots.revision+1 WHERE farm_plots.crop IS NULL AND farm_plots.revision=?`).bind(r.town_id,target!.id,crop.id,now,...args,...farmArgs,revision);
  // Existing empty beds retain their revision; an absent bed must have revision zero.
  if(revision>0)claim=d.prepare(`UPDATE farm_plots SET crop=?,planted=?,watered=0,revision=revision+1 WHERE town_id=? AND plot_id=? AND crop IS NULL AND revision=? AND ${guard} AND ${farmGuard}`).bind(crop.id,now,r.town_id,target!.id,revision,...args,...farmArgs);
  kind='plant';
 }else if(b.action==='life-water'){
  claim=d.prepare(`UPDATE farm_plots SET watered=?,revision=revision+1 WHERE town_id=? AND plot_id=? AND crop IS NOT NULL AND watered=0 AND revision=? AND ${guard} AND ${farmGuard}`).bind(now,r.town_id,target!.id,revision,...args,...farmArgs);kind='water';
 }else if(b.action==='life-harvest'){
  if(!crop)return fail('Refresh this crop before harvesting.',400);
  claim=d.prepare(`UPDATE farm_plots SET crop=NULL,planted=0,watered=0,revision=revision+1 WHERE town_id=? AND plot_id=? AND crop=? AND watered>0 AND watered<=? AND revision=? AND ${guard} AND ${farmGuard}`).bind(r.town_id,target!.id,crop.id,now-crop.minutes*60000,revision,...args,...farmArgs);kind='harvest';
 }else return fail('That town activity is unavailable.',400);
 const result=await d.batch([claim,...(kind==='harvest'?[d.prepare('INSERT INTO farm_pantry(town_id,crop,amount) SELECT ?,?,? WHERE changes()=1 ON CONFLICT(town_id,crop) DO UPDATE SET amount=amount+excluded.amount').bind(r.town_id,crop!.id,crop!.yield)]:[]),gesture(kind),...(kind==='harvest'?[event(`added ${crop!.yield} ${crop!.name.toLowerCase()} to the shared pantry`)]:[])]);
 return result[0].meta.changes?null:fail('This bed changed, is still growing, or the farm is not open yet. Check its latest state.');
}
