// The founding large initiative is independent of mayoral charter projects.
export const TOWN_FARM={id:'town-farm',name:'Town Farm',cost:6000,x:-88,z:-1,width:56,depth:46};
export const FARM_GATE={id:'farm-gate',name:'Road to the Town Farm',x:-58,z:-21};
export const FARM_BARN={id:'farm-barn',name:'Town Farm Barn',x:-100,z:-11,width:8,depth:6,height:4,color:'#c48868',roof:'#73866a',action:'life'};
export const FARM_ROADS=[{x:-87,z:-21,width:54,depth:3.6},{x:-88,z:-1,width:2.6,depth:40},{x:-100,z:-3,width:22,depth:2.4},{x:-77,z:18,width:24,depth:2.4}];
export const farmIsOpen=(s:{farmFunded?:number})=>(s.farmFunded??0)>=TOWN_FARM.cost;

export const FARM_SOLIDS=[{x:-108,z:-11,width:2,depth:2},{x:-103.9,z:-5.8,width:3.3,depth:1},{x:-92,z:-4,width:3,depth:1.3},...[-110,-102,-95].flatMap(x=>[6,14].map(z=>({x,z,width:.6,depth:.6})))];
