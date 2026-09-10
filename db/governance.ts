import {readMayor} from './elections.ts';
import {projectById,type CivicState,townLevel} from '../app/game/civicProjects.ts';
import {recordContribution} from './contributions.ts';
type Citizen={id:string;town_id:string;name:string;home:number|null;job:string|null};
type Town={tax:number;term:string;featured:string|null;treasury:number};
function log(d:D1Database,r:{town_id:string;name:string},kind:string,project:string|null,amount:number,now:number){
 return d.prepare('INSERT INTO civic_history(id,town_id,name,kind,project,amount,created) SELECT ?,?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,kind,project,amount,now);
}
export async function syncGovernance(d:D1Database,townId:string,now=Date.now()){
 const mayor=await readMayor(d,townId,now);
 const current=mayor?await d.prepare('SELECT term FROM towns WHERE id=?').bind(townId).first<{term:string}>():null;
 if(mayor&&current&&current.term<mayor.cycle)await d.batch([
  d.prepare('UPDATE towns SET term=?,featured=?,tax=? WHERE id=? AND term<?').bind(mayor.cycle,projectById(mayor.platform)?.id??null,mayor.tax,townId,mayor.cycle),
  log(d,{town_id:townId,name:mayor.name},'elected',mayor.platform,mayor.tax,now),
  d.prepare('INSERT INTO town_projects(town_id,id) SELECT id,featured FROM towns WHERE id=? AND featured IS NOT NULL ON CONFLICT(town_id,id) DO NOTHING').bind(townId)
 ]);
 return mayor;
}
export async function readCivic(d:D1Database,townId:string):Promise<CivicState>{
 const [town,projects,history]=await Promise.all([
  d.prepare('SELECT tax,term,featured FROM towns WHERE id=?').bind(townId).first<Town>(),
  d.prepare('SELECT p.id,p.funded,p.completed,r.name AS mayorName FROM town_projects p LEFT JOIN residents r ON r.id=p.mayor_id AND r.town_id=p.town_id WHERE p.town_id=?').bind(townId).all<CivicState['projects'][number]>(),
  d.prepare('SELECT id,name,kind,project,amount,created FROM civic_history WHERE town_id=? ORDER BY created DESC,id DESC LIMIT 20').bind(townId).all<CivicState['history'][number]>()
 ]);
 return {tax:town!.tax,term:town!.term,featured:town!.featured,projects:projects.results,history:history.results};
}
export async function payPolicy(d:D1Database,townId:string){
 const row=await d.prepare('SELECT tax,(SELECT COUNT(*) FROM town_projects WHERE town_id=towns.id AND completed>0) AS upgrades FROM towns WHERE id=?').bind(townId).first<{tax:number;upgrades:number}>();
 return {tax:row!.tax,bonus:townLevel(row!.upgrades).bonus};
}
export async function civicAction(d:D1Database,r:Citizen,b:Record<string,unknown>,now=Date.now()){
 if(r.home===null||!r.job)return {error:'Choose your home and job first.',status:400};
 const mayor=await syncGovernance(d,r.town_id,now);
 if(b.action==='support-project'){
  const results=await d.batch([
   d.prepare('UPDATE residents SET coins=coins-25 WHERE id=? AND town_id=? AND coins>=25').bind(r.id,r.town_id),
   d.prepare('UPDATE towns SET treasury=treasury+25 WHERE id=? AND changes()=1').bind(r.town_id),
   recordContribution(d,r,now,'donated',0,0),log(d,r,'donation',null,25,now)
  ]);
  return results[0].meta.changes?null:{error:'You need 25 coins to contribute to the town fund.',status:409};
 }
 if(!mayor||mayor.id!==r.id)return {error:'Only the elected mayor can spend town funds or change town policy.',status:403};
 if(b.term!==mayor.cycle)return {error:'The mayoral term changed. Reopen Town Hall.',status:409};
 const town=(await d.prepare('SELECT tax,term,featured,treasury FROM towns WHERE id=?').bind(r.town_id).first<Town>())!;
 if(b.action==='set-tax'){
  if(typeof b.tax!=='number'||![0,1,2].includes(b.tax)||typeof b.previousTax!=='number'||![0,1,2].includes(b.previousTax))return {error:'Choose a tax policy from 0 to 2 coins.',status:400};
  const results=await d.batch([
   d.prepare('UPDATE towns SET tax=? WHERE id=? AND term=? AND tax=? AND tax<>?').bind(b.tax,r.town_id,mayor.cycle,b.previousTax,b.tax),
   log(d,r,'tax',null,b.tax,now)
  ]);
  return results[0].meta.changes?null:{error:'That tax policy is already set or has changed. Refresh your choice.',status:409};
 }
 const project=projectById(b.project);if(!project)return {error:'Choose an available town upgrade.',status:400};
 if(b.action==='feature-project'){
  const results=await d.batch([
   d.prepare('UPDATE towns SET featured=? WHERE id=? AND term=? AND (featured IS NULL OR EXISTS(SELECT 1 FROM town_projects WHERE town_id=? AND id=towns.featured AND completed>0)) AND NOT EXISTS(SELECT 1 FROM town_projects WHERE town_id=? AND id=? AND completed>0)').bind(project.id,r.town_id,mayor.cycle,r.town_id,r.town_id,project.id),
   log(d,r,'featured',project.id,0,now),
   d.prepare('INSERT INTO town_projects(town_id,id) SELECT id,featured FROM towns WHERE id=? AND featured=? ON CONFLICT(town_id,id) DO NOTHING').bind(r.town_id,project.id)
  ]);
  return results[0].meta.changes?null:{error:'Finish the featured project before choosing another upgrade.',status:409};
 }
 if(b.action!=='fund-project')return {error:'That town decision is not available.',status:400};
 const progress=await d.prepare('SELECT funded,completed FROM town_projects WHERE town_id=? AND id=?').bind(r.town_id,project.id).first<{funded:number;completed:number}>();
 if(town.featured!==project.id||!progress||progress.completed||b.funded!==progress.funded)return {error:'The project has changed. Reopen it to see the latest progress.',status:409};
 const remaining=project.cost-progress.funded;
 if(typeof b.amount!=='number'||!Number.isInteger(b.amount)||b.amount<=0||b.amount>remaining)return {error:'Choose an amount within the remaining project budget.',status:400};
 const results=await d.batch([
  d.prepare('UPDATE towns SET treasury=treasury-? WHERE id=? AND term=? AND featured=? AND treasury>=? AND EXISTS(SELECT 1 FROM town_projects WHERE town_id=? AND id=? AND funded=? AND completed=0)').bind(b.amount,r.town_id,mayor.cycle,project.id,b.amount,r.town_id,project.id,b.funded),
  d.prepare('UPDATE town_projects SET funded=funded+?,completed=CASE WHEN funded+?>=? THEN ? ELSE 0 END,mayor_id=CASE WHEN funded+?>=? THEN ? ELSE mayor_id END WHERE town_id=? AND id=? AND changes()=1').bind(b.amount,b.amount,project.cost,now,b.amount,project.cost,r.id,r.town_id,project.id),
  log(d,r,progress.funded+b.amount===project.cost?'completed':'funded',project.id,b.amount,now)
 ]);
 return results[0].meta.changes?null:{error:'The town needs more coins, or a neighbor’s update changed this budget.',status:409};
}
