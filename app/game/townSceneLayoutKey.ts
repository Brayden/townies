import {EMPTY_PLANNING,locationOf,type PlanningState} from './charters';
import {farmIsOpen} from './townFarm';

// Only static geometry belongs here. Names, pets, decorations, funding and
// other live state already update in the animation loop without rebuilding it.
export function townSceneLayoutKey(planning:PlanningState=EMPTY_PLANNING,properties:{home:number;house?:string}[]=[]){
 const sorted=(rows:unknown[][])=>rows.map(row=>JSON.stringify(row)).sort();
 return JSON.stringify([
  planning.squareVersion??0,
  [...planning.territories].sort(),
  sorted(planning.institutions.map(i=>{const p=locationOf(i);return[i.id,i.node,i.plot,p.x,p.z,p.rotation]})),
  sorted(planning.buildings.map(b=>{const p=locationOf(b);return[b.plot,b.kind,p.x,p.z,p.rotation]})),
  farmIsOpen(planning),
  sorted(properties.map(p=>[p.home,p.house??null]))
 ]);
}
