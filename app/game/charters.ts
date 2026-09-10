import {BUILDINGS,STALLS,SOLID_PROPS,type TownLayout} from './townLayout.ts';
export type InstitutionId='library'|'towncenter'|'harbor';
export const INSTITUTIONS=[{id:'library',name:'Library',plot:'library-site'},{id:'towncenter',name:'Town center',plot:'market-site'},{id:'harbor',name:'Harbor',plot:'harbor-site'}] as const;
export const TERRITORIES=[
 {id:'north',name:'Northern Meadows',cost:2400,x:-19,z:-77,width:82,depth:38,description:'Meadow lanes and open land for a new campus north of town. Place buildings freely between the streets.'},
 {id:'east',name:'Eastern Fields',cost:3200,x:82,z:0,width:44,depth:100,description:'A new grid of streets east of the neighborhoods, with room to design your own civic district.'},
 {id:'island',name:'Sunrise Island',cost:4800,x:90,z:81,width:44,depth:34,description:'A ferry route and open island land. Design a new waterfront district across the water.'},
] as const;
export const PLOTS=[
 {id:'library-site',name:'Old Library Square',territory:'core',x:-16,z:9,width:10,depth:8},
 {id:'market-site',name:'Market Square',territory:'core',x:0,z:14,width:18,depth:10},
 {id:'harbor-site',name:'Harbor Yard',territory:'core',x:-30,z:47,width:10,depth:6},
 ...[-70,-87].flatMap((z,row)=>[-44,-17,10].map((x,col)=>({id:`north-${row}-${col}`,name:`Meadow ${row*3+col+1}`,territory:'north',x,z,width:22,depth:12}))),
 ...[-37,-6,36].flatMap((z,row)=>[73,94].map((x,col)=>({id:`east-${row}-${col}`,name:`Eastfield ${row*2+col+1}`,territory:'east',x,z,width:18,depth:20}))),
 ...[74,89].flatMap((z,row)=>[79,101].map((x,col)=>({id:`island-${row}-${col}`,name:`Island ${row*2+col+1}`,territory:'island',x,z,width:18,depth:12}))),
];
export type CharterNode={id:string;institution:InstitutionId;parent:string;name:string;cost:number;width:number;depth:number;height:number;color:string;roof:string;style:'campus'|'glass'|'theater'|'museum'|'observatory'|'market'|'mall'|'festival'|'harbor'|'workshop';description:string};
const nodes:CharterNode[]=[];
function branch(institution:InstitutionId,id:string,parent:string,name:string,cost:number,width:number,depth:number,height:number,style:CharterNode['style'],color:string,roof:string,description:string){nodes.push({institution,id,parent,name,cost,width,depth,height,style,color,roof,description});}
branch('library','academy','root','Public Academy',1600,8,6,4.2,'campus','#e6d5aa','#708999','A taller teaching house with a colonnade. Opens the institute or conservatory paths.');
branch('library','culture','root','House of Culture',1700,8,6,4.5,'theater','#ead0b4','#a76f79','A civic arts hall with an entrance canopy. Opens the theater or museum paths.');
branch('library','archive','root','Explorers’ Archive',1800,8,6,4.6,'observatory','#d3ddcf','#627e9e','A map house with a lookout tower. Opens maritime research or stargazing paths.');
branch('library','institute','academy','Inventors’ Institute',3600,14,10,6,'workshop','#dfd2ac','#668a91','A large workshop campus with roof vents and a clock tower. Requires a larger parcel.');
branch('library','conservatory','academy','Botanical Conservatory',3400,14,10,5.5,'glass','#bcded0','#83b4a9','An expansive glasshouse with tall mullions and a planted entrance. Requires a larger parcel.');
branch('library','theater','culture','Grand Theater',3800,14,10,7,'theater','#ebccab','#a66674','A grand theater with tall columns, banners, and a sweeping entrance canopy.');
branch('library','museum','culture','Museum of Town Life',3600,14,10,6.5,'museum','#e5d9bf','#6b8795','A monumental museum with a central dome and two gallery wings.');
branch('library','marine','archive','Oceanographic Center',3900,14,10,6,'glass','#b8dce0','#5d95a5','A blue glass research landmark with a planted entrance.');
branch('library','observatory','archive','Hilltop Observatory',4000,14,10,7,'observatory','#d8d7cd','#6b80a3','A telescope dome above a broad civic campus, with a columned entrance.');
branch('towncenter','artisans','root','Artisan Market Quarter',1700,14,8,3.8,'market','#e4cd9f','#ae805f','Replace the old stalls with a coordinated covered market. Opens craft or culinary districts.');
branch('towncenter','arcade','root','Shopping Arcade',2200,16,8,4.5,'mall','#e8d7bc','#799a91','An indoor shopping street with glazed roof sections. Opens a mall or garden galleria.');
branch('towncenter','festivals','root','Festival Hall',1900,14,8,4.5,'festival','#e8d1a6','#ba7a77','A colorful gathering hall and banner-lined forecourt. Opens music or seasonal fairgrounds.');
branch('towncenter','craft-quarter','artisans','Makers’ Quarter',3400,16,8,5,'workshop','#dac39d','#72978e','An artisan workshop landmark with paired roof vents and a central tower.');
branch('towncenter','food-hall','artisans','Grand Food Hall',3500,16,8,5,'market','#eed9ad','#b68a5f','A large market hall with colorful awnings and a broad pitched roof.');
branch('towncenter','mall','arcade','Town Shopping Mall',4500,16,8,7,'mall','#e9dcc1','#7d9e9c','A full two-story shopping landmark with a glass atrium and broad canopy.');
branch('towncenter','galleria','arcade','Garden Galleria',4200,16,8,6,'glass','#d0dfc8','#83ab8d','A planted shopping conservatory under a long glass roof.');
branch('towncenter','music-hall','festivals','Music Pavilion',3800,16,8,6,'theater','#e6c7b4','#a97586','A dramatic performance hall with tall columns and a sheltered entrance.');
branch('towncenter','fairgrounds','festivals','Four Seasons Fair Hall',3900,16,8,5,'festival','#e6d7b1','#b58462','A festival landmark with striped awnings, pennants, and a broad entrance.');
branch('harbor','ferry-port','root','Passenger Terminal',1900,8,4,4,'harbor','#dcdabc','#6c93a2','A welcoming terminal with a clock tower. Opens a grand terminal or resort port.');
branch('harbor','working-port','root','Working Waterfront',1600,8,4,3.8,'workshop','#d3bd96','#708d8b','A timber waterfront workshop. Opens boatbuilding or a fish market.');
branch('harbor','expedition-port','root','Exploration Harbor',2100,8,4,4.2,'observatory','#d6d5b5','#6d89a5','A chart house with a lookout. Opens a research base or an expedition lodge.');
branch('harbor','grand-terminal','ferry-port','Grand Ferry Terminal',4100,14,10,6,'harbor','#e7d9b9','#668da2','A landmark passenger hall with a central tower. Requires a larger parcel.');
branch('harbor','resort-port','ferry-port','Seaside Welcome Center',3900,14,10,5.5,'market','#efdab3','#c18a74','A broad seaside pavilion with striped awnings and a planted entrance.');
branch('harbor','boatworks','working-port','Boatbuilders’ Basin',3800,14,10,5,'workshop','#d4bd95','#6e8e89','A large boatbuilding hall with paired roof vents and a central tower.');
branch('harbor','fish-market','working-port','Harbor Market Hall',3600,14,10,5,'market','#e5d1aa','#749a9d','A waterfront market building with colorful awnings and a broad pitched roof.');
branch('harbor','research-port','expedition-port','Marine Expedition Base',4300,14,10,6,'glass','#c7dfe1','#668a9e','A glazed expedition campus with tall mullions and a sheltered entrance.');
branch('harbor','explorer-lodge','expedition-port','Explorers’ Lodge',4000,14,10,6,'campus','#d9c5a2','#827c65','A timber expedition landmark with entrance columns and a tall lookout.');
export const CHARTER_NODES=nodes;
export const REDEVELOPMENTS=[{id:'garden',name:'Civic garden',cost:600,description:'A public garden and seating on a vacated civic site.'},{id:'food',name:'Neighborhood food hall',cost:1200,description:'A small food hall with striped awnings on a vacant civic parcel.'},{id:'craft',name:'Community craft studio',cost:1400,description:'A timber workshop and planted entrance on a vacant civic parcel.'}] as const;
export type Placement={x:number;z:number;rotation:number};
export type Institution={id:InstitutionId;node:string;plot:string;x?:number|null;z?:number|null;rotation?:number};
export type ParcelBuilding={plot:string;kind:string;x?:number|null;z?:number|null;rotation?:number};
export type WorldBuilding=typeof BUILDINGS[number]&{rotation?:number;modelWidth?:number;modelDepth?:number};
export type PlanProposal={id:string;kind:'branch'|'relocate'|'expand'|'build';institution:string|null;option:string;fromNode:string|null;fromPlot:string|null;cost:number;funded:number;status:'voting'|'approved'|'ready'|'rejected'|'completed';created:number;closes:number;electorate:number;quorum:number;yes:number;no:number;myVote:number|null;eligible:boolean;name:string};
export type PlanningState={territories:string[];institutions:Institution[];buildings:ParcelBuilding[];proposals:PlanProposal[]};
export const EMPTY_PLANNING:PlanningState={territories:[],institutions:INSTITUTIONS.map(i=>({id:i.id,node:'root',plot:i.plot})),buildings:[],proposals:[]};
export const nodeById=(id:string)=>CHARTER_NODES.find(n=>n.id===id);
export const plotById=(id:string)=>PLOTS.find(p=>p.id===id);
export function plotOwned(plot:typeof PLOTS[number],s:PlanningState){return plot.territory==='core'||s.territories.includes(plot.territory);}
export function locationOf(i:{plot:string;x?:number|null;z?:number|null;rotation?:number}){const p=plotById(i.plot);return {x:i.x??p?.x??0,z:i.z??p?.z??0,rotation:i.rotation??0,name:i.x!=null?'Custom town site':p?.name??'Town site'};}
export function oriented(width:number,depth:number,rotation=0){return rotation%180?{width:depth,depth:width}:{width,depth};}
export function plotOccupied(id:string,s:PlanningState){const p=plotById(id);if(!p)return false;return [...s.institutions.map(i=>({...locationOf(i),...oriented(institutionShape(i).width,institutionShape(i).depth,i.rotation)})),...s.buildings.map(b=>({...locationOf(b),...oriented(7,4,b.rotation)}))].some(b=>Math.abs(b.x-p.x)<(b.width+p.width)/2&&Math.abs(b.z-p.z)<(b.depth+p.depth)/2);}
export function institutionShape(i:Institution){const node=nodeById(i.node),root=BUILDINGS.find(b=>b.id==='library')!;return node??(i.id==='library'?{...root,name:'Town Library'}:i.id==='towncenter'?{width:16,depth:6,height:2.4,name:'Market Square',color:'#dfcea6',roof:'#b98b65'}:{width:5,depth:3.3,height:2.2,name:'Harbor House',color:'#bb9e72',roof:'#6f8b9c'});}
export function fitsPlot(shape:{width:number;depth:number},plot:typeof PLOTS[number]){return shape.width<=plot.width-1&&shape.depth<=plot.depth-1;}
export function townBuildings(s:PlanningState):WorldBuilding[]{const fixed=BUILDINGS.filter(b=>b.id!=='library');return [...fixed,...s.institutions.filter(i=>i.id!=='towncenter'||i.node!=='root').map(i=>{const p=locationOf(i),n=institutionShape(i);return {id:i.id,...p,...oriented(n.width,n.depth,p.rotation),modelWidth:n.width,modelDepth:n.depth,height:n.height,color:n.color,roof:n.roof,name:n.name,action:i.id==='library'?'library':'town'};}),...s.buildings.filter(b=>b.kind!=='garden').map(b=>{const p=locationOf(b),parcel=plotById(b.plot),width=Math.min(7,(parcel?.width??9)-2),depth=Math.min(4,(parcel?.depth??6)-2);return {id:`site-${b.plot}`,...p,name:REDEVELOPMENTS.find(r=>r.id===b.kind)!.name,...oriented(width,depth,p.rotation),modelWidth:width,modelDepth:depth,height:3.4,color:'#e5d2ad',roof:b.kind==='food'?'#bd8267':'#719088',action:'town'};})];}
export function townLayout(s:PlanningState):TownLayout{return {bounds:[{x:0,z:-1.5,width:120,depth:113},...TERRITORIES.filter(t=>s.territories.includes(t.id))],buildings:townBuildings(s),solidProps:SOLID_PROPS.filter(p=>p.x!==-30||p.z!==47),stalls:s.institutions.find(i=>i.id==='towncenter')?.node==='root'?marketStalls(s):[]};}
export function marketStalls(s:PlanningState){const p=locationOf(s.institutions.find(i=>i.id==='towncenter')!),a=p.rotation*Math.PI/180;return STALLS.map(stall=>({...stall,x:p.x+stall.x*Math.cos(a)+(stall.z-14)*Math.sin(a),z:p.z-stall.x*Math.sin(a)+(stall.z-14)*Math.cos(a),rotation:p.rotation}));}
export const FERRY_STOPS=[{id:'ferry-main',x:-35,z:54,name:'Ferry to Sunrise Island'},{id:'ferry-island',x:70,z:94,name:'Ferry to town'}];
export function proposalTitle(p:Pick<PlanProposal,'kind'|'option'|'institution'>){return p.kind==='expand'?`Open ${TERRITORIES.find(t=>t.id===p.option)?.name}`:p.kind==='branch'?nodeById(p.option)?.name??p.option:p.kind==='relocate'?`Relocate ${INSTITUTIONS.find(i=>i.id===p.institution)?.name}`:`Build ${REDEVELOPMENTS.find(r=>r.id===p.option)?.name}`;}
export function proposalSite(p:Pick<PlanProposal,'kind'|'option'|'institution'|'fromPlot'>){return p.kind==='expand'?TERRITORIES.find(t=>t.id===p.option):plotById((p.kind==='relocate'?p.option:p.fromPlot)??'');}
export function expansionRoads(s:PlanningState){return [
 ...(s.territories.includes('north')?[...[-58,-30,-3,21].map(x=>({x,z:-77,width:2,depth:38})),...[-61,-78,-95].map(z=>({x:-19,z,width:82,depth:2}))]:[]),
 ...(s.territories.includes('east')?[...[62,84,103].map(x=>({x,z:0,width:2,depth:100})),...[-49,-21,21,49].map(z=>({x:82,z,width:44,depth:2}))]:[]),
 ...(s.territories.includes('island')?[...[69,90,111].map(x=>({x,z:81,width:2,depth:34})),...[65,82,97].map(z=>({x:90,z,width:44,depth:2}))]:[]),
];}
