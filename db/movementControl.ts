export type MovementResident={id:string;town_id:string;town_joined_at:number;move_owner?:string;move_epoch?:number;move_updated?:number};
export const validDevice=(value:unknown):value is string=>typeof value==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(value);
export const movementOwner=(r:MovementResident,b:Record<string,unknown>)=>r.move_owner?b.device===r.move_owner&&b.moveEpoch===r.move_epoch:!b.device;
// Taking control is an explicit input event, never a side effect of polling.
// The epoch fences delayed claims and all packets from a previous controller.
export async function claimMovement(d:D1Database,r:MovementResident,b:Record<string,unknown>,now:number){
 if(!validDevice(b.device)||!Number.isSafeInteger(b.moveEpoch)||Number(b.moveEpoch)<0)return false;
 const result=await d.prepare('UPDATE residents SET move_epoch=move_epoch+CASE WHEN move_owner=? THEN 0 ELSE 1 END,move_updated=CASE WHEN move_owner=? THEN move_updated ELSE MAX(?,move_updated+1) END,move_owner=? WHERE id=? AND town_id=? AND town_joined_at=? AND move_epoch=?').bind(b.device,b.device,now,b.device,r.id,r.town_id,r.town_joined_at,b.moveEpoch).run();return !!result.meta.changes;
}
export async function presenceOnly(d:D1Database,r:MovementResident,now:number){await d.prepare('UPDATE residents SET seen=MAX(seen,?) WHERE id=? AND town_id=? AND town_joined_at=?').bind(now,r.id,r.town_id,r.town_joined_at).run();}
