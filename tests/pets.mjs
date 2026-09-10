import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import * as THREE from 'three';
import {petAction} from '../db/pets.ts';
import {moveTown} from '../db/moving.ts';
import {validatePlan} from '../db/planning.ts';
import {PETS,petPose} from '../app/game/pets.ts';
import {petModel,townPets} from '../app/game/petScenery.ts';
import {EMPTY_PLANNING,townBuildings} from '../app/game/charters.ts';
import {initialPlacement,placementError,placementBuilding} from '../app/game/placement.ts';
import {HOMES} from '../app/game/data.ts';
import {ROADS,entrance} from '../app/game/townLayout.ts';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const d={prepare(query){const stmt=sql.prepare(query);let args=[];return{bind(...a){args=a;return this},async first(){return stmt.get(...args)??null},async all(){return{results:stmt.all(...args)}},execute(){return{meta:{changes:Number(stmt.run(...args).changes)}}},async run(){return this.execute()}}},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};

const now=Date.parse('2026-09-10T12:00:00Z');sql.exec("INSERT INTO towns(id,name,created) VALUES('town','Town',0),('other','Other',0);INSERT INTO residents(id,token_hash,town_id,name,color,home,job,coins,seen,created) VALUES('a','a','town','A','#fff',0,'mow',10000,0,0),('b','b','other','B','#fff',0,'paper',10000,0,0)");
const row=id=>sql.prepare('SELECT * FROM residents WHERE id=?').get(id),cat=PETS[0],dog=PETS.find(p=>p.kind==='dog');
assert.equal(PETS.length,12);assert.equal(new Set(PETS.map(p=>p.id)).size,12);assert.equal((await petAction(d,row('a'),{pet:cat.id})).status,409,'Store must be constructed');assert.equal((await petAction(d,row('a'),{pet:'fake',price:0})).status,400);
const plan={kind:'build',option:'pets',institution:null};assert.equal(validatePlan(EMPTY_PLANNING,plan).cost,1800);const placement=initialPlacement(EMPTY_PLANNING,plan);assert.equal(placementError(EMPTY_PLANNING,plan,placement),null,'Pet store can be placed in the core town');
sql.prepare("INSERT INTO parcel_buildings(town_id,plot,kind,x,z) VALUES('town','pet-site','pets',?,?)").run(placement.x,placement.z);
const results=await Promise.all([petAction(d,row('a'),{pet:cat.id,price:0}),petAction(d,row('a'),{pet:cat.id,price:0})]);assert.ok(results.every(v=>v===null));assert.equal(row('a').coins,10000-cat.price);assert.equal(JSON.parse(row('a').items).filter(id=>id===cat.id).length,1);
assert.equal(await petAction(d,row('a'),{pet:dog.id}),null);assert.equal(row('a').cat_pet,cat.id);assert.equal(row('a').dog_pet,dog.id);assert.equal((await petAction(d,row('b'),{pet:dog.id})).status,409,'Other towns cannot borrow the unlock');
assert.equal(await petAction(d,row('a'),{pet:null,slot:'cat'}),null);assert.equal(row('a').cat_pet,null);assert.equal(row('a').dog_pet,dog.id);assert.equal(await petAction(d,row('a'),{pet:cat.id}),null);assert.equal(row('a').coins,10000-cat.price-dog.price);
const owned=row('a');assert.equal(await moveTown(d,owned,{fromTown:'town',membership:0,destination:'other',home:1},now),null);assert.equal(row('a').cat_pet,cat.id);assert.equal(row('a').dog_pet,dog.id);assert.equal(await petAction(d,row('a'),{pet:cat.id}),null,'Owned pets can be equipped without a store');assert.equal((await petAction(d,row('a'),{pet:PETS[1].id})).status,409);
sql.exec("UPDATE residents SET coins=0 WHERE id='b';INSERT INTO parcel_buildings(town_id,plot,kind) VALUES('other','pet-site','pets')");assert.equal((await petAction(d,row('b'),{pet:cat.id})).status,409);assert.equal(row('b').cat_pet,null);
// Shared absolute time and compact yard paths keep pets off streets and doorways.
for(const h of HOMES)for(let t=0;t<24000;t+=100){const pose=petPose('dog',h.id,now+t);assert.deepEqual(pose,petPose('dog',h.id,now+t));assert.ok(pose.x< -2.9&&pose.x> -3.1);assert.ok(Math.abs(pose.z)<=1.41);assert.ok(!ROADS.some(r=>Math.abs(h.x+pose.x-r.x)<r.width/2+.35&&Math.abs(h.z+pose.z-r.z)<r.depth/2+.35),'Dog remains in the yard');}
for(const pet of PETS){const model=petModel(pet);const box=new THREE.Box3().setFromObject(model.root);assert.ok(box.max.y<1.3&&box.min.y>-.05);model.root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.count>0);o.geometry.dispose();}});}
const s={...EMPTY_PLANNING,buildings:[{plot:'pet-site',kind:'pets',...placement}]};const store=townBuildings(s).find(b=>b.action==='pets');assert.ok(store);for(const rotation of [0,90,180,270]){const b=placementBuilding(s,plan,{...placement,rotation});assert.ok(Number.isFinite(entrance(b).x));assert.equal(b.modelWidth,7);assert.equal(b.modelDepth,4);}
const scene=new THREE.Scene(),pets=townPets(scene,false);pets.update([{home:0,catPet:cat.id,dogPet:dog.id}],now);assert.equal(scene.children.length,2);pets.update([{home:1,catPet:cat.id,dogPet:dog.id}],now);assert.equal(scene.children.length,2);assert.ok(scene.children.every(c=>c.position.x>HOMES[1].x-4&&c.position.x<HOMES[1].x+1));pets.update([],now);assert.equal(scene.children.length,0);pets.dispose();
console.log('PASS: 12 varieties, Pet Store planning and core placement, server unlock/prices, concurrent purchase deduplication, indoor/outdoor selection, both species, insufficient funds, town isolation, moves with ownership, synchronized yard paths, all models, and scene cleanup.');
