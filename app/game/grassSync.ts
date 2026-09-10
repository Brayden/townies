const REGROW_MS=86400000;
/** Predictions belong to the movement request that carries them, not a timeout. */
export class GrassSync {
 private confirmed=new Map<string,number>();
 private pending=new Map<string,number>();
 private sequence=0;
 revision=0;
 get movementSequence(){return this.sequence;}
 cutAt(id:string){return this.confirmed.get(id);}
 isCut(id:string,now:number){return this.pending.has(id)||(this.confirmed.get(id)??-Infinity)>now-REGROW_MS;}
 predict(id:string,now:number){if(this.isCut(id,now))return false;this.pending.set(id,++this.sequence);this.revision++;return true;}
 merge(history:readonly {cell:string;cut_at:number}[]){
  for(const {cell,cut_at} of history){if(!Number.isFinite(cut_at))continue;if(cut_at>(this.confirmed.get(cell)??-Infinity)){this.confirmed.set(cell,cut_at);this.revision++;}}
 }
 settle(sequence:number,history:readonly {cell:string;cut_at:number}[]){
  this.merge(history);
  // New cuts made while this request was in flight must keep their prediction.
  for(const [id,cutSequence] of this.pending)if(cutSequence<=sequence){this.pending.delete(id);this.revision++;}
 }
 cuts(now:number){return new Set([...this.pending.keys(),...[...this.confirmed].filter(([,at])=>at>now-REGROW_MS).map(([id])=>id)]);}
 nextRegrowth(now:number){let next=Infinity;for(const at of this.confirmed.values())if(at+REGROW_MS>now)next=Math.min(next,at+REGROW_MS);return next;}
}
