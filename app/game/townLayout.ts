export const BRIDGES=[{id:'north',z:-29},{id:'central',z:0},{id:'south',z:35}];
export const RIVER={x:28,width:9};
export const COMMUNITY_PARK={x:-35,z:0,width:18,depth:20};
export const BUILDINGS=[
 {id:'townhall',name:'Town Hall',x:0,z:-14,width:9,depth:6,height:4.2,color:'#e7cf9e',roof:'#687f85',action:'town'},
 {id:'clothing',name:'Thread & Thistle',x:12,z:-6,width:7,depth:5,height:3.1,color:'#e4b8ba',roof:'#83678b',action:'clothing'},
 {id:'general',name:'General Store',x:-12,z:-6,width:7,depth:5,height:3.1,color:'#d4dfb6',roof:'#637e5a',action:'market'},
 {id:'post',name:'Post Office',x:-12,z:10,width:7,depth:5,height:3.2,color:'#e6c49c',roof:'#b76c4d',action:'work'},
 {id:'cafe',name:'Corner Café',x:12,z:10,width:7,depth:5,height:3.2,color:'#e9d9b6',roof:'#bd8a58',action:'cafe'},
 {id:'school',name:'Town School',x:-15,z:-19,width:6.4,depth:4.8,height:3.1,color:'#e8d2a4',roof:'#7a8d89',action:'school'},
];
export const entrance=(b:typeof BUILDINGS[number])=>({x:b.x,z:b.z+b.depth/2+1.2});
export const HOME_LOTS=Array.from({length:50},(_,i)=>i<40?{x:[-50,-40,-30,-20,-10,0,10,20,40,50][i%10],z:[-45,-33,31,43][Math.floor(i/10)]}:((i-40)%5===2?{x:i<45?-38:41,z:-17}:{x:i<45?-48:48,z:[-21,-10,1,12,23][(i-40)%5]}));
export const ROADS=[
 {x:0,z:0,width:124,depth:5}, {x:0,z:0,width:5,depth:116},
 ...[-41,-29,35,47].map(z=>({x:0,z,width:114,depth:3.6})),
 ...[-55,55].map(x=>({x,z:-1,width:3.6,depth:110})),
 ...[-23,22,35].map(x=>({x,z:2,width:3.6,depth:90})),
 {x:0,z:19,width:47,depth:3.6}, {x:0,z:-24,width:47,depth:3.6},
];
export const STALLS=[{x:-5,z:18},{x:0,z:18},{x:5,z:18}];
export const onBridge=(x:number,z:number)=>x>=21&&x<=35&&BRIDGES.some(b=>Math.abs(z-b.z)<=2.4);
export const groundHeight=(x:number,z:number)=>onBridge(x,z)?Math.max(0,Math.min(1,(x-21)/2,(35-x)/2))*.4:0;
export function isTownBlocked(x:number,z:number){
 return x< -60||x>60||z< -58||z>55
  ||(x>23.2&&x<32.8&&!onBridge(x,z))
  ||HOME_LOTS.some(h=>Math.abs(x-h.x)<2.5&&Math.abs(z-h.z)<2.2)
  ||BUILDINGS.some(b=>Math.abs(x-b.x)<b.width/2+.23&&Math.abs(z-b.z)<b.depth/2+.23)
  ||(Math.abs(x)<2.05&&Math.abs(z)<2.05)
  ||STALLS.some(b=>Math.abs(x-b.x)<1.5&&Math.abs(z-b.z)<1.05)
  ||Math.hypot(x+27,z+18)<1.65;
}
export function safeTownPosition(x:number,z:number){
 if(!isTownBlocked(x,z))return{x,z};
 for(let radius=1;radius<10;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if((Math.abs(dx)===radius||Math.abs(dz)===radius)&&!isTownBlocked(x+dx,z+dz))return{x:x+dx,z:z+dz};
 return{x:0,z:6};
}
