'use client';
import {useEffect,useState} from 'react';
import {Sprout,MapPin,Heart,Users,Check} from 'lucide-react';
import {CROPS,FARM_BEDS,FARM_ORDER,PICNIC,PICNIC_BASKET,BASKET_REWARD,GESTURES,cropStage} from './sharedLife';
import {farmIsOpen} from './townFarm';
import type {TownState} from './data';
export default function SharedLifePanel({data,seed,onSeed,onWalk,onGesture,onChat,onFund,busy}:{data:TownState;seed:string;onSeed:(id:string)=>void;onWalk:(x:number,z:number,name:string)=>void;onGesture:(id:string)=>void;onChat:()=>void;onFund:()=>void;busy:boolean}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 const life=data.life,open=farmIsOpen(data.planning),offDuty=!data.resident.shift&&!data.resident.mowing;
 const counts={empty:0,thirsty:0,growing:0,ready:0};for(const bed of FARM_BEDS)counts[cropStage(life?.plots.find(p=>p.id===bed.id),now)]++;
 const next=FARM_BEDS.find(b=>cropStage(life?.plots.find(p=>p.id===b.id),now)==='ready')??FARM_BEDS.find(b=>cropStage(life?.plots.find(p=>p.id===b.id),now)==='thirsty')??FARM_BEDS.find(b=>cropStage(life?.plots.find(p=>p.id===b.id),now)==='empty')??FARM_BEDS[0];
 return <div className="shared-life-panel">
 <section className="life-card picnic-card"><div className="eyebrow"><Heart size={14}/> A little time together</div><h3>Meet you at the picnic.</h3><p>A blanket in the park, familiar faces, and no work shift. Drop by whenever you like—even if you only have a minute. Sit on the blanket, open town chat, and catch up. Move any time to stand up.</p>
 <div className="life-chips"><span><Users size={15}/>{life?.picnicGuests.length??0} visitors today</span>{life?.visited&&<span><Check size={15}/>You stopped by</span>}</div>
 <p className="note">{life?.basketCompleted?'Your farm’s picnic basket is on the blanket. Come enjoy what everyone grew.':'The blanket is always open. Fill the farm basket to add a spread for everyone today.'}</p>
 <button className="primary-button full" onClick={()=>onWalk(PICNIC.x,PICNIC.z,PICNIC.name)}><MapPin size={17}/>Head to the park picnic</button>
 {!!life?.picnicGuests.length&&<p className="life-guests">Today’s guest book: {life.picnicGuests.map(p=>p.name).join(', ')}</p>}
 <div className="life-gestures" aria-label="Shared character gestures">{GESTURES.map(g=><button className="secondary-button" key={g.id} disabled={busy} onClick={()=>onGesture(g.id)}><span aria-hidden="true">{g.symbol}</span>{g.name}</button>)}</div><button className="danger-link" onClick={onChat}>Say hello in town chat</button></section>
 <section className="life-card"><div className="eyebrow"><Sprout size={14}/> Grown by all of us</div><h3>The shared town farm</h3><p>Plant a bed. Water a neighbor’s seedlings. Come back to a harvest someone else helped grow. Everything goes into your town’s pantry.</p>
 {!open?<><p>Open the west road by completing the town farm initiative. The park picnic is ready to visit now.</p><button className="secondary-button full" onClick={onFund}>View the farm initiative</button></>:<>
 {!offDuty&&<p className="note">Finish your current work shift to plant, tend, or harvest.</p>}
 <div className="life-chips"><span>{counts.ready} ready</span><span>{counts.thirsty} need water</span><span>{counts.growing} growing</span><span>{counts.empty} empty</span></div>
 <strong className="life-label">Your seed pouch · always free</strong><div className="seed-options" role="group" aria-label="Choose seeds">{CROPS.map(c=><button key={c.id} className={`seed-option ${seed===c.id?'selected':''}`} aria-pressed={seed===c.id} onClick={()=>onSeed(c.id)}><i style={{background:c.color}}/><strong>{c.name}</strong><small>{c.minutes<60?`${c.minutes} min`:`${c.minutes/60} hours`}</small></button>)}</div>
 <p className="note">Growth starts after watering. Each harvest adds 4 produce. Ready crops wait for you and never wither.</p>
 <button className="primary-button full" disabled={!offDuty} onClick={()=>onWalk(next.x,next.z,next.name)}><Sprout size={17}/>Find a bed to tend</button>
 <p className="note">At a bed, press E or tap the action button. Blue markers need water; golden markers are ready to harvest. Anyone can help.</p>
 <div className="pantry-order"><h4>{life?.basketCompleted?'Today’s basket is delivered':'Today’s neighborhood picnic basket'}</h4><p>Use shared produce to set the picnic spread and earn {BASKET_REWARD} coins for the town fund.</p>
 {CROPS.map(c=><div className="pantry-row" key={c.id}><span>{c.name}</span><strong>{life?.pantry[c.id]??0} in pantry</strong><small>{PICNIC_BASKET[c.id]} needed</small></div>)}
 <button className="secondary-button full" disabled={!offDuty||!!life?.basketCompleted} onClick={()=>onWalk(FARM_ORDER.x,FARM_ORDER.z,FARM_ORDER.name)}>{life?.basketCompleted?'Thank you, neighbors!':'Visit the pantry stand'}</button>
 <p className="note">One shared basket per day. Next basket {life?new Date(life.resets).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'tomorrow'}. Spare produce stays in the pantry.</p></div>
 </>}</section></div>;
}
