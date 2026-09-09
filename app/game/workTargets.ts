import {HOMES} from './data.ts';
import {isTownBlocked,BUILDINGS,entrance} from './townLayout.ts';
import {GARDEN_AREAS} from './gardenAreas.ts';
export type FieldJob='paper'|'clean'|'garden'|'deliver';
export type WorkTarget={id:string;group:string;job:FieldJob;kind:'mailbox'|'door'|'litter'|'bed';x:number;z:number;title:string;home?:number};
export const WORK_DAY_MS=24*60*60*1000;
export const WORK_PAY:Record<FieldJob,number>={paper:4,clean:3,garden:6,deliver:8};
export const CAPACITY={paper:12,clean:8,garden:8,deliver:6};
export const STATIONS=[{id:'supplies',...entrance(BUILDINGS.find(b=>b.id==='post')!),title:'Town supply stand',jobs:['paper','deliver']},{id:'recycling',x:-6,z:0,title:'Recycling station',jobs:['clean']},{id:'water',x:0,z:3,title:'Fountain refill',jobs:['garden']}];
export const JOB_HINTS:Record<FieldJob,string>={paper:'Keep riding! Press Space in range or tap a mailbox or doorstep to throw a newspaper.',clean:'Walk up to litter and tap it to pick it up. Empty a full bag at recycling.',garden:'Follow gray flowers on your map to thirsty beds at homes and community gardens. Tap a bed to water it.',deliver:'Pull your handcart to a house and tap its doorstep to leave a parcel.'};
export function workPointOpen(x:number,z:number){return !isTownBlocked(x,z)}
const targets:WorkTarget[]=[];
for(const h of HOMES){
 for(const kind of ['mailbox','door'] as const)targets.push({id:`paper-${h.id}-${kind}`,group:`paper-home-${h.id}`,job:'paper',kind,x:h.x+(kind==='mailbox'?2.65:.55),z:h.z+(kind==='mailbox'?2.1:2.85),title:`${h.name} · ${kind}`,home:h.id});
 targets.push({id:`parcel-${h.id}`,group:`parcel-${h.id}`,job:'deliver',kind:'door',x:h.x+.55,z:h.z+2.85,title:`Parcel for ${h.name}`,home:h.id});
 for(let i=0;i<2;i++)targets.push({id:`litter-${h.id}-${i}`,group:`litter-${h.id}-${i}`,job:'clean',kind:'litter',x:h.x+(i?3.3:-3.3),z:h.z+3.4+i*.4,title:'Pick up litter'});
 targets.push({id:`bed-${h.id}`,group:`bed-${h.id}`,job:'garden',kind:'bed',x:h.x-3.35,z:h.z+1.9,title:`${h.name} flower bed`,home:h.id});
}
for(let i=0;i<20;i++){const x=-8+(i%5)*3.6,z=-5.5+Math.floor(i/5)*3.4;targets.push({id:`square-litter-${i}`,group:`square-litter-${i}`,job:'clean',kind:'litter',x,z,title:'Tidy the town square'})}
for(const [i,x,z] of [[0,-7,3],[1,3,-7],[2,-49,6],[3,-45,6],[4,10,16],[5,-10,16]])targets.push({id:`square-bed-${i}`,group:`square-bed-${i}`,job:'garden',kind:'bed',x,z,title:'Community flower bed'});
for(const area of GARDEN_AREAS)for(let i=0;i<6;i++){const id=`${area.id}-bed-${i}`;targets.push({id,group:id,job:'garden',kind:'bed',x:area.x+(i%3-1)*2,z:area.z+(i<3?-1:1)*Math.min(1.5,(area.depth-1.2)/2),title:`${area.name} · bed ${i+1}`})}
export const WORK_TARGETS=targets.filter(t=>workPointOpen(t.x,t.z));
export const TARGET_BY_ID=new Map(WORK_TARGETS.map(t=>[t.id,t]));
