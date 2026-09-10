import {petById} from '../app/game/pets.ts';
export async function petAction(d:D1Database,r:{id:string;town_id:string;home:number|null},b:Record<string,unknown>){
 if(r.home===null)return {error:'Choose your home before bringing a pet home.',status:400};
 const pet=petById(b.pet),slot=b.slot==='cat'?'cat_pet':b.slot==='dog'?'dog_pet':null;
 if(b.pet===null&&slot){await d.prepare(`UPDATE residents SET ${slot}=NULL WHERE id=? AND town_id=?`).bind(r.id,r.town_id).run();return null;}
 if(!pet)return {error:'Choose a cat or dog from the Pet Store.',status:400};
 const column=pet.kind==='cat'?'cat_pet':'dog_pet',owned='EXISTS(SELECT 1 FROM json_each(items) WHERE value=?)';
 // Server prices and ownership govern one atomic purchase/equip. Retrying is free.
 const result=await d.prepare(`UPDATE residents SET ${column}=?,coins=coins-CASE WHEN ${owned} THEN 0 ELSE ? END,items=CASE WHEN ${owned} THEN items ELSE json_insert(items,'$[#]',?) END WHERE id=? AND town_id=? AND home IS NOT NULL AND coins>=CASE WHEN ${owned} THEN 0 ELSE ? END AND (${owned} OR EXISTS(SELECT 1 FROM parcel_buildings WHERE town_id=residents.town_id AND kind='pets')) RETURNING id`).bind(pet.id,pet.id,pet.price,pet.id,pet.id,r.id,r.town_id,pet.id,pet.price,pet.id).first();
 return result?null:{error:'Your town needs a completed Pet Store and enough coins for this pet. Pets you already own can always come outside.',status:409};
}
