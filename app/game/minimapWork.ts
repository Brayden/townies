export const MAP_ZOOMS=[1,1.5,2,3,4,6,8];
type Stop={id:string;group:string;x:number;z:number};
export function minimapWorkMarkers<T extends Stop>(stops:T[],done:Set<string>,view:{x:number;z:number;span:number;pixels:number}){
 const unit=view.span/Math.max(80,view.pixels),size=unit*25,buckets=new Map<string,T[]>();
 for(const t of stops){
  if(Math.abs(t.x-view.x)>view.span/2+size||Math.abs(t.z-view.z)>view.span/2+size)continue;
  const key=`${Math.floor(t.x/size)},${Math.floor(t.z/size)}`;buckets.set(key,[...(buckets.get(key)??[]),t]);
 }
 const candidates=[...buckets].map(([id,items])=>{
  const pending=items.filter(t=>!done.has(t.group)),candidates=pending.length?pending:items;
  const cx=candidates.reduce((n,t)=>n+t.x,0)/candidates.length,cz=candidates.reduce((n,t)=>n+t.z,0)/candidates.length;
  // Pin and camera destination both point to a real unfinished task, never a
  // centroid in a house/river or a completed neighbor in a mixed cluster.
  const target=[...candidates].sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz))[0];
  return {id,target,pending:pending.length,total:items.length,done:pending.length===0};
 }).sort((a,b)=>Number(a.done)-Number(b.done));
 const markers:typeof candidates=[];
 // Adjacent grid buckets may still put their real task anchors side by side.
 // Merge those pins too, keeping the unfinished anchor and counting every spot.
 for(const pin of candidates){
  const neighbor=markers.find(p=>Math.hypot(p.target.x-pin.target.x,p.target.z-pin.target.z)<unit*24);
  if(neighbor){neighbor.pending+=pin.pending;neighbor.total+=pin.total;neighbor.done=neighbor.pending===0;}
  else markers.push({...pin});
 }
 return markers.sort((a,b)=>Number(b.done)-Number(a.done));
}
