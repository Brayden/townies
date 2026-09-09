'use client';
import {useEffect,useState} from 'react';
import {Check,Mailbox,Map as MapIcon,Minus,Plus,X} from 'lucide-react';
import {HOMES,type TownState} from './data';
import {WORK_TARGETS,WORK_DAY_MS} from './workTargets';

// A doorstep and mailbox share one delivery; prefer the mailbox as its map pin.
const paperStops=[...new Map(WORK_TARGETS.filter(t=>t.job==='paper').sort((a,b)=>Number(a.kind==='mailbox')-Number(b.kind==='mailbox')).map(t=>[t.group,t])).values()];
const ZOOMS=[1,1.5,2,3,4];
export default function MiniMap({data,getPosition}:{data:TownState;getPosition:()=>{x:number;z:number}|undefined}){
 const [level,setLevel]=useState(0),[open,setOpen]=useState(false),[position,setPosition]=useState({x:data.resident.x,z:data.resident.z});
 useEffect(()=>{const timer=setInterval(()=>{const p=getPosition();if(p)setPosition({x:p.x,z:p.z})},100);return()=>clearInterval(timer)},[getPosition]);
 const paper=data.resident.shift==='paper',zoom=ZOOMS[level],span=128/zoom;
 const clamp=(v:number)=>Math.max(-64+span/2,Math.min(64-span/2,v));
 const cx=clamp(position.x),cz=clamp(position.z),unit=span/220;
 const delivered=new Set(data.worldWork.filter(w=>Date.now()-w.completed<WORK_DAY_MS).map(w=>w.id));
 const count=paperStops.filter(t=>delivered.has(t.group)).length;
 return <section className={`town-minimap ${open?'is-open':''}`} aria-label={paper?'Paper delivery minimap':'Town minimap'} onKeyDown={e=>e.stopPropagation()}>
  <button className="minimap-mobile-toggle secondary-button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="town-minimap-content">{open?<X size={18}/>:paper?<Mailbox size={18}/>:<MapIcon size={18}/>} {open?'Close map':paper?'Mail route':'Town map'}</button>
  <div className="minimap-content paper" id="town-minimap-content">
   <div className="minimap-heading"><strong>{paper?'Paper route':data.town.name}</strong><span>N ↑</span></div>
   <svg className="town-minimap-map" viewBox={`${cx-span/2} ${cz-span/2} ${span} ${span}`} role="img" aria-label={paper?`${count} of ${paperStops.length} houses delivered. Green checked mailboxes are delivered; gray mailboxes are waiting.`:'Town streets, homes, neighbors, and your position.'}>
    <rect x="-64" y="-64" width="128" height="128" fill="#afc487"/>
    <path d="M-60 0H60M0-60V60M-54-50V50M54-50V50M-54-42H54M-54-30H54M-54 34H54M-54 46H54" fill="none" stroke="#e5d5ad" strokeWidth="3.5"/>
    <path d="M28-64V64" stroke="#78bbc9" strokeWidth="9"/>
    <path d="M22 0H34" stroke="#ceb786" strokeWidth="4"/>
    {HOMES.map(h=><rect key={h.id} x={h.x-2.3} y={h.z-1.8} width="4.6" height="3.6" rx=".5" fill={paper?'#d4d3b4':h.id===data.resident.home?'#eac16c':h.roof} stroke="#647451" strokeWidth=".3"/>)}
    <circle r="1.6" fill="#79adb6"/>
    {data.peers.filter(p=>p.id!==data.resident.id).map(p=><circle key={p.id} cx={p.x} cy={p.z} r={2.4*unit} fill="#375c60" stroke="#fffbea" strokeWidth={unit}><title>{p.name}</title></circle>)}
    {paper&&paperStops.map(t=>{const done=delivered.has(t.group),size=12*unit;return <g key={t.group}><title>{t.title} · {done?'Paper delivered':'Awaiting newspaper'}</title><rect x={t.x-size/2-unit} y={t.z-size/2-unit} width={size+2*unit} height={size+2*unit} rx={2*unit} fill={done?'#e2f8d8':'#f3f2ea'} stroke={done?'#257440':'#787e82'} strokeWidth={unit}/><Mailbox x={t.x-size/2} y={t.z-size/2} width={size} height={size} color={done?'#257440':'#787e82'} strokeWidth={2.6}/>{done&&<Check x={t.x+size/5} y={t.z-size*.7} width={size*.65} height={size*.65} color="#154d28" strokeWidth={4}/>}</g>})}
    <circle cx={position.x} cy={position.z} r={4.5*unit} fill="#fffbea" stroke="#244b67" strokeWidth={2*unit}><title>You</title></circle>
    <circle cx={position.x} cy={position.z} r={1.5*unit} fill="#244b67"/>
   </svg>
   {paper&&<div className="minimap-status"><span className="delivered"><Mailbox size={15}/><Check size={12}/> Delivered</span><span><Mailbox size={15}/> Waiting</span><strong>{count}/{paperStops.length} delivered</strong></div>}
   <div className="minimap-zoom"><button className="secondary-button" aria-label="Zoom minimap out" disabled={level===0} onClick={()=>setLevel(v=>Math.max(0,v-1))}><Minus size={18}/></button><button className="secondary-button minimap-fit" onClick={()=>setLevel(0)} aria-label="Show whole town on minimap">{zoom===1?'Whole town':`${zoom}× · Fit town`}</button><button className="secondary-button" aria-label="Zoom minimap in" disabled={level===ZOOMS.length-1} onClick={()=>setLevel(v=>Math.min(ZOOMS.length-1,v+1))}><Plus size={18}/></button></div>
  </div>
 </section>;
}
