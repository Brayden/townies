import * as THREE from 'three';
import {OUTFITS} from './outfits';
type Look={outfit?:string;hat?:string;accessory?:string;color:string};
export function dressAvatar(g:THREE.Group,p:Look,mat:(color:string)=>THREE.MeshStandardMaterial){
 const key=JSON.stringify([p.outfit,p.hat,p.accessory,p.color]);if(g.userData.lookKey===key)return;g.userData.lookKey=key;
 let group=g.userData.wardrobe as THREE.Group|undefined;if(!group){group=new THREE.Group();g.add(group);g.userData.wardrobe=group;g.userData.rider.push({o:group,y:0,z:0});}else{group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});group.clear();}
 function mesh(geo:THREE.BufferGeometry,color:string,x:number,y:number,z:number){const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;group!.add(m);return m;}
 function box(w:number,h:number,d:number,c:string,x:number,y:number,z:number){return mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);}
 const outfit=OUTFITS.find(o=>o.id===p.outfit),shape=outfit?.shape,color=p.color;
 if(shape==='dress'){mesh(new THREE.CylinderGeometry(.27,.48,.62,10),color,0,.55,0);box(.57,.045,.12,'#e8cf9e',0,.81,.23);}
 if(shape==='suit'){box(.15,.38,.09,'#f0e4cc',0,.91,.285);const a=box(.12,.35,.06,color,-.12,.95,.32);a.rotation.z=.3;const b=box(.12,.35,.06,color,.12,.95,.32);b.rotation.z=-.3;box(.06,.25,.07,'#a85562',0,.93,.35);}
 if(shape==='overalls'){box(.4,.32,.16,'#506e83',0,.74,.23);for(const x of [-.16,.16])box(.07,.39,.1,'#506e83',x,.95,.24);}
 if(shape==='coat'){mesh(new THREE.CylinderGeometry(.29,.35,.55,10),color,0,.59,0);for(const y of [.55,.72,.9])mesh(new THREE.SphereGeometry(.027,6,4),'#d7b36e',.07,y,.31);}
 const hat=OUTFITS.find(o=>o.id===(p.hat??'hat-straw'));if(hat&&hat.shape!=='none'){const top=hat.shape==='top',beret=hat.shape==='beret',bonnet=hat.shape==='bonnet';mesh(new THREE.CylinderGeometry(.37,.38,.07,14),hat.color,0,1.76,0);mesh(new THREE.CylinderGeometry(beret?.31:bonnet?.3:.23,beret?.34:.25,top?.49:beret?.12:.21,14),hat.color,beret?.035:0,top?2.02:1.87,0);if(top)mesh(new THREE.CylinderGeometry(.252,.252,.075,14),'#d3b17c',0,1.84,0);}
 const accessory=OUTFITS.find(o=>o.id===p.accessory);if(accessory?.shape==='glasses'){for(const x of [-.105,.105])mesh(new THREE.TorusGeometry(.086,.016,6,12),accessory.color,x,1.44,.29);box(.055,.016,.03,accessory.color,0,1.44,.29);}else if(accessory?.shape==='scarf'){mesh(new THREE.CylinderGeometry(.29,.29,.12,10),accessory.color,0,1.12,0);box(.12,.3,.1,accessory.color,.12,.94,.32);}else if(accessory?.shape==='bow'){for(const x of [-.07,.07]){const b=box(.13,.09,.08,accessory.color,x,1.07,.3);b.rotation.z=x<0?.3:-.3;}}
}
