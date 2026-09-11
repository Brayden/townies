import {ROADS,HOME_LOTS,COMMUNITY_PARK,isTownBlocked,onBridge} from './townLayout.ts';

export const MAINTENANCE_JOBS=['sweep','wash','trim','rake'] as const;
export type MaintenanceJob=typeof MAINTENANCE_JOBS[number];
export function isMaintenance(job:unknown):job is MaintenanceJob{return MAINTENANCE_JOBS.includes(job as MaintenanceJob)}
export const MAINTENANCE_PAY={sweep:2,wash:7,trim:8,rake:6};
export const MAINTENANCE_VERB={sweep:'Drive over debris',wash:'Powerwash sidewalk',trim:'Trim hedge',rake:'Rake leaves'};
export function workDuration(job:string){return job==='garden'?2000:job==='wash'?3000:job==='trim'?2500:job==='rake'?2200:0}
export type MaintenanceTarget={id:string;group:string;job:MaintenanceJob;kind:'road'|'sidewalk'|'hedge'|'leaves';x:number;z:number;width:number;depth:number;title:string};
const targets:MaintenanceTarget[]=[],occupied=new Set<string>();
const roadAt=(x:number,z:number,padding=0)=>ROADS.some(r=>Math.abs(x-r.x)<r.width/2+padding&&Math.abs(z-r.z)<r.depth/2+padding);
function add(job:MaintenanceJob,kind:MaintenanceTarget['kind'],x:number,z:number,width:number,depth:number,title:string){
 x=Number(x.toFixed(2));z=Number(z.toFixed(2));
 if(isTownBlocked(x,z)||onBridge(x,z)||Math.abs(x)>59||z>53||z< -55)return;
 // No tasks underneath buildings, homes or water, including the patch corners.
 if([[-1,-1],[-1,1],[1,-1],[1,1]].some(([a,b])=>isTownBlocked(x+a*width/2,z+b*depth/2)))return;
 const cell=`${job}:${Math.round(x/1.6)}:${Math.round(z/1.6)}`;if(occupied.has(cell))return;occupied.add(cell);
 const id=`${job}:${x}:${z}`;targets.push({id,group:id,job,kind,x,z,width,depth,title});
}
for(const road of ROADS){
 const horizontal=road.width>road.depth,length=horizontal?road.width:road.depth,thickness=horizontal?road.depth:road.width;
 for(let offset=-length/2+1.3;offset<length/2-1;offset+=2.6){
  const x=road.x+(horizontal?offset:0),z=road.z+(horizontal?0:offset);
  add('sweep','road',x,z,horizontal?2.4:1.6,horizontal?1.6:2.4,'Sweep the street');
  for(const side of [-1,1]){
   const sx=x+(horizontal?0:side*(thickness/2+.75)),sz=z+(horizontal?side*(thickness/2+.75):0);
   if(!roadAt(sx,sz,.1))add('wash','sidewalk',sx,sz,horizontal?2.4:1.15,horizontal?1.15:2.4,'Powerwash the sidewalk');
  }
 }
}
for(const h of HOME_LOTS){
 const x=h.x-3.6,z=h.z-.5;
 if(!roadAt(x,z,.8))add('trim','hedge',x,z,.85,2.2,'Trim the garden hedge');
 for(const side of [-1,1]){const x=h.x+side*3.3,z=h.z+(side===1?-.7:3.8);if(!roadAt(x,z,.5))add('rake','leaves',x,z,1.4,1.4,'Rake the neighborhood leaves');}
}
for(let x=COMMUNITY_PARK.x-12;x<=COMMUNITY_PARK.x+12;x+=3){
 for(const z of [-17,17])add('trim','hedge',x,z,2.4,.8,'Shape the park hedge');
 for(const z of [-12,-6,6,12])if(!roadAt(x,z,.6))add('rake','leaves',x,z,1.7,1.7,'Rake the park leaves');
}
export const MAINTENANCE_TARGETS=targets;
export function maintenanceApproach(t:{x:number;z:number;width?:number;depth?:number},from:{x:number;z:number},blocked:(x:number,z:number)=>boolean=isTownBlocked){
 const candidates=[{x:t.x-(t.width??1)/2-.45,z:t.z},{x:t.x+(t.width??1)/2+.45,z:t.z},{x:t.x,z:t.z-(t.depth??1)/2-.45},{x:t.x,z:t.z+(t.depth??1)/2+.45}];
 return candidates.filter(p=>Math.hypot(p.x-t.x,p.z-t.z)<1.85&&!blocked(p.x,p.z)).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0]??{x:t.x,z:t.z};
}
const bins=new Map<string,MaintenanceTarget[]>();
for(const t of targets.filter(t=>t.job==='sweep')){const key=`${Math.floor(t.x/4)},${Math.floor(t.z/4)}`;bins.set(key,[...(bins.get(key)??[]),t]);}
// Same swept footprint on client and server; a standing machine earns nothing.
export function sweptStreet(ax:number,az:number,bx:number,bz:number){
 const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;if(length<.000001)return[];
 const result:MaintenanceTarget[]=[];
 for(let x=Math.floor((Math.min(ax,bx)-1.2)/4);x<=Math.floor((Math.max(ax,bx)+1.2)/4);x++)for(let z=Math.floor((Math.min(az,bz)-1.2)/4);z<=Math.floor((Math.max(az,bz)+1.2)/4);z++)for(const t of bins.get(`${x},${z}`)??[]){const p=Math.max(0,Math.min(1,((t.x-ax)*dx+(t.z-az)*dz)/length));if(Math.hypot(t.x-ax-p*dx,t.z-az-p*dz)<=1.2)result.push(t);}
 return result;
}
