'use client';
import {useEffect,useMemo,useState} from 'react';
import {Check,ChevronDown,ClipboardList,Newspaper,Brush,Trees,Flower2,Package,Truck,Droplets,Scissors,Leaf} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle,PopoverDescription} from '@/components/ui/popover';
import {townWorkCatalog,townWorkProgress} from './townWork';
import type {TownState} from './data';
const icons:Record<string,typeof Leaf>={paper:Newspaper,clean:Brush,mow:Trees,garden:Flower2,deliver:Package,sweep:Truck,wash:Droplets,trim:Scissors,rake:Leaf};
export default function TownWorkMenu({data,onStart,disabled=false}:{data:TownState;onStart:(job:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>{if(!document.hidden)setNow(Date.now())};const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[]);
 // Geometry only changes when the town plan changes, not on movement updates.
 const planKey=JSON.stringify(data.planning);
 const catalog=useMemo(()=>townWorkCatalog(data.planning),[planKey]);
 const progress=useMemo(()=>townWorkProgress(data,catalog,now),[catalog,data.town.id,data.worldWork,data.grassHistory,data.lawnCuts,now]);
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger className="town-work-trigger" aria-label={`Town work: ${progress.remaining.toLocaleString()} tasks left. View job checklist.`}><ClipboardList size={15}/><span>{progress.jobsRemaining?`Town work · ${progress.jobsRemaining} jobs need help`:'All jobs complete'}</span><ChevronDown size={13}/></PopoverTrigger>
  <PopoverContent align="start" sideOffset={8} className="town-work-menu" onKeyDown={e=>e.stopPropagation()}>
   <div className="town-work-heading"><PopoverTitle>Pitch in around town</PopoverTitle><strong>{progress.remaining?`${progress.remaining.toLocaleString()} tasks left`:'All caught up!'}</strong></div>
   <PopoverDescription className="town-work-description">{progress.remaining?'Shared progress from everyone in your town. Choose a job to lend a hand.':'Every available job is complete. Thanks for looking after your town!'}</PopoverDescription>
   <ul className="town-work-list">{progress.jobs.map(job=>{const Icon=icons[job.id],done=job.remaining===0;return <li key={job.id}><button className="town-work-job" disabled={disabled||done} onClick={()=>{setOpen(false);onStart(job.id)}} aria-label={`${job.name}: ${job.completed} of ${job.total} ${job.unit} complete. ${done?'All done':`${job.remaining} left. Start job.`}`}>
    <span className={`town-work-icon ${done?'is-complete':''}`}>{done?<Check size={18}/>:<Icon size={18}/>}</span><span className="town-work-details"><span className="town-work-title"><strong>{job.name}</strong><span>{done?'All done':`${job.remaining.toLocaleString()} left`}</span></span><span className="town-work-progress" role="progressbar" aria-label={job.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.percent} aria-valuetext={`${job.completed} of ${job.total} ${job.unit} complete`}><span style={{width:`${job.percent}%`}}/></span><small>{job.completed.toLocaleString()} / {job.total.toLocaleString()} {job.unit}</small></span>
   </button></li>})}</ul>
   <p className="town-work-footnote">Jobs return 24 hours after completion. Parcel routes refresh daily at midnight UTC.</p>
  </PopoverContent>
 </Popover>;
}
