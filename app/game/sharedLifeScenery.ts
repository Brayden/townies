import * as THREE from 'three';
import {FARM_BEDS,PICNIC,cropById,cropStage,type SharedLifeState} from './sharedLife.ts';
export function sharedLifeScenery(scene:THREE.Scene,open:boolean,reducedMotion:boolean){
 const root=new THREE.Group();scene.add(root);const materials=new Map<string,THREE.MeshStandardMaterial>();
 const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));return materials.get(color)!};
 function mesh(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,parent:THREE.Object3D=root){const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=root)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p);
 const ball=(r:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=root)=>mesh(new THREE.IcosahedronGeometry(r,1),c,x,y,z,p);
 // Woven blanket and cushions occupy protected park lawn, away from paths and civic additions.
 const picnic=new THREE.Group();picnic.position.set(PICNIC.x,0,PICNIC.z);root.add(picnic);
 box(4.6,.04,3.6,'#ebd1a3',0,.23,0,picnic);
 for(let i=0;i<6;i++)for(let j=0;j<5;j++)if((i+j)%2===0)box(.72,.012,.68,'#b77773',-1.8+i*.72,.26,-1.36+j*.68,picnic);
 const cushions:THREE.Mesh[]=[];for(const [x,z]of [[-1.65,-1.25],[0,-1.25],[1.65,-1.25],[-1.65,1.25],[0,1.25],[1.65,1.25]]){const cushion=box(.7,.17,.6,'#f1dfb2',x,.35,z,picnic);cushions.push(cushion);}
 const food=new THREE.Group();picnic.add(food);box(.85,.35,.6,'#b99363',-.8,.48,0,food);for(let i=0;i<4;i++)ball(.14,i%2?'#d76460':'#8ead63',-.99+i*.13,.72,0,food);
 for(const x of [.25,1]){mesh(new THREE.CylinderGeometry(.32,.32,.045,16),'#fff0ce',x,.31,0,food);box(.3,.1,.22,'#d6a96a',x,.38,0,food);box(.28,.025,.2,'#739c58',x,.44,0,food);box(.3,.065,.22,'#f0cd8e',x,.48,0,food);}
 food.visible=false;
 const beds=new Map<string,{root:THREE.Group;plants:THREE.Group;marker:THREE.Mesh;soil:THREE.Mesh;key:string;burst:number;particles:THREE.Group}>();
 if(open)for(const bed of FARM_BEDS){const g=new THREE.Group();g.position.set(bed.x,0,bed.z);g.userData.task=bed.id;root.add(g);const soil=box(2.6,.07,2.6,'#aa8359',0,.29,0,g);for(const x of [-1.34,1.34])box(.08,.12,2.7,'#c6a174',x,.33,0,g);for(const z of [-1.34,1.34])box(2.7,.12,.08,'#c6a174',0,.33,z,g);
 const plants=new THREE.Group();g.add(plants);const marker=mesh(new THREE.OctahedronGeometry(.18),'#8ec3da',1.05,1.35,-1.05,g);
 const particles=new THREE.Group();g.add(particles);for(let i=0;i<8;i++)ball(.07,'#f3d377',0,0,0,particles);particles.visible=false;beds.set(bed.id,{root:g,plants,marker,soil,key:'',burst:0,particles});}
 const drops=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045,0),material('#94cee1'),800);drops.count=0;drops.frustumCulled=false;root.add(drops);const dropPose=new THREE.Object3D();
 const clear=(g:THREE.Group)=>{g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});g.clear();};
 return {root,update(life:SharedLifeState|undefined,now:number,people:{x:number;z:number;emote?:string|null;emoteUntil?:number}[]=[]){
 let dropCount=0;for(const p of people){if(p.emote!=='water'||(p.emoteUntil??0)<=now)continue;const bed=FARM_BEDS.find(b=>Math.hypot(b.x-p.x,b.z-p.z)<=2);if(!bed)continue;for(let i=0;i<16&&dropCount<800;i++){const t=(now*.001+i/16)%1;dropPose.position.set(p.x+(bed.x-p.x)*t,1.1*(1-t)+.3*t+Math.sin(t*Math.PI)*.25,p.z+(bed.z-p.z)*t);dropPose.scale.setScalar(reducedMotion?0:1);dropPose.updateMatrix();drops.setMatrixAt(dropCount++,dropPose.matrix);}}drops.count=dropCount;drops.instanceMatrix.needsUpdate=true;
 food.visible=!!life?.basketCompleted;const guests=life?.picnicGuests.length??0;for(let i=0;i<cushions.length;i++)cushions[i].material=material(i<guests?'#e7b96c':'#f1dfb2');
 for(const [id,bed]of beds){const plot=life?.plots.find(p=>p.id===id),stage=cropStage(plot,now),crop=cropById(plot?.crop),key=`${plot?.revision??0}:${stage}`;
 if(key!==bed.key){if(bed.key&&stage==='empty'&&plot?.revision)bed.burst=now;bed.key=key;clear(bed.plants);
 if(crop)for(let i=0;i<3;i++)for(let j=0;j<3;j++){const x=-.75+i*.75,z=-.75+j*.75;const leaf=ball(.24,'#70974e',x,.62,z,bed.plants);leaf.scale.set(1.1,.65,1);const leaf2=ball(.16,'#94b664',x+.12,.82,z,bed.plants);leaf2.scale.y=1.4;if(stage==='ready'){const fruit=ball(crop.id==='pumpkin'?.3:.17,crop.color,x,.53,z+.16,bed.plants);fruit.scale.y=crop.id==='radish'?1.35:.85;}}
 bed.soil.material=material(stage==='thirsty'||stage==='empty'?'#aa8359':'#71583e');bed.marker.visible=stage==='thirsty'||stage==='ready';bed.marker.material=material(stage==='ready'?'#f5ce68':'#85c8e2');}
 const progress=plot?.watered&&crop?Math.min(1,(now-plot.watered)/(crop.minutes*60000)):0;bed.plants.scale.y=.45+progress*.55;
 bed.marker.position.y=1.2+(reducedMotion?0:Math.sin(now*.003)*.08);
 const t=(now-bed.burst)/900;bed.particles.visible=!reducedMotion&&bed.burst>0&&t<1;bed.particles.children.forEach((p,i)=>{const angle=i*Math.PI/4;p.position.set(Math.cos(angle)*t*1.1,.6+Math.sin(t*Math.PI)*.8,Math.sin(angle)*t*1.1);p.scale.setScalar(Math.max(0,1-t));});
 }
 },dispose(){drops.dispose();clear(root);root.removeFromParent();materials.forEach(m=>m.dispose());}};
}
// Apply after locomotion so gestures don't stop movement or change the authoritative position.
export function animateLifeGesture(g:THREE.Group,person:{emote?:string|null;emoteUntil?:number;riding?:boolean;mowing?:boolean;shift?:string|null},now:number,reducedMotion:boolean){
 const arms=g.userData.arms as THREE.Mesh[]|undefined;if(!arms)return;
 if(g.userData.lifeGesturing){if(g.userData.lifeKind==='sit')for(const l of g.userData.legs??[])l.rotation.x=0;for(const a of arms){a.rotation.z=0;if(!person.shift&&!person.riding&&!person.mowing)a.rotation.x=0;}g.userData.lifeGesturing=false;}
 const kind=(person.emoteUntil??0)>now?person.emote:null;
 if(!kind||person.mowing||person.riding||person.shift)return;
 g.userData.lifeGesturing=true;g.userData.lifeKind=kind;const t=(5000-((person.emoteUntil??0)-now))/1000,sway=reducedMotion?0:Math.sin(t*7);
 if(kind==='sit'){for(const {o,y,z} of g.userData.rider??[]){o.position.y=y-.18;o.position.z=z;}for(const l of g.userData.legs??[]){l.rotation.x=-1.4;l.position.y=.24;l.position.z=.15;}arms.forEach(a=>a.rotation.x=-.5);return;}
 if(kind==='wave'){arms[1].rotation.z=-2.2+sway*.22;arms[1].rotation.x=-.25;}
 else if(kind==='cheer'||kind==='dance'){arms[0].rotation.z=2.1+sway*.25;arms[1].rotation.z=-2.1+sway*.25;if(kind==='dance'&&!reducedMotion){g.rotation.y+=Math.sin(t*5)*.025;g.position.y+=Math.abs(sway)*.12;}}
 else {arms.forEach(a=>{a.rotation.x=-.8+sway*.15});if(kind==='water'){g.userData.tool.visible=true;for(const [id,tool]of Object.entries(g.userData.tools) as [string,THREE.Group][])tool.visible=id==='garden';}}
}
