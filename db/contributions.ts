type Contributor={id:string;town_id:string};
type WorkKind='mow'|'paper'|'clean'|'garden'|'deliver'|'task'|'donated';
// Append immediately after a successful, guarded work/town update in the SAME D1 batch.
// changes() is the preceding statement's result, so retries and lost races record nothing.
export function recordContribution(d:D1Database,r:Contributor,now:number,kind:WorkKind,xp:number,tax:number){
 const units=kind==='donated'?25:1;
 return d.prepare(`INSERT INTO contributions(town_id,resident_id,day,${kind},xp,tax)
 SELECT ?,?,?,?,?,? WHERE changes()=1 AND EXISTS(SELECT 1 FROM residents WHERE id=? AND town_id=?)
 ON CONFLICT(town_id,resident_id,day) DO UPDATE SET ${kind}=contributions.${kind}+excluded.${kind},xp=contributions.xp+excluded.xp,tax=contributions.tax+excluded.tax`)
 .bind(r.town_id,r.id,new Date(now).toISOString().slice(0,10),units,xp,tax,r.id,r.town_id);
}
