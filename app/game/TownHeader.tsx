'use client';
import {Coins,Settings,Vote,UserRoundPlus} from 'lucide-react';
import {projectById} from './civicProjects';
import type {TownState} from './data';
type Props={data:TownState|null;active:boolean;onElection:()=>void;onTown:()=>void;onSettings:()=>void};
export default function TownHeader({data,active,onElection,onSettings,onTown}:Props){
 const e=data?.election;
 return <header className="hud topbar">
  <div className="brand"><div className="wordmark">townies<span>.</span></div>{active&&<button className="brand-project" onClick={onTown}>{projectById(data?.civic.featured)?.name??'Our town’s next chapter'}</button>}</div>
  <div className="civic-status">
   <div className="season-label">Spring in {data?.town.name??'Willowbrook'}</div>
   {e?.mayor&&<div className="mayor-label">Mayor <strong>{e.mayor.name}</strong></div>}
   {active&&e&&<div className="election-header-row">{e.active?<button className="civic-link election-live" onClick={onElection}><Vote size={14}/>{e.myVote?'Vote saved · View ballot':'Election open · Cast your vote'}</button>:<><button className="civic-link election-countdown" onClick={onElection}>Election is in {e.daysUntil} {e.daysUntil===1?'day':'days'}</button><span className="civic-divider" aria-hidden="true">·</span><button className="civic-link" onClick={onElection}><UserRoundPlus size={13}/>{e.nominated?'On the ballot':'Run for mayor'}</button></>}</div>}
  </div>
  <div className="top-right"><div className="coin-chip paper" aria-label={`${data?.resident.coins??150} coins`}><Coins size={18}/><span>{(data?.resident.coins??150).toLocaleString('en-US')}</span></div><button className="icon-button" aria-label="Settings and controls" onClick={onSettings}><Settings/></button></div>
 </header>;
}
