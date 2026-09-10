import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {petById,petPose,type Pet} from './pets.ts';
import {HOMES} from './data.ts';
export function petModel(pet:Pet){
 const root=new THREE.Group(),body=new THREE.Group(),tail=new THREE.Group(),head=new THREE.Group(),legs:THREE.Group[]=[];
 root.add(body,tail,head);root.scale.setScalar(pet.size);
 const materials=new Map<string,THREE.MeshStandardMaterial>();
 function part(parent:THREE.Group,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,shape:'round'|'box'|'ear'='round'){
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.92}));
  const geometry=shape==='round'?new THREE.SphereGeometry(1,8,6):shape==='ear'?new THREE.ConeGeometry(1,2,4):new THREE.BoxGeometry(2,2,2);
  const mesh=new THREE.Mesh(geometry,materials.get(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 const cat=pet.kind==='cat',long=pet.long??false,coat=pet.coat,accent=pet.accent;
 part(body,coat,0,cat?.29:.4,0,cat?.19:.22,cat?.28:.23,cat?.19:long?.46:.34);
 if(!cat)for(const x of [-.14,.14])for(const z of [long?-.31:-.23,long?.31:.23]){const leg=new THREE.Group();leg.position.set(x,.3,z);root.add(leg);legs.push(leg);part(leg,coat,0,-.11,0,.075,.16,.08,'box');part(leg,pet.pattern==='tuxedo'?accent:coat,0,-.24,.025,.085,.055,.11);}
 else for(const x of [-.09,.09]){part(body,coat,x,.14,.13,.055,.14,.065);part(body,pet.pattern==='tuxedo'?accent:coat,x,.025,.17,.075,.04,.085);}
 head.position.set(0,cat?.62:.66,cat?.055:long?.45:.34);
 part(head,pet.pattern==='points'?accent:coat,0,0,0,.205,.185,.185);
 if(pet.pattern==='tuxedo'){part(body,accent,0,cat?.36:.44,cat?.16:long?.38:.28,.13,.17,.065);part(head,accent,0,-.075,.15,.14,.1,.08);}
 part(head,cat?'#ead5bf':pet.pattern==='plain'?coat:accent,0,-.055,.18,cat?.1:.12,.065,cat?.07:.14);
 for(const x of [-.105,.105]){part(head,pet.name==='Siamese cat'||pet.name==='Husky'?'#82bdc9':'#a2b97c',x,.025,.164,.04,.046,.026);part(head,'#2f3938',x,.025,.187,.016,.028,.009);part(head,'#fff4db',x-.006,.04,.195,.009,.012,.006);}
 part(head,cat?'#b4807e':'#3b4140',0,-.028,cat?.245:.305,.038,.025,.018);
 for(const x of [-.15,.15]){const ear=part(head,pet.pattern==='points'?accent:coat,x,pet.ears==='pointed'?.195:.035,-.02,pet.ears==='pointed'?.09:.065,pet.ears==='pointed'?.15:.2,.065,pet.ears==='pointed'?'ear':'round');ear.rotation.z=x<0?.18:-.18;if(pet.ears==='pointed')part(head,'#d9aba2',x,.185,.037,.044,.075,.018,'ear');}
 if(pet.pattern==='tabby')for(const y of [.15,.25,.35])part(body,accent,-.175,y,-.01,.035,.025,.13,'box');
 if(pet.pattern==='spots'||pet.pattern==='patches')for(let i=0;i<5;i++){const mark=part(body,i%2&&pet.pattern==='patches'?'#55504b':accent,i%2?.19:-.19,.28+(i%3)*.1,(i-2)*.09,.034,pet.pattern==='spots'?.06:.12,.065);mark.rotation.z=i*.4;}
 tail.position.set(cat?.15:0,cat?.1:.49,cat?-.13:long?-.43:-.33);
 const tip=part(tail,coat,0,cat?.02:.13,cat?.17:-.16,.055,cat?.055:.18,cat?.23:.07);tip.rotation.x=cat?0:-.8;
 // Merge static parts by coat color; only tails, heads and legs need animation.
 for(const group of [body,head,tail,...legs]){group.updateMatrix();const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();for(const child of group.children){if(!(child instanceof THREE.Mesh))continue;child.updateMatrix();const g=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);const material=child.material as THREE.Material;if(!buckets.has(material))buckets.set(material,[]);buckets.get(material)!.push(g);child.geometry.dispose();}group.clear();for(const [material,gs]of buckets){const g=mergeGeometries(gs,false);if(g){const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}gs.forEach(g=>g.dispose());}}
 return {root,tail,head,legs};
}
type Property={home:number;catPet?:string|null;dogPet?:string|null};
export function townPets(scene:THREE.Scene,reducedMotion:boolean){
 const animals=new Map<string,{pet:Pet;home:number;model:ReturnType<typeof petModel>}>();let signature='';
 function discard(model:ReturnType<typeof petModel>){scene.remove(model.root);const materials=new Set<THREE.Material>();model.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());}
 return {update(properties:Property[],now:number){const key=JSON.stringify(properties.map(p=>[p.home,p.catPet,p.dogPet]));if(key!==signature){signature=key;const wanted=new Set<string>();for(const property of properties)for(const id of [property.catPet,property.dogPet]){const pet=petById(id);if(!pet||!HOMES[property.home])continue;const key=property.home+':'+pet.id;wanted.add(key);if(!animals.has(key)){const model=petModel(pet);animals.set(key,{pet,home:property.home,model});scene.add(model.root);}}for(const [key,a]of animals)if(!wanted.has(key)){discard(a.model);animals.delete(key);}}
  for(const a of animals.values()){const home=HOMES[a.home],pose=petPose(a.pet.kind,a.home,reducedMotion?0:now);a.model.root.position.set(home.x+pose.x,pose.y,home.z+pose.z);a.model.root.rotation.y=pose.yaw;a.model.tail.rotation.y=pose.tail;a.model.head.rotation.y=reducedMotion?0:Math.sin(now/2400+a.home)*.12;a.model.legs.forEach((leg,i)=>leg.rotation.x=pose.walk*(i%3===0?1:-1));}
 },dispose(){for(const a of animals.values())discard(a.model);animals.clear();}};
}
