'use client';
import {FARM_BEDS,PICNIC,cropStage} from './sharedLife';
import {useEffect,useState} from 'react';
import {PawPrint,Tractor,LockKeyhole,Package,Check,BookOpen,Sprout,Mailbox,Flower2,Landmark,Shirt,Store,Coffee,GraduationCap,Map as MapIcon,Minus,Plus,X} from 'lucide-react';
import {TOWN_FARM,FARM_GATE,farmIsOpen} from './townFarm';
import {HOMES,type TownState} from './data';
import {WORK_TARGETS,WORK_DAY_MS} from './workTargets';
import {GARDEN_AREAS} from './gardenAreas';
import {townBuildings,TERRITORIES,expansionRoads,FERRY_STOPS} from './charters';
import {ROADS,BRIDGES,COMMUNITY_PARK} from './townLayout';

// A doorstep and mailbox share one delivery; prefer the mailbox as its map pin.
const paperStops=[...new Map(WORK_TARGETS.filter(t=>t.job==='paper').sort((a,b)=>Number(a.kind==='mailbox')-Number(b.kind==='mailbox')).map(t=>[t.group,t])).values()];
const gardenStops=WORK_TARGETS.filter(t=>t.job==='garden');
const ZOOMS=[1,1.5,2,3,4];
export default function MiniMap({data,getPosition,onLook}:{data:TownState;getPosition:()=>{x:number;z:number}|undefined;onLook:(x:number,z:number)=>void}){
 const [level,setLevel]=useState(0),[open,setOpen]=useState(false),[position,setPosition]=useState({x:data.resident.x,z:data.resident.z});
 useEffect(()=>{const timer=setInterval(()=>{const p=getPosition();if(p)setPosition({x:p.x,z:p.z})},100);return()=>clearInterval(timer)},[getPosition]);
 const buildings=townBuildings(data.planning),expanded=data.planning.territories.length>0;
 const paper=data.resident.shift==='paper',garden=data.resident.shift==='garden',parcel=data.resident.shift==='deliver',route=paper||garden||parcel,stops=paper?paperStops:parcel?WORK_TARGETS.filter(t=>t.job==='deliver'&&data.parcelHomes?.includes(t.home!)):gardenStops,Marker=paper?Mailbox:parcel?Package:Flower2,zoom=ZOOMS[level],span=(expanded?236:184)/zoom;
 const clamp=(v:number,min:number,max:number)=>span>=max-min?(min+max)/2:Math.max(min+span/2,Math.min(max-span/2,v));
 const cx=clamp(position.x,-118,expanded?116:64),cz=clamp(position.z,expanded?-99:-64,expanded?101:64),unit=span/220;
 const delivered=new Set(data.worldWork.filter(w=>Date.now()-w.completed<WORK_DAY_MS).map(w=>w.id));
 const count=stops.filter(t=>delivered.has(t.group)).length;
 function lookFromMap(svg:SVGSVGElement,clientX:number,clientY:number){
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const point=svg.createSVGPoint();point.x=clientX;point.y=clientY;
  const world=point.matrixTransform(matrix.inverse());onLook(world.x,world.y);
 }
 return <section className={`town-minimap ${open?'is-open':''}`} aria-label={paper?'Paper delivery minimap':garden?'Community gardening minimap':'Town minimap'} onKeyDown={e=>e.stopPropagation()}>
  <button className="minimap-mobile-toggle secondary-button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="town-minimap-content">{open?<X size={18}/>:route?<Marker size={18}/>:<MapIcon size={18}/>} {open?'Close map':paper?'Mail route':parcel?'Parcel route':garden?'Garden map':'Town map'}</button>
  <div className="minimap-content paper" id="town-minimap-content">
   <div className="minimap-heading"><strong>{paper?'Paper route':parcel?'Parcel route':garden?'Garden care':data.town.name}</strong><span>N ↑</span></div>
   <svg className="town-minimap-map" onClick={e=>lookFromMap(e.currentTarget,e.clientX,e.clientY)} style={{cursor:'crosshair'}} aria-describedby="minimap-look-hint" viewBox={`${cx-span/2} ${cz-span/2} ${span} ${span}`} role="img" aria-label={paper?`${count} of ${stops.length} houses delivered. Green checked mailboxes are delivered; gray mailboxes are waiting.`:garden?`${count} of ${stops.length} beds watered. Green checked flowers are watered; gray flowers need water.`:'Town streets, homes, neighbors, and your position.'}>
    <rect x="-125" y="-110" width="265" height="230" fill="#78bbc9"/>{TERRITORIES.filter(t=>data.planning.territories.includes(t.id)).map(t=><rect key={t.id} x={t.x-t.width/2} y={t.z-t.depth/2} width={t.width} height={t.depth} fill="#b0c888"/>)}<rect x="-64" y="-64" width="128" height="128" fill="#afc487"/>
    <g><title>{farmIsOpen(data.planning)?'Town Farm · open':'Future Town Farm · road closed'}</title><rect x={TOWN_FARM.x-TOWN_FARM.width/2} y={TOWN_FARM.z-TOWN_FARM.depth/2} width={TOWN_FARM.width} height={TOWN_FARM.depth} fill={farmIsOpen(data.planning)?'#9fbd73':'#aaa98a'} stroke="#7b815b" strokeWidth=".6" strokeDasharray={farmIsOpen(data.planning)?undefined:'2 2'}/><path d="M-60 -21H-113" stroke={farmIsOpen(data.planning)?'#e5d5ad':'#d3b681'} strokeWidth="3.6" strokeDasharray={farmIsOpen(data.planning)?undefined:'3 2'}/><Tractor x={-91-7*unit} y={-10-7*unit} width={14*unit} height={14*unit} color="#586d49"/>{!farmIsOpen(data.planning)&&<LockKeyhole x={FARM_GATE.x-5*unit} y={FARM_GATE.z-6*unit} width={10*unit} height={12*unit} color="#796041"/>}</g>
    {[...ROADS,...expansionRoads(data.planning)].map((r,i)=><rect key={i} x={r.x-r.width/2} y={r.z-r.depth/2} width={r.width} height={r.depth} fill="#e5d5ad"/>)}
    <rect x="-64" y="57" width="128" height="7" fill="#78bbc9"/><path d="M28-64V64" stroke="#78bbc9" strokeWidth="9"/>
    {BRIDGES.map(b=><path key={b.id} d={`M21 ${b.z}H35`} stroke="#aa8051" strokeWidth="5"/>)}
    <rect x={COMMUNITY_PARK.x-COMMUNITY_PARK.width/2} y={-COMMUNITY_PARK.depth/2} width={COMMUNITY_PARK.width} height={COMMUNITY_PARK.depth} fill="#7fa660"><title>Community Park</title></rect>
    <circle cx={PICNIC.x} cy={PICNIC.z} r={2.4*unit} fill="#b77773" stroke="#fff0ce" strokeWidth={unit}><title>Neighborhood picnic</title></circle>
    {farmIsOpen(data.planning)&&!route&&FARM_BEDS.map(b=>{const stage=cropStage(data.life?.plots.find(p=>p.id===b.id),Date.now());return <rect key={b.id} x={b.x-1.2} y={b.z-1.2} width="2.4" height="2.4" fill={stage==='ready'?'#f4ce65':stage==='thirsty'?'#70b8d1':stage==='growing'?'#567c42':'#97764e'}><title>{b.name}: {stage}</title></rect>})}
    {HOMES.map(h=><rect key={h.id} x={h.x-2.3} y={h.z-1.8} width="4.6" height="3.6" rx=".5" fill={route?'#d4d3b4':h.id===data.resident.home?'#eac16c':h.roof} stroke="#647451" strokeWidth=".3"/>)}
    {GARDEN_AREAS.map(a=><rect key={a.id} x={a.x-a.width/2} y={a.z-a.depth/2} width={a.width} height={a.depth} rx=".5" fill="#83a765" stroke="#5c7b46" strokeWidth=".4"><title>{a.name}</title></rect>)}
    {buildings.map(b=>{const Icon=b.action==='pets'?PawPrint:b.id==='townhall'?Landmark:b.id==='clothing'?Shirt:b.id==='general'?Store:b.id==='cafe'?Coffee:b.id==='school'?GraduationCap:b.id==='library'?BookOpen:b.id==='gardenclub'?Sprout:Mailbox;return <g key={b.id} role="button" tabIndex={0} aria-label={`Look at ${b.name}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onLook(b.x,b.z)}}} style={{cursor:'pointer'}}><title>{b.name}</title><rect x={b.x-b.width/2} y={b.z-b.depth/2} width={b.width} height={b.depth} rx=".5" fill={b.color} stroke={b.roof} strokeWidth=".5"/><Icon x={b.x-7*unit} y={b.z-7*unit} width={14*unit} height={14*unit} color="#354b48" strokeWidth={2.5}/></g>})}
    {data.planning.territories.includes('island')&&FERRY_STOPS.map(f=><circle key={f.id} cx={f.x} cy={f.z} r={3*unit} fill="#eecc7b" stroke="#48677b" strokeWidth={unit}><title>{f.name}</title></circle>)}
    <circle r="1.6" fill="#79adb6"/>
    {data.peers.filter(p=>p.id!==data.resident.id).map(p=><circle key={p.id} cx={p.x} cy={p.z} r={2.4*unit} fill="#375c60" stroke="#fffbea" strokeWidth={unit}><title>{p.name}</title></circle>)}
    {route&&stops.map(t=>{const done=delivered.has(t.group),size=12*unit;return <g key={t.group}><title>{t.title} · {done?(paper?'Paper delivered':parcel?'Parcel delivered':'Watered'):(paper?'Awaiting newspaper':parcel?'Awaiting parcel':'Needs water')}</title><rect x={t.x-size/2-unit} y={t.z-size/2-unit} width={size+2*unit} height={size+2*unit} rx={2*unit} fill={done?'#e2f8d8':'#f3f2ea'} stroke={done?'#257440':'#787e82'} strokeWidth={unit}/><Marker x={t.x-size/2} y={t.z-size/2} width={size} height={size} color={done?'#257440':'#787e82'} strokeWidth={2.6}/>{done&&<Check x={t.x+size/5} y={t.z-size*.7} width={size*.65} height={size*.65} color="#154d28" strokeWidth={4}/>}</g>})}
    <circle cx={position.x} cy={position.z} r={4.5*unit} fill="#fffbea" stroke="#244b67" strokeWidth={2*unit}><title>You</title></circle>
    <circle cx={position.x} cy={position.z} r={1.5*unit} fill="#244b67"/>
   </svg>
   <p className="minimap-look-hint" id="minimap-look-hint">Click or tap the map to look around.</p>
   {parcel&&<p className="minimap-look-hint">38 homes today · new route at midnight UTC</p>}{route&&<div className="minimap-status"><span className="delivered"><Marker size={15}/><Check size={12}/> {paper||parcel?'Delivered':'Watered'}</span><span><Marker size={15}/> {paper||parcel?'Waiting':'Needs water'}</span><strong>{count}/{stops.length} {paper||parcel?'delivered':'beds watered'}</strong></div>}
   <div className="minimap-zoom"><button className="secondary-button" aria-label="Zoom minimap out" disabled={level===0} onClick={()=>setLevel(v=>Math.max(0,v-1))}><Minus size={18}/></button><button className="secondary-button minimap-fit" onClick={()=>setLevel(0)} aria-label="Show whole town on minimap">{zoom===1?'Whole town':`${zoom}× · Fit town`}</button><button className="secondary-button" aria-label="Zoom minimap in" disabled={level===ZOOMS.length-1} onClick={()=>setLevel(v=>Math.min(ZOOMS.length-1,v+1))}><Plus size={18}/></button></div>
  </div>
 </section>;
}
