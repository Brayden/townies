'use client';
import type {ReactNode} from 'react';
import {Coins,Settings,Vote,UserRoundPlus,MessageCircle} from 'lucide-react';
import {TOWN_FARM,farmIsOpen} from './townFarm';
import type {TownState} from './data';
type Props={actions?:ReactNode;data:TownState|null;active:boolean;unread:number;chatOpen:boolean;onChat:()=>void;onElection:()=>void;onTown:()=>void;onSettings:()=>void};
export default function TownHeader({data,active,unread,chatOpen,onChat,onElection,onSettings,onTown,actions}:Props){
 const e=data?.election;
 return <header className="hud topbar">
  <div className="town-status-cluster"><div className="brand"><div className="wordmark">townies<span>.</span></div>{active&&<button className="brand-project" onClick={onTown}>{`Park ${data!.town.project>=100?'open':data!.town.project+'%'} · Farm ${farmIsOpen(data!.planning)?'open':Math.floor((data!.planning.farmFunded??0)/TOWN_FARM.cost*100)+'%'}`}</button>}</div>
  <div className="civic-status">
   {active&&<div className="town-location"><span>{data!.town.name} Square</span><span className="town-online"><i className="online-dot"/>{data!.peers.length} online</span></div>}
   <div className="season-label">Spring in {data?.town.name??'Willowbrook'}</div>
   {e?.mayor&&<div className="mayor-label">Mayor <strong>{e.mayor.name}</strong></div>}
   {active&&e&&<div className="election-header-row">{e.active?<button className="civic-link election-live" onClick={onElection}><Vote size={14}/>{e.myVote?'Vote saved · View ballot':'Election open · Cast your vote'}</button>:<><button className="civic-link election-countdown" onClick={onElection}>Election is in {e.daysUntil} {e.daysUntil===1?'day':'days'}</button><span className="civic-divider" aria-hidden="true">·</span><button className="civic-link" onClick={onElection}><UserRoundPlus size={13}/>{e.nominated?'On the ballot':'Run for mayor'}</button></>}</div>}
  </div>
  </div>
  <div className="hud-tools"><div className="top-right">{actions}<div className="coin-chip paper" aria-label={`${data?.resident.coins??150} coins`}><Coins size={18}/><span>{(data?.resident.coins??150).toLocaleString('en-US')}</span></div><button className="icon-button" aria-label="Settings and controls" onClick={onSettings}><Settings/></button></div>
   {active&&<button type="button" className="town-chat-launch" aria-label={`Town chat${unread?`, ${unread} unread ${unread===1?'message':'messages'}`:''}`} aria-expanded={chatOpen} aria-controls="town-chat" onClick={onChat} title="Talk with your town"><MessageCircle size={21} aria-hidden="true"/><span>Town chat</span>{unread>0&&<span className="town-chat-unread" aria-hidden="true">{unread>99?'99+':unread}</span>}</button>}
  </div>
 </header>;
}
