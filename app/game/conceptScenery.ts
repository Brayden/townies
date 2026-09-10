import * as THREE from 'three';
import {HOME_LOTS,ROADS,COMMUNITY_PARK} from './townLayout';
type Parent=THREE.Object3D;
type Kit={box:(w:number,h:number,d:number,c:string,x:number,y:number,z:number,parent?:Parent)=>THREE.Mesh;ball:(r:number,c:string,x:number,y:number,z:number,parent?:Parent)=>THREE.Mesh;cylinder:(r:number,h:number,c:string,x:number,y:number,z:number,parent?:Parent,rt?:number)=>THREE.Mesh;roof:(w:number,d:number,h:number,c:string,x:number,y:number,z:number,parent?:Parent)=>THREE.Mesh;tree:(x:number,z:number,s?:number)=>void;bench:(x:number,z:number,parent?:Parent)=>void;flower:(x:number,z:number,c:string,parent?:Parent)=>void};
export function conceptScenery(k:Kit,expanded:{north:boolean;east:boolean}={north:false,east:false}){const {box,ball,cylinder,roof,tree,bench,flower}=k;
 // Raised curb lines and repeated paving give the grid a consistent visual scale.
 const paved=ROADS.flatMap(r=>{const left=r.x-r.width/2,right=r.x+r.width/2;if(right<=23.2||left>=32.8)return[r];return[{...r,x:(left+23.2)/2,width:23.2-left},{...r,x:(32.8+right)/2,width:right-32.8}].filter(p=>p.width>0)});
 for(const r of paved){box(r.width+.45,.045,r.depth+.45,'#e8ddbf',r.x,.155,r.z);box(r.width,.045,r.depth,'#c8c4af',r.x,.18,r.z);const along=r.width>r.depth,length=along?r.width:r.depth;for(let n=-length/2+2;n<length/2;n+=2)box(along?.025:r.width,.012,along?r.depth:.025,'#b7b6a5',r.x+(along?n:0),.21,r.z+(along?0:n));}
 box(41,.08,36,'#c4c1a8',0,.15,0);box(40,.045,35,'#e1d3b1',0,.205,0);
 for(let x=-19;x<20;x+=2)for(let z=-16;z<18;z+=2){box(1.95,.012,.025,'#cdbf9f',x,.236,z);box(.025,.012,1.95,'#cdbf9f',x-1,.236,z+1)}
 function shrub(x:number,z:number,s=1){const b=ball(.45*s,'#62864c',x,.45*s,z);b.scale.set(1.25,.9,1);ball(.3*s,'#8aaa59',x+.18*s,.68*s,z);}
 function flowerBorder(x:number,z:number,length:number,vertical=false){for(let i=0;i<length;i+=.65){const xx=x+(vertical?0:i),zz=z+(vertical?i:0);shrub(xx,zz,.8);for(let j=0;j<3;j++)flower(xx+(j-1)*.18,zz+.23,j%2?'#e89aae':'#efd474');}}
 // Every cottage gets an aligned, readable plot and front path.
 function rail(x:number,z:number,length:number,vertical=false){for(let i=0;i<=length;i+=1){box(.09,.57,.09,'#ece5c5',x+(vertical?0:i),.42,z+(vertical?i:0))}for(const y of [.36,.62])box(vertical?.065:length,.07,vertical?length:.065,'#dfd6b3',x+(vertical?0:length/2),y,z+(vertical?length/2:0));}
 for(const [i,h]of HOME_LOTS.entries()){
  box(7.8,.04,8.2,i%3?'#99b96f':'#a7bf79',h.x,.13,h.z+.4);
  rail(h.x-3.8,h.z-3.6,7.6);rail(h.x-3.8,h.z-3.6,7.6,true);rail(h.x+3.8,h.z-3.6,7.6,true);
  rail(h.x-3.8,h.z+4,3.3);rail(h.x+1.5,h.z+4,2.3);
  box(1.05,.05,2.4,'#d8c9a4',h.x+.55,.20,h.z+3.9);
  for(let j=0;j<4;j++)flower(h.x-1.9+j*.3,h.z+3.4,['#e59db3','#f6df90','#d7c6de'][i%3]);
  tree(h.x+3.25,h.z-1.7,.7);
  for(const dx of [-2.7,-1.7,-.7,.3,1.3,2.3])shrub(h.x+dx,h.z-3,.85);
  flowerBorder(h.x-2.6,h.z+3.5,2);
  for(const z of [-2,-.7])shrub(h.x-3.4,h.z+z,.85);
 }
 const park=COMMUNITY_PARK;
 box(park.width,.065,park.depth,'#8bac66',park.x,.17,0);
 for(const x of [-54,-42,-29])box(1.4,.045,34,'#dfd1ae',x,.23,0);
 for(const z of [-15,0,15])box(30,.045,1.4,'#dfd1ae',park.x,.23,z);
 // Gazebo, playground, picnic lawn and garden courts match the reference park block.
 const gx=-42,gz=-3;cylinder(2.5,.22,'#d5bc91',gx,.35,gz);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.13,2.3,.13,'#f4e3bd',gx+Math.cos(a)*2,1.55,gz+Math.sin(a)*2)}cylinder(2.9,1.4,'#b88060',gx,3.3,gz,undefined,0);cylinder(.12,.5,'#e7d1a0',gx,4.13,gz);
 function play(x:number,z:number,scale=1){for(const dx of [-1.3,1.3])box(.12,2.2*scale,.12,'#ab8555',x+dx*scale,1.3*scale,z);box(2.8*scale,.15,.14,'#a78b57',x,2.4*scale,z);for(const dx of [-.45,.45]){box(.025,1.45*scale,.025,'#707b62',x+dx*scale,1.55*scale,z);box(.6*scale,.08,.32*scale,'#cd9a5b',x+dx*scale,.83*scale,z)}const slide=box(.8*scale,.1,2.8*scale,'#eab64d',x+2.8*scale,1.03*scale,z+.4);slide.rotation.x=.4;roof(1.4*scale,1.3*scale,.8*scale,'#b5764e',x+2.8*scale,2.8*scale,z-1);}
 play(-51,-9);play(-17,-34,.65);
 for(const [x,z]of [[-48,-15],[-35,-15],[-34,1],[-51,14],[-31,14],[-34,10]])bench(x,z);
 for(const [x,z]of [[-54,-16],[-50,-16],[-36,-14],[-29,-14],[-29,-7],[-29,5],[-29,13],[-54,12],[-38,13],[-36,5],[-51,2]])tree(x,z,.7);
 for(let i=0;i<18;i++)flower(-39+(i%6)*.4,6+Math.floor(i/6)*.45,i%2?'#e696af':'#f2d58b');
 // Planted park boundaries have gaps exactly where paths meet the surrounding streets.
 for(const z of [-17,17])for(const [x,len]of [[-52,8],[-40,9]])flowerBorder(x,z,len);
 for(const x of [-56,-26])for(const [z,len]of [[-13,11],[2,11]])flowerBorder(x,z,len,true);
 for(const [x,z]of [[-50,-5],[-45,-12],[-37,-11],[-32,-3],[-40,8],[-54,5]])tree(x,z,.85);
 // Floral courtyards, planters and a café terrace add activity around the square.
 for(const [x,z,len]of [[-18,-16,14],[5,-16,13],[-18,15,5],[12,15,6],[-11,8,5],[6,8,5]])flowerBorder(x,z,len);
 for(const x of [-9,-3,3,9]){box(1,.45,1,'#c2ad84',x,.44,19);flowerBorder(x-.25,19,.6)}
 for(const [x,z]of [[-18,-1],[-15,-1],[-18,2]]){cylinder(.75,.12,'#dfc89c',x,.82,z);cylinder(.08,.7,'#837351',x,.43,z);cylinder(1.05,.45,'#f1e6c7',x,2.3,z,undefined,0);box(.06,1.7,.06,'#8d7651',x,1.35,z);}
 // Greenhouses and rectangular teaching / neighborhood garden plots.
 function greenhouse(x:number,z:number,depth=3){box(3,1.65,depth,'#bdd6c6',x,1.05,z);roof(3.1,depth+.1,1,'#b8d0bd',x,1.89,z);for(const dx of [-1.5,-.5,.5,1.5]){box(.055,1.7,.055,'#f2ead3',x+dx,1.07,z+depth/2+.03);box(.055,1.7,.055,'#f2ead3',x+dx,1.07,z-depth/2-.03)}for(const y of [.28,1.1,1.85])box(3.1,.065,depth+.1,'#e6e2c8',x,y,z);}
 greenhouse(17,-28);greenhouse(53,-16);greenhouse(53,17.7,2.4);
 // The school has a paved approach, teaching beds and a hedge enclosing its playground.
 box(1.4,.04,9,'#d8c8a2',-7,.2,-28);
 flowerBorder(-18,-42,17);flowerBorder(-20,-39,11,true);
 for(const [x,z]of [[-18,-28],[-2,-29],[3,-40],[3,-29]])tree(x,z,.9);
 for(const [x,z]of [[5,-34],[9,-34],[13,-34]]){box(2.3,.16,3,'#a28552',x,.25,z);for(let i=0;i<8;i++){shrub(x+(i%2-.5)*.7,z+Math.floor(i/2)*.55-.8,.5)}}
 // A restrained orchard around the windmill; forest stays outside the settled blocks.
 for(const x of [-56,-51,-47])for(const z of [-39,-35,-30]){tree(x,z,.63);for(let n=0;n<5;n++)ball(.12,n%2?'#d89747':'#bc5a41',x+Math.sin(n*2)*.65,1.8+Math.cos(n)*.28,z+Math.cos(n*2)*.65)}
 flowerBorder(-57,-25,10);flowerBorder(-57,-49,21,true);
 rail(-56,-24,10);rail(-46,-51,27,true);
 // Waterfront promenade, boat shed, timber landing and small moored boats.
 box(220,.08,80,'#71bec7',0,.13,97);box(98,.025,5,'#e1d5b2',-26,.15,55.5);box(42,.025,5,'#e1d5b2',54,.15,55.5);
 box(23,.13,2,'#bb9567',-35,.33,55);box(3,.18,8,'#a78259',-35,.4,60);box(9,.18,2,'#a78259',-35,.4,63);
 for(let x=-45;x<=-24;x+=2.5){box(.13,1.05,.13,'#947753',x,.65,56);box(2.3,.08,.1,'#a4885c',x+1.15,.9,56)}

 for(const [x,z]of [[-39,61],[-30,62]]){const boat=ball(1,'#ae774d',x,.34,z);boat.scale.set(.6,.32,1.55);box(.07,3,.07,'#ac9d73',x,1.9,z);const sail=roof(1.6,.035,2,'#fff1cc',x+.55,1.5,z);sail.rotation.y=.2;}
 for(let i=0;i<38;i++){const x=-69+i*3.8;if(Math.abs(x+35)<9||Math.abs(x-28)<6)continue;const rock=ball(.6+(i%3)*.13,['#9ba397','#b1b5a1','#87978d'][i%3],x,.2,57+Math.sin(i)*.5);rock.scale.y=.7;}
 // River reeds, stones and lilies give the straight channel a living edge.
 for(let i=0;i<44;i++){const z=-57+i*2.6;if([-53,-21,21,41,51].some(b=>Math.abs(z-b)<3.4))continue;for(const x of [24.3,31.7]){const rock=ball(.32,'#97a899',x,.25,z);rock.scale.y=.65;for(let j=0;j<3;j++)box(.04,.55,.04,'#7a9853',x+(j-1)*.14,.45,z+.45);if(i%3===0)cylinder(.24,.025,'#83a66c',x+(x<28?.45:-.45),.2,z+1)}}
 for(let i=0;i<25;i++)box(.8+(i%3)*.4,.02,.055,'#d0e5d5',-63+i*5,.2,59+(i%4)*3);
 // Street trees establish block edges without obscuring the civic frontage.
 for(const [x,z]of [[-20,-15],[-20,4],[-19,15],[20,15],[20,-16],[-6,-4],[6,-4],[-6,5],[6,5],[-19,-27],[2,-28]])tree(x,z,.6);
 if(!expanded.north)for(let i=0;i<48;i++){const x=-72+(i%24)*6+Math.sin(i*7)*1.5,z=(i<24?-60:-66)+Math.cos(i*3)*1.2;tree(x,z,1.15+(i%3)*.16)}
 // Leave the western farm and its construction road visible through the tree line.
 for(let i=0;i<30;i++){if(i>=15&&expanded.east)continue;const z=-54+(i%15)*7,x=i<15?-66:67;if(i<15&&z>=-26&&z<=24)continue;tree(x,z,1.05+(i%4)*.15)}
}
