import {electionWindow,type ContributionTotals,type ElectionState} from '../app/game/elections.ts';
type Voter={id:string;town_id:string;home:number|null;job:string|null};
export async function readElection(d:D1Database,r:Voter,now=Date.now()):Promise<ElectionState>{
 const schedule=electionWindow(now),today=new Date(now).toISOString().slice(0,10),month=today.slice(0,7);
 const metrics=['xp','mow','paper','clean','garden','deliver','task','tax','donated'] as const;
 const sums=metrics.flatMap(k=>[`COALESCE(SUM(w.${k}),0) AS total_${k}`,`COALESCE(SUM(CASE WHEN w.day>=? THEN w.${k} ELSE 0 END),0) AS month_${k}`]).join(',');
 const [candidates,vote,mayor]=await Promise.all([
  d.prepare(`SELECT c.resident_id AS id,r.name,r.created AS joinedAt,r.xp AS overallXp,${sums},
   COUNT(CASE WHEN w.xp>0 THEN 1 END) AS total_days,
   COUNT(CASE WHEN w.xp>0 AND w.day>=? THEN 1 END) AS month_days
   FROM election_candidates c JOIN residents r ON r.id=c.resident_id AND r.town_id=c.town_id
   LEFT JOIN contributions w ON w.town_id=c.town_id AND w.resident_id=c.resident_id AND w.day<=?
   WHERE c.town_id=? AND c.cycle=? GROUP BY c.resident_id ORDER BY c.nominated_at,c.resident_id`)
   .bind(...metrics.map(()=>month+'-01'),month+'-01',today,r.town_id,schedule.cycle)
   .all<{id:string;name:string;joinedAt:number;overallXp:number}&Record<string,number|string>>(),
  d.prepare('SELECT candidate_id FROM election_votes WHERE town_id=? AND cycle=? AND voter_id=?').bind(r.town_id,schedule.cycle,r.id).first<{candidate_id:string}>(),
  // Closed ballots cannot change. Latest winning cycle determines the sitting mayor;
  // no-vote months retain the last mayor, ties go to the earliest nomination.
  d.prepare('SELECT c.resident_id AS id,r.name,c.cycle FROM election_candidates c JOIN residents r ON r.id=c.resident_id AND r.town_id=c.town_id JOIN election_votes v ON v.town_id=c.town_id AND v.cycle=c.cycle AND v.candidate_id=c.resident_id WHERE c.town_id=? AND c.cycle<=? GROUP BY c.cycle,c.resident_id ORDER BY c.cycle DESC,COUNT(*) DESC,c.nominated_at ASC,c.resident_id ASC LIMIT 1').bind(r.town_id,schedule.lastClosedCycle).first<{id:string;name:string;cycle:string}>()
 ]);
 const people=candidates.results.map(c=>{
  const totals=(prefix:string)=>Object.fromEntries([...metrics,'days'].map(k=>[k,Number(c[`${prefix}_${k}`])])) as ContributionTotals;
  return {id:c.id,name:c.name,joinedAt:c.joinedAt,contributions:{month:totals('month'),overall:{...totals('total'),xp:c.overallXp}}};
 });
 return {...schedule,contributionMonth:month,mayor,candidates:people,myVote:vote?.candidate_id??null,nominated:candidates.results.some(c=>c.id===r.id)};
}
export async function electionAction(d:D1Database,r:Voter,action:'nominate'|'vote',cycle:unknown,candidate:unknown,now=Date.now()){
 const schedule=electionWindow(now);
 if(r.home===null||!r.job)return {error:'Choose your home and job before taking part in elections.',status:400};
 if(cycle!==schedule.cycle)return {error:'The election calendar has changed. Open the ballot again.',status:409};
 if(action==='nominate'){
  await d.prepare('INSERT INTO election_candidates(town_id,cycle,resident_id,nominated_at) SELECT town_id,?,id,? FROM residents WHERE id=? AND town_id=? AND home IS NOT NULL AND job IS NOT NULL ON CONFLICT(town_id,cycle,resident_id) DO NOTHING').bind(schedule.cycle,now,r.id,r.town_id).run();
  return null;
 }
 if(!schedule.active)return {error:'Voting opens on the 21st. You can join the ballot now.',status:409};
 if(typeof candidate!=='string')return {error:'Choose a candidate on this town’s ballot.',status:400};
 const result=await d.prepare('INSERT INTO election_votes(town_id,cycle,voter_id,candidate_id,cast_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM election_candidates WHERE town_id=? AND cycle=? AND resident_id=?) AND EXISTS(SELECT 1 FROM residents WHERE id=? AND town_id=? AND home IS NOT NULL AND job IS NOT NULL) ON CONFLICT(town_id,cycle,voter_id) DO UPDATE SET candidate_id=excluded.candidate_id,cast_at=excluded.cast_at').bind(r.town_id,schedule.cycle,r.id,candidate,now,r.town_id,schedule.cycle,candidate,r.id,r.town_id).run();
 return result.meta.changes?null:{error:'Choose a candidate on this town’s ballot.',status:400};
}
