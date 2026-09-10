'use client';
import {useEffect,useState} from 'react';
import {Check,Vote,UserRoundPlus} from 'lucide-react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {electionDate,type ContributionTotals,type ElectionState} from './elections';
type Props={election:ElectionState;residentId:string;busy:boolean;onNominate:()=>void;onVote:(id:string)=>void};
const number=(n:number)=>n.toLocaleString('en-US');
const summaryRows:[keyof ContributionTotals,string][]=[['xp','Work XP'],['days','Days worked']];
const detailRows:[keyof ContributionTotals,string][]=[['mow','Grass patches cut'],['paper','Newspapers delivered'],['clean','Litter collected'],['garden','Garden beds tended'],['deliver','Parcels delivered'],['task','Town tasks finished'],['tax','Tax coins contributed'],['donated','Coins donated']];
function ContributionTable({stats,rows,name}:{stats:{month:ContributionTotals;overall:ContributionTotals};rows:[keyof ContributionTotals,string][];name:string}){
 return <table className="candidate-stats" aria-label={`${name}’s contributions to this town`}><thead><tr><th scope="col">Contribution</th><th scope="col">This month</th><th scope="col">Overall</th></tr></thead><tbody>{rows.map(([key,label])=><tr key={key}><th scope="row">{label}</th><td>{number(stats.month[key])}</td><td>{number(stats.overall[key])}</td></tr>)}</tbody></table>;
}
export default function ElectionPanel({election:e,residentId,busy,onNominate,onVote}:Props){
 const [choice,setChoice]=useState(e.myVote??'');
 useEffect(()=>setChoice(e.myVote??''),[e.cycle,e.myVote]);
 return <div className="election-panel">
  <div className={`election-phase ${e.active?'is-live':''}`}><span className="election-dot"/>{e.active?'Polls are open':`Election is in ${e.daysUntil} ${e.daysUntil===1?'day':'days'}`}<span>{electionDate(e.opensAt)} – {electionDate(e.closesAt-1)}</span></div>
  {e.mayor&&<p className="current-mayor">Your mayor <strong>{e.mayor.name}</strong></p>}
  <div className="election-nomination"><div><h3>Your town. Your voice.</h3><p>{e.nominated?'You’re on this month’s ballot. Good luck!':'Want to help lead your town? Put your name on the ballot.'}</p></div><button className="secondary-button" disabled={busy||e.nominated} onClick={onNominate}>{e.nominated?<Check size={17}/>:<UserRoundPlus size={17}/>} {e.nominated?'On the ballot':'Nominate myself'}</button></div>
  <h3 className="ballot-heading">Meet the candidates <span>{e.candidates.length}</span></h3>
  <p className="candidate-context">{new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(e.contributionMonth+'-01T00:00:00Z'))} · Contributions to this town</p>
  <p className="candidate-records-note">Overall work XP includes earlier work. Monthly totals and detailed records start with this update; earlier work cannot be assigned to a month. Days worked count completed jobs, not time spent online. Donations are shown separately from work.</p>
  {e.candidates.length?<RadioGroup value={choice} onValueChange={v=>setChoice(String(v))} aria-label="Choose your mayor" disabled={!e.active||busy} className="ballot-list">{e.candidates.map(c=><div className={`ballot-candidate ${choice===c.id?'is-selected':''}`} key={c.id}><label className="candidate-choice"><span className="candidate-avatar" aria-hidden="true">{c.name.slice(0,1).toUpperCase()}</span><span className="candidate-name"><strong>{c.name}{c.id===residentId?' (you)':''}</strong><small>{e.myVote===c.id?'Your saved vote':'Mayoral candidate'} · Joined {new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(c.joinedAt)}</small></span><RadioGroupItem value={c.id}/></label><ContributionTable stats={c.contributions} rows={summaryRows} name={c.name}/><details className="candidate-details"><summary>Work &amp; community contributions</summary><ContributionTable stats={c.contributions} rows={detailRows} name={c.name}/></details></div>)}</RadioGroup>:<div className="ballot-empty">No candidates yet. Be the first neighbor to stand for mayor.</div>}
  {e.active&&<button className="primary-button full" disabled={busy||!choice||choice===e.myVote} onClick={()=>onVote(choice)}><Vote size={18}/>{choice&&choice===e.myVote?'Vote saved':e.myVote?'Update my vote':'Cast my vote'}</button>}
  <p className="note election-rules">Voting runs from the 21st through the 30th, or the last day of February, on the town’s shared UTC calendar. Each resident has one vote and may change it until polls close. Nominations stay open during voting. The most votes wins; ties go to the earliest nomination. If nobody votes, the current mayor stays.</p>
 </div>;
}
