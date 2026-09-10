// Coordinates transcribed from the approved aligned-town concept. All fronts face south.
export const BRIDGES=[{id:'north',z:-53},{id:'school',z:-21},{id:'central',z:21},{id:'south',z:41},{id:'harbor',z:51}];
export const RIVER={x:28,width:9};
export const COMMUNITY_PARK={x:-41,z:0,width:32,depth:36};
export const BUILDINGS=[
 {id:'townhall',name:'Town Hall',x:0,z:-11,width:8,depth:6,height:4.2,color:'#e7cf9e',roof:'#687f85',action:'town'},
 {id:'clothing',name:'Thread & Thistle',x:11,z:-11,width:6,depth:5,height:3.4,color:'#e4c5ab',roof:'#866e91',action:'clothing'},
 {id:'general',name:'General Store',x:-10,z:-11,width:6,depth:5,height:3.7,color:'#e3d7b0',roof:'#677e9c',action:'market'},
 {id:'post',name:'Post Office',x:17.5,z:-7,width:4.5,depth:4.5,height:3.1,color:'#e7c399',roof:'#ba6d51',action:'work'},
 {id:'cafe',name:'Corner Café',x:-17,z:-6,width:5,depth:5,height:3.1,color:'#e9d9b6',roof:'#ba6d62',action:'cafe'},
 {id:'school',name:'Town School',x:-7,z:-37,width:7,depth:5.5,height:3.4,color:'#e8d2a4',roof:'#b27856',action:'school'},
 {id:'library',name:'Town Library',x:-16,z:9,width:6,depth:5,height:3.1,color:'#e5d2a7',roof:'#6f879d',action:'library'},
 {id:'gardenclub',name:'Garden Club',x:17,z:9,width:6,depth:5,height:3.1,color:'#e5c7ab',roof:'#a37373',action:'work'},
];
export const entrance=(b:typeof BUILDINGS[number])=>({x:b.x,z:b.z+b.depth/2+1.2});
const lots:{x:number;z:number;district:string}[]=[];
for(const z of [-49,-39,-29])for(const x of [-39,-29])lots.push({x,z,district:'North Meadows'});
for(const z of [-49,-39])for(const x of [9,17])lots.push({x,z,district:'School Lane'});
for(const z of [-49,-39,-29,-9,1,11,27,37])for(const x of [41,53])lots.push({x,z,district:'Riverside'});
for(const z of [27,37,47])for(const x of [-52,-41,-30,-13,-2,9,17]){
 if(z===47&&(x===-41||x===-30))continue;
 lots.push({x,z,district:z===47?'Harbor Lane':'South Orchard'});
}
for(const [x,z]of [[-17,-49],[-7,-49],[-41,47],[53,47],[41,47]])lots.push({x,z,district:z>0?'Harbor Lane':'North Meadows'});
export const HOME_LOTS=lots;
export const ROADS=[
 ...[-53,-21,21,51].map(z=>({x:0,z,width:122,depth:3.6})),
 ...[-58.5,-23,22,35,58.5].map(x=>({x,z:-1,width:2.5,depth:108})),
 ...[31,41].map(z=>({x:0,z,width:120,depth:2.4})),
 ...[-45,-35,-25].flatMap(z=>[{x:-34,z,width:21,depth:2.4},{x:47,z,width:24,depth:2.4}]),
 ...[-45,-25].map(z=>({x:0,z,width:43,depth:2.4})),
 {x:12,z:-35,width:18,depth:2.4},
 {x:-44,z:-37,width:2.4,depth:30},
 {x:-21,z:36,width:2.4,depth:28},
 ...[-5,5,15].map(z=>({x:48,z,width:26,depth:2.4})),
];
export const STALLS=[{x:-6,z:13},{x:0,z:13},{x:6,z:13},{x:-6,z:17},{x:0,z:17},{x:6,z:17}];
export const WINDMILL={x:-53,z:-47};
export const HARBOR={x:-35,z:51};
export const SOLID_PROPS=[{x:17,z:-28,width:3,depth:3},{x:53,z:-16,width:3,depth:3},{x:53,z:17.7,width:3,depth:2.4},{x:-30,z:47,width:5,depth:3.3}];
export const onBridge=(x:number,z:number)=>x>=21&&x<=35&&BRIDGES.some(b=>Math.abs(z-b.z)<=2.4);
export const groundHeight=(x:number,z:number)=>onBridge(x,z)?Math.max(0,Math.min(1,(x-21)/2,(35-x)/2))*.4:0;
export type TownLayout={bounds:{x:number;z:number;width:number;depth:number}[];buildings:{x:number;z:number;width:number;depth:number}[];solidProps:{x:number;z:number;width:number;depth:number}[];stalls:{x:number;z:number}[]};
export function isTownBlocked(x:number,z:number,layout?:TownLayout){
 return (layout?!layout.bounds.some(r=>Math.abs(x-r.x)<=r.width/2&&Math.abs(z-r.z)<=r.depth/2):x< -60||x>60||z< -58||z>55)
  ||(x>23.2&&x<32.8&&z>=-58&&z<=55&&!onBridge(x,z))
  ||(layout?.solidProps??SOLID_PROPS).some(b=>Math.abs(x-b.x)<b.width/2+.15&&Math.abs(z-b.z)<b.depth/2+.15)
  ||HOME_LOTS.some(h=>Math.abs(x-h.x)<2.5&&Math.abs(z-h.z)<2.2)
  ||(layout?.buildings??BUILDINGS).some(b=>Math.abs(x-b.x)<b.width/2+.23&&Math.abs(z-b.z)<b.depth/2+.23)
  ||(Math.abs(x)<2.05&&Math.abs(z)<2.05)
  ||(layout?.stalls??STALLS).some(b=>Math.abs(x-b.x)<1.5&&Math.abs(z-b.z)<1.05)
  ||Math.hypot(x-WINDMILL.x,z-WINDMILL.z)<1.65;
}
export function safeTownPosition(x:number,z:number,layout?:TownLayout){
 if(!isTownBlocked(x,z,layout))return{x,z};
 for(let radius=1;radius<10;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if((Math.abs(dx)===radius||Math.abs(dz)===radius)&&!isTownBlocked(x+dx,z+dz,layout))return{x:x+dx,z:z+dz};
 return{x:0,z:6};
}
