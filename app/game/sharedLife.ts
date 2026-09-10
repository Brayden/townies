export const CROPS=[
 {id:'radish',name:'Radishes',minutes:10,color:'#d76d89',yield:4},
 {id:'berry',name:'Strawberries',minutes:30,color:'#d85e56',yield:4},
 {id:'pumpkin',name:'Pumpkins',minutes:120,color:'#e6a047',yield:4},
] as const;
export const cropById=(id:unknown)=>CROPS.find(c=>c.id===id);
export const FARM_BEDS=[-79,-70].flatMap(x=>[-11,0,11].flatMap(z=>[-1.5,1.5].flatMap(dx=>[-1.5,1.5].map(dz=>({x:x+dx,z:z+dz}))))).map((p,i)=>({...p,id:`farm-bed-${i}`,name:`Shared bed ${i+1}`}));
export const FARM_ORDER={id:'farm-order',name:'Farm pantry stand',x:-92,z:-2.4};
export const PICNIC={id:'community-picnic',name:'Neighborhood picnic',x:-48,z:8};
export const PICNIC_BASKET={radish:8,berry:8,pumpkin:4};
export const BASKET_REWARD=150;
export const GESTURES=[{id:'wave',name:'Wave',symbol:'👋'},{id:'cheer',name:'Cheer',symbol:'🙌'},{id:'dance',name:'Dance',symbol:'♫'}] as const;
export const LIFE_TARGETS=[PICNIC,FARM_ORDER,...FARM_BEDS];
export const lifeTarget=(id:unknown)=>LIFE_TARGETS.find(t=>t.id===id);
export type FarmPlot={id:string;crop:string|null;planted:number;watered:number;revision:number};
export type SharedLifeState={serverNow:number;plots:FarmPlot[];pantry:Record<string,number>;basketCompleted:number;picnicGuests:{id:string;name:string}[];visited:boolean;resets:number};
export function cropStage(plot:FarmPlot|undefined,now:number){if(!plot?.crop)return 'empty';if(!plot.watered)return 'thirsty';return now>=plot.watered+(cropById(plot.crop)?.minutes??120)*60000?'ready':'growing';}
export function lifeVerb(id:string,life:SharedLifeState|undefined,seed:string,now=Date.now()){
 if(id===PICNIC.id)return life?.visited?'Sit on the blanket':'Join the picnic';
 if(id===FARM_ORDER.id)return life?.basketCompleted?'Today’s basket delivered':'Fill the picnic basket';
 const plot=life?.plots.find(p=>p.id===id),stage=cropStage(plot,now);
 return stage==='empty'?`Plant ${cropById(seed)?.name.toLowerCase()??'radishes'}`:stage==='thirsty'?'Water this bed':stage==='ready'?`Harvest ${cropById(plot?.crop)?.name.toLowerCase()}`:`Growing · ${Math.max(1,Math.ceil(((plot!.watered+(cropById(plot!.crop)?.minutes??120)*60000)-now)/60000))} min`;
}

// A slower heartbeat must not restore a bed that a newer action already harvested.
export function mergeFarmPlots(incoming:FarmPlot[],previous:FarmPlot[]){const plots=new Map(previous.map(p=>[p.id,p]));for(const p of incoming)if(p.revision>=(plots.get(p.id)?.revision??-1))plots.set(p.id,p);return [...plots.values()];}
