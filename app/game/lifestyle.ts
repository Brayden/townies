// Shared catalog and calendar rules; all money and ownership changes are server-authoritative.
export const HOUSE_STYLES=[
 {id:'meadow',name:'Meadow',wall:'#e5d4a0',roof:'#81905c',trim:'#faf0ce',detail:'Timber framing and wildflower window boxes'},
 {id:'seaside',name:'Seaside',wall:'#cae1dc',roof:'#557e98',trim:'#fff0d8',detail:'Coastal blue shingles and crisp white shutters'},
 {id:'rose',name:'Rosewood',wall:'#e7b6ad',roof:'#91516b',trim:'#f6dfc8',detail:'Blush walls and a romantic gabled roof'},
 {id:'cedar',name:'Cedar',wall:'#b8916b',roof:'#587866',trim:'#e9cba0',detail:'Warm wood siding and forest green trim'},
 {id:'lavender',name:'Lavender',wall:'#d2c1dd',roof:'#696486',trim:'#f5e6cb',detail:'Soft lilac walls and slate violet shingles'},
 {id:'brick',name:'Bramble',wall:'#ba7860',roof:'#5d626f',trim:'#e6ccb1',detail:'Rustic brickwork and stone accents'},
 {id:'sunflower',name:'Sunflower',wall:'#ebce77',roof:'#ad7250',trim:'#fff1c6',detail:'Golden plaster and terracotta tiles'},
 {id:'moon',name:'Moonstone',wall:'#d2d8d4',roof:'#485b70',trim:'#e8e2c9',detail:'Cool stone and deep midnight roofing'},
 {id:'mint',name:'Mint',wall:'#b3cfa6',roof:'#54847a',trim:'#f3e7bb',detail:'Fresh green walls with a mint roof'},
 {id:'pearl',name:'Pearl',wall:'#f1e3cf',roof:'#9a7b77',trim:'#d8b979',detail:'Ivory plaster, copper roofing and gold accents'},
];
const forms=['Nook','Cottage','House','Villa','Manor'];
export const HOUSES=HOUSE_STYLES.flatMap((s,i)=>forms.map((form,index)=>({...s,style:s.id,level:index+1,name:`${s.name} ${form}`,price:[0,900,2400,5400,10000][index]+i*[35,50,90,150,240][index],upkeep:[0,45,110,240,420][index],id:`${s.id}-${index+1}`})));
export const houseById=(id?:string)=>HOUSES.find(h=>h.id===id)??HOUSES[0];
export function houseCost(current:string,next:string){const a=houseById(current),b=houseById(next);return a.id===b.id?0:Math.max(100,b.price-Math.floor(a.price*.5));}
export function nextMonth(time:number){const d=new Date(time),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.getTime();}
export function settleUpkeep(house:string,coins:number,due:number,now:number){let paid=0,levels=0;while(due>0&&due<=now){const h=houseById(house);if(coins>=h.upkeep){coins-=h.upkeep;paid+=h.upkeep;}else{house=`${h.style}-${Math.max(1,h.level-1)}`;levels++;}due=nextMonth(due);}return{house,coins,due,paid,levels};}
export const DAY_MS=86400000;
export const dayStart=(now:number)=>Math.floor(now/DAY_MS)*DAY_MS;
export function parcelHomes(town:string,now:number,count=50){let seed=2166136261;for(const c of `${town}:${Math.floor(now/DAY_MS)}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;const ids=Array.from({length:count},(_,i)=>i);for(let i=ids.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,Math.round(count*.75)).sort((a,b)=>a-b);}
export function grassHeight(cutAt:number|undefined,now:number,townCreated:number){const age=Math.max(0,now-(cutAt??townCreated-DAY_MS));return age<DAY_MS?0:Math.min(2.4,.75+(age-DAY_MS)/DAY_MS*.55);}
export type ChatMessage={id:string;resident:string;name:string;text:string;created:number};
export const EXTRA_SHOP=[
 {id:'watering-can',name:'Long-day watering can',price:240,description:'Carry 16 waters instead of 8. Refill at the fountain.'},
 {id:'delivery-crate',name:'Roomy parcel crate',price:280,description:'Carry 12 parcels instead of 6. Restock at the supply stand.'},
 {id:'paper-basket',name:'Deep newspaper basket',price:220,description:'Carry 24 newspapers instead of 12.'},
 {id:'cleanup-bag',name:'Heavy-duty cleanup bag',price:180,description:'Pick up 16 pieces before visiting recycling.'},
 {id:'birdbath',name:'Stone birdbath',price:260,description:'A little water feature for your front garden.'},
 {id:'lanterns',name:'Porch lanterns',price:150,description:'Two golden lanterns to welcome you home.'},
 {id:'topiary',name:'Spiral topiary pair',price:300,description:'Two sculpted evergreens frame your cottage.'},
 {id:'roses',name:'Rose arch',price:400,description:'A flowering arch beside your front garden.'},
];
export function capacity(job:string,items:string[]){const base:Record<string,number>={paper:12,deliver:6,garden:8,clean:8};const upgrade:Record<string,string>={paper:'paper-basket',deliver:'delivery-crate',garden:'watering-can',clean:'cleanup-bag'};return(base[job]??0)*(items.includes(upgrade[job])?2:1);}
