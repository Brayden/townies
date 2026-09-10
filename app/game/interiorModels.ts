import * as THREE from 'three';
import type {Furniture} from './interiors.ts';
export function interiorKit(){const materials=new Map<string,THREE.MeshStandardMaterial>();const mat=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true}));return materials.get(color)!};
 const mesh=(geo:THREE.BufferGeometry,c:string,x:number,y:number,z:number,p:THREE.Object3D)=>{const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;};
 return {mat,box:(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:THREE.Object3D)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p),ball:(r:number,c:string,x:number,y:number,z:number,p:THREE.Object3D)=>mesh(new THREE.IcosahedronGeometry(r,1),c,x,y,z,p),cylinder:(r:number,h:number,c:string,x:number,y:number,z:number,p:THREE.Object3D,top=r)=>mesh(new THREE.CylinderGeometry(top,r,h,12),c,x,y,z,p),dispose:()=>materials.forEach(m=>m.dispose())};}
export type InteriorKit=ReturnType<typeof interiorKit>;
export function furnitureModel(f:Furniture,k:InteriorKit){const g=new THREE.Group(),{box,ball,cylinder}=k,c=f.color,w=f.w-.14,d=f.d-.14,wood='#9c7754',cream='#f4e9cc';
 const legs=(height:number)=>{for(const x of [-w/2+.15,w/2-.15])for(const z of [-d/2+.15,d/2-.15])box(.1,height,.1,wood,x,height/2,z,g);};
 if(f.kind==='bed'){legs(.4);box(w,.22,d,wood,0,.35,0,g);box(w-.1,.25,d-.1,cream,0,.58,0,g);box(w-.08,.08,d*.66,c,0,.74,d*.15,g);box(w,.9,.13,wood,0,.7,-d/2,g);for(const x of [-w*.24,w*.24])box(w*.38,.14,.55,'#fff3d8',x,.78,-d*.31,g);for(let i=0;i<4;i++)box(w*.96,.015,.035,cream,0,.79,-.3+i*.35,g);}
 if(f.kind==='sofa'){legs(.2);box(w,.35,d,c,0,.38,0,g);box(w,.65,.18,c,0,.8,-d/2+.05,g);for(const x of [-w/2+.08,w/2-.08])box(.17,.5,d,c,x,.68,0,g);for(let i=0;i<3;i++)box(w/3-.1,.17,d-.15,c,-w/3+i*w/3,.62,.03,g);for(const x of [-w*.32,w*.32])box(.42,.35,.2,cream,x,.86,-.15,g);}
 if(f.kind==='chair'){legs(.55);box(w,.15,d,c,0,.6,0,g);box(w,.6,.13,c,0,.96,-d/2,g);}
 if(f.kind==='table'||f.kind==='desk'){legs(.8);if(f.id==='table-round')cylinder(w/2,.14,c,0,.9,0,g);else box(w,.14,d,c,0,.9,0,g);if(f.kind==='desk'){box(.55,.055,.4,cream,.2,1,-.1,g);box(.06,.16,.06,'#526e76',.5,1.05,-.2,g);}else{cylinder(.14,.17,'#e6d5af',0,1.06,0,g);ball(.16,'#d1a067',.3,1.05,0,g);}}
 if(f.kind==='shelf'){box(w,1.8,.1,c,0,.9,-d/2+.03,g);for(const x of [-w/2+.05,w/2-.05])box(.12,1.9,d,c,x,.95,0,g);for(const y of [.1,.7,1.3,1.9])box(w,.1,d,c,0,y,0,g);for(let row=0;row<3;row++)for(let i=0;i<6;i++)box(.16,.33+(i%3)*.04,.32,['#769c93','#c68c74','#e3c783'][i%3],-w/2+.22+i*.24,.34+row*.6,0,g);}
 if(f.kind==='plant'){cylinder(.25,.38,f.id==='plant-flowers'?'#e7d6bd':'#bd8765',0,.21,0,g,.3);cylinder(.035,.6,'#739255',0,.58,0,g);for(let i=0;i<7;i++){const a=i*2.4,leaf=ball(.2,c,Math.cos(a)*.2,.65+(i%3)*.16,Math.sin(a)*.2,g);leaf.scale.set(1.3,.6,1);}if(f.id==='plant-monstera')g.scale.y=1.45;}
 if(f.kind==='lamp'){cylinder(.3,.06,wood,0,.06,0,g);cylinder(.045,1.5,wood,0,.8,0,g);cylinder(.37,.43,c,0,1.55,0,g,.22);ball(.12,'#fff3b4',0,1.34,0,g);}
 if(f.kind==='rug'){box(w,.035,d,c,0,.025,0,g);for(const x of [-w/2+.12,w/2-.12])box(.06,.007,d-.12,cream,x,.047,0,g);for(const z of [-d/2+.12,d/2-.12])box(w-.12,.007,.06,cream,0,.047,z,g);for(let x=-w/2+.2;x<w/2;x+=.2)for(const z of [-d/2-.01,d/2+.01])box(.035,.018,.12,cream,x,.025,z,g);}
 g.userData.furniture=f.id;return g;}
export function disposeGeometry(g:THREE.Object3D){g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});}

export function staircaseModel(k:InteriorKit,level:number,count:number){
 const g=new THREE.Group(),{box}=k,up=level<count-1,wood='#a57d55',trim='#e4d3ab';g.userData.floorTo=up?level+1:level-1;
 if(up){for(let i=0;i<9;i++){const h=.24*(i+1);box(1.35,h,.25,wood,0,h/2,1-i*.24,g);box(1.39,.055,.28,trim,0,h+.025,1-i*.24,g);}for(const x of [-.78,.78]){for(let i=0;i<4;i++)box(.09,.72,.09,wood,x,.6+i*.57,.9-i*.57,g);const rail=box(.1,.1,2.85,wood,x,1.58,.05,g);rail.rotation.x=.78;}}
 else{box(1.4,.03,2.5,'#635847',0,.07,0,g);for(let i=0;i<8;i++)box(1.32,.025,.15,i%2?wood:'#85684c',0,.09,-1+i*.3,g);for(const x of [-.78,.78]){for(const z of [-1,0,1])box(.09,.8,.09,wood,x,.46,z,g);box(.11,.1,2.2,trim,x,.86,0,g);}}
 box(1.85,.08,.55,trim,0,.06,1.5,g);
 const addArrow=(x:number,to:number,c:string)=>{const plate=box(.65,.06,.46,c,x,.13,1.5,g);plate.userData.floorTo=to;for(const side of [-1,1]){const mark=box(.065,.018,.23,'#fff9df',x+side*.065,.17,1.5,g);mark.rotation.y=side*(to>level?1:-1)*Math.PI/4;mark.userData.floorTo=to;}};
 if(up)addArrow(level>0?.43:0,level+1,'#668968');if(level>0)addArrow(up?-.43:0,level-1,'#638d9c');return g;
}
