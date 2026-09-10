'use client';
import {Check,MapPin,RefreshCw,Trees,Newspaper,Brush,Flower2,Package} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {JOBS,type Resident} from './data';
import {JOB_HINTS,type FieldJob} from './workTargets';

type Props={resident:Resident;busy:boolean;patches:number;coins:number;completed:number;waterProgress:number;onFindNext:()=>void;onVisitStation:()=>void;onFinish:()=>void};
const icons={mow:Trees,paper:Newspaper,clean:Brush,garden:Flower2,deliver:Package};
export default function JobDock({resident,busy,patches,coins,completed,waterProgress,onFindNext,onVisitStation,onFinish}:Props){
 const mowing=resident.mowing,job=mowing?'mow':resident.shift as FieldJob,Icon=icons[job];
 const watering=!!resident.wateringTarget;
 const supplies=job==='paper'?`${resident.papers}/12 papers`:job==='deliver'?`${resident.parcels}/6 parcels`:job==='garden'?`${resident.water}/8 water`:`${resident.bag}/8 litter`;
 const refill=job==='clean'?'Recycling':job==='garden'?'Refill water':'Restock';
 const hint=mowing?'Mow anywhere you find tall grass. Grass regrows 24 hours after cutting.':JOB_HINTS[job as FieldJob];
 return <nav className={`hud bottom-dock paper job-dock ${mowing?'mowing-dock':''}`} aria-label="Job shift controls">
  <div className="job-dock-summary" title={hint}>
   <strong><Icon aria-hidden="true"/><span>{JOBS.find(j=>j.id===job)?.name}</span></strong>
   <span className="job-dock-earnings" title={`${mowing?patches:completed} ${mowing?'patches cut':'actions completed'} · ${coins} coins earned`}>{mowing?`${patches} patches`:`${completed} done`} · +{coins} coins</span>
   {watering?<div className="job-dock-watering"><span>Watering {Math.round(waterProgress)}%</span><Progress value={waterProgress} className="progress" aria-label="Watering progress"/></div>:<span className="job-dock-supplies">{mowing?`${resident.job==='mow'?2:1} coins / patch · regrows in 24h`:supplies}</span>}
  </div>
  {!mowing&&<>
   <button className="dock-button" disabled={busy||watering} onClick={onFindNext} aria-label="Find next job target" title="Find next job target"><MapPin/><span>Next</span></button>
   <button className="dock-button" disabled={busy||watering} onClick={onVisitStation} aria-label={refill} title={refill}><RefreshCw/><span>{job==='clean'?'Empty':job==='garden'?'Refill':'Restock'}</span></button>
  </>}
  <button className="dock-button job-dock-finish" disabled={busy} onClick={onFinish} aria-label={mowing?'Get off mower':'Finish shift'} title={mowing?'Get off mower':'Finish shift'}><Check/><span>{mowing?'Get off':'Finish'}</span></button>
 </nav>;
}
