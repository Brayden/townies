import * as THREE from 'three';
import {MAINTENANCE_TARGETS,workDuration,type MaintenanceTarget} from './maintenance';
import {WORK_DAY_MS} from './workTargets';

type Worker={shift:string|null;wateringTarget:string|null;wateringStarted:number};
// Batched geometry keeps hundreds of street sections inexpensive on phones.
export function maintenanceScenery(scene:THREE.Scene,blocked:(x:number,z:number)=>boolean){
 const targets=MAINTENANCE_TARGETS.filter(t=>!blocked(t.x,t.z)),dummy=new THREE.Object3D();
 const batches:{mesh:THREE.InstancedMesh;targets:MaintenanceTarget[];pieces:number;kind:string}[]=[];
 const make=(kind:string,job:string,pieces:number,geometry:THREE.BufferGeometry,color:string)=>{
  const ts=targets.filter(t=>t.job===job),mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1}),ts.length*pieces);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=job==='trim';scene.add(mesh);batches.push({mesh,targets:ts,pieces,kind});
 };
 make('paving','wash',1,new THREE.BoxGeometry(1,1,1),'#d1cab3');
 make('grime','wash',12,new THREE.BoxGeometry(1,1,1),'#8d8b69');
 make('road','sweep',7,new THREE.IcosahedronGeometry(1,0),'#92764e');
 make('hedge','trim',1,new THREE.BoxGeometry(1,1,1),'#63854a');
 make('growth','trim',7,new THREE.IcosahedronGeometry(1,1),'#8aab5b');
 make('leaves','rake',14,new THREE.SphereGeometry(1,4,2),'#c28a40');
 const clean=new Map<string,number>();let workKey='',nextRefresh=0;
 return {pick(ray:THREE.Ray,job:string|null,done:Set<string>){
  const box=new THREE.Box3(),hit=new THREE.Vector3();let closest:MaintenanceTarget|undefined,distance=Infinity;
  for(const t of targets){if(t.job!==job||t.job==='sweep'||done.has(t.id))continue;
   box.min.set(t.x-t.width/2,.12,t.z-t.depth/2);box.max.set(t.x+t.width/2,t.job==='trim'?1.55:.32,t.z+t.depth/2);
   if(ray.intersectBox(box,hit)&&hit.distanceToSquared(ray.origin)<distance){closest=t;distance=hit.distanceToSquared(ray.origin);}
  }
  return closest;
 },update(work:{id:string;completed:number}[],workers:Worker[],now:number){
  const key=work.map(w=>`${w.id}=${w.completed}`).join('|'),active=new Map<string,number>();
  for(const worker of workers)if(worker.wateringTarget&&workDuration(worker.shift??''))active.set(worker.wateringTarget,Math.min(.97,Math.max(active.get(worker.wateringTarget)??0,(now-worker.wateringStarted)/workDuration(worker.shift!))));
  if(key===workKey&&now<nextRefresh)return;
  workKey=key;nextRefresh=now+(active.size?66:250);clean.clear();for(const w of work)if(now-w.completed<WORK_DAY_MS)clean.set(w.id,w.completed);
  for(const batch of batches){let index=0;for(const t of batch.targets){const done=clean.has(t.group),progress=done?1:active.get(t.id)??0;
   for(let j=0;j<batch.pieces;j++){
    const a=j*2.399+t.x,spread=1-progress;
    dummy.position.set(t.x,.16,t.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
    if(batch.kind==='paving')dummy.scale.set(t.width,.045,t.depth);
    if(batch.kind==='grime'){
     const horizontal=t.width>t.depth,part=1/batch.pieces;
     dummy.position.set(t.x+(horizontal?(j+.5-batch.pieces/2)*t.width*part:0),.19,t.z+(horizontal?0:(j+.5-batch.pieces/2)*t.depth*part));
     dummy.scale.set(horizontal?t.width*part*.96:t.width*.96,.015,horizontal?t.depth*.96:t.depth*part*.96);
     if(j/batch.pieces<progress)dummy.scale.setScalar(0);
    }
    if(batch.kind==='road'){
     dummy.position.set(t.x+Math.sin(a)*t.width*.4,.22,t.z+Math.cos(a*1.7)*t.depth*.4);dummy.rotation.y=a;dummy.scale.set(.12+(j%3)*.07,.045,.08+(j%2)*.09);if(done)dummy.scale.setScalar(0);
    }
    if(batch.kind==='hedge'){dummy.position.y=.57;dummy.scale.set(t.width,.92,t.depth);}
    if(batch.kind==='growth'){
     dummy.position.set(t.x+Math.sin(a)*t.width*.4,1.02+Math.sin(j*1.9)*.15,t.z+Math.cos(a)*t.depth*.4);dummy.scale.set(.42*spread,.5*spread,.42*spread);
    }
    if(batch.kind==='leaves'){
     dummy.position.set(t.x+Math.sin(a)*t.width*.45*spread,.2+j*.003,t.z+Math.cos(a*1.7)*t.depth*.45*spread);dummy.rotation.set(.1,a,Math.sin(a)*.25);dummy.scale.set(.17*(1-progress),.028,.09*(1-progress));if(done)dummy.scale.setScalar(0);
    }
    dummy.updateMatrix();batch.mesh.setMatrixAt(index++,dummy.matrix);
   }
  }batch.mesh.instanceMatrix.needsUpdate=true;}
 }};
}

// Tools belong to the avatar so neighbors see the same equipment and motions.
export function maintenanceEquipment(parent:THREE.Group){
 const root=new THREE.Group();parent.add(root);const gear=new Map<string,THREE.Group>(),brushes:THREE.Group[]=[],wheels:THREE.Mesh[]=[];
 const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true});
 const mats=new Map<string,THREE.Material>();
 const mesh=(g:THREE.Object3D,geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number)=>{if(!mats.has(color))mats.set(color,material(color));const m=new THREE.Mesh(geometry,mats.get(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 const box=(g:THREE.Object3D,w:number,h:number,d:number,c:string,x:number,y:number,z:number)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);
 for(const job of ['sweep','wash','trim','rake']){const g=new THREE.Group();gear.set(job,g);root.add(g);g.visible=false;}
 const sweep=gear.get('sweep')!;
 box(sweep,1.2,.48,1.85,'#d6a44e',0,.52,0);box(sweep,1.05,.75,.65,'#6e9394',0,1.04,-.55);box(sweep,1.28,.13,.75,'#e8be6c',0,1.5,-.55);box(sweep,.7,.15,.48,'#5d6458',0,.86,0);
 for(const x of [-.64,.64])for(const z of [-.62,.62]){const w=mesh(sweep,new THREE.CylinderGeometry(.25,.25,.16,10),'#444f49',x,.3,z);w.rotation.z=Math.PI/2;wheels.push(w);}
 for(const x of [-.58,.58]){const brush=new THREE.Group();brush.position.set(x,.16,1);sweep.add(brush);brushes.push(brush);mesh(brush,new THREE.CylinderGeometry(.38,.48,.12,16),'#5a6756',0,0,0);for(let i=0;i<10;i++){const tooth=box(brush,.045,.1,.22,'#a5ae87',Math.sin(i*.628)*.39,0,Math.cos(i*.628)*.39);tooth.rotation.y=i*.628;}}
 box(sweep,.25,.09,.14,'#f8dc86',-.4,.72,.96);box(sweep,.25,.09,.14,'#f8dc86',.4,.72,.96);
 const wash=gear.get('wash')!;
 box(wash,.53,.65,.32,'#64a8b5',0,.88,-.35);box(wash,.37,.16,.05,'#c3dbd1',0,1.23,-.53);
 const wand=box(wash,.075,.075,.85,'#435b5f',.4,.87,.67);wand.rotation.x=.3;box(wash,.1,.24,.1,'#edcc76',.4,.82,.32);
 const trim=gear.get('trim')!;box(trim,.36,.24,.4,'#d6a451',.3,.92,.46);box(trim,.12,.07,.8,'#b5c6c0',.3,.92,1.02);
 for(let i=0;i<9;i++)box(trim,.28,.065,.035,'#c3d2ca',.3,.92,.66+i*.085);
 const rake=gear.get('rake')!;const handle=box(rake,.065,1.08,.065,'#b68a55',.4,.71,.58);handle.rotation.x=-.6;box(rake,.72,.08,.08,'#718b82',.4,.26,.87);for(let i=0;i<8;i++)box(rake,.035,.035,.3,'#718b82',.1+i*.085,.21,1.01);
 mesh(rake,new THREE.CylinderGeometry(.22,.28,.56,8),'#b89b65',-.4,.55,-.15);box(rake,.25,.055,.18,'#806b45',-.4,.85,-.15);
 const spray=new THREE.Group();wash.add(spray);
 for(let i=0;i<13;i++){const drop=mesh(spray,new THREE.IcosahedronGeometry(.035,0),'#b9e4e4',0,0,0);drop.userData.phase=i/13;}
 return {update(job:string|null,working:boolean,moving:boolean,now:number){
  for(const [id,g] of gear)g.visible=id===job;
  for(const brush of brushes)brush.rotation.y=moving?now*.02:brush.rotation.y;
  if(moving)for(const wheel of wheels)wheel.rotation.x=now*.009;
  trim.rotation.y=working?Math.sin(now*.012)*.28:0;rake.rotation.x=working?Math.sin(now*.009)*.25:0;wash.rotation.y=working?Math.sin(now*.007)*.3:0;
  spray.visible=working&&job==='wash';for(const drop of spray.children){const phase=(now*.002+drop.userData.phase)%1;drop.position.set(.4+(phase-.5)*.16,.84-phase*.66,1+phase*.65);}
 }};
}
