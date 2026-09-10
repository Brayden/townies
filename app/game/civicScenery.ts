import * as THREE from 'three';
import {CIVIC_PROJECTS} from './civicProjects.ts';
import {BUILDINGS,STALLS} from './townLayout.ts';
type Kit={box:(w:number,h:number,d:number,c:string,x:number,y:number,z:number,parent?:THREE.Object3D)=>THREE.Mesh;ball:(r:number,c:string,x:number,y:number,z:number,parent?:THREE.Object3D)=>THREE.Mesh;cylinder:(r:number,h:number,c:string,x:number,y:number,z:number,parent?:THREE.Object3D,rt?:number)=>THREE.Mesh;roof:(w:number,d:number,h:number,c:string,x:number,y:number,z:number,parent?:THREE.Object3D)=>THREE.Mesh;bench:(x:number,z:number,parent?:THREE.Object3D)=>void;flower:(x:number,z:number,c:string,parent?:THREE.Object3D)=>void};
// Additions use the same world geometry, palette, scale, and southern frontage as town scenery.
// All public paths and existing work targets remain accessible beneath/around these additions.
export function civicScenery(k:Kit){
 const {box,ball,cylinder,roof,bench,flower}=k,groups=new Map<string,THREE.Group>();
 function lantern(x:number,z:number,g:THREE.Group){cylinder(.09,2.8,'#526b60',x,1.5,z,g);box(.5,.6,.5,'#ffe6a1',x,3.04,z,g);roof(.8,.8,.35,'#547c75',x,3.36,z,g);ball(.12,'#d8b666',x,3.8,z,g);}
 function planter(x:number,z:number,g:THREE.Group){box(1,.5,.8,'#b99065',x,.48,z,g);for(let i=0;i<4;i++){const f=new THREE.Group();f.position.y=.4;g.add(f);flower(x-.3+i*.2,z,i%2?'#efa7bc':'#f6dc87',f)}}
 function pergola(x:number,z:number,w:number,d:number,g:THREE.Group,color='#eee0ba'){for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(.14,2.8,.14,'#a78055',x+dx,1.6,z+dz,g);for(let n=-w/2;n<=w/2;n+=.45)box(.16,.18,d+.6,color,x+n,3,z,g);for(const dz of [-d/2,d/2])box(w+.5,.16,.17,'#ab8458',x,2.9,z+dz,g);}
 function picnic(x:number,z:number,g:THREE.Group){box(1.8,.13,1.1,'#cbac76',x,.95,z,g);for(const dx of [-.6,.6])box(.13,.8,.8,'#897550',x+dx,.55,z,g);bench(x,z+1,g);bench(x,z-1.2,g);}
 function banner(x:number,y:number,z:number,g:THREE.Group){box(.65,1.5,.06,'#658e85',x,y,z,g);box(.45,.12,.08,'#e6c577',x,y+.35,z+.04,g);}
 for(const p of CIVIC_PROJECTS){const g=new THREE.Group();g.name=p.id;g.visible=false;groups.set(p.id,g);
  switch(p.id){
   case 'park-stage':box(4.8,.3,3.5,'#b88e62',-34,.37,8,g);pergola(-34,8,4.7,3.4,g);roof(5.4,4,.9,'#769c86',-34,3.05,8,g);for(const x of [-35.5,-34,-32.5])banner(x,2.3,6.25,g);bench(-37,11,g);bench(-32,11,g);break;
   case 'flower-walk':for(const z of [5,9,13]){pergola(-54,z,2.2,.65,g,'#dce9b1');for(const dx of [-1.3,1.3])planter(-54+dx,z,g);for(let i=0;i<5;i++)ball(.16,i%2?'#d997b6':'#f1d790',-54.9+i*.45,3.17,z,g)}break;
   case 'orchard-picnic':for(const x of [-54,-49]){picnic(x,-27,g);cylinder(.06,3,'#9f895c',x,1.8,-27,g);cylinder(1.4,.5,'#e5ba70',x,3.4,-27,g,0)}break;
   case 'garden-terrace':pergola(17,14,5,3,g);for(const x of [14.2,19.8])planter(x,14,g);bench(17,15,g);break;
   case 'hall-restoration':box(8.8,.2,6.6,'#d5b761',0,4.65,-11,g);for(const x of [-3.5,3.5])banner(x,2.7,-7.8,g);for(const x of [-4.6,4.6]){planter(x,-7.5,g);lantern(x,-8.8,g)}break;
   case 'market-canopies':for(const s of STALLS){roof(3.4,2.6,.65,'#dfb16d',s.x,3.3,s.z,g);for(const dx of [-1.5,1.5]){box(.07,1.6,.07,'#a1845c',s.x+dx,3,s.z,g);banner(s.x+dx,3.4,s.z,g)}}break;
   case 'shopfronts':for(const b of BUILDINGS.filter(b=>['general','clothing','cafe'].includes(b.id))){for(const dx of [-b.width*.32,b.width*.32]){box(1.65,.3,.5,'#bc8e63',b.x+dx,1.02,b.z+b.depth/2+.35,g);for(let i=0;i<5;i++)ball(.18,i%2?'#efaab4':'#edd48a',b.x+dx-.55+i*.27,1.27,b.z+b.depth/2+.35,g)}for(let n=0;n<8;n++)box(b.width/8,.12,1.45,n%2?'#faf0ce':'#739e90',b.x-b.width/2+(n+.5)*b.width/8,3.08,b.z+b.depth/2+.65,g)}break;
   case 'library-court':pergola(-16,14,5,2.5,g);bench(-17,14,g);box(1.2,1.4,.4,'#8e7959',-19,1,13.5,g);for(let n=0;n<6;n++)box(.12,.35,.3,n%2?'#799f9c':'#c1946b',-19.4+n*.16,1.6,13.5,g);break;
   case 'school-court':cylinder(2.4,.04,'#d9c38c',-7,.25,-30,g);for(let i=0;i<8;i++){const angle=i*Math.PI/4;cylinder(.37,.35,i%2?'#729ca0':'#c9986e',-7+Math.cos(angle)*2.3,.44,-30+Math.sin(angle)*2.3,g)}box(2,1,.1,'#537965',-7,1.25,-32,g);for(const x of [-8,-6])box(.08,1.8,.08,'#a48259',x,1,-32,g);break;
   case 'river-lights':for(const z of [-47,-37,-27,-12,-2,8,28,36,46]){lantern(33.5,z,g);planter(33.5,z+1.2,g)}break;
   case 'neighborhood-lights':for(const z of [24,34,44])for(const x of [-57,-22,34,59.5])lantern(x,z,g);break;
   case 'harbor-terrace':box(7,.06,2.6,'#c4a173',-39,.28,54,g);pergola(-39,54,6.5,2.2,g);for(const x of [-41,-37])bench(x,54,g);for(const x of [-43,-35])lantern(x,54,g);break;
  }
 }
 const construction=new THREE.Group();construction.name='Featured project site';for(const x of [-.65,.65])box(.1,1.25,.1,'#8d7958',x,.8,0,construction);box(1.8,.65,.15,'#e2c076',0,1.18,0,construction);for(const x of [-.6,-.2,.2,.6]){const stripe=box(.15,.65,.17,'#788568',x,1.18,0,construction);stripe.rotation.z=-.3}construction.visible=false;
 return {groups,construction};
}
