import {communityBuilding} from './communityBuildings.ts';
import {SQUARE_LOTS,squareLot,hasCommunitySquare} from './communitySquare.ts';
import {TOWN_FARM,farmIsOpen} from './townFarm.ts';
import {HOME_LOTS,ROADS,COMMUNITY_PARK,WINDMILL,entrance,isTownBlocked} from './townLayout.ts';
import {GARDEN_AREAS} from './gardenAreas.ts';
import {WORK_TARGETS,STATIONS} from './workTargets.ts';
import {nodeById,institutionShape,locationOf,townLayout,townBuildings,expansionRoads,FERRY_STOPS,oriented,type PlanningState,type PlanProposal,type Placement,type WorldBuilding} from './charters.ts';
export type BuildingChoice=Pick<PlanProposal,'kind'|'institution'|'option'>&{fromPlot?:string|null};
export function placementShape(s:PlanningState,p:BuildingChoice){
 if(p.kind==='branch')return nodeById(p.option)!;
 if(p.kind==='relocate')return institutionShape(s.institutions.find(i=>i.id===p.institution)!);
 const spec=communityBuilding(p.option);return {name:spec?.name??'Community building',width:7,depth:4,height:p.option==='garden'?1:3.4,color:spec?.color??'#e5d2ad',roof:spec?.roof??'#719088'};
}
export function placementBuilding(s:PlanningState,p:BuildingChoice,v:Placement):WorldBuilding{const n=placementShape(s,p);return {id:p.institution??'preview',...n,...v,...oriented(n.width,n.depth,v.rotation),modelWidth:n.width,modelDepth:n.depth,action:'town'};}
type Rect={x:number;z:number;width:number;depth:number};
export const overlaps=(a:Rect,b:Rect,pad=0)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&Math.abs(a.z-b.z)<(a.depth+b.depth)/2+pad;
export function protectedLand(s:PlanningState){return [...(farmIsOpen(s)?[{...TOWN_FARM,name:'The shared town farm'}]:[]),
 ...HOME_LOTS.map(h=>({...h,z:h.z+.4,width:8,depth:8.4,name:'A resident’s home and garden'})),
 ...[...ROADS,...expansionRoads(s)].map(r=>({...r,name:'A public street'})),
 {...COMMUNITY_PARK,name:'Community Park'},...GARDEN_AREAS.map(a=>({...a,name:'A shared garden'})),
 ...townLayout(s).solidProps.map(p=>({...p,name:'An existing town feature'})),
 {x:0,z:0,width:4.5,depth:4.5,name:'The town fountain'},{...WINDMILL,width:5,depth:5,name:'The windmill'},
 ...FERRY_STOPS.map(f=>({...f,width:4,depth:4,name:'A ferry landing'})),
 ...WORK_TARGETS.map(t=>({...t,width:1.4,depth:1.4,name:'A job activity'})),...STATIONS.map(t=>({...t,width:2,depth:2,name:'A work supply station'})),
 ];}
export function placementError(s:PlanningState,p:BuildingChoice,v:Placement,reserved=protectedLand(s)):string|null{
 if(!Number.isInteger(v.x)||!Number.isInteger(v.z)||![0,90,180,270].includes(v.rotation))return 'Choose a grid square and one of the four building facings.';
 if(p.kind==='expand')return 'Land acquisitions do not need building placement.';
 const lot=squareLot(p.fromPlot);if(lot&&(!hasCommunitySquare(s)||v.x!==lot.x||v.z!==lot.z||v.rotation!==lot.rotation))return 'This vote reserves its named lot and inward-facing entrance.';if(lot&&s.buildings.some(b=>b.plot===lot.id))return 'That square lot is already occupied.';
 const b=placementBuilding(s,p,v),layout=townLayout(s);
 const inside=(x:number,z:number)=>layout.bounds.some(r=>Math.abs(x-r.x)<=r.width/2&&Math.abs(z-r.z)<=r.depth/2);
 for(const x of [b.x-b.width/2-.5,b.x+b.width/2+.5])for(const z of [b.z-b.depth/2-.5,b.z+b.depth/2+.5])if(!inside(x,z))return 'The whole building must fit on land your town owns.';
 if(overlaps(b,{x:28,z:-1.5,width:9.6,depth:113},.5))return 'Buildings cannot cover the river or its bridges.';
 if(hasCommunitySquare(s)&&SQUARE_LOTS.some(l=>l.id!==p.fromPlot&&overlaps(b,l,.35)))return 'Reserve this square lot for its own resident vote.';
 const protectedArea=reserved.find(r=>overlaps(b,r,.35));if(protectedArea)return `${protectedArea.name} needs to stay clear.`;
 const others=townBuildings(s).filter(o=>o.id!==p.institution);
 const market=s.institutions.find(i=>i.id==='towncenter')!;if(p.institution!=='towncenter'&&market.node==='root')others.push({id:'towncenter',...institutionShape(market),...locationOf(market),...oriented(16,8,market.rotation),action:'town'});
 for(const o of others)if(overlaps(b,o,.6))return `Leave space around ${o.name}.`;
 for(const g of s.buildings.filter(g=>g.kind==='garden'))if(overlaps(b,{...locationOf(g),...oriented(7,4,g.rotation)},.6))return 'Leave space around the civic garden.';
 const door=entrance(b),withoutCurrent={...layout,buildings:others,stalls:p.institution==='towncenter'?[]:layout.stalls};
 if(!inside(door.x,door.z)||isTownBlocked(door.x,door.z,withoutCurrent))return 'Turn or move the building so its front door has clear access.';
 if(p.kind==='relocate'){const old=locationOf(s.institutions.find(i=>i.id===p.institution)!);if(v.x===old.x&&v.z===old.z&&v.rotation===old.rotation)return 'Choose a new location or facing for this relocation.';}
 return null;
}
export function initialPlacement(s:PlanningState,p:BuildingChoice):Placement{const lot=squareLot(p.fromPlot);if(lot)return{x:lot.x,z:lot.z,rotation:lot.rotation};const i=s.institutions.find(i=>i.id===p.institution),start=i?locationOf(i):{x:-44,z:-70,rotation:0},reserved=protectedLand(s),current={x:Math.round(start.x),z:Math.round(start.z),rotation:start.rotation};if(!placementError(s,p,current,reserved))return current;for(const r of townLayout(s).bounds.slice().reverse())for(let z=Math.ceil(r.z-r.depth/2+1);z<r.z+r.depth/2;z++)for(let x=Math.ceil(r.x-r.width/2+1);x<r.x+r.width/2;x++)for(const rotation of [0,90,180,270]){const v={x,z,rotation};if(!placementError(s,p,v,reserved))return v;}return current;}
