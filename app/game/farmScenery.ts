import type * as THREE from 'three';
import {TOWN_FARM,FARM_ROADS,FARM_BARN} from './townFarm.ts';
type Kit={box:(w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>THREE.Mesh;ball:(r:number,c:string,x:number,y:number,z:number)=>THREE.Mesh;cylinder:(r:number,h:number,c:string,x:number,y:number,z:number,parent?:THREE.Object3D,rt?:number)=>THREE.Mesh;roof:(w:number,d:number,h:number,c:string,x:number,y:number,z:number)=>THREE.Mesh};
export function farmScenery({box,ball,cylinder,roof}:Kit,open:boolean){
 box(TOWN_FARM.width,1,TOWN_FARM.depth,'#8b9d65',TOWN_FARM.x,-.48,TOWN_FARM.z);
 box(TOWN_FARM.width,.08,TOWN_FARM.depth,open?'#9fbd73':'#a2ae7d',TOWN_FARM.x,.12,TOWN_FARM.z);
 // Straight westward construction corridor continues the town's north park road.
 for(const road of FARM_ROADS)box(road.width,.055,road.depth,open?'#d4c5a0':'#b3a387',road.x,.2,road.z);
 for(let x=-62;x>=-112;x-=3){if(!open){box(1.7,.09,2.9,x>-73?'#c8b896':'#a9a080',x,.24,-21);for(const z of [-23.2,-18.8]){box(.12,.75,.12,'#9e8056',x,.5,z);box(.27,.18,.18,'#e3c379',x,.85,z);}}}
 // Surveyed fields are visible from town; opening adds planted rows and a barn.
 for(const x of [-79,-70])for(const z of [-11,0,11]){box(6.3,.09,6.4,open?'#97764e':'#a19671',x,.21,z);for(let row=0;row<5;row++){box(5.7,.06,.35,open?'#765c40':'#958965',x,.3,z-2.4+row*1.2);if(open)for(let i=0;i<8;i++){const xx=x-2.5+i*.72,zz=z-2.4+row*1.2;const plant=ball(.22,row%2?'#84a14d':'#739245',xx,.5,zz);plant.scale.y=1.4;if(row%2===0)ball(.09,'#d79257',xx,.68,zz);}}}
 for(const x of [-110,-102,-95])for(const z of [6,14]){cylinder(.18,1.7,'#93714c',x,1,z);ball(1.05,open?'#829e54':'#949f73',x,2.25,z);if(open)for(const dx of [-.5,.5])ball(.13,'#cc865a',x+dx,2.3,z+.65);}
 for(let z=-24;z<=22;z+=2){if(z>-24&&z<-18)continue;box(.14,.85,.14,'#cabb91',-60,.6,z);box(.08,.12,1.95,'#cabb91',-60,.65,z+.9);}
 for(const z of [-24,22])for(let x=-114;x<-62;x+=3){box(.14,.8,.14,'#b6a67a',x,.55,z);box(2.9,.1,.09,'#bcad83',x+1.45,.7,z);}
 if(!open){
  for(const z of [-22.7,-19.3])box(.18,1.25,.18,'#846d4c',-60,.8,z);
  for(const y of [.8,1.3]){box(.16,.26,3.8,'#f2d58b',-60,y,-21);for(let i=0;i<7;i++){const stripe=box(.18,.29,.22,'#8b7150',-59.98,y,-22.55+i*.5);stripe.rotation.x=.45;}}
  for(const x of [-65,-71,-79]){cylinder(.23,.6,'#cf9462',x,.5,-18.5,undefined,.06);box(.55,.07,.55,'#a17e56',x,.22,-18.5);}
  for(let i=0;i<5;i++)box(3,.15,.22,'#bc9a65',-69,.35+i*.13,-16.8);
  box(FARM_BARN.width,.13,FARM_BARN.depth,'#aaa58d',FARM_BARN.x,.25,FARM_BARN.z);
  for(const x of [-104,-96])for(const z of [-14,-8]){box(.16,1.1,.16,'#a78c66',x,.8,z);}
 }else{
  // Barn is drawn by the shared building renderer; these are its farm details.
  cylinder(.85,4,'#c4c6ae',-108,2.2,-11);roof(2,2,1,'#8f9b86',-108,4.2,-11);
  for(let i=0;i<3;i++){box(1,.8,.8,'#d2b96b',-105+i*1.1,.65,-5.8);box(.07,.82,.83,'#9b884b',-105+i*1.1,.65,-5.8);}
  box(2.8,.6,1.1,'#ac8655',-92,.55,-4);for(let i=0;i<5;i++)box(.45,.4,.6,'#cba36b',-93+i*.48,1,-4);
 }
}
