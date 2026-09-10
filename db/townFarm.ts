import {TOWN_FARM} from '../app/game/townFarm.ts';
import {readMayor} from './elections.ts';
export async function farmAction(d:D1Database,r:{id:string;town_id:string;name:string;home:number|null;job:string|null},b:Record<string,any>,now:number){
 if(r.home===null||!r.job)return{error:'Choose your home and job before supporting the farm.',status:400};
 if(b.source!=='personal'&&b.source!=='treasury')return{error:'Choose personal coins or the town budget.',status:400};
 const treasury=b.source==='treasury';
 if(treasury&&(await readMayor(d,r.town_id,now))?.id!==r.id)return{error:'Only the elected mayor can allocate town funds.',status:403};
 const town=await d.prepare('SELECT farm_funded FROM towns WHERE id=?').bind(r.town_id).first<{farm_funded:number}>();
 if(!town||town.farm_funded>=TOWN_FARM.cost||town.farm_funded!==b.funded)return{error:'The farm fund has changed. Review its current progress.',status:409};
 const amount=Math.min(treasury?100:50,TOWN_FARM.cost-town.farm_funded),complete=town.farm_funded+amount===TOWN_FARM.cost;
 const result=await d.batch([
  d.prepare('UPDATE towns SET farm_funded=farm_funded+?,treasury=treasury-? WHERE id=? AND farm_funded=? AND treasury>=? AND EXISTS(SELECT 1 FROM residents WHERE id=? AND town_id=towns.id AND coins>=?)').bind(amount,treasury?amount:0,r.town_id,b.funded,treasury?amount:0,r.id,treasury?0:amount),
  d.prepare('UPDATE residents SET coins=coins-? WHERE id=? AND changes()=1').bind(treasury?0:amount,r.id),
  d.prepare('INSERT INTO civic_history(id,town_id,name,kind,project,amount,created) SELECT ?,?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,complete?'farm-opened':treasury?'farm-budget':'farm-donation',TOWN_FARM.name,amount,now),
  d.prepare('INSERT INTO events(id,town_id,name,text,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.town_id,r.name,complete?'helped open the Town Farm — the west road is ready!':`contributed ${amount} ${treasury?'town':'personal'} coins toward opening the Town Farm`,now),
  d.prepare('INSERT INTO contributions(town_id,resident_id,day,donated) SELECT ?,?,?,? WHERE changes()=1 AND ?=0 ON CONFLICT(town_id,resident_id,day) DO UPDATE SET donated=contributions.donated+excluded.donated').bind(r.town_id,r.id,new Date(now).toISOString().slice(0,10),amount,treasury?1:0)
 ]);
 return result[0].meta.changes?null:{error:'The fund changed or there are not enough coins for this contribution.',status:409};
}
