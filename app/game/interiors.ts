import {houseById} from './lifestyle.ts';
export type Furniture={id:string;name:string;kind:'bed'|'sofa'|'chair'|'table'|'shelf'|'plant'|'lamp'|'rug'|'desk';w:number;d:number;color:string;price:number};
export const FURNITURE:Furniture[]=[
 {id:'bed-meadow',name:'Meadow bed',kind:'bed',w:2,d:3,color:'#88a375',price:0},
 {id:'table-oak',name:'Oak breakfast table',kind:'table',w:2,d:2,color:'#b98b5e',price:0},
 {id:'chair-oak',name:'Oak chair',kind:'chair',w:1,d:1,color:'#ac855d',price:0},
 {id:'plant-fern',name:'Little fern',kind:'plant',w:1,d:1,color:'#71924e',price:0},
 {id:'rug-woven',name:'Woven welcome rug',kind:'rug',w:3,d:2,color:'#c99369',price:0},
 {id:'bed-rose',name:'Rose quilt bed',kind:'bed',w:2,d:3,color:'#cd8197',price:240},
 {id:'bed-coastal',name:'Coastal linen bed',kind:'bed',w:2,d:3,color:'#79a9bb',price:260},
 {id:'sofa-forest',name:'Forest reading sofa',kind:'sofa',w:3,d:1,color:'#628466',price:220},
 {id:'sofa-velvet',name:'Plum velvet sofa',kind:'sofa',w:3,d:1,color:'#906886',price:320},
 {id:'chair-mustard',name:'Golden armchair',kind:'chair',w:1,d:1,color:'#d6ad5e',price:95},
 {id:'chair-blue',name:'Blue reading chair',kind:'chair',w:1,d:1,color:'#6f9caa',price:95},
 {id:'table-round',name:'Round tea table',kind:'table',w:2,d:2,color:'#dfc394',price:130},
 {id:'desk-writer',name:'Writer’s desk',kind:'desk',w:2,d:1,color:'#957257',price:180},
 {id:'shelf-books',name:'Well-loved bookshelf',kind:'shelf',w:2,d:1,color:'#ab8057',price:160},
 {id:'shelf-white',name:'Ivory display cabinet',kind:'shelf',w:2,d:1,color:'#e3dcc5',price:210},
 {id:'plant-monstera',name:'Big leafy friend',kind:'plant',w:1,d:1,color:'#48795b',price:75},
 {id:'plant-flowers',name:'Porcelain flower pot',kind:'plant',w:1,d:1,color:'#d28aaa',price:85},
 {id:'lamp-amber',name:'Amber floor lamp',kind:'lamp',w:1,d:1,color:'#efc570',price:110},
 {id:'lamp-cream',name:'Linen floor lamp',kind:'lamp',w:1,d:1,color:'#f2e5c5',price:125},
 {id:'rug-coastal',name:'Coastal stripe rug',kind:'rug',w:3,d:2,color:'#80b4bb',price:90},
 {id:'rug-bloom',name:'Rose garden rug',kind:'rug',w:3,d:3,color:'#be8396',price:140},
 {id:'rug-night',name:'Midnight woven rug',kind:'rug',w:4,d:3,color:'#5d7196',price:190},
];
export const FINISHES={wall:[{id:'house',name:'Match house',color:''},{id:'cream',name:'Warm cream',color:'#eee1bd'},{id:'rose',name:'Blush',color:'#e7bfc3'},{id:'sage',name:'Garden green',color:'#b8c9a1'},{id:'sky',name:'Morning blue',color:'#b7d4dc'},{id:'clay',name:'Terracotta',color:'#d4a089'},{id:'lilac',name:'Lilac',color:'#cbc0dd'}],floor:[{id:'oak',name:'Honey oak',color:'#be956b'},{id:'walnut',name:'Walnut',color:'#876449'},{id:'birch',name:'Pale birch',color:'#decb9b'},{id:'slate',name:'Slate tile',color:'#839398'},{id:'rosewood',name:'Rosewood',color:'#ab7970'}]};
export type PlacedFurniture={id:string;x:number;z:number;rotation:number;level?:number};
export type Interior={wall:string;floor:string;owned:string[];placed:PlacedFurniture[];upperFinishes?:Record<string,{wall:string;floor:string}>};
export const furnitureById=(id:unknown)=>FURNITURE.find(f=>f.id===id);
export const roomSize=(house?:string)=>{const level=houseById(house).level;return {width:8+(level-1)*2,depth:7+Math.floor((level-1)/2)*2};};
export const floorCount=(house?:string)=>1+Math.floor((houseById(house).level-1)/2);
export const floorName=(level:number)=>['Ground floor','Second floor','Third floor'][level]??'Floor';
export const floorFinishes=(interior:Interior,level:number)=>level===0?{wall:interior.wall,floor:interior.floor}:interior.upperFinishes?.[String(level)]??{wall:'house',floor:'oak'};
export function stairwell(house?:string){const size=roomSize(house);return {x:size.width/2-1.25,z:size.depth/2-2,w:2.1,d:3.6};}
export function starterInterior():Interior{return {wall:'house',floor:'oak',owned:FURNITURE.filter(f=>f.price===0).map(f=>f.id),placed:[{id:'bed-meadow',x:-3,z:-2,rotation:0},{id:'table-oak',x:2,z:-2,rotation:0},{id:'chair-oak',x:2,z:0,rotation:0},{id:'plant-fern',x:3,z:2,rotation:0},{id:'rug-woven',x:0,z:1,rotation:0}]};}
export function readInterior(raw:string):Interior{try{const p=JSON.parse(raw);if(!Array.isArray(p.owned)||!Array.isArray(p.placed))return starterInterior();return p;}catch{return starterInterior();}}
export function furnitureRect(p:PlacedFurniture){const f=furnitureById(p.id)!;return {x:p.x,z:p.z,w:p.rotation%180?f.d:f.w,d:p.rotation%180?f.w:f.d};}
export function placementIssue(p:PlacedFurniture,placed:PlacedFurniture[],house?:string){
 const f=furnitureById(p.id);if(!f)return 'Choose a furniture piece.';
 const level=p.level??0;if(!Number.isInteger(level)||level<0||level>=floorCount(house))return 'This house does not have that floor.';
 if(![p.x,p.z].every(n=>typeof n==='number'&&Number.isFinite(n)&&Number.isInteger(n*2))||![0,90,180,270].includes(p.rotation))return 'Place furniture on the half-step grid.';
 const size=roomSize(house),a=furnitureRect(p);
 if(Math.abs(a.x)+a.w/2>size.width/2||Math.abs(a.z)+a.d/2>size.depth/2)return 'Keep the entire piece inside your room.';
 if(floorCount(house)>1){const stairs=stairwell(house);if(Math.abs(a.x-stairs.x)<(a.w+stairs.w)/2&&Math.abs(a.z-stairs.z)<(a.d+stairs.d)/2)return 'Keep the stairs and landing clear.';}
 if(level===0&&f.kind!=='rug'&&Math.abs(a.x)<a.w/2+1&&a.z+a.d/2>size.depth/2-1.5)return 'Keep the doorway clear.';
 if(placed.some(other=>{if(other.id===p.id||(other.level??0)!==level)return false;const of=furnitureById(other.id);if(!of||((f.kind==='rug')!==(of.kind==='rug')))return false;const b=furnitureRect(other);return Math.abs(a.x-b.x)<(a.w+b.w)/2-.02&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.02;}))return 'Leave some room around the other furniture.';
 return null;
}
export function fittedFurniture(interior:Interior,house?:string,level=0){const result:PlacedFurniture[]=[];for(const p of interior.placed)if((p.level??0)===level&&!placementIssue(p,result,house))result.push(p);return result;}
export function firstFurnitureSpot(id:string,placed:PlacedFurniture[],house?:string,level=0):PlacedFurniture|null{const {width,depth}=roomSize(house);for(let z=-depth/2+.5;z<depth/2;z+=.5)for(let x=-width/2+.5;x<width/2;x+=.5){const p={id,x,z,rotation:0,level};if(!placementIssue(p,placed,house))return p;}return null;}
export const homeDoor=(h:{x:number;z:number})=>({x:h.x+.55,z:h.z+3});
