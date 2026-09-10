'use client';
import {useEffect,useState} from 'react';
import {Check,Vote,UserRoundPlus} from 'lucide-react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {electionDate,type ElectionState} from './elections';
type Props={election:ElectionState;residentId:string;busy:boolean;onNominate:()=>void;onVote:(id:string)=>void};
export default function ElectionPanel({election:e,residentId,busy,onNominate,onVote}:Props){
 const [choice,setChoice]=useState(e.myVote??'');
 useEffect(()=>setChoice(e.myVote??''),[e.cycle,e.myVote]);
 return <div className="election-panel">
  <div className={`election-phase ${e.active?'is-live':''}`}><span className="election-dot"/>{e.active?'Polls are open':`Election is in ${e.daysUntil} ${e.daysUntil===1?'day':'days'}`}<span>{electionDate(e.opensAt)} – {electionDate(e.closesAt-1)}</span></div>
  {e.mayor&&<p className="current-mayor">Your mayor <strong>{e.mayor.name}</strong></p>}
  <div className="election-nomination"><div><h3>Your town. Your voice.</h3><p>{e.nominated?'You’re on this month’s ballot. Good luck!':'Want to help lead your town? Put your name on the ballot.'}</p></div><button className="secondary-button" disabled={busy||e.nominated} onClick={onNominate}>{e.nominated?<Check size={17}/>:<UserRoundPlus size={17}/>} {e.nominated?'On the ballot':'Nominate myself'}</button></div>
  <h3 className="ballot-heading">Meet the candidates <span>{e.candidates.length}</span></h3>
  {e.candidates.length?<RadioGroup value={choice} onValueChange={v=>setChoice(String(v))} aria-label="Choose your mayor" disabled={!e.active||busy} className="ballot-list">{e.candidates.map(c=><label className={`ballot-candidate ${choice===c.id?'is-selected':''}`} key={c.id}><span className="candidate-avatar" aria-hidden="true">{c.name.slice(0,1).toUpperCase()}</span><span className="candidate-name"><strong>{c.name}{c.id===residentId?' (you)':''}</strong><small>{e.myVote===c.id?'Your saved vote':'Mayoral candidate'}</small></span><RadioGroupItem value={c.id}/></label>)}</RadioGroup>:<div className="ballot-empty">No candidates yet. Be the first neighbor to stand for mayor.</div>}
  {e.active&&<button className="primary-button full" disabled={busy||!choice||choice===e.myVote} onClick={()=>onVote(choice)}><Vote size={18}/>{choice&&choice===e.myVote?'Vote saved':e.myVote?'Update my vote':'Cast my vote'}</button>}
  <p className="note election-rules">Voting runs from the 21st through the 30th, or the last day of February, on the town’s shared UTC calendar. Each resident has one vote and may change it until polls close. Nominations stay open during voting. The most votes wins; ties go to the earliest nomination. If nobody votes, the current mayor stays.</p>
 </div>;
}
