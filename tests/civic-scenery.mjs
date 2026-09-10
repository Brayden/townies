import assert from 'node:assert/strict';
import * as THREE from 'three';
import {civicScenery} from '../app/game/civicScenery.ts';
import {CIVIC_PROJECTS} from '../app/game/civicProjects.ts';
const material=new THREE.MeshBasicMaterial();
const make=(w,h,d,x,y,z,parent)=>{assert.ok(parent,'Every addition belongs to its own toggleable upgrade group');const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const box=(w,h,d,c,x,y,z,p)=>make(w,h,d,x,y,z,p),ball=(r,c,x,y,z,p)=>make(r*2,r*2,r*2,x,y,z,p),cylinder=(r,h,c,x,y,z,p)=>make(r*2,h,r*2,x,y,z,p),roof=(w,d,h,c,x,y,z,p)=>make(w,h,d,x,y,z,p);
const art=civicScenery({box,ball,cylinder,roof,bench:(x,z,p)=>make(1.5,1,.5,x,.5,z,p),flower:(x,z,c,p)=>make(.2,.6,.2,x,.3,z,p)});
assert.equal(art.groups.size,12);for(const p of CIVIC_PROJECTS){const group=art.groups.get(p.id);assert.ok(group.children.length>0);assert.equal(group.visible,false);const bounds=new THREE.Box3().setFromObject(group);assert.ok(Number.isFinite(bounds.min.x));assert.ok(bounds.min.x>=-61&&bounds.max.x<=61);assert.ok(bounds.min.z>=-58&&bounds.max.z<=56);group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});}
assert.equal(art.construction.visible,false);assert.ok(art.construction.children.length>0);
console.log('PASS: every project has isolated, nonempty, initially hidden 3D additions within the town bounds, plus a featured construction marker.');
