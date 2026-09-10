import {placementError,initialPlacement} from '../app/game/placement.ts';
import {INSTITUTIONS,TERRITORIES,REDEVELOPMENTS,nodeById,plotById,proposalTitle,type Institution,type PlanProposal,type PlanningState,type ParcelBuilding} from '../app/game/charters.ts';
import {readMayor} from './elections.ts';
type Citizen={id:string;town_id:string;name:string;job:string|null;home:number|null};
const WEEK=7*86400000;
export async function settlePlans(d:D1Database,town:string,now:number){
 await d.prepare("UPDATE town_plans SET status=CASE WHEN (SELECT COUNT(*) FROM plan_voters WHERE plan_id=town_plans.id AND vote IS NOT NULL)>=quorum AND (SELECT COUNT(*) FROM plan_voters WHERE plan_id=town_plans.id AND vote=1)*5 >= (SELECT COUNT(*) FROM plan_voters WHERE plan_id=town_plans.id AND vote IS NOT NULL)*3 THEN 'approved' ELSE 'rejected' END WHERE town_id=? AND status='voting' AND closes<=?").bind(town,now).run();
}
export async function readPlanning(d:D1Database,town:string,resident:string,now=Date.now()):Promise<PlanningState>{
 await settlePlans(d,town,now);
 const [farm,land,institutions,buildings,plans]=await Promise.all([
  d.prepare('SELECT farm_funded FROM towns WHERE id=?').bind(town).first<{farm_funded:number}>(),
  d.prepare('SELECT id FROM town_territories WHERE town_id=?').bind(town).all<{id:string}>(),
  d.prepare('SELECT id,node,plot,x,z,rotation FROM charter_institutions WHERE town_id=?').bind(town).all<Institution>(),
  d.prepare('SELECT plot,kind,x,z,rotation FROM parcel_buildings WHERE town_id=?').bind(town).all<ParcelBuilding>(),
  d.prepare('SELECT p.id,p.kind,p.institution,p.option,p.from_node AS fromNode,p.from_plot AS fromPlot,p.cost,p.funded,p.status,p.created,p.closes,p.electorate,p.quorum,p.name,COUNT(CASE WHEN v.vote=1 THEN 1 END) AS yes,COUNT(CASE WHEN v.vote=0 THEN 1 END) AS no,(SELECT vote FROM plan_voters WHERE plan_id=p.id AND resident_id=?) AS myVote,EXISTS(SELECT 1 FROM plan_voters WHERE plan_id=p.id AND resident_id=?) AS eligible FROM town_plans p LEFT JOIN plan_voters v ON v.plan_id=p.id WHERE p.town_id=? GROUP BY p.id ORDER BY p.created DESC,p.id DESC LIMIT 12').bind(resident,resident,town).all<PlanProposal>()
 ]);
 return {farmFunded:farm?.farm_funded??0,territories:land.results.map(t=>t.id),institutions:INSTITUTIONS.map(i=>institutions.results.find(r=>r.id===i.id)??{id:i.id,node:'root',plot:i.plot}),buildings:buildings.results,proposals:plans.results.map(p=>({...p,eligible:!!p.eligible}))};
}
export function validatePlan(s:PlanningState,b:Record<string,unknown>){
 const kind=b.kind,institution=s.institutions.find(i=>i.id===b.institution),plot=institution?plotById(institution.plot):null;
 if(kind==='expand'){const t=TERRITORIES.find(t=>t.id===b.option);if(!t||s.territories.includes(t.id))return {error:'Choose territory the town does not yet own.'};return {kind,option:t.id,institution:null,fromNode:null,fromPlot:null,cost:t.cost} as const;}
 if(kind==='build'){const building=REDEVELOPMENTS.find(k=>k.id===b.option);if(!building)return {error:'Choose a community building.'};return {kind,option:building.id,institution:null,fromNode:null,fromPlot:null,cost:building.cost} as const;}
 if(!institution||!plot)return {error:'Choose a public institution.'};
 if(kind==='branch'){const node=nodeById(String(b.option));if(!node||node.institution!==institution.id||node.parent!==institution.node)return {error:'That branch is not a possible next step. Earlier charter choices cannot be undone.'};return {kind,option:node.id,institution:institution.id,fromNode:institution.node,fromPlot:institution.plot,cost:node.cost} as const;}
 if(kind==='relocate')return {kind,option:'free',institution:institution.id,fromNode:institution.node,fromPlot:institution.plot,cost:800+(institution.node==='root'?0:600)} as const;
 return {error:'Choose a charter, relocation, expansion, or vacant-site project.'};
}
export async function planningAction(d:D1Database,r:Citizen,b:Record<string,unknown>,now=Date.now()){
 if(!r.job||r.home===null)return {error:'Choose your job and home before taking part in town planning.',status:400};
 await settlePlans(d,r.town_id,now);
 if(b.action==='plan-vote'){
  if(typeof b.plan!=='string'||typeof b.vote!=='boolean')return {error:'Choose support or oppose for this proposal.',status:400};
  const result=await d.prepare("UPDATE plan_voters SET vote=? WHERE plan_id=? AND resident_id=? AND EXISTS(SELECT 1 FROM town_plans WHERE id=plan_voters.plan_id AND town_id=? AND status='voting' AND closes>?)").bind(b.vote?1:0,b.plan,r.id,r.town_id,now).run();
  return result.meta.changes?null:{error:'This vote is closed, or you were not in its resident roll when it opened.',status:409};
 }
 const mayor=await readMayor(d,r.town_id,now);if(!mayor||mayor.id!==r.id)return {error:'Only the elected mayor can propose developments or allocate the town’s construction budget.',status:403};
 if(b.action==='plan-propose'){
  const revision=await d.prepare("SELECT COUNT(*) AS n FROM town_plans WHERE town_id=? AND status='completed'").bind(r.town_id).first<{n:number}>();
  const s=await readPlanning(d,r.town_id,r.id,now);if(s.proposals.some(p=>p.status==='voting'||p.status==='approved'||p.status==='ready'))return {error:'Finish the town’s current planning vote or approved project before proposing another.',status:409};const plan=validatePlan(s,b);if('error'in plan)return {error:plan.error,status:400};if(plan.kind!=='expand'&&placementError(s,plan,initialPlacement(s,plan)))return {error:'There is not enough suitable owned land for this building. Expand the town first.',status:400};
  const id=crypto.randomUUID();
  try{const results=await d.batch([
   d.prepare("INSERT INTO town_plans(id,town_id,kind,institution,option,from_node,from_plot,cost,created,closes,electorate,quorum,name) SELECT ?,?,?,?,?,?,?,?,?,?,COUNT(*),MAX(1,CAST((COUNT(*)+1)/2 AS INTEGER)),? FROM residents WHERE town_id=? AND home IS NOT NULL AND job IS NOT NULL AND (seen>=? OR id=?) HAVING (SELECT COUNT(*) FROM town_plans WHERE town_id=? AND status='completed')=?").bind(id,r.town_id,plan.kind,plan.institution,plan.option,plan.fromNode,plan.fromPlot,plan.cost,now,now+WEEK,r.name,r.town_id,now-2*WEEK,r.id,r.town_id,revision!.n),
   d.prepare('INSERT INTO plan_voters(plan_id,resident_id) SELECT ?,id FROM residents WHERE town_id=? AND home IS NOT NULL AND job IS NOT NULL AND (seen>=? OR id=?) AND EXISTS(SELECT 1 FROM town_plans WHERE id=?)').bind(id,r.town_id,now-2*WEEK,r.id,id),
   d.prepare('INSERT INTO civic_history(id,town_id,name,kind,project,amount,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM town_plans WHERE id=?)').bind(crypto.randomUUID(),r.town_id,r.name,'planning',proposalTitle(plan),plan.cost,now,id)
  ]);if(!results[0].meta.changes)return {error:'The town layout changed while this proposal was being prepared. Review the updated options.',status:409};}catch(e){if(String(e).includes('UNIQUE'))return {error:'Finish the town’s current planning vote or approved project before proposing another.',status:409};throw e;}
  return null;
 }
 if(b.action==='plan-place'){
  const s=await readPlanning(d,r.town_id,r.id,now),p=s.proposals.find(p=>p.id===b.plan);
  if(!p||p.status!=='ready'||p.funded!==p.cost||p.kind==='expand')return {error:'This building must pass its vote and be fully funded before placement.',status:409};
  const v={x:b.x as number,z:b.z as number,rotation:b.rotation as number},error=placementError(s,p,v);if(error)return {error,status:400};
  const apply=p.kind==='build'?d.prepare('INSERT INTO parcel_buildings(town_id,plot,kind,x,z,rotation) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(r.town_id,`placed-${p.id}`,p.option,v.x,v.z,v.rotation):d.prepare('INSERT INTO charter_institutions(town_id,id,node,plot,x,z,rotation) SELECT ?,?,?,?,?,?,? WHERE changes()=1 ON CONFLICT(town_id,id) DO UPDATE SET node=excluded.node,plot=excluded.plot,x=excluded.x,z=excluded.z,rotation=excluded.rotation').bind(r.town_id,p.institution,p.kind==='branch'?p.option:p.fromNode,p.fromPlot,v.x,v.z,v.rotation);
  const result=await d.batch([
   d.prepare("UPDATE town_plans SET status='completed' WHERE id=? AND town_id=? AND status='ready' AND funded=cost").bind(p.id,r.town_id),
   d.prepare('INSERT INTO civic_history(id,town_id,name,kind,project,amount,created) SELECT ?,?,?,?,?,0,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,'plan-completed',proposalTitle(p),now),apply
  ]);
  return result[0].meta.changes?null:{error:'This building has already been placed. Refresh the town plan.',status:409};
 }
 if(b.action!=='plan-fund'||typeof b.plan!=='string')return {error:'Choose an approved town project.',status:400};
 const p=await d.prepare('SELECT id,kind,institution,option,from_node AS fromNode,from_plot AS fromPlot,cost,funded,status FROM town_plans WHERE id=? AND town_id=?').bind(b.plan,r.town_id).first<PlanProposal>();
 if(!p||p.status!=='approved'||p.funded!==b.funded)return {error:'This project is not approved or its budget has changed.',status:409};
 if(typeof b.amount!=='number'||!Number.isInteger(b.amount)||b.amount<1||b.amount>p.cost-p.funded)return {error:'Choose a valid amount within the remaining budget.',status:400};
 const fullyFunded=p.funded+b.amount===p.cost,complete=fullyFunded&&p.kind==='expand';
 let apply:D1PreparedStatement;
 if(p.kind==='expand')apply=d.prepare('INSERT INTO town_territories(town_id,id) SELECT ?,? WHERE changes()=1 AND ?=1').bind(r.town_id,p.option,complete?1:0);
 else if(p.kind==='build')apply=d.prepare('INSERT INTO parcel_buildings(town_id,plot,kind) SELECT ?,?,? WHERE changes()=1 AND ?=1').bind(r.town_id,p.fromPlot,p.option,complete?1:0);
 else apply=d.prepare('INSERT INTO charter_institutions(town_id,id,node,plot) SELECT ?,?,?,? WHERE changes()=1 AND ?=1 ON CONFLICT(town_id,id) DO UPDATE SET node=excluded.node,plot=excluded.plot').bind(r.town_id,p.institution,p.kind==='branch'?p.option:p.fromNode,p.kind==='relocate'?p.option:p.fromPlot,complete?1:0);
 const results=await d.batch([
  d.prepare("UPDATE towns SET treasury=treasury-? WHERE id=? AND treasury>=? AND EXISTS(SELECT 1 FROM town_plans WHERE id=? AND town_id=? AND status='approved' AND funded=?)").bind(b.amount,r.town_id,b.amount,p.id,r.town_id,b.funded),
  d.prepare("UPDATE town_plans SET funded=funded+?,status=CASE WHEN funded+?=cost THEN CASE WHEN kind='expand' THEN 'completed' ELSE 'ready' END ELSE 'approved' END WHERE id=? AND changes()=1").bind(b.amount,b.amount,p.id),
  d.prepare('INSERT INTO civic_history(id,town_id,name,kind,project,amount,created) SELECT ?,?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,complete?'plan-completed':'plan-funded',proposalTitle(p),b.amount,now),apply
 ]);
 return results[0].meta.changes?null:{error:'The town needs more coins or this project has already been updated.',status:409};
}
