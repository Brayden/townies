export const COLORS=['#6988ab','#a66b75','#ce9e4e','#688451','#957cad'];
export const JOBS=[
{id:'paper',name:'Paper carrier',description:'Bring a little good news to every doorstep.',tool:'Newspaper',verb:'Deliver papers',color:'#c69351'},
{id:'clean',name:'Street cleaner',description:'Turn a messy corner into a lovely one.',tool:'Broom',verb:'Sweep the lane',color:'#728b65'},
{id:'mow',name:'Lawn mower',description:'Fresh grass, neat stripes. Very satisfying.',tool:'Mower',verb:'Mow the grass',color:'#769951'},
{id:'garden',name:'Community gardener',description:'Help the neighborhood bloom.',tool:'Watering can',verb:'Tend the flowers',color:'#b384a7'},
{id:'deliver',name:'Delivery helper',description:'Keep the little shops stocked and happy.',tool:'Parcel',verb:'Deliver the parcel',color:'#b57f55'},
];
export const HOMES=Array.from({length:50},(_,i)=>{const central=[[-10,-8],[-2,-12],[9,-9],[17,0],[9,10],[-11,10]];let p=central[i];if(!p){const j=i-6;const row=Math.floor(j/11);p=[-50+(j%11)*10,row<2?-34-row*12:30+(row-2)*12]};const names=['Clover Cottage','Honeycomb House','Bluebell Nook','Rosemary Retreat','Peachwood Place','Fern Hollow'];return{id:i,name:i<6?names[i]:`${i+1} ${['Meadow Lane','Willow Way','Orchard Row','Bramble Walk'][Math.floor((i-6)/11)]}`,x:p[0],z:p[1],color:['#e5c992','#e7ba9e','#d4dfbf','#e4c8aa','#eed6a1','#d8d7b3'][i%6],roof:['#b66549','#627e79','#677d9a','#bd8361','#b57761','#71855e'][i%6],description:['A sunny porch beside the square','A quiet corner with climbing flowers','Blue shutters and a little garden','Room to grow by the market','A warm little home under the trees','A green retreat for slower days'][i%6]}});
export const TASKS=[{id:'paper-1',job:'paper',x:-9,z:-4,title:'Good news on Clover Lane'},{id:'clean-1',job:'clean',x:-6,z:3,title:'A tidy town square'},{id:'mow-1',job:'mow',x:8,z:5,title:'Freshen the village green'},{id:'garden-1',job:'garden',x:-12,z:3,title:'A little more color'},{id:'deliver-1',job:'deliver',x:6,z:-2,title:'Supplies for the market'},{id:'paper-2',job:'paper',x:8,z:-5,title:'The morning round'},{id:'clean-2',job:'clean',x:2,z:8,title:'Sweep the fountain path'},{id:'mow-2',job:'mow',x:-10,z:6,title:'A neat cottage lawn'},{id:'garden-2',job:'garden',x:3,z:-7,title:'Water the square planters'},{id:'deliver-2',job:'deliver',x:-4,z:-15,title:'A school supply delivery'}];
export const SCHOOL={x:0,z:-19};
export const PARK={x:-16,z:0};
export const SHOP=[{id:'flowers',name:'Porch flowers',price:80,description:'A bright little welcome at your front door.'},{id:'bench',name:'Garden bench',price:180,description:'Your very own spot to watch the world go by.'},{id:'bike',name:'Town bicycle',price:350,description:'Cruise around town a little faster.'},{id:'home',name:'Cottage extension',price:1200,description:'A bigger porch and a very proud front garden.'}];
export type Resident={id:string;name:string;color:string;home:number|null;job:string|null;coins:number;xp:number;education:number;lastStudy:string|null;x:number;z:number;items:string[];mowing:boolean};
export type Peer={id:string;name:string;color:string;x:number;z:number;mowing:boolean};
export type TownState={resident:Resident;town:{id:string;name:string;private:boolean;key?:string;treasury:number;project:number;prosperity:number;residents:number};peers:Peer[];properties:{home:number;items:string[];name:string}[];occupied:number[];completed:string[];lawnCuts:string[];events:{name:string;text:string}[]};

// Each patch has a stable identity shared by the scene and the authoritative server.
export const GRASS_REGROW_MS=120000;
type GrassCell={id:string;task:string;x:number;z:number;row:number;size:number};
// Keep existing patch IDs so neighbors' recent work survives this town expansion.
const originalLawns:GrassCell[]=TASKS.filter(t=>t.job==='mow').flatMap(t=>Array.from({length:40},(_,i)=>({id:`${t.id}:${i}`,task:t.id,x:t.x+(i%8-3.5)*.65,z:t.z+(Math.floor(i/8)-2)*.65,row:Math.floor(i/8),size:.65})));
export function isGrassGround(x:number,z:number){
 if(Math.abs(x)>58||z< -53||z>50)return false;
 if(Math.abs(x)<2.95||Math.abs(z)<2.95||(Math.abs(x)<10.95&&Math.abs(z)<9.45))return false;
 if(x>23.1&&x<32.9)return false;
 if(Math.abs(Math.abs(x)-54)<2.1)return false;
 if([-34,-46,30,42].some(row=>Math.abs(z-row-4)<2.15))return false;
 if(HOMES.some(h=>(Math.abs(x-h.x)<3.55&&Math.abs(z-h.z)<3.25)||(Math.abs(x-h.x-.55)<1&&z>h.z+1.5&&z<h.z+5.35)))return false;
 if(Math.abs(x)<3.9&&Math.abs(z+22)<3.5)return false;
 if(Math.abs(x+16)<4&&Math.abs(z)<4)return false;
 if(Math.hypot(x+23,z+18)<2.1)return false;
 // Respect the existing flower beds and the two original lawns.
 if(TASKS.some(t=>t.job==='garden'&&Math.hypot(x-t.x,z-t.z)<1.6))return false;
 if(TASKS.some(t=>t.job==='mow'&&Math.abs(x-t.x)<3&&Math.abs(z-t.z)<2))return false;
 return true;
}
const neighborhoodGrass:GrassCell[]=[];
for(let row=0;row<=128;row++)for(let col=0;col<=145;col++){
 const x=Number((-58+col*.8).toFixed(2)),z=Number((-52.8+row*.8).toFixed(2));
 if(isGrassGround(x,z))neighborhoodGrass.push({id:`town-grass:${col}:${row}`,task:'town-grass',x,z,row,size:.8});
}
export const LAWN_CELLS=[...originalLawns,...neighborhoodGrass];
// Local lookups keep cutting inexpensive even with grass across the whole town.
const grassBuckets=new Map<string,GrassCell[]>();
for(const c of LAWN_CELLS){const key=`${Math.floor(c.x/2)}:${Math.floor(c.z/2)}`;const bucket=grassBuckets.get(key)??[];bucket.push(c);grassBuckets.set(key,bucket)}
export function sweptGrass(ax:number,az:number,bx:number,bz:number){
 const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
 if(length<.000001)return [];
 const result:GrassCell[]=[];
 for(let x=Math.floor((Math.min(ax,bx)-.52)/2);x<=Math.floor((Math.max(ax,bx)+.52)/2);x++)for(let z=Math.floor((Math.min(az,bz)-.52)/2);z<=Math.floor((Math.max(az,bz)+.52)/2);z++){
  for(const c of grassBuckets.get(`${x}:${z}`)??[]){const t=Math.max(0,Math.min(1,((c.x-ax)*dx+(c.z-az)*dz)/length));if(Math.hypot(c.x-ax-t*dx,c.z-az-t*dz)<.52)result.push(c)}
 }
 return result;
}
