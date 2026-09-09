import {HOMES} from './data.ts';
export type FieldJob='paper'|'clean'|'garden'|'deliver';
export type WorkTarget={id:string;group:string;job:FieldJob;kind:'mailbox'|'door'|'litter'|'bed';x:number;z:number;title:string;home?:number};
export const WORK_DAY_MS=24*60*60*1000;
export const WORK_PAY:Record<FieldJob,number>={paper:4,clean:3,garden:6,deliver:8};
export const CAPACITY={paper:12,clean:8,garden:8,deliver:6};
export const STATIONS=[{id:'supplies',x:6,z:0,title:'Town supply stand',jobs:['paper','deliver']},{id:'recycling',x:-6,z:0,title:'Recycling station',jobs:['clean']},{id:'water',x:0,z:3,title:'Fountain refill',jobs:['garden']}];
export const JOB_HINTS:Record<FieldJob,string>={paper:'Ride to a house. Press Space nearby or tap its mailbox or doorstep to leave a newspaper.',clean:'Walk up to litter and tap it to pick it up. Empty a full bag at recycling.',garden:'Tap a thirsty flower bed to water it. Watch the soil darken and flowers bloom.',deliver:'Pull your handcart to a house and tap its doorstep to leave a parcel.'};
export function workPointOpen(x:number,z:number){return Math.abs(x)<60&&z> -58&&z<55&&!(x>23.2&&x<32.8&&Math.abs(z)>2.35)&&!HOMES.some(h=>Math.abs(x-h.x)<2.5&&Math.abs(z-h.z)<2.2)&&!(Math.abs(x)<2.1&&Math.abs(z)<2.1)&&!(Math.abs(x)<3.5&&Math.abs(z+22)<2.7)&&![7,10.2,13.4].some(a=>Math.abs(x-a)<1.5&&Math.abs(z+2.6)<1.1)}
const targets:WorkTarget[]=[];
for(const h of HOMES){
 for(const kind of ['mailbox','door'] as const)targets.push({id:`paper-${h.id}-${kind}`,group:`paper-home-${h.id}`,job:'paper',kind,x:h.x+(kind==='mailbox'?2.65:.55),z:h.z+(kind==='mailbox'?2.1:2.85),title:`${h.name} · ${kind}`,home:h.id});
 targets.push({id:`parcel-${h.id}`,group:`parcel-${h.id}`,job:'deliver',kind:'door',x:h.x+.55,z:h.z+2.85,title:`Parcel for ${h.name}`,home:h.id});
 for(let i=0;i<2;i++)targets.push({id:`litter-${h.id}-${i}`,group:`litter-${h.id}-${i}`,job:'clean',kind:'litter',x:h.x+(i?3.3:-3.3),z:h.z+3.4+i*.4,title:'Pick up litter'});
 targets.push({id:`bed-${h.id}`,group:`bed-${h.id}`,job:'garden',kind:'bed',x:h.x-3.35,z:h.z+1.9,title:`${h.name} flower bed`,home:h.id});
}
for(let i=0;i<20;i++){const x=-8+(i%5)*3.6,z=-5.5+Math.floor(i/5)*3.4;targets.push({id:`square-litter-${i}`,group:`square-litter-${i}`,job:'clean',kind:'litter',x,z,title:'Tidy the town square'})}
for(const [i,x,z] of [[0,-12,3],[1,3,-7],[2,-17,2],[3,-16,-2],[4,3,13],[5,-3,16]])targets.push({id:`square-bed-${i}`,group:`square-bed-${i}`,job:'garden',kind:'bed',x,z,title:'Community flower bed'});
export const WORK_TARGETS=targets.filter(t=>workPointOpen(t.x,t.z));
export const TARGET_BY_ID=new Map(WORK_TARGETS.map(t=>[t.id,t]));
