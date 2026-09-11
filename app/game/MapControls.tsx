'use client';
import {useState} from 'react';
import {Camera,MapPin,Plus,Minus,LocateFixed,RotateCcw,RotateCw,ChevronUp,ChevronDown} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle} from '@/components/ui/popover';
import MiniMap from './MiniMap';
import type {TownState} from './data';
import type {SceneApi} from './TownScene';
type Props={data:TownState;getPosition:()=>{x:number;z:number}|undefined;onLook:(x:number,z:number)=>void;scene:()=>SceneApi|null;open:boolean;onOpenChange:(v:boolean)=>void;mode:'pan'|'orbit';onMode:(v:'pan'|'orbit')=>void};
export default function MapControls({data,getPosition,onLook,scene,open,onOpenChange,mode,onMode}:Props){
 const [level,setLevel]=useState(0);
 return <div className="map-hud">
  <MiniMap data={data} getPosition={getPosition} onLook={onLook} level={level}/>
  <Popover open={open} onOpenChange={onOpenChange}>
   <PopoverTrigger className="icon-button map-tools-trigger" aria-label="Map and camera controls" title="Map and camera controls"><Camera size={19}/></PopoverTrigger>
   <PopoverContent className="hud-popover map-tools" side="top" align="end" sideOffset={8} onKeyDown={e=>e.stopPropagation()}>
    <PopoverTitle>Map & camera</PopoverTitle>
    <div className="map-control-row"><span>View zoom</span><button className="icon-button" aria-label="Zoom camera out" onClick={()=>scene()?.zoom(4)}><Minus size={18}/></button><button className="icon-button" aria-label="Zoom camera in" onClick={()=>scene()?.zoom(-4)}><Plus size={18}/></button></div>
    <div className="map-control-row"><span>Minimap · {[1,1.5,2,3,4][level]}×</span><button className="icon-button" aria-label="Zoom minimap out" disabled={level===0} onClick={()=>setLevel(v=>Math.max(0,v-1))}><Minus size={18}/></button><button className="icon-button" aria-label="Zoom minimap in" disabled={level===4} onClick={()=>setLevel(v=>Math.min(4,v+1))}><Plus size={18}/></button></div>
    <div className="button-row"><button className="secondary-button" onClick={()=>{scene()?.overview();setLevel(0)}}><MapPin size={17}/>Whole town</button><button className="secondary-button" onClick={()=>scene()?.center()}><LocateFixed size={17}/>Follow me</button></div>
    <div className="button-row"><button className="secondary-button" aria-pressed={mode==='pan'} onClick={()=>onMode('pan')}>Drag to pan</button><button className="secondary-button" aria-pressed={mode==='orbit'} onClick={()=>onMode('orbit')}>Drag to rotate</button></div>
    <div className="camera-directions"><button className="icon-button" aria-label="Rotate camera left" onClick={()=>scene()?.orbit(-Math.PI/4)}><RotateCcw size={18}/></button><button className="icon-button" aria-label="Tilt camera up" onClick={()=>scene()?.orbit(0,.15)}><ChevronUp size={18}/></button><button className="icon-button" aria-label="Tilt camera down" onClick={()=>scene()?.orbit(0,-.15)}><ChevronDown size={18}/></button><button className="icon-button" aria-label="Rotate camera right" onClick={()=>scene()?.orbit(Math.PI/4)}><RotateCw size={18}/></button></div>
    <button className="secondary-button" onClick={()=>{scene()?.resetCamera();setLevel(0)}}>Reset view</button>
   </PopoverContent>
  </Popover>
 </div>;
}
