import {HOMES} from '../app/game/data.ts';
import {homeDoor,readInterior,FINISHES,furnitureById,placementIssue,fittedFurniture,type PlacedFurniture} from '../app/game/interiors.ts';
type Resident={id:string;town_id:string;town_joined_at:number;home:number|null;house:string;x:number;z:number;inside:number;interior:string;interior_revision:number};
export async function interiorAction(d:D1Database,r:Resident,b:Record<string,unknown>,now:number){
 const fail=(error:string,status=409)=>({error,status});
 if(r.home===null)return fail('Choose a home first.',400);
 const door=homeDoor(HOMES[r.home]);
 if(b.action==='home-enter'){
  if(r.inside)return null;
  if(b.home!==r.home)return fail('This door belongs to another resident.',403);
  if(Math.hypot(r.x-door.x,r.z-door.z)>1.9)return fail('Walk to your front door first.',400);
  const result=await d.prepare('UPDATE residents SET inside=1,interior_revision=interior_revision+1,mowing=0,shift=NULL,riding=0,action_target=NULL,action_started=0,emote=NULL,emote_until=0,seen=? WHERE id=? AND town_id=? AND town_joined_at=? AND home=? AND inside=0 AND (x-?)*(x-?)+(z-?)*(z-?)<=3.61').bind(now,r.id,r.town_id,r.town_joined_at,r.home,door.x,door.x,door.z,door.z).run();
  return result.meta.changes?null:fail('Your home or position changed. Try the door again.');
 }
 if(b.action==='home-exit'){
  await d.prepare('UPDATE residents SET inside=0,interior_revision=interior_revision+1,x=?,z=?,seen=? WHERE id=? AND town_id=? AND town_joined_at=? AND inside=1').bind(door.x,door.z,now,r.id,r.town_id,r.town_joined_at).run();return null;
 }
 if(!r.inside)return fail('Step inside your own home to decorate.',403);
 if(b.revision!==r.interior_revision)return fail('Your room changed on another screen. Reloading the latest arrangement.');
 const interior=readInterior(r.interior);let cost=0;
 if(b.action==='home-finish'){
  if(!FINISHES.wall.some(f=>f.id===b.wall)||!FINISHES.floor.some(f=>f.id===b.floor))return fail('Choose one of the wall and floor finishes.',400);
  interior.wall=String(b.wall);interior.floor=String(b.floor);
 }else if(b.action==='home-store'){
  if(!interior.owned.includes(String(b.item)))return fail('This piece is not in your collection.',400);
  interior.placed=interior.placed.filter(p=>p.id!==b.item);
 }else if(b.action==='home-place'){
  const f=furnitureById(b.item);if(!f)return fail('Choose a piece from the furniture collection.',400);
  const p={id:f.id,x:b.x,z:b.z,rotation:b.rotation} as PlacedFurniture;
  const issue=placementIssue(p,fittedFurniture(interior,r.house),r.house);if(issue)return fail(issue,400);
  cost=interior.owned.includes(f.id)?0:f.price;
  if(!interior.owned.includes(f.id))interior.owned.push(f.id);
  interior.placed=[...interior.placed.filter(p=>p.id!==f.id),p];
 }else return fail('That decorating option is unavailable.',400);
 const result=await d.prepare('UPDATE residents SET interior=?,coins=coins-?,interior_revision=interior_revision+1 WHERE id=? AND town_id=? AND town_joined_at=? AND inside=1 AND interior_revision=? AND house=? AND coins>=?').bind(JSON.stringify(interior),cost,r.id,r.town_id,r.town_joined_at,r.interior_revision,r.house,cost).run();
 return result.meta.changes?null:fail('Your room changed, or you need more coins. Refresh and try again.');
}
