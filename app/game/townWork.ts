import {JOBS,LAWN_CELLS,GRASS_REGROW_MS,type TownState} from './data';
import {WORK_TARGETS,WORK_DAY_MS} from './workTargets';
import {townLayout,type PlanningState} from './charters';
import {isTownBlocked} from './townLayout';
import {dayStart,parcelHomes} from './lifestyle';

const units:Record<string,string>={mow:'grass patches',paper:'homes',deliver:'parcels',garden:'garden beds',clean:'litter spots',sweep:'road sections',wash:'sidewalk sections',trim:'hedges',rake:'leaf piles'};
export function townWorkCatalog(planning:PlanningState){
 const layout=townLayout(planning),open=(p:{x:number;z:number})=>!isTownBlocked(p.x,p.z,layout);
 const targets=WORK_TARGETS.filter(open);
 return JOBS.map(job=>({...job,unit:units[job.id],targets:job.id==='mow'?LAWN_CELLS.filter(open).map(c=>({id:c.id,home:undefined as number|undefined})):[...new Map(targets.filter(t=>t.job===job.id).map(t=>[t.group,{id:t.group,home:t.home}])).values()]}));
}
export function townWorkProgress(data:Pick<TownState,'town'|'worldWork'|'grassHistory'|'lawnCuts'>,catalog:ReturnType<typeof townWorkCatalog>,now:number){
 const today=dayStart(now),route=new Set(parcelHomes(data.town.id,now));
 const done=new Set(data.worldWork.filter(w=>w.id.startsWith('parcel-')?w.completed>=today:w.completed>now-WORK_DAY_MS).map(w=>w.id));
 const mowed=new Set(data.grassHistory?data.grassHistory.filter(c=>c.cut_at>now-GRASS_REGROW_MS).map(c=>c.cell):data.lawnCuts);
 const jobs=catalog.map(job=>{
  const targets=job.id==='deliver'?job.targets.filter(t=>route.has(t.home!)):job.targets;
  const completed=targets.filter(t=>(job.id==='mow'?mowed:done).has(t.id)).length,total=targets.length;
  return {...job,total,completed,remaining:total-completed,percent:total?Math.floor(completed/total*100):100};
 });
 return {jobs,remaining:jobs.reduce((n,j)=>n+j.remaining,0),jobsRemaining:jobs.filter(j=>j.remaining>0).length};
}
