import {CIVIC_PROJECTS,projectById} from '../app/game/civicProjects.ts';
import {electionWindow,type ContributionTotals,type ElectionState} from '../app/game/elections.ts';
type Voter={id:string;town_id:string;home:number|null;job:string|null};
export async function readElection(d:D1Database,r:Voter,now=Date.now()):Promise<ElectionState>{
 const schedule=electionWindow(now),today=new Date(now).toISOString().slice(0,10),month=today.slice(0,7);
 const metrics=['xp','mow','paper','clean','garden','deliver','task','tax','donated'] as const;
 const sums=metrics.flatMap(k=>[`COALESCE(SUM(w.${k}),0) AS total_${k}`,`COALESCE(SUM(CASE WHEN w.day>=? THEN w.${k} ELSE 0 END),0) AS month_${k}`]).join(',');
 const [candidates,vote,mayor]=await Promise.all([
  d.prepare(`SELECT c.resident_id AS id,r.name,r.created AS joinedAt,r.xp AS overallXp,c.platform,c.tax,(SELECT COUNT(*) FROM town_projects p WHERE p.town_id=c.town_id AND p.mayor_id=c.resident_id AND p.completed>0) AS delivered,${sums},
   COUNT(CASE WHEN w.xp>0 THEN 1 END) AS total_days,
   COUNT(CASE WHEN w.xp>0 AND w.day>=? THEN 1 END) AS month_days
   FROM election_candidates c JOIN residents r ON r.id=c.resident_id AND r.town_id=c.town_id
   LEFT JOIN contributions w ON w.town_id=c.town_id AND w.resident_id=c.resident_id AND w.day<=?
   WHERE c.town_id=? AND c.cycle=? GROUP BY c.resident_id ORDER BY c.nominated_at,c.resident_id`)
   .bind(...metrics.map(()=>month+'-01'),month+'-01',today,r.town_id,schedule.cycle)
   .all<{id:string;name:string;joinedAt:number;overallXp:number;platform:string|null;tax:number;delivered:number}&Record<string,number|string|null>>(),
  d.prepare('SELECT candidate_id FROM election_votes WHERE town_id=? AND cycle=? AND voter_id=?').bind(r.town_id,schedule.cycle,r.id).first<{candidate_id:string}>(),
  // Closed ballots cannot change. Latest winning cycle determines the sitting mayor;
  // no-vote months retain the last mayor, ties go to the earliest nomination.
  readMayor(d,r.town_id,now)
 ]);
 const people=candidates.results.map(c=>{
  const totals=(prefix:string)=>Object.fromEntries([...metrics,'days'].map(k=>[k,Number(c[`${prefix}_${k}`])])) as ContributionTotals;
  return {id:c.id,name:c.name,joinedAt:c.joinedAt,platform:c.platform,tax:c.tax,delivered:c.delivered,contributions:{month:totals('month'),overall:{...totals('total'),xp:c.overallXp}}};
 });
 return {...schedule,contributionMonth:month,mayor,candidates:people,myVote:vote?.candidate_id??null,nominated:candidates.results.some(c=>c.id===r.id)};
}
export async function electionAction(d:D1Database,r:Voter,action:'nominate'|'vote'|'platform',cycle:unknown,candidate:unknown,now=Date.now(),platform?:unknown,tax?:unknown){
 const schedule=electionWindow(now);
 if(r.home===null||!r.job)return {error:'Choose your home and job before taking part in elections.',status:400};
 if(cycle!==schedule.cycle)return {error:'The election calendar has changed. Open the ballot again.',status:409};
 const allBuilt=async()=>{const row=await d.prepare('SELECT COUNT(*) AS n FROM town_projects WHERE town_id=? AND completed>0').bind(r.town_id).first<{n:number}>();return (row?.n??0)>=CIVIC_PROJECTS.length};
 if(action==='platform'){
  if(now>=schedule.opensAt)return {error:'Voting has begun. Campaign promises are permanently locked for this election.',status:409};
  if((!projectById(platform)&&!(platform===null&&await allBuilt()))||typeof tax!=='number'||![0,1,2].includes(tax))return {error:'Choose a town project and tax policy.',status:400};
  if(platform&&await d.prepare('SELECT id FROM town_projects WHERE town_id=? AND id=? AND completed>0').bind(r.town_id,platform).first())return {error:'That upgrade is already complete. Choose another promise.',status:409};
  const result=await d.prepare('UPDATE election_candidates SET platform=?,tax=? WHERE town_id=? AND cycle=? AND resident_id=?').bind(platform,tax,r.town_id,schedule.cycle,r.id).run();
  return result.meta.changes?null:{error:'Join the ballot before updating your campaign.',status:400};
 }
 if(action==='nominate'){
  if((tax!==undefined&&(typeof tax!=='number'||![0,1,2].includes(tax)))||(platform!==undefined&&!projectById(platform)&&!(platform===null&&await allBuilt())))return {error:'Choose a town project and tax policy.',status:400};
  if(platform&&await d.prepare('SELECT id FROM town_projects WHERE town_id=? AND id=? AND completed>0').bind(r.town_id,platform).first())return {error:'That upgrade is already complete. Choose another promise.',status:409};
  await d.prepare('INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at,platform,tax) SELECT town_id,?,id,?,?,? FROM residents WHERE id=? AND town_id=? AND home IS NOT NULL AND job IS NOT NULL ON CONFLICT(town_id,cycle,resident_id) DO NOTHING').bind(schedule.cycle,now,platform??null,tax??1,r.id,r.town_id).run();
  return null;
 }
 if(!schedule.active)return {error:'Voting opens on the 21st. You can join the ballot now.',status:409};
 if(typeof candidate!=='string')return {error:'Choose a candidate on this town’s ballot.',status:400};
 const result=await d.prepare('INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM election_candidates WHERE town_id=? AND cycle=? AND resident_id=?) AND EXISTS(SELECT 1 FROM residents WHERE id=? AND town_id=? AND home IS NOT NULL AND job IS NOT NULL) ON CONFLICT(town_id,cycle,voter_id) DO UPDATE SET candidate_id=excluded.candidate_id,cast_at=excluded.cast_at').bind(r.town_id,schedule.cycle,r.id,candidate,now,r.town_id,schedule.cycle,candidate,r.id,r.town_id).run();
 return result.meta.changes?null:{error:'Choose a candidate on this town’s ballot.',status:400};
}

export async function readMayor(d:D1Database,townId:string,now=Date.now()){
 return d.prepare('SELECT c.resident_id AS id,r.name,c.cycle,c.platform,c.tax FROM election_candidates c JOIN residents r ON r.id=c.resident_id AND r.town_id=c.town_id JOIN election_votes v ON v.town_id=c.town_id AND v.cycle=c.cycle AND v.candidate_id=c.resident_id WHERE c.town_id=? AND c.cycle<=? GROUP BY c.cycle,c.resident_id ORDER BY c.cycle DESC,COUNT(*) DESC,c.nominated_at ASC,c.resident_id ASC LIMIT 1').bind(townId,electionWindow(now).lastClosedCycle).first<{id:string;name:string;cycle:string;platform:string|null;tax:number}>();
}
