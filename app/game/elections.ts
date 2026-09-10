const DAY=86400000;
export function electionWindow(now=Date.now()){
 const date=new Date(now),year=date.getUTCFullYear(),month=date.getUTCMonth();
 const end=Date.UTC(year,month,Math.min(30,new Date(Date.UTC(year,month+1,0)).getUTCDate())+1);
 const next=now>=end,cycleDate=new Date(Date.UTC(year,month+(next?1:0),1));
 const y=cycleDate.getUTCFullYear(),m=cycleDate.getUTCMonth(),opensAt=Date.UTC(y,m,21),closesAt=Date.UTC(y,m,Math.min(30,new Date(Date.UTC(y,m+1,0)).getUTCDate())+1);
 return {cycle:cycleDate.toISOString().slice(0,7),opensAt,closesAt,active:now>=opensAt&&now<closesAt,daysUntil:Math.max(0,Math.ceil((opensAt-now)/DAY)),lastClosedCycle:new Date(Date.UTC(year,month+(next?0:-1),1)).toISOString().slice(0,7)};
}
export type ElectionState=ReturnType<typeof electionWindow>&{mayor:{id:string;name:string;cycle:string;platform:string|null;tax:number}|null;contributionMonth:string;candidates:{id:string;name:string;joinedAt:number;platform:string|null;tax:number;delivered:number;contributions:{month:ContributionTotals;overall:ContributionTotals}}[];myVote:string|null;nominated:boolean};
export const electionDate=(time:number)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(time);

export type ContributionTotals={xp:number;days:number;mow:number;paper:number;clean:number;garden:number;deliver:number;task:number;tax:number;donated:number};
