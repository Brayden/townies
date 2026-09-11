import {townContext} from './context.ts';
import {HOUSES,houseById,houseCost,nextMonth,settleUpkeep} from '../app/game/lifestyle.ts';
import {HOMES} from '../app/game/data.ts';
import {OUTFITS} from '../app/game/outfits.ts';
type Citizen={id:string;town_id:string;home:number|null;job:string|null;house:string;coins:number;upkeep_due:number;items:string};
export async function maintainHomes(d:D1Database,town:string,now:number){
 const rows=await d.prepare('SELECT id,house,coins,upkeep_due FROM residents WHERE town_id=? AND upkeep_due>0 AND upkeep_due<=?'+(townContext.getStore()?" AND NOT EXISTS(SELECT 1 FROM _transfers WHERE resident=residents.id AND status='prepared')":'')).bind(town,now).all<Citizen>();
 for(const r of rows.results){const v=settleUpkeep(r.house,r.coins,r.upkeep_due,now);await d.prepare('UPDATE residents SET house=?,coins=?,upkeep_due=?,upkeep_note=? WHERE id=? AND upkeep_due=? AND coins=? AND house=?').bind(v.house,v.coins,v.due,v.levels?`Maintenance missed: your home stepped down ${v.levels} level${v.levels===1?'':'s'}. ${v.paid} coins paid for other months.`:`Monthly maintenance paid: ${v.paid} coins.`,r.id,r.upkeep_due,r.coins,r.house).run();}
}
export async function lifestyleAction(d:D1Database,r:Citizen,b:Record<string,any>,now:number){
 if(r.home===null)return{error:'Choose your first home before making changes.',status:400};
 if(b.action==='house'){
  const home=HOUSES.find(h=>h.id===b.house);if(!home)return{error:'Choose a home from the catalog.',status:400};
  if(home.id===r.house)return{error:'You already live in this house style.',status:409};
  const cost=houseCost(r.house,home.id);
  const v=await d.prepare('UPDATE residents SET house=?,coins=coins-?,upkeep_due=CASE WHEN upkeep_due=0 THEN ? ELSE upkeep_due END WHERE id=? AND house=? AND coins>=? RETURNING id').bind(home.id,cost,nextMonth(now),r.id,r.house,cost).first();
  if(!v)return{error:'Your balance or home changed. Refresh and try again.',status:409};
 }else if(b.action==='move-home'){
  const lot=HOMES.find(h=>h.id===b.home);if(!lot||lot.id===r.home)return{error:'Choose a different vacant address.',status:400};
  try{const moved=await d.prepare('UPDATE residents SET home=?,coins=coins-100 WHERE id=? AND home=? AND coins>=100 RETURNING id').bind(lot.id,r.id,r.home).first();if(!moved)return{error:'Moving costs 100 coins. Your home or balance may have changed.',status:409};}catch{return{error:'A neighbor just claimed that address. Choose another vacant home.',status:409};}
 }else if(b.action==='bike'){
  const updated=await d.prepare("UPDATE residents SET riding=? WHERE id=? AND shift IS NULL AND mowing=0 AND EXISTS(SELECT 1 FROM json_each(items) WHERE value='bike') RETURNING id").bind(b.active===true?1:0,r.id).first();
  if(!updated)return{error:'Own a town bicycle and finish your current shift before riding.',status:409};
 }else if(b.action==='wardrobe'){
  const item=OUTFITS.find(o=>o.id===b.item);if(!item)return{error:'Choose an item from Thread & Thistle.',status:400};
  const column=item.slot==='hat'?'hat':item.slot==='accessory'?'accessory':'outfit';
  const owns='EXISTS(SELECT 1 FROM json_each(items) WHERE value=?)';
  const result=await d.prepare(`UPDATE residents SET ${column}=?,${column==='outfit'?'color=?,':''}coins=coins-CASE WHEN ${owns} THEN 0 ELSE ? END,items=CASE WHEN ${owns} OR ?=0 THEN items ELSE json_insert(items,'$[#]',?) END WHERE id=? AND coins>=CASE WHEN ${owns} THEN 0 ELSE ? END RETURNING id`).bind(item.id,...(column==='outfit'?[item.color]:[]),item.id,item.price,item.id,item.price,item.id,r.id,item.id,item.price).first();
  if(!result)return{error:'Save a few more coins for this wardrobe piece.',status:409};
 }
 return null;
}
